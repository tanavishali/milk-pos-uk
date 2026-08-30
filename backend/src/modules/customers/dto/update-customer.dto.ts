import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/** Every field optional; the edit form sends the whole draft regardless. */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
