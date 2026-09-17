/**
 * 全文检索接口。对照 React 端：frontend/react-app/src/api/index.ts 的 searchApi。
 */
import { requestClient } from '#/api/request';

import type { PageResult } from './document';

export interface SearchHit {
  id: string;
  title: string;
  summary?: null | string;
  categoryId?: null | string;
  tags?: null | string;
  authorId?: null | string;
  teamId?: null | string;
  isPublic?: null | boolean;
  status?: null | number;
  publishTime?: null | string;
  score: number;
  highlight: {
    content: string[];
    summary: string[];
    title: string[];
  };
}

export const searchApi = {
  search: (body: {
    authorId?: string;
    categoryId?: string;
    keyword: string;
    page?: number;
    pageSize?: number;
  }) => requestClient.post<PageResult<SearchHit>>('/search', body),
};
