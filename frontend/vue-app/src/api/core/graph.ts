/**
 * 知识图谱接口。对照 React 端：frontend/react-app/src/api/index.ts 的 graphApi。
 */
import { requestClient } from '#/api/request';

export interface GraphViewNode {
  id: string;
  name: string;
  kind: 'document' | 'entity' | 'tag';
  type?: null | string;
  documentId?: null | string;
  updatedAt?: null | string;
  description?: null | string;
}

export interface GraphViewEdge {
  source: string;
  target: string;
  relation: string;
  kind: 'mentions' | 'related' | 'tagged';
}

export interface GraphOverview {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  stats: {
    documentCount: number;
    edgeCount: number;
    entityCount: number;
    mentionCount: number;
    nodeCount: number;
    relatedCount: number;
    tagCount: number;
    entityTypes: Array<{ count: number; type: string }>;
  };
  topEntities: Array<{ degree: number; name: string; type: null | string }>;
  recentNodes: Array<{
    id: string;
    kind: string;
    name: string;
    updatedAt: null | string;
  }>;
  entityTypes: string[];
}

export const graphApi = {
  overview: (query: {
    docLimit?: number;
    entityType?: string;
    from?: string;
    keyword?: string;
    to?: string;
  }) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.set(k, String(v));
    }
    const qs = params.toString();
    return requestClient.get<GraphOverview>(`/graph/overview${qs ? `?${qs}` : ''}`);
  },
};
