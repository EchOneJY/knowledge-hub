/** AI 会话与流式问答接口。 */
import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

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

export interface ChatStreamEvent {
  data?: unknown;
  delta?: string;
  errorText?: string;
  id?: string;
  type: string;
}

export interface ChatStreamInput {
  messages: Array<{
    parts?: Array<{ text?: string; type?: string }>;
    role?: string;
  }>;
  messageId?: string;
  sessionId?: string;
  topK?: number;
  trigger?: string;
}

/**
 * 原生读取 AI SDK UI Message Stream，避免为了 Vue 端引入 React Hooks 适配层。
 */
export async function streamChat(
  body: ChatStreamInput,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
) {
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const token = useAccessStore().accessToken;
  const response = await fetch(`${apiURL}/ai/chat/stream`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `请求失败（${response.status}）`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          onEvent(JSON.parse(raw) as ChatStreamEvent);
        } catch {
          // 忽略协议外的心跳或非 JSON 片段
        }
      }
    }
  }
}
