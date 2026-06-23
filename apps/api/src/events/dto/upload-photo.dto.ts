import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

/** Multipart fields that ride alongside the uploaded file(s). */
export class UploadPhotoDto {
  @IsString()
  memberId: string;

  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVideo?: boolean;
}
