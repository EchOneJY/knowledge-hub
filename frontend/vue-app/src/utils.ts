import type { TeamItem, TeamTreeNode } from '#/api';

/** 状态与展示工具。对照 React 端 frontend/react-app/src/utils.ts */
export interface DocStatusMeta {
  label: string;
  type: 'danger' | 'info' | 'primary' | 'success' | 'warning';
}

export const DOC_STATUS: Record<number, DocStatusMeta> = {
  0: { label: '草稿', type: 'info' },
  1: { label: '已发布', type: 'success' },
  2: { label: '已归档', type: 'warning' },
  3: { label: '待审核', type: 'primary' },
};

export function formatTime(value?: null | string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function visibilityMeta(doc: { isPublic?: boolean | null; teamId?: null | string }) {
  if (doc.isPublic) return { label: '公开', type: 'success' as const };
  if (doc.teamId) return { label: '团队可见', type: 'primary' as const };
  return { label: '仅自己', type: 'info' as const };
}

/** 作者或管理员可写；权限码已由 authStore 合并角色与权限。 */
export function canWriteDocument(
  userCodes: string[],
  userId: undefined | string,
  doc: { authorId?: null | string },
) {
  if (userCodes.includes('ROLE_ADMIN')) return true;
  return Boolean(userId && doc.authorId === userId);
}

/** 把团队树压平成编辑页可用的团队选项。 */
export function flattenTeams(nodes: TeamTreeNode[]): TeamItem[] {
  const out: TeamItem[] = [];
  const walk = (list: TeamTreeNode[]) => {
    for (const node of list) {
      if (node?.id && node.teamName) out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** ES 高亮只保留 em，避免 XSS。 */
export function safeHighlight(html?: string) {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>');
}
