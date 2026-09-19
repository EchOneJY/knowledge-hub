<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import { documentApi, userApi } from '#/api';
import type { DocumentItem, UserStats } from '#/api';
import type { VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { DocStatusTag } from '#/components/doc-status-tag';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { StatCard } from '#/components/stat-card';
import { formatTime, visibilityMeta } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

/**
 * 首页大盘。对照 React 端 frontend/react-app/src/pages/DashboardPage.tsx
 * 页面整体固定高度不滚动:顶部统计卡固定,底部最近文档表格填满剩余空间、表体内部滚动。
 */
defineOptions({ name: 'Dashboard' });

const router = useRouter();
const accessStore = useAccessStore();

const stats = ref<null | UserStats>(null);

const canListDocuments = hasAccessByCodes(accessStore.accessCodes, [
  'document:list',
]);

const gridOptions: VxeTableGridOptions<DocumentItem> = {
  autoResize: true,
  columns: [
    { field: 'title', minWidth: 260, slots: { default: 'title' }, title: '标题' },
    { field: 'status', slots: { default: 'status' }, title: '状态', width: 110 },
    { field: 'isPublic', slots: { default: 'visibility' }, title: '可见性', width: 120 },
    {
      field: 'updatedAt',
      formatter: ({ cellValue }) => formatTime(cellValue),
      title: '更新时间',
      width: 170,
    },
  ],
  // 仅展示最近文档,无需分页
  pagerConfig: { enabled: false },
  proxyConfig: {
    ajax: { query: async () => documentApi.list({ page: 1, pageSize: 8 }) },
    autoLoad: canListDocuments,
    response: { result: 'items', total: 'total' },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [RecentGrid] = useVbenVxeGrid<DocumentItem>({ gridOptions });

onMounted(() => {
  userApi
    .stats()
    .then((res) => (stats.value = res))
    .catch(() => undefined);
});
</script>

<template>
  <!-- 固定高度:页面不滚动,表格内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col gap-4 p-4">
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard icon="lucide:file-text" label="我的文档" :value="stats?.documentCount ?? 0" />
      <StatCard icon="lucide:eye" label="浏览合计" tone="purple" :value="stats?.viewCount ?? 0" />
      <StatCard icon="lucide:thumbs-up" label="点赞合计" tone="green" :value="stats?.likeCount ?? 0" />
      <StatCard icon="lucide:message-circle" label="评论合计" tone="orange" :value="stats?.commentCount ?? 0" />
    </div>

    <div v-if="canListDocuments" class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <RecentGrid>
        <template #table-title>
          <SectionTitle title="最近可见文档" />
        </template>
        <template #title="{ row }">
          <a class="flex cursor-pointer items-center gap-2 text-primary hover:underline" @click="router.push(`/documents/${row.id}`)">
            <FileTypeIcon :name="row.title" />
            <span>{{ row.title }}</span>
          </a>
        </template>
        <template #status="{ row }">
          <DocStatusTag :status="row.status" />
        </template>
        <template #visibility="{ row }">
          <ElTag :type="visibilityMeta(row).type">{{ visibilityMeta(row).label }}</ElTag>
        </template>
      </RecentGrid>
    </div>
  </div>
</template>
