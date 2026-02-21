import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetWorkLineageQuery } from '../application/queries/get-work-lineage-query.js';
import { ExportWorkLineageQuery } from '../application/queries/export-work-lineage-query.js';

@ApiTags('Work Lineage')
@Controller('work-lineage')
export class WorkLineageController {
  constructor(
    private readonly getWorkLineageQuery: GetWorkLineageQuery,
    private readonly exportWorkLineageQuery: ExportWorkLineageQuery,
  ) {}

  @Get()
  async getWorkLineage() {
    return this.getWorkLineageQuery.execute();
  }

  @Get('export')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async exportWorkLineage(): Promise<string> {
    return this.exportWorkLineageQuery.execute();
  }
}
