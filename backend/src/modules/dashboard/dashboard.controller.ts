import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderDto } from '../orders/dto/order.dto';
import { DashboardMetricsDto } from './dto/dashboard.dto';
import { DashboardOverviewDto } from './dto/overview.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'The whole dashboard in one response',
    description:
      'Headline figures plus three panels: who owes money, which bills are open, and what is below the reorder point. One request rather than four, so the panels cannot disagree with each other while the last one is still loading.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 6,
    description: 'Rows per panel. Each panel also reports its full count.',
  })
  @ApiOkResponse({ type: DashboardOverviewDto })
  overview(
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ): Promise<DashboardOverviewDto> {
    return this.dashboard.overview(limit);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Headline figures',
    description:
      'A projection over orders, payments and the registries — nothing here is stored.',
  })
  @ApiOkResponse({ type: DashboardMetricsDto })
  metrics(): Promise<DashboardMetricsDto> {
    return this.dashboard.metrics();
  }

  @Get('recent')
  @ApiOperation({ summary: 'The activity log — most recent orders first' })
  @ApiQuery({ name: 'limit', required: false, example: 4 })
  @ApiOkResponse({ type: [OrderDto] })
  recent(
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ): Promise<OrderDto[]> {
    return this.dashboard.recent(limit);
  }
}
