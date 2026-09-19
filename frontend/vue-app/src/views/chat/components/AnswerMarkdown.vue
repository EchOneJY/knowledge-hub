<script lang="ts" setup>
import { computed } from 'vue';

import DOMPurify from 'dompurify';
import { marked } from 'marked';

import type { ChatSource } from '#/api';

import { focusCite } from '../message-parts';

/**
 * 回答 Markdown 渲染 + 内联 [n] 定位:
 * marked/DOMPurify 渲染后,对已 sanitize 的 DOM 做文本遍历(跳过 pre/code/a),
 * 把命中引用集合的 [n] 替换成可点击 button,再交给 v-html;点击用事件委托处理。
 * 对照 react-app SourceCiteList.tsx 的 AnswerMarkdown。
 */
defineOptions({ name: 'AnswerMarkdown' });

marked.use({ breaks: true, gfm: true });

const props = defineProps<{
  scope: string;
  sources?: ChatSource[];
  text: string;
}>();

const emit = defineEmits<{ cite: [index: number] }>();

const citedIndexes = computed(
  () =>
    new Set(
      (props.sources ?? [])
        .filter((source) => source.index != null)
        .map((source) => source.index),
    ),
);

/** 遍历文本节点,把 [n] 换成 button;只处理命中引用集合的编号 */
function injectCites(html: string, indexes: Set<number>): string {
  if (!indexes.size) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    current = walker.nextNode();
    if (!/\[\d+\]/.test(node.data)) continue;
    if (isInSkipped(node)) continue;
    targets.push(node);
  }
  for (const node of targets) replaceTextNode(node, indexes);
  return tpl.innerHTML;
}

/** pre/code/a 内的 [n] 不做替换,避免破坏代码块与链接 */
function isInSkipped(node: Text): boolean {
  let el = node.parentElement;
  while (el) {
    const tag = el.tagName;
    if (tag === 'PRE' || tag === 'CODE' || tag === 'A') return true;
    el = el.parentElement;
  }
  return false;
}

function replaceTextNode(node: Text, indexes: Set<number>) {
  const parts = node.data.split(/(\[\d+\])/);
  if (parts.length === 1) return;
  const frag = document.createDocumentFragment();
  for (const part of parts) {
    const match = /^\[(\d+)\]$/.exec(part);
    const index = match ? Number(match[1]) : null;
    if (index != null && indexes.has(index)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cite-inline';
      btn.dataset.cite = String(index);
      btn.title = '查看本条用到的资料块';
      btn.textContent = part;
      frag.append(btn);
    } else if (part) {
      frag.append(document.createTextNode(part));
    }
  }
  node.replaceWith(frag);
}

const html = computed(() => {
  const rendered = DOMPurify.sanitize(
    marked.parse(props.text, { async: false }),
  );
  return injectCites(rendered, citedIndexes.value);
});

function onClick(event: MouseEvent) {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    '[data-cite]',
  );
  if (!target) return;
  const index = Number(target.dataset.cite);
  if (Number.isNaN(index)) return;
  emit('cite', index);
  focusCite(props.scope, index);
}
</script>

<template>
  <div
    class="answer-md prose prose-sm dark:prose-invert max-w-none"
    @click="onClick"
    v-html="html"
  />
</template>

<style scoped>
/* v-html 内容不带 scoped 属性,内联引用按钮样式需用 :deep 命中 */
.answer-md :deep(.cite-inline) {
  display: inline;
  padding: 0 1px;
  border: 0;
  background: none;
  color: hsl(var(--primary));
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.answer-md :deep(.cite-inline:hover) {
  text-decoration: underline;
}

/* 表格:对照 react-app .kh-md table —— 满宽、边框合并、每格描边、左对齐、13px。
   prose 默认只给表头行底边框,这里改成完整网格线。语义 token 适配暗色。 */
.answer-md :deep(table) {
  width: 100%;
  margin: 0 0 10px;
  border-collapse: collapse;
  font-size: 13px;
  background: hsl(var(--card));
}

.answer-md :deep(th),
.answer-md :deep(td) {
  padding: 6px 8px;
  border: 1px solid hsl(var(--border));
  text-align: left;
}

.answer-md :deep(thead th) {
  background: hsl(var(--card));
  font-weight: 600;
}

/* 排版对齐 react-app .kh-md:prose 默认标题过大、行距过松、链接深色带下划线,
   这里收敛为 react 的紧凑规格(标题 15px、段落 10px 间距、链接主题蓝不带下划线)。 */
.answer-md :deep(> *:first-child) {
  margin-top: 0;
}

.answer-md :deep(> *:last-child) {
  margin-bottom: 0;
}

.answer-md :deep(h1),
.answer-md :deep(h2),
.answer-md :deep(h3),
.answer-md :deep(h4) {
  margin: 14px 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.answer-md :deep(p) {
  margin: 0 0 10px;
}

.answer-md :deep(ul),
.answer-md :deep(ol) {
  margin: 0 0 10px;
  padding-left: 1.4em;
}

.answer-md :deep(li) {
  margin: 4px 0;
  padding-left: 0;
}

.answer-md :deep(li::marker) {
  color: hsl(var(--foreground));
}

.answer-md :deep(a) {
  color: hsl(var(--primary));
  text-decoration: none;
  font-weight: inherit;
}

.answer-md :deep(a:hover) {
  text-decoration: underline;
}
</style>
