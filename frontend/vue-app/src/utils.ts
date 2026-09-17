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

/** ES 高亮只保留 em，避免 XSS。对照 react-app/src/utils.ts safeHighlight */
export function safeHighlight(html?: string) {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>');
}
