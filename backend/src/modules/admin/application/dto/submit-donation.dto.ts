import { IsBoolean, IsEmail, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DonationMethod } from '@shared/enums/admin-operations.enum';

export class SubmitDonationDto {
  @IsMongoId() campaignId: string;
  @IsNumber() @Min(1) @Type(() => Number) amount: number;
  @IsEnum(DonationMethod) @IsOptional() method?: DonationMethod;
  @IsBoolean() @IsOptional() isAnonymous?: boolean;
  @IsString() @IsOptional() donorName?: string;
  @IsString() @IsOptional() donorPhone?: string;
  @IsEmail() @IsOptional() donorEmail?: string;
  @IsString() @IsOptional() note?: string;
}

export class RejectDonationDto {
  @IsString() rejectionReason: string;
}
