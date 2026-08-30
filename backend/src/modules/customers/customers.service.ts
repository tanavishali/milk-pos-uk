import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SequenceService } from '../../database/sequence.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
    private readonly sequence: SequenceService,
  ) {}

  /** Newest first, so a record just added is on the page being looked at. */
  async list(): Promise<CustomerDto[]> {
    const rows = await this.customers.find().sort({ createdAt: -1 });
    return rows.map((row) => CustomerDto.from(row));
  }

  async findOne(code: string): Promise<CustomerDto> {
    return CustomerDto.from(await this.require(code));
  }

  async create(dto: CreateCustomerDto): Promise<CustomerDto> {
    const created = await this.customers.create({
      code: await this.sequence.next('CUST'),
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      round: dto.round ?? '',
      deliveryDays: dto.deliveryDays ?? [],
      email: dto.email.trim(),
      area: dto.area.trim(),
      address: dto.address.trim(),
      postcode: dto.postcode.trim(),
    });

    return CustomerDto.from(created);
  }

  async update(code: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    const customer = await this.require(code);

    /**
     * Field by field rather than a spread: an omitted key arrives as
     * `undefined` and would otherwise wipe a stored value.
     *
     * `round` and `deliveryDays` are assigned independently — clearing the
     * round must not clear the days, since a customer can keep their delivery
     * days after coming off a named round.
     */
    if (dto.name !== undefined) customer.name = dto.name.trim();
    if (dto.phone !== undefined) customer.phone = dto.phone.trim();
    if (dto.round !== undefined) customer.round = dto.round;
    if (dto.deliveryDays !== undefined) customer.deliveryDays = dto.deliveryDays;
    if (dto.email !== undefined) customer.email = dto.email.trim();
    if (dto.area !== undefined) customer.area = dto.area.trim();
    if (dto.address !== undefined) customer.address = dto.address.trim();
    if (dto.postcode !== undefined) customer.postcode = dto.postcode.trim();

    await customer.save();

    return CustomerDto.from(customer);
  }

  /**
   * Orders already raised are unaffected: each one copies the customer onto
   * itself at the time of sale, so a printed receipt survives the record going.
   */
  async remove(code: string): Promise<{ id: string }> {
    const deleted = await this.customers.findOneAndDelete({ code });

    if (!deleted) {
      throw new NotFoundException(`Customer ${code} not found.`);
    }

    return { id: code };
  }

  private async require(code: string): Promise<CustomerDocument> {
    const customer = await this.customers.findOne({ code });

    if (!customer) {
      throw new NotFoundException(`Customer ${code} not found.`);
    }

    return customer;
  }
}
