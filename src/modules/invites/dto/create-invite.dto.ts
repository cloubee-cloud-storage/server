import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, Min } from 'class-validator';
import { Role } from 'prisma/generated';

export class CreateInviteDto {
    @IsEmail({}, { message: 'Invalid email address' })
    @ApiProperty()
    email: string;

    @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
    @ApiProperty({ enum: Role })
    role: Role;

    @IsInt({ message: 'Quota must be an integer' })
    @Min(1, { message: 'Quota must be at least 1MB' })
    @ApiProperty()
    quota: number; // Указываем в мегабайтах
}
