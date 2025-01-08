import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MkdirDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @ApiProperty()
    directoryId: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    folderName: string;
}
