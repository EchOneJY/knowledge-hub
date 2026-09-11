import { Module } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { RerankerService } from './reranker.service';
import { EmbeddingService } from '../pipeline/embedding.service';
import { ChatSessionService } from './chat-session.service';
import { AiStreamService } from './ai-stream.service';
import { WebSearchService } from './web-search.service';

@Module({
  imports: [PipelineModule],
  controllers: [AiController],
  providers: [
    AiChatService,
    AiStreamService,
    HybridRetrievalService,
    RerankerService,
    EmbeddingService,
    ChatSessionService,
    WebSearchService,
  ],
})
export class AiModule {}
