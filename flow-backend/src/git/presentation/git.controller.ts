import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateGitUseCase } from '../application/commands/create-git-use-case.js';
import { DeleteGitUseCase } from '../application/commands/delete-git-use-case.js';
import { ListGitsQuery } from '../application/queries/list-gits-query.js';
import { GetGitQuery } from '../application/queries/get-git-query.js';
import { CreateGitDto } from './dto/create-git.dto.js';
import { GitId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';

@ApiTags('Git Repositories')
@Controller('gits')
export class GitController {
  constructor(
    private readonly createUseCase: CreateGitUseCase,
    private readonly deleteUseCase: DeleteGitUseCase,
    private readonly listGitsQuery: ListGitsQuery,
    private readonly getGitQuery: GetGitQuery,
  ) {}

  @ApiOperation({ summary: 'List all git repositories' })
  @ApiResponse({ status: 200, description: 'List of git repositories' })
  @Get()
  async findAll() {
    return this.listGitsQuery.execute();
  }

  @ApiOperation({ summary: 'Get git repository by ID' })
  @ApiResponse({ status: 200, description: 'Git repository details' })
  @ApiResponse({ status: 404, description: 'Git repository not found' })
  @Get(':id')
  async findById(@Param('id', new BrandedIdPipe(GitId, 'GitId')) id: GitId) {
    return this.getGitQuery.execute({ gitId: id });
  }

  @ApiOperation({ summary: 'Register a git repository' })
  @ApiResponse({ status: 201, description: 'Git repository registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  async create(@Body() dto: CreateGitDto) {
    return this.createUseCase.execute({
      url: dto.url,
      localPath: dto.localPath,
    });
  }

  @ApiOperation({ summary: 'Delete a git repository' })
  @ApiResponse({ status: 200, description: 'Git repository deleted' })
  @ApiResponse({ status: 404, description: 'Git repository not found' })
  @Delete(':id')
  async delete(@Param('id', new BrandedIdPipe(GitId, 'GitId')) id: GitId) {
    await this.deleteUseCase.execute({
      gitId: id,
    });
  }
}
