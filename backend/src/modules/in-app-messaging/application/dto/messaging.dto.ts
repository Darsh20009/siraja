import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ThreadType } from '@shared/enums/messaging.enum';

export class CreateThreadDto {
  @IsEnum(ThreadType)
  type: ThreadType;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  participants: string[];

  @IsString()
  @IsOptional()
  circleId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  /** Optional first message sent when creating the thread. */
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(5000)
  initialMessage?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsString()
  @IsOptional()
  refType?: string;

  @IsString()
  @IsOptional()
  refId?: string;
}
