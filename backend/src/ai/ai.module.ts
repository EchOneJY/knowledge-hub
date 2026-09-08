import { Module } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { RerankerService } from './reranker.service';
import { EmbeddingService } from '../pipeline/embedding.service';

@Module({
  imports: [PipelineModule],
  controllers: [AiController],
  providers: [
    AiChatService,
    HybridRetrievalService,
    RerankerService,
    EmbeddingService,
  ],
})
export class AiModule {}
