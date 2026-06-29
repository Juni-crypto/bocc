import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  // optional phone so the guest can later pull up every event they joined
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  // explicit biometric consent for face matching (GDPR / BIPA)
  @IsOptional()
  @IsBoolean()
  consentFaceMatch?: boolean;
}
