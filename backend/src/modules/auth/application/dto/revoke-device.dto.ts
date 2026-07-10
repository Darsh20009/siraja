import { IsMongoId } from 'class-validator';

export class RevokeDeviceParamDto {
  @IsMongoId()
  deviceId: string;
}
