import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCurrentUserDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @ApiProperty()
    name?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @IsOptional()
    @ApiProperty()
    password?: string;
}
