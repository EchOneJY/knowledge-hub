<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import {
  ElCard,
  ElCol,
  ElMessage,
  ElRow,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { documentApi, userApi } from '#/api';
import type { DocumentItem, UserStats } from '#/api';
import { hasAccessByCodes } from '#/utils/access';
import { DocStatusTag } from '#/components/doc-status-tag';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { StatCard } from '#/components/stat-card';
import { formatTime } from '#/utils';

/**
 * 首页大盘。对照 React 端 frontend/react-app/src/pages/DashboardPage.tsx
 */
defineOptions({ name: 'Dashboard' });

const router = useRouter();
const accessStore = useAccessStore();

const stats = ref<null | UserStats>(null);
const docs = ref<DocumentItem[]>([]);
const loading = ref(false);

const canListDocuments = hasAccessByCodes(accessStore.accessCodes, [
  'document:list',
]);

/** 可见性标签：公开 / 团队可见 / 仅自己（对照 react-app visibilityMeta） */
function visibilityMeta(doc: DocumentItem) {
  if (doc.isPublic) return { label: '公开', type: 'success' as const };
  if (doc.teamId) return { label: '团队可见', type: 'primary' as const };
  return { label: '仅自己', type: 'info' as const };
}

const quickEntries = [
  {
    authority: 'document:list',
    icon: 'lucide:file-text',
    path: '/documents',
    title: '文档管理',
  },
  {
    authority: 'search',
    icon: 'lucide:search',
    path: '/search',
    title: '文档搜索',
  },
  {
    authority: 'search',
    icon: 'lucide:messages-square',
    path: '/chat',
    title: 'AI 问答',
  },
  {
    authority: 'search',
    icon: 'lucide:share-2',
    path: '/graph',
    title: '知识图谱',
  },
].filter((entry) => hasAccessByCodes(accessStore.accessCodes, [entry.authority]));
onMounted(async () => {
  userApi
    .stats()
    .then((res) => (stats.value = res))
    .catch(() => undefined);
  if (!canListDocuments) return;
  loading.value = true;
  try {
    const res = await documentApi.list({ page: 1, pageSize: 8 });
    docs.value = res.items;
  } catch {
    ElMessage.error('加载最近文档失败');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-4 p-4">
    <ElRow :gutter="16">
      <ElCol :span="6">
        <StatCard icon="lucide:file-text" label="我的文档" :value="stats?.documentCount ?? 0" />
      </ElCol>
      <ElCol :span="6">
        <StatCard icon="lucide:eye" label="浏览合计" tone="purple" :value="stats?.viewCount ?? 0" />
      </ElCol>
      <ElCol :span="6">
        <StatCard icon="lucide:thumbs-up" label="点赞合计" tone="green" :value="stats?.likeCount ?? 0" />
      </ElCol>
      <ElCol :span="6">
        <StatCard icon="lucide:message-circle" label="评论合计" tone="orange" :value="stats?.commentCount ?? 0" />
      </ElCol>
    </ElRow>

    <ElRow :gutter="16">
      <ElCol v-for="entry in quickEntries" :key="entry.path" :span="6">
        <ElCard
          shadow="hover"
          class="group cursor-pointer transition-shadow hover:shadow-md"
          @click="router.push(entry.path)"
        >
          <div class="flex items-center gap-3">
            <span class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <IconifyIcon :icon="entry.icon" class="text-lg" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold">{{ entry.title }}</div>
            </div>
            <IconifyIcon
              class="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
              icon="lucide:chevron-right"
            />
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard shadow="never" v-if="canListDocuments">
      <template #header>
        <SectionTitle icon="lucide:history" title="最近可见文档" />
      </template>
      <ElTable
        v-loading="loading"
        border
        row-key="id"
        :data="docs"
        size="default"
      >
        <ElTableColumn label="标题" min-width="240">
          <template #default="{ row }">
            <a
              class="flex cursor-pointer items-center gap-2 text-primary hover:underline"
              @click="router.push(`/documents/${row.id}`)"
            >
              <FileTypeIcon :name="row.title" />
              {{ row.title }}
            </a>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <DocStatusTag :status="(row as DocumentItem).status" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="可见性" width="110">
          <template #default="{ row }">
            <ElTag :type="visibilityMeta(row as DocumentItem).type">
              {{ visibilityMeta(row as DocumentItem).label }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="更新时间" width="180">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
