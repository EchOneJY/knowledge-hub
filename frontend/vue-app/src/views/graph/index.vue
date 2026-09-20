<script lang="ts" setup>
import { onMounted, shallowRef, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { ElButton, ElEmpty, ElMessage } from 'element-plus';

import { graphApi } from '#/api';
import type { GraphOverview, GraphViewNode } from '#/api';
import { useVbenForm } from '#/adapter/form';
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
const data = shallowRef<GraphOverview>(emptyOverview);
const loading = shallowRef(false);
const selected = shallowRef<GraphViewNode | null>(null);
const graphRef = useTemplateRef<InstanceType<typeof ForceGraph>>('graphRef');

// 搜索筛选统一走 useVbenForm(对照 react-app GraphPage 的筛选区)
const [GraphForm, graphFormApi] = useVbenForm({
  // 检索/重置按钮间距收窄
  actionWrapperClass: 'gap-1',
  commonConfig: { hideLabel: true },
  handleReset: onReset,
  handleSubmit: onSearch,
  resetButtonOptions: { content: '重置' },
  schema: [
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '输入关键词检索…' },
      fieldName: 'keyword',
      // 关键词最宽
      formItemClass: 'lg:col-span-2',
    },
    {
      component: 'Select',
      componentProps: { clearable: true, options: [], placeholder: '节点类型' },
      fieldName: 'entityType',
      // 类型选择最窄
      formItemClass: 'lg:col-span-1',
    },
    {
      component: 'DatePicker',
      componentProps: {
        endPlaceholder: '结束日期',
        startPlaceholder: '开始日期',
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'dateRange',
      // 日期范围较宽
      formItemClass: 'lg:col-span-2',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: { content: '检索' },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
});

async function load(filters?: {
  entityType?: null | string;
  from?: null | string;
  keyword?: null | string;
  to?: null | string;
}) {
  loading.value = true;
  try {
    data.value = await graphApi.overview({
      docLimit: 24,
      entityType: filters?.entityType || undefined,
      from: filters?.from || undefined,
      keyword: filters?.keyword || undefined,
      to: filters?.to || undefined,
    });
    selected.value = null;
    // 节点类型选项由后端返回的实体类型动态填充
    graphFormApi.updateSchema([
      {
        componentProps: {
          clearable: true,
          options: data.value.entityTypes.map((type) => ({ label: type, value: type })),
          placeholder: '节点类型',
        },
        fieldName: 'entityType',
      },
    ]);
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '图谱加载失败');
  } finally {
    loading.value = false;
  }
}

async function onSearch(values: Record<string, unknown>) {
  const range = values.dateRange as [string, string] | null | undefined;
  await load({
    entityType: (values.entityType as string) || null,
    from: range?.[0] ?? null,
    keyword: String(values.keyword ?? '').trim() || null,
    to: range?.[1] ?? null,
  });
}

// handleReset 存在时框架不再自动清空,需手动重置表单后重新加载
async function onReset() {
  await graphFormApi.resetForm();
  await load();
}

function selectNode(node: GraphViewNode) {
  selected.value = node;
}

const statItems = [
  { key: 'documentCount', label: '文档节点' },
  { key: 'entityCount', label: '知识点' },
  { key: 'relatedCount', label: '实体关系' },
  { key: 'mentionCount', label: '文档提及' },
  { key: 'tagCount', label: '当前标签' },
  { key: 'edgeCount', label: '画布边数' },
] as const;

onMounted(() => void load());
</script>

<template>
  <!-- 固定高度：页面不滚动，画布与侧栏各自滚动 -->
  <div class="grid h-[var(--vben-content-height)] grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[1fr_320px]">
    <!-- 主面板:工具栏与画布合并为一张卡片,分隔线区隔,对齐 react-app 观感 -->
    <div class="bg-card flex min-h-0 flex-col overflow-hidden rounded-lg border">
      <div class="border-b px-4 pt-4">
        <GraphForm />
      </div>

      <div v-loading="loading" class="bg-muted/30 relative min-h-0 flex-1 overflow-hidden">
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

        <ElButton class="absolute right-4 top-4" @click="graphRef?.exportPng()">
          <IconifyIcon class="mr-1" icon="lucide:download" />
          导出图谱
        </ElButton>

        <div class="bg-background/90 text-muted-foreground pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2 text-xs">
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:#1677ff" />文档</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:#52c41a" />知识点</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:#fa8c16" />人物</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:#13c2c2" />组织</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:#722ed1" />标签</span>
          <span><i class="mr-1 inline-block h-0 w-5 border-t-2 align-middle" style="border-color:#1677ff" />提及</span>
          <span><i class="mr-1 inline-block h-0 w-5 border-t-2 border-dashed align-middle" style="border-color:#8c8c8c" />关联</span>
          <span><i class="mr-1 inline-block h-0 w-5 border-t-2 border-dashed align-middle" style="border-color:#722ed1" />标注</span>
        </div>

        <div class="graph-zoom absolute bottom-4 right-4 flex flex-col items-center gap-2">
          <ElButton circle title="放大" @click="graphRef?.zoomIn()">
            <IconifyIcon class="text-base" icon="lucide:plus" />
          </ElButton>
          <ElButton circle title="缩小" @click="graphRef?.zoomOut()">
            <IconifyIcon class="text-base" icon="lucide:minus" />
          </ElButton>
          <ElButton circle title="复位" @click="graphRef?.reset()">
            <IconifyIcon class="text-base" icon="lucide:shrink" />
          </ElButton>
          <ElButton circle title="刷新" @click="load()">
            <IconifyIcon class="text-base" icon="lucide:refresh-cw" />
          </ElButton>
        </div>
      </div>
    </div>

    <aside class="min-h-0 space-y-4 overflow-y-auto pr-1">
      <div class="bg-card rounded-lg border p-5">
        <SectionTitle title="图谱数据统计" />
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div v-for="item in statItems" :key="item.key" class="bg-muted/40 rounded-lg py-3.5 text-center">
            <div class="text-primary text-xl font-semibold leading-none">{{ data.stats[item.key] }}</div>
            <div class="text-muted-foreground mt-2 text-xs">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <div class="bg-card rounded-lg border p-5">
        <SectionTitle title="知识点类型分布" />
        <div class="mt-4">
          <EntityTypePie v-if="data.stats.entityTypes.length" :items="data.stats.entityTypes" />
          <ElEmpty v-else description="暂无" />
        </div>
      </div>

      <div class="bg-card rounded-lg border p-5">
        <SectionTitle title="热门知识点 TOP5" />
        <ol v-if="data.topEntities.length" class="mt-3 space-y-0.5 pl-0">
          <li
            v-for="(entity, index) in data.topEntities"
            :key="entity.name"
            class="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium"
              :class="index < 3 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'"
            >{{ index + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-sm">{{ entity.name }}</span>
            <span class="text-muted-foreground shrink-0 text-xs tabular-nums">{{ entity.degree }}</span>
          </li>
        </ol>
        <ElEmpty v-else description="暂无" />
      </div>

      <div class="bg-card rounded-lg border p-5">
        <SectionTitle title="最近更新节点" />
        <div v-if="data.recentNodes.length" class="mt-3">
          <div
            v-for="node in data.recentNodes"
            :key="node.id"
            class="border-border/60 border-b py-2.5 last:border-b-0 last:pb-0"
          >
            <div class="truncate text-sm">{{ node.name }}</div>
            <div class="text-muted-foreground mt-1 text-xs">{{ formatTime(node.updatedAt) }}</div>
          </div>
        </div>
        <div v-else class="text-muted-foreground mt-2 text-sm">暂无</div>
      </div>

      <div v-if="selected" class="bg-card rounded-lg border p-5">
        <SectionTitle title="当前节点" />
        <div class="mt-3 text-sm font-medium">{{ selected.name }}</div>
        <span class="bg-muted text-muted-foreground mt-2 inline-block rounded px-2 py-0.5 text-xs">
          {{ selected.kind === 'document' ? '文档' : selected.kind === 'tag' ? '标签' : selected.type || '知识点' }}
        </span>
        <p v-if="selected.description" class="text-muted-foreground mt-3 text-sm leading-relaxed">{{ selected.description }}</p>
        <ElButton
          v-if="selected.documentId"
          class="mt-3"
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

<style scoped>
/* Element Plus 相邻按钮默认 margin-left:12px,竖排缩放控件时会破坏垂直对齐,这里清零 */
.graph-zoom :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
