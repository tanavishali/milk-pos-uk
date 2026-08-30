import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WEEKDAYS, WEEKDAY_INITIAL, WEEKDAY_SHORT } from '../../common/enums';
import { DELIVERY_ROUNDS } from './delivery.constants';
import { DeliveryRoundDto, WeekdayDto } from './dto/delivery.dto';

/**
 * Reference data for the round planner. Read-only and unchanging, so there is
 * no database behind either route — they exist so the frontend has one source
 * for both lists instead of its own copy.
 */
@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  @Get('rounds')
  @ApiOperation({
    summary: 'The named delivery rounds',
    description:
      'Two rounds can cover the same weekdays at different times of day, which is why a round is stored in its own right rather than derived from the days.',
  })
  @ApiOkResponse({ type: [DeliveryRoundDto] })
  rounds(): DeliveryRoundDto[] {
    return DELIVERY_ROUNDS;
  }

  @Get('days')
  @ApiOperation({
    summary: 'The seven weekdays, Monday first',
    description: 'Monday-first because that is the order a round is planned in.',
  })
  @ApiOkResponse({ type: [WeekdayDto] })
  days(): WeekdayDto[] {
    return WEEKDAYS.map((value) => ({
      value,
      short: WEEKDAY_SHORT[value],
      initial: WEEKDAY_INITIAL[value],
    }));
  }
}
