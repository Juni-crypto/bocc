import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  // explicit biometric consent for face matching (GDPR / BIPA)
  @IsOptional()
  @IsBoolean()
  consentFaceMatch?: boolean;
}
