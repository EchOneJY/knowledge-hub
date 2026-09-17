<script lang="ts" setup>
import { computed } from 'vue';

/**
 * 文件类型图标：按文件名后缀画圆角色块（PDF / W / X / P…）。
 * 移植自 React 端 frontend/react-app/src/components/FileTypeIcon.tsx
 */
const props = withDefaults(
  defineProps<{ name?: null | string; size?: number }>(),
  { size: 22 },
);

interface IconSpec {
  bg: string;
  fontSize: number;
  label: string;
}

const ICONS: Record<string, IconSpec> = {
  pdf: { bg: '#E53935', fontSize: 7, label: 'PDF' },
  doc: { bg: '#1E88E5', fontSize: 11, label: 'W' },
  docx: { bg: '#1E88E5', fontSize: 11, label: 'W' },
  xls: { bg: '#43A047', fontSize: 11, label: 'X' },
  xlsx: { bg: '#43A047', fontSize: 11, label: 'X' },
  ppt: { bg: '#FB8C00', fontSize: 11, label: 'P' },
  pptx: { bg: '#FB8C00', fontSize: 11, label: 'P' },
  txt: { bg: '#78909C', fontSize: 11, label: 'T' },
  md: { bg: '#5C6BC0', fontSize: 7, label: 'MD' },
  json: { bg: '#F9A825', fontSize: 7, label: 'JS' },
};

const FALLBACK: IconSpec = { bg: '#90A4AE', fontSize: 7, label: 'DOC' };

function extFromName(name?: null | string) {
  if (!name) return 'md';
  const base = name.split(/[/\\]/).pop() || name;
  const idx = base.lastIndexOf('.');
  if (idx <= 0 || idx === base.length - 1) return 'md';
  const ext = base.slice(idx + 1).toLowerCase();
  return ext in ICONS ? ext : 'md';
}

const spec = computed(() => ICONS[extFromName(props.name)] ?? FALLBACK);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 22 22"
    aria-hidden="true"
    style="display: block; flex-shrink: 0"
  >
    <rect width="22" height="22" rx="4" :fill="spec.bg" />
    <text
      x="11"
      y="15"
      text-anchor="middle"
      fill="#fff"
      :font-size="spec.fontSize"
      font-weight="700"
      font-family="system-ui, -apple-system, sans-serif"
    >
      {{ spec.label }}
    </text>
  </svg>
</template>
