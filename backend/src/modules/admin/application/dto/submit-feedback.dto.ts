import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FeedbackType, FeedbackStatus } from '@shared/enums/admin-operations.enum';

export class SubmitFeedbackDto {
  @IsEnum(FeedbackType) @IsOptional() type?: FeedbackType;
  @IsString() title: string;
  @IsString() body: string;
  @IsInt() @Min(1) @Max(5) @IsOptional() rating?: number;
  @IsBoolean() @IsOptional() isAnonymous?: boolean;
  /** When true, the feedback entry is publicly visible (e.g. community wall). Default: false. */
  @IsBoolean() @IsOptional() isPublic?: boolean;
  @IsString() @IsOptional() submitterName?: string;
  @IsEmail() @IsOptional() submitterEmail?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
}

export class ResolveFeedbackDto {
  @IsString() @IsOptional() adminNotes?: string;
}

export class ChangeFeedbackStatusDto {
  @IsEnum(FeedbackStatus) status: FeedbackStatus;
  @IsString() @IsOptional() adminNotes?: string;
}
