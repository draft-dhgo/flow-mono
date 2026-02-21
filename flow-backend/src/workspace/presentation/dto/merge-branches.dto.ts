import { IsArray, IsString } from 'class-validator';

export class MergeBranchesDto {
  @IsArray()
  @IsString({ each: true })
  workflowRunIds!: string[];
}
