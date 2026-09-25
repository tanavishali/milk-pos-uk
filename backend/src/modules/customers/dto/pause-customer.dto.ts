import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PauseCustomerDto {
  @ApiProperty({ example: true, description: 'true pauses, false resumes.' })
  @IsBoolean()
  paused!: boolean;
}
