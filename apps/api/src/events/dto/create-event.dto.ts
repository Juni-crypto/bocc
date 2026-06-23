import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import {
  EventType,
  Visibility,
  UploadWindow,
  DownloadPolicy,
} from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  // capture rules
  @IsOptional() @IsInt() @Min(0) @Max(200)
  perGuestCap?: number; // 0 = unlimited

  @IsOptional() @IsInt() @Min(0)
  totalCap?: number;

  @IsOptional() @IsBoolean()
  allowVideo?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(600)
  maxVideoSec?: number;

  @IsOptional() @IsBoolean()
  liveCaptureOnly?: boolean;

  @IsOptional() @IsEnum(UploadWindow)
  uploadWindow?: UploadWindow;

  @IsOptional() @IsInt() @Min(0) @Max(365)
  uploadDaysAfter?: number;

  // location / geo
  @IsOptional() @IsBoolean()
  geoEnabled?: boolean;

  @IsOptional() @IsBoolean()
  geofenceEnabled?: boolean;

  @IsOptional() @IsLatitude()
  geofenceLat?: number;

  @IsOptional() @IsLongitude()
  geofenceLng?: number;

  @IsOptional() @IsInt() @Min(10) @Max(50_000)
  geofenceRadiusM?: number;

  @IsOptional() @IsBoolean()
  mapView?: boolean;

  // AI
  @IsOptional() @IsBoolean() faceMatching?: boolean;
  @IsOptional() @IsBoolean() autoHighlights?: boolean;
  @IsOptional() @IsBoolean() semanticSearch?: boolean;
  @IsOptional() @IsBoolean() autoModeration?: boolean;

  // access / privacy
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsBoolean() requireName?: boolean;
  @IsOptional() @IsBoolean() requireSelfie?: boolean;
  @IsOptional() @IsBoolean() hostApproval?: boolean;
  @IsOptional() @IsBoolean() uploadToUnlock?: boolean;
  @IsOptional() @IsEnum(DownloadPolicy) downloadPolicy?: DownloadPolicy;
  @IsOptional() @IsBoolean() watermark?: boolean;
  @IsOptional() @IsBoolean() moderationQueue?: boolean;

  // lifecycle
  @IsOptional() @IsInt() @Min(1) @Max(3650)
  expiryDays?: number;
}
