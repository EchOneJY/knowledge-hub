/**
 * 智能问答的 parts 纯逻辑层。
 * 移植自 React 端 frontend/react-app/src/components/ChatMessageParts.tsx,
 * 只搬与 UI 无关的类型与解析函数,渲染留给 .vue 组件。
 */
import type { UIMessage } from 'ai';

import type { ChatSource } from '#/api';

export interface RetrieveHit {
  documentId: string;
  documentTitle: string;
  heading: null | string;
  index: number;
}

/** 与 react-app KhUIMessage 对齐的 UI Message 类型(data-parts 命名一致) */
export type KhUIMessage = UIMessage<
  unknown,
  {
    retrieve: { items: RetrieveHit[]; query: string };
    session: { sessionId: string };
    sources: ChatSource[];
    status: { stage: string; text: string };
    think: { text: string };
  }
>;

export interface WebSearchHit {
  siteName?: string;
  snippet: string;
  title: string;
  url: string;
}

export interface WebSearchResult {
  error?: string;
  items: WebSearchHit[];
  query: string;
}

export function sourcesFromParts(parts: KhUIMessage['parts']): ChatSource[] {
  for (const part of parts) {
    if (part.type === 'data-sources' && Array.isArray(part.data)) {
      return part.data;
    }
  }
  return [];
}

/** 只保留回答里实际标了 [n] 的资料,避免无关召回也占引用区 */
export function citedSources(
  sources: ChatSource[],
  answer: string,
): ChatSource[] {
  const used = new Set(
    [...answer.matchAll(/\[(\d+)\]/g)].map((item) => Number(item[1])),
  );
  if (!used.size) return [];
  return sources.filter((source) => used.has(source.index));
}

export function textFromParts(parts: KhUIMessage['parts']): string {
  return parts
    .filter(
      (part): part is { text: string; type: 'text' } => part.type === 'text',
    )
    .map((part) => part.text)
    .join('');
}

export function historyToUIMessages(
  rows: Array<{
    content: string;
    id: string;
    role: 'assistant' | 'user';
    sources?: ChatSource[] | null;
  }>,
): KhUIMessage[] {
  return rows.map((row) => {
    if (row.role === 'user') {
      return {
        id: row.id,
        parts: [{ text: row.content, type: 'text' }],
        role: 'user',
      };
    }
    const parts: KhUIMessage['parts'] = [];
    if (row.sources?.length) {
      parts.push({ data: row.sources, type: 'data-sources' });
    }
    parts.push({ text: row.content, type: 'text' });
    return { id: row.id, parts, role: 'assistant' };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

/** LangChain tool 结果经常是 JSON 字符串或带 content 的消息对象 */
function parseToolPayload(value: unknown): null | Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return parseToolPayload(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.content === 'string') {
    const nested = parseToolPayload(rec.content);
    if (nested) return nested;
  }
  return rec;
}

export function asWebSearchInput(value: unknown): string {
  const input = asRecord(value);
  return typeof input.query === 'string' ? input.query : '';
}

export function asWebSearchResult(value: unknown): null | WebSearchResult {
  const rec = parseToolPayload(value);
  if (!rec) return null;
  return {
    error: typeof rec.error === 'string' ? rec.error : undefined,
    items: Array.isArray(rec.items) ? (rec.items as WebSearchHit[]) : [],
    query: typeof rec.query === 'string' ? rec.query : '',
  };
}

export function citeAnchorId(scope: string, index: number) {
  return `kh-cite-${scope}-${index}`;
}

/** [n] 点击后滚动到对应引用卡并闪一下 */
export function focusCite(scope: string, index: number) {
  const el = document.getElementById(citeAnchorId(scope, index));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
