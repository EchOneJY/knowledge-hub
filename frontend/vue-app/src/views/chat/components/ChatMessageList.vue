<script lang="ts" setup>
import { computed } from 'vue';

import DOMPurify from 'dompurify';
import { marked } from 'marked';

import type { ChatSource } from '#/api';

/** 聊天消息渲染：支持 Markdown、思考状态和 [n] 引用。 */
defineOptions({ name: 'ChatMessageList' });

marked.use({ breaks: true, gfm: true });

interface DisplayMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
  sources?: ChatSource[] | null;
  status?: string;
}

const props = defineProps<{ messages: DisplayMessage[]; streaming: boolean }>();

function citedSources(message: DisplayMessage) {
  const sources = message.sources ?? [];
  const used = new Set(
    [...message.content.matchAll(/\[(\d+)\]/g)].map((item) => Number(item[1])),
  );
  return used.size ? sources.filter((source) => used.has(source.index)) : [];
}

function renderMarkdown(message: DisplayMessage) {
  return DOMPurify.sanitize(marked.parse(message.content, { async: false }));
}

const hasAssistantMessage = computed(() =>
  props.messages.some((message) => message.role === 'assistant'),
);
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="message in messages"
      :key="message.id"
      class="flex"
      :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[min(860px,88%)] rounded-xl border px-4 py-3"
        :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'"
      >
        <div v-if="message.status" class="text-muted-foreground mb-2 text-xs">
          {{ message.status }}
        </div>
        <div
          v-if="message.role === 'assistant'"
          class="markdown-body"
          v-html="renderMarkdown(message)"
        />
        <p v-else class="m-0 whitespace-pre-wrap">{{ message.content }}</p>

        <div v-if="citedSources(message).length" class="mt-3 space-y-2">
          <div class="text-muted-foreground text-xs font-medium">引用资料</div>
          <div
            v-for="source in citedSources(message)"
            :key="`${message.id}-${source.index}`"
            class="bg-background rounded-md border p-2 text-xs"
          >
            <div class="font-medium">
              [{{ source.index }}] {{ source.documentTitle }}
              <span v-if="source.heading" class="text-muted-foreground">/ {{ source.heading }}</span>
            </div>
            <div class="text-muted-foreground mt-1 line-clamp-3">{{ source.excerpt }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="streaming && !hasAssistantMessage" class="text-muted-foreground text-sm">
      正在生成回答…
    </div>
  </div>
</template>
