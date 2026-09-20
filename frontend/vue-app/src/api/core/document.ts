/**
 * 文档与审核接口。对照 React 端：frontend/react-app/src/api/index.ts 的 documentApi。
 * 端点与字段与 React 端保持一致，后端无响应包装。
 */
import { requestClient } from '#/api/request';

export interface DocumentItem {
  id: string;
  title: string;
  summary?: null | string;
  content?: string;
  categoryId?: null | string;
  teamId?: null | string;
  teamName?: null | string;
  authorId?: null | string;
  authorName?: null | string;
  fileUrl?: null | string;
  fileType?: null | string;
  tags?: null | string;
  status: number;
  isPublic: boolean;
  viewCount?: number;
  likeCount?: number;
  wordCount?: number;
  publishTime?: null | string;
  createdAt?: string;
  updatedAt?: string;
  remark?: null | string;
}

export interface ReviewTask {
  id: string;
  documentId: string;
  reviewerId?: null | string;
  reviewerName?: null | string;
  reviewResult?: null | number;
  reviewComment?: null | string;
  beforeStatus: number;
  reviewedAt?: null | string;
  createdAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

type Query = Record<string, number | string | undefined>;

function toQueryString(query: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const documentApi = {
  list: (query: Query) =>
    requestClient.get<PageResult<DocumentItem>>(`/documents${toQueryString(query)}`),
  get: (id: string) => requestClient.get<DocumentItem>(`/documents/${id}`),
  create: (body: Record<string, unknown>) =>
    requestClient.post<DocumentItem>('/documents', body),
  update: (id: string, body: Record<string, unknown>) =>
    requestClient.request<DocumentItem>(`/documents/${id}`, {
      data: body,
      method: 'PATCH',
    }),
  remove: (id: string) =>
    requestClient.delete<{ affected?: number }>(`/documents/${id}`),
  publish: (id: string) =>
    requestClient.put<DocumentItem>(`/documents/${id}/publish`),
  archive: (id: string) =>
    requestClient.put<DocumentItem>(`/documents/${id}/archive`),
  saveDraft: (id: string) =>
    requestClient.put<DocumentItem>(`/documents/${id}/save-draft`),
  /**
   * multipart 上传，字段名 file（后端 FileInterceptor('file')）。
   * 必须覆盖客户端默认的 application/json：否则 axios transformRequest 会把
   * FormData 序列化成 JSON，后端 ValidationPipe 收到 { file } 报 "property file should not exist"；
   * 设为 multipart/form-data 后浏览器会自动补 boundary。
   */
  uploadParse: (form: FormData) =>
    requestClient.post<{ documentId: string; status: number; title: string }>(
      '/documents/upload/parse',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  reviewTasks: (query: Query) =>
    requestClient.get<PageResult<ReviewTask>>(
      `/documents/reviews/tasks${toQueryString(query)}`,
    ),
  pendingCount: () =>
    requestClient.get<number>('/documents/reviews/tasks/pending-count'),
  approve: (taskId: string, reviewComment?: string) =>
    requestClient.post<DocumentItem>(
      `/documents/reviews/tasks/${taskId}/approve`,
      { reviewComment },
    ),
  reject: (taskId: string, reviewComment: string) =>
    requestClient.post<DocumentItem>(
      `/documents/reviews/tasks/${taskId}/reject`,
      { reviewComment },
    ),
};
