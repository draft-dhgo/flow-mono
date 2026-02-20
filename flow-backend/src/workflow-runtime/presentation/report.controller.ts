import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetReportQuery } from '../application/queries/get-report-query.js';
import { WorkExecutionId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly getReportQuery: GetReportQuery,
  ) {}

  @ApiOperation({ summary: 'Get report by work execution ID' })
  @ApiResponse({ status: 200, description: 'Report content' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @Get(':workExecutionId')
  async getByWorkExecutionId(@Param('workExecutionId', new BrandedIdPipe(WorkExecutionId, 'WorkExecutionId')) workExecutionId: WorkExecutionId) {
    return this.getReportQuery.execute({ workExecutionId });
  }
}
