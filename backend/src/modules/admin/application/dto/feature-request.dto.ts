import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';

export class SuggestFeatureDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
}

export class ReviewFeatureDto {
  @IsEnum(FeatureRequestStatus) status: FeatureRequestStatus;
  @IsString() @IsOptional() adminResponse?: string;
  @IsString() @IsOptional() rejectionReason?: string;
}

export class SetFeaturePriorityDto {
  @IsEnum(FeatureRequestPriority) priority: FeatureRequestPriority;
}
