import { ApiProperty } from '@nestjs/swagger';
import { Weekday } from '../../../common/enums';

export class DeliveryRoundDto {
  @ApiProperty({ example: 'mon-pm-thu-pm', description: 'Stored on the customer as `round`.' })
  id!: string;

  @ApiProperty({ example: 'Mon(PM)&Thurs(PM)', description: 'What the dropdown shows.' })
  label!: string;

  @ApiProperty({
    enum: Weekday,
    isArray: true,
    example: ['mon', 'thu'],
    description: 'The days this round covers — used to fill the day toggles when a round is picked.',
  })
  days!: Weekday[];
}

export class WeekdayDto {
  @ApiProperty({ enum: Weekday, example: Weekday.Mon, description: 'Stored value.' })
  value!: Weekday;

  @ApiProperty({ example: 'Mon', description: 'Three-letter label for a chip.' })
  short!: string;

  @ApiProperty({ example: 'M', description: 'Single letter for the seven-slot row indicator.' })
  initial!: string;
}
