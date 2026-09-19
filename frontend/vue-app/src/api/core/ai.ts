/** AI 会话与问答 REST 接口(流式问答由 @ai-sdk/vue 的 useChat 直连,见 views/chat)。 */
import { requestClient } from '#/api/request';

import type { PageResult } from './document';

export interface ChunkHit {
  bm25Score?: number;
  chunkId: string;
  content: string;
  documentId: string;
  documentTitle: string;
  heading: null | string;
  score: number;
  vectorScore?: number;
}

export interface ChatSource {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  heading: null | string;
  index: number;
  score: number;
}

export interface ChatResult {
  answer: string;
  sessionId: null | string;
  sources: ChatSource[];
}

export interface ChatSession {
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatMessage {
  content: string;
  createdAt: string;
  id: string;
  role: 'assistant' | 'user';
  sessionId: string;
  sources?: ChatSource[] | null;
}

export const aiApi = {
  chat: (content: string, topK = 5, sessionId?: string) =>
    requestClient.post<ChatResult>('/ai/chat', { content, sessionId, topK }),
  ragSearch: (query: string, topK = 8) =>
    requestClient.post<ChunkHit[]>('/rag/search', { query, topK }),
  sessions: (page = 1, pageSize = 50) =>
    requestClient.get<PageResult<ChatSession>>(
      `/ai/sessions?page=${page}&pageSize=${pageSize}`,
    ),
  createSession: () => requestClient.post<ChatSession>('/ai/sessions', {}),
  messages: (id: string) =>
    requestClient.get<ChatMessage[]>(`/ai/sessions/${id}/messages`),
  renameSession: (id: string, title: string) =>
    requestClient.request<ChatSession>(`/ai/sessions/${id}`, {
      data: { title },
      method: 'PATCH',
    }),
  removeSession: (id: string) =>
    requestClient.delete<{ message: string }>(`/ai/sessions/${id}`),
};
