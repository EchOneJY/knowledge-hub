<script lang="ts" setup>
import { onMounted, shallowRef, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElButton, ElDatePicker, ElEmpty, ElInput, ElMessage, ElOption, ElSelect } from 'element-plus';

import { graphApi } from '#/api';
import type { GraphOverview, GraphViewNode } from '#/api';
import { ApiError } from '#/api/request';
import { SectionTitle } from '#/components/section-title';
import { formatTime } from '#/utils';
import EntityTypePie from './components/EntityTypePie.vue';
import ForceGraph from './components/ForceGraph.vue';

/** 知识图谱全景：筛选、统计、导出与节点详情。 */
defineOptions({ name: 'Graph' });

const emptyOverview: GraphOverview = {
  edges: [],
  entityTypes: [],
  nodes: [],
  recentNodes: [],
  stats: {
    documentCount: 0,
    edgeCount: 0,
    entityCount: 0,
    entityTypes: [],
    mentionCount: 0,
    nodeCount: 0,
    relatedCount: 0,
    tagCount: 0,
  },
  topEntities: [],
};

const router = useRouter();
const keyword = shallowRef('');
const entityType = shallowRef<string>();
const dateRange = shallowRef<[Date, Date]>();
const data = shallowRef<GraphOverview>(emptyOverview);
const loading = shallowRef(false);
const selected = shallowRef<GraphViewNode | null>(null);
const graphRef = useTemplateRef<InstanceType<typeof ForceGraph>>('graphRef');

async function load(overrides?: {
  entityType?: null | string;
  from?: null | string;
  keyword?: null | string;
  to?: null | string;
}) {
  loading.value = true;
  try {
    data.value = await graphApi.overview({
      docLimit: 24,
      entityType: overrides && 'entityType' in overrides ? overrides.entityType || undefined : entityType.value || undefined,
      from: overrides && 'from' in overrides ? overrides.from || undefined : dateRange.value?.[0]?.toISOString(),
      keyword: overrides && 'keyword' in overrides ? overrides.keyword || undefined : keyword.value.trim() || undefined,
      to: overrides && 'to' in overrides ? overrides.to || undefined : dateRange.value?.[1]?.toISOString(),
    });
    selected.value = null;
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '图谱加载失败');
  } finally {
    loading.value = false;
  }
}

function reset() {
  keyword.value = '';
  entityType.value = undefined;
  dateRange.value = undefined;
  void load({ entityType: null, from: null, keyword: '', to: null });
}

function selectNode(node: GraphViewNode) {
  selected.value = node;
}

const statItems = [
  { key: 'documentCount', label: '文档节点', icon: 'lucide:file-text' },
  { key: 'entityCount', label: '知识点', icon: 'lucide:lightbulb' },
  { key: 'relatedCount', label: '实体关系', icon: 'lucide:git-branch' },
  { key: 'mentionCount', label: '文档提及', icon: 'lucide:at-sign' },
  { key: 'tagCount', label: '当前标签', icon: 'lucide:tags' },
  { key: 'edgeCount', label: '画布边数', icon: 'lucide:spline' },
] as const;

onMounted(() => void load());
</script>

<template>
  <!-- 固定高度：页面不滚动，画布与侧栏各自滚动 -->
  <div class="grid h-[calc(100vh-50px)] grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[1fr_320px]">
    <div class="flex min-h-0 flex-col">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <ElInput v-model="keyword" class="!w-64" clearable placeholder="输入关键词检索你有权限的图谱…" @keydown.enter="load()" />
        <ElSelect v-model="entityType" class="!w-40" clearable placeholder="节点类型" @change="(value?: string) => load({ entityType: value ?? null })">
          <ElOption v-for="type in data.entityTypes" :key="type" :label="type" :value="type" />
        </ElSelect>
        <ElDatePicker
          v-model="dateRange"
          end-placeholder="结束日期"
          start-placeholder="开始日期"
          type="daterange"
          value-format="YYYY-MM-DD"
          @change="(value: unknown) => {
            const range = value as [string, string] | null;
            void load({ from: range?.[0] ?? null, to: range?.[1] ?? null });
          }"
        />
        <ElButton @click="reset">重置</ElButton>
        <ElButton :loading="loading" type="primary" @click="load()">
          <IconifyIcon class="mr-1" icon="lucide:search" />
          检索
        </ElButton>
        <span class="text-muted-foreground hidden text-xs lg:block">仅展示你有权限的文档及其实体</span>
        <ElButton class="ml-auto" @click="graphRef?.exportPng()">
          <IconifyIcon class="mr-1" icon="lucide:download" />
          导出图谱
        </ElButton>
      </div>

      <div class="bg-card relative min-h-0 flex-1 overflow-hidden rounded-lg border">
        <ForceGraph
          v-if="data.nodes.length"
          ref="graphRef"
          :edges="data.edges"
          :nodes="data.nodes"
          @select="selectNode"
        />
        <div v-else class="flex h-full items-center justify-center">
          <ElEmpty description="暂无你有权限的图谱数据。发布文档后会写入 Neo4j。" />
        </div>

        <div class="bg-background/80 pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-md p-2 text-xs">
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#1677ff" />文档</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#52c41a" />知识点</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#fa8c16" />人物</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#13c2c2" />组织</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#722ed1" />标签</span>
        </div>

        <div class="absolute right-3 top-3 flex gap-2">
          <ElButton size="small" @click="graphRef?.zoomIn()">+</ElButton>
          <ElButton size="small" @click="graphRef?.zoomOut()">-</ElButton>
          <ElButton size="small" @click="graphRef?.reset()">复位</ElButton>
          <ElButton size="small" @click="load()">刷新</ElButton>
        </div>
        <div class="text-muted-foreground absolute bottom-3 right-3 text-xs">
          可拖拽节点，滚轮缩放；点击节点查看详情
        </div>
      </div>
    </div>

    <aside class="min-h-0 space-y-3 overflow-y-auto pr-1">
      <div class="bg-card rounded-lg border p-4">
        <SectionTitle icon="lucide:bar-chart-3" title="图谱数据统计" />
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div v-for="item in statItems" :key="item.key" class="rounded-md border p-2">
            <div class="flex items-center gap-2">
              <IconifyIcon :icon="item.icon" class="text-primary text-sm" />
              <span class="text-lg font-semibold">{{ data.stats[item.key] }}</span>
            </div>
            <div class="text-muted-foreground mt-1 text-xs">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <div class="bg-card rounded-lg border p-4">
        <SectionTitle icon="lucide:pie-chart" title="知识点类型分布" />
        <div class="mt-3">
          <EntityTypePie v-if="data.stats.entityTypes.length" :items="data.stats.entityTypes" />
          <ElEmpty v-else description="暂无" />
        </div>
      </div>

      <div class="bg-card rounded-lg border p-4">
        <SectionTitle icon="lucide:flame" title="热门知识点 TOP5" />
        <ol v-if="data.topEntities.length" class="mt-3 space-y-2 pl-0">
          <li v-for="(entity, index) in data.topEntities" :key="entity.name" class="flex items-center gap-2">
            <span class="bg-primary text-primary-foreground h-5 w-5 rounded-full text-center text-xs leading-5">{{ index + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-sm">{{ entity.name }}</span>
            <span class="text-muted-foreground text-xs">{{ entity.degree }}</span>
          </li>
        </ol>
        <ElEmpty v-else description="暂无" />
      </div>

      <div class="bg-card rounded-lg border p-4">
        <SectionTitle icon="lucide:history" title="最近更新节点" />
        <div v-for="node in data.recentNodes" :key="node.id" class="mt-2">
          <div class="truncate text-sm">{{ node.name }}</div>
          <div class="text-muted-foreground text-xs">{{ formatTime(node.updatedAt) }}</div>
        </div>
        <div v-if="!data.recentNodes.length" class="text-muted-foreground mt-2 text-sm">暂无</div>
      </div>

      <div v-if="selected" class="bg-card rounded-lg border p-4">
        <SectionTitle icon="lucide:scan-eye" title="当前节点" />
        <div class="mt-2 text-sm">{{ selected.name }}</div>
        <div class="text-muted-foreground mt-1 text-xs">
          {{ selected.kind === 'document' ? '文档' : selected.kind === 'tag' ? '标签' : selected.type || '知识点' }}
        </div>
        <p v-if="selected.description" class="mt-2 text-sm">{{ selected.description }}</p>
        <ElButton
          v-if="selected.documentId"
          class="mt-2"
          link
          type="primary"
          @click="router.push(`/documents/${selected.documentId}`)"
        >
          打开文档
        </ElButton>
      </div>
    </aside>
  </div>
</template>
