<script lang="ts" setup>
import { RouterLink } from 'vue-router';

import type { ChatSource } from '#/api';

import { FileTypeIcon } from '#/components/file-type-icon';

import { citeAnchorId } from '../message-parts';

/**
 * 引用文档横向卡片轨:卡片停在对话里展示用到的块摘录,
 * 「查看原文」才新开文档页,避免点 [n] 冲掉问答。
 * 对照 react-app SourceCiteList.tsx。
 */
defineOptions({ name: 'SourceCiteList' });

const props = defineProps<{
  activeIndex?: null | number;
  items: ChatSource[];
  scope: string;
}>();

const emit = defineEmits<{ select: [index: number] }>();
</script>

<template>
  <div v-if="items.length" class="cite-list">
    <div class="cite-list__title">引用文档 ({{ items.length }})</div>
    <div class="cite-rail">
      <div
        v-for="(source, i) in items"
        :id="citeAnchorId(scope, source.index ?? i + 1)"
        :key="`${source.documentId}-${source.index ?? i + 1}`"
        class="cite"
        :class="{ 'is-active': activeIndex === (source.index ?? i + 1) }"
        @click="emit('select', source.index ?? i + 1)"
      >
        <FileTypeIcon :name="source.documentTitle" :size="28" />
        <div class="cite__body">
          <div class="cite__title" :title="source.documentTitle">
            [{{ source.index ?? i + 1 }}] {{ source.documentTitle }}
          </div>
          <div v-if="source.heading" class="cite__heading" :title="source.heading">
            {{ source.heading }}
          </div>
          <div v-if="source.excerpt" class="cite__meta" :title="source.excerpt">
            {{ source.excerpt }}
          </div>
          <RouterLink
            class="cite__open"
            :to="`/documents/${source.documentId}`"
            target="_blank"
            @click.stop
          >
            查看原文
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cite-list {
  margin-top: 12px;
}

.cite-list__title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.cite-rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 8px;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}

.cite-rail::-webkit-scrollbar {
  height: 4px;
}

.cite-rail::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 2px;
}

.cite {
  display: flex;
  align-items: flex-start;
  flex: 0 0 220px;
  width: 220px;
  min-height: 132px;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: hsl(var(--card));
  color: inherit;
  border: 1px solid hsl(var(--border));
  scroll-snap-align: start;
  scroll-margin-inline: 8px;
  cursor: pointer;
}

.cite__body {
  min-width: 0;
  flex: 1;
}

.cite:hover,
.cite.is-active {
  border-color: hsl(var(--primary));
}

/* flash 类由 focusCite 命中式添加,与 is-active 共用高亮 */
.cite.flash,
.cite.is-active {
  background: hsl(var(--primary) / 0.04);
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.08);
}

.cite__title,
.cite__heading,
.cite__meta {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.cite__title {
  -webkit-line-clamp: 2;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.cite__heading {
  margin-top: 2px;
  -webkit-line-clamp: 1;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.cite__meta {
  margin-top: 4px;
  -webkit-line-clamp: 4;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  line-height: 1.45;
}

.cite__open {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: hsl(var(--primary));
}
</style>
