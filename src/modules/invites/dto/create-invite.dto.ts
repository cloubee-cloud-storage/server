import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, Min } from 'class-validator';

export class CreateInviteDto {
    @IsEmail({}, { message: 'Invalid email address' })
    @ApiProperty()
    email: string;

    @IsInt({ message: 'Quota must be an integer' })
    @Min(1, { message: 'Quota must be at least 1MB' })
    @ApiProperty()
    storageQuota: number;
}
