import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import {
  DocumentContent,
  DocumentContentSchema,
} from './schemas/document-content.schema';
import { StorageModule } from '../storage/storage.module';
import { MqModule } from '../mq/mq.module';
import { FileParserService } from './parser/file-parser.service';
import { DocumentReviewService } from './document-review.service';

@Module({
  imports: [
    StorageModule,
    MqModule,
    MongooseModule.forFeature([
      { name: DocumentContent.name, schema: DocumentContentSchema },
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, FileParserService, DocumentReviewService],
  exports: [DocumentService],
})
export class DocumentModule {}
