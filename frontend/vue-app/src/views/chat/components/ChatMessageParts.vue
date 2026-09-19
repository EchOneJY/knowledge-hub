<script lang="ts" setup>
import { computed, shallowRef } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { getToolName, isToolUIPart } from 'ai';

import type {
  KhUIMessage,
  RetrieveHit,
  WebSearchHit,
} from '../message-parts';

import {
  asWebSearchInput,
  asWebSearchResult,
  citedSources,
  sourcesFromParts,
  textFromParts,
} from '../message-parts';
import AnswerMarkdown from './AnswerMarkdown.vue';
import SourceCiteList from './SourceCiteList.vue';

/**
 * 单条消息渲染:过程卡片(思考/检索/联网搜索/状态)→ Markdown 正文 → 引用横向轨。
 * 对照 react-app ChatMessageParts.tsx 的 ChatMessageParts + renderProcessParts。
 */
defineOptions({ name: 'ChatMessageParts' });

// 整条 message 作为单个 prop 传入:@ai-sdk/vue 流式时会用 { ...message } 浅拷贝
// 替换消息(对象身份每帧变化),据此触发本组件重渲;若只传 parts 数组,其引用不变
// 会导致流式内容不刷新。
const props = withDefaults(
  defineProps<{
    message: KhUIMessage;
    showSources?: boolean;
  }>(),
  { showSources: true },
);

type ProcItem =
  | { error?: string; kind: 'websearch'; count: number; failed: boolean; items: WebSearchHit[]; pending: boolean; query: string }
  | { kind: 'retrieve'; items: RetrieveHit[]; query: string }
  | { kind: 'status'; text: string }
  | { kind: 'think'; streaming: boolean; text: string }
  | { kind: 'weblink'; title: string; url: string };

const activeCite = shallowRef<null | number>(null);

const messageId = computed(() => props.message.id);
const role = computed(() => props.message.role);
// @ai-sdk/vue 流式用 messages.value[i] = { ...message } 换消息外壳,但浅拷贝使 parts
// 数组仍是同一引用(内容原地增长)。若直接 computed(() => props.message.parts),其返回的
// 数组身份恒定,Vue 判定「值未变」而不通知下游 computed,导致流式正文永不刷新。故此处展开成
// 新数组:props.message 每帧换身份 → 本 computed 重算并产出新引用 → textParts/processItems
// /sources 随之重算。
const parts = computed(() => [...props.message.parts]);

const sources = computed(() =>
  citedSources(sourcesFromParts(parts.value), textFromParts(parts.value)),
);

const textParts = computed(() =>
  parts.value.filter(
    (part): part is { text: string; type: 'text' } =>
      part.type === 'text' && Boolean(part.text),
  ),
);

const hasRetrieve = computed(() =>
  parts.value.some((part) => part.type === 'data-retrieve'),
);

/** 对照 renderProcessParts:reasoning 缓冲合并,其余按类型收集 */
const processItems = computed<Array<{ item: ProcItem; key: string }>>(() => {
  const out: Array<{ item: ProcItem; key: string }> = [];
  let reasoningBuf: string[] = [];
  let reasoningStreaming = false;
  let thinkKey = 0;

  const flush = () => {
    if (!reasoningBuf.length) return;
    out.push({
      item: {
        kind: 'think',
        streaming: reasoningStreaming,
        text: reasoningBuf.join('\n\n'),
      },
      key: `think-${thinkKey}`,
    });
    thinkKey += 1;
    reasoningBuf = [];
    reasoningStreaming = false;
  };

  parts.value.forEach((part, i) => {
    if (part.type === 'reasoning' || part.type === 'data-think') {
      const text =
        'text' in part && typeof part.text === 'string' ? part.text : '';
      if (text) reasoningBuf.push(text);
      if ('state' in part && part.state === 'streaming') {
        reasoningStreaming = true;
      }
      return;
    }

    flush();

    if (
      part.type === 'step-start' ||
      part.type === 'data-session' ||
      part.type === 'data-sources' ||
      part.type === 'source-document' ||
      part.type === 'text'
    ) {
      return;
    }

    if (part.type === 'data-status') {
      if (part.data.stage === 'generate') return;
      if (part.data.stage === 'retrieve' && hasRetrieve.value) return;
      out.push({ item: { kind: 'status', text: part.data.text }, key: `s-${i}` });
      return;
    }

    if (part.type === 'data-retrieve') {
      out.push({
        item: { items: part.data.items, kind: 'retrieve', query: part.data.query },
        key: `r-${i}`,
      });
      return;
    }

    if (part.type === 'source-url') {
      out.push({
        item: { kind: 'weblink', title: part.title || part.url, url: part.url },
        key: `u-${i}`,
      });
      return;
    }

    if (isToolUIPart(part) && getToolName(part) === 'web_search') {
      const output = asWebSearchResult(part.output);
      const pending =
        part.state === 'input-streaming' || part.state === 'input-available';
      const failed = part.state === 'output-error' || Boolean(output?.error);
      out.push({
        item: {
          count: output?.items?.length ?? 0,
          error: output?.error ?? part.errorText,
          failed,
          items: output?.items ?? [],
          kind: 'websearch',
          pending,
          query: asWebSearchInput(part.input),
        },
        key: `w-${i}`,
      });
    }
  });

  flush();
  return out;
});

function onCite(index: number) {
  activeCite.value = index;
}
</script>

<template>
  <!-- 用户消息:纯文本气泡 -->
  <template v-if="role === 'user'">
    <div
      v-for="(part, i) in textParts"
      :key="`u-text-${i}`"
      class="whitespace-pre-wrap"
    >
      {{ part.text }}
    </div>
  </template>

  <!-- 助手消息:过程卡片 → 正文 → 引用轨 -->
  <template v-else>
    <template v-for="entry in processItems" :key="entry.key">
      <details
        v-if="entry.item.kind === 'think'"
        class="proc-think"
        open
      >
        <summary>{{ entry.item.streaming ? '思考中…' : '思考过程' }}</summary>
        <div class="proc-think__body">{{ entry.item.text }}</div>
      </details>

      <div v-else-if="entry.item.kind === 'status'" class="proc-status">
        {{ entry.item.text }}
      </div>

      <details v-else-if="entry.item.kind === 'retrieve'" class="proc-web">
        <summary>
          <IconifyIcon icon="lucide:file-search" />
          <span class="proc-web__label">
            {{ entry.item.items.length ? '已检索可见知识库' : '未检索到你有权限的相关资料' }}
          </span>
          <span v-if="entry.item.query" class="proc-web__q">{{ entry.item.query }}</span>
          <span v-if="entry.item.items.length" class="proc-web__n">{{ entry.item.items.length }}</span>
        </summary>
        <ul v-if="entry.item.items.length" class="proc-web__list">
          <li v-for="hit in entry.item.items" :key="`${hit.documentId}-${hit.index}`">
            [{{ hit.index }}] {{ hit.documentTitle }}{{ hit.heading ? ` / ${hit.heading}` : '' }}
          </li>
        </ul>
      </details>

      <details
        v-else-if="entry.item.kind === 'websearch'"
        class="proc-web"
        :class="{ 'is-pending': entry.item.pending, 'is-failed': entry.item.failed }"
      >
        <summary>
          <IconifyIcon icon="lucide:search" />
          <span class="proc-web__label">
            {{ entry.item.pending ? '正在搜索' : entry.item.failed ? '搜索失败' : '已搜索' }}
          </span>
          <span v-if="entry.item.query" class="proc-web__q">{{ entry.item.query }}</span>
          <span v-if="!entry.item.pending && entry.item.count" class="proc-web__n">
            {{ entry.item.count }}
          </span>
        </summary>
        <div v-if="entry.item.failed" class="proc-web__err">{{ entry.item.error }}</div>
        <ul v-else-if="entry.item.count" class="proc-web__list">
          <li v-for="hit in entry.item.items" :key="hit.url">
            <a :href="hit.url" target="_blank" rel="noreferrer">{{ hit.title }}</a>
          </li>
        </ul>
      </details>

      <a
        v-else-if="entry.item.kind === 'weblink'"
        class="proc-weblink"
        :href="entry.item.url"
        target="_blank"
        rel="noreferrer"
      >
        {{ entry.item.title }}
      </a>
    </template>

    <AnswerMarkdown
      v-for="(part, i) in textParts"
      :key="`text-${i}`"
      :scope="messageId"
      :sources="sources"
      :text="part.text"
      @cite="onCite"
    />

    <SourceCiteList
      v-if="showSources && sources.length"
      :active-index="activeCite"
      :items="sources"
      :scope="messageId"
      @select="onCite"
    />
  </template>
</template>

<style scoped>
.proc-status {
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--primary));
}

.proc-think {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  font-size: 13px;
  color: hsl(var(--foreground) / 0.75);
}

.proc-think summary {
  cursor: pointer;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.proc-think__body {
  margin-top: 6px;
  white-space: pre-wrap;
}

.proc-web {
  margin: 6px 0 10px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.proc-web summary {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.proc-web summary::-webkit-details-marker {
  display: none;
}

.proc-web__label {
  flex-shrink: 0;
}

.proc-web__q {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(var(--foreground) / 0.75);
}

.proc-web__q::before {
  content: '“';
}

.proc-web__q::after {
  content: '”';
}

.proc-web__n {
  flex-shrink: 0;
  opacity: 0.65;
}

.proc-web.is-failed .proc-web__label {
  color: hsl(var(--destructive));
}

.proc-web__err {
  margin: 4px 0 0 22px;
  color: hsl(var(--destructive));
}

.proc-web__list {
  margin: 4px 0 0 22px;
  padding: 0;
  list-style: none;
}

.proc-web__list li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proc-web__list a {
  color: hsl(var(--muted-foreground));
}

.proc-weblink {
  display: inline-block;
  margin: 4px 8px 4px 0;
  font-size: 12px;
  color: hsl(var(--primary));
}
</style>
