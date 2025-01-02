import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { Role } from '../../../../prisma/generated';

export class UpdateUserByAdminDto {
    @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
    @IsOptional()
    @ApiProperty()
    role?: Role;

    @IsInt({ message: 'Quota must be an integer' })
    @Min(1, { message: 'Quota must be at least 1MB' })
    @IsOptional()
    @ApiProperty()
    quota?: number;
}
