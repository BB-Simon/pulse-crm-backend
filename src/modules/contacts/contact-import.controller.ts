import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ContactImportService } from './contact-import.service';
import { ContactImportPreviewResponseDto } from './dto/import/contact-import-preview-response.dto';
import { ContactImportResultDto } from './dto/import/contact-import-result.dto';
import { ImportContactsDto } from './dto/import/import-contacts.dto';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts/import')
export class ContactImportController {
  constructor(private readonly contactImportService: ContactImportService) {}

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Parse a CSV file and return its headers, a sample of rows, and a best-guess column mapping — nothing is imported yet',
  })
  @ApiOkResponse({ type: ContactImportPreviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  preview(
    @UploadedFile() file: Express.Multer.File,
  ): ContactImportPreviewResponseDto {
    return this.contactImportService.preview(file);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        firstNameColumn: { type: 'string' },
        lastNameColumn: { type: 'string' },
        emailColumn: { type: 'string' },
        phoneColumn: { type: 'string' },
        tagsColumn: { type: 'string' },
        ownerEmailColumn: { type: 'string' },
        dryRun: { type: 'boolean', default: false },
      },
      required: ['file', 'firstNameColumn', 'lastNameColumn'],
    },
  })
  @ApiOperation({
    summary:
      'Import contacts from a CSV file using the given column mapping. Set dryRun=true to validate and preview the outcome without creating anything.',
  })
  @ApiOkResponse({ type: ContactImportResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  commit(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportContactsDto,
  ): Promise<ContactImportResultDto> {
    return this.contactImportService.commit(user, file, dto);
  }
}
