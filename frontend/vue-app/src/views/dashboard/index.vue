<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ElCard,
  ElCol,
  ElMessage,
  ElRow,
  ElStatistic,
  ElTable,
} from 'element-plus';

import { documentApi, userApi } from '#/api';
import type { DocumentItem, UserStats } from '#/api';
import { hasAccessByCodes } from '#/utils/access';
import { DocStatusTag } from '#/components/doc-status-tag';
import { FileTypeIcon } from '#/components/file-type-icon';
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
        <ElCard shadow="never">
          <ElStatistic title="我的文档" :value="stats?.documentCount ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never">
          <ElStatistic title="浏览合计" :value="stats?.viewCount ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never">
          <ElStatistic title="点赞合计" :value="stats?.likeCount ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="never">
          <ElStatistic title="评论合计" :value="stats?.commentCount ?? 0" />
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16">
      <ElCol v-for="entry in quickEntries" :key="entry.path" :span="6">
        <ElCard
          shadow="hover"
          class="cursor-pointer"
          @click="router.push(entry.path)"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl text-primary">{{ entry.title }}</span>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard shadow="never" v-if="canListDocuments">
      <template #header>
        <h3 class="m-0 text-base font-semibold">最近可见文档</h3>
      </template>
      <ElTable
        v-loading="loading"
        row-key="id"
        :data="docs"
        size="default"
      >
        <ElTable.Column label="标题" min-width="240">
          <template #default="{ row }">
            <a
              class="flex cursor-pointer items-center gap-2 text-primary hover:underline"
              @click="router.push(`/documents/${row.id}`)"
            >
              <FileTypeIcon :name="row.title" />
              {{ row.title }}
            </a>
          </template>
        </ElTable.Column>
        <ElTable.Column label="状态" width="100">
          <template #default="{ row }">
            <DocStatusTag :status="row.status" />
          </template>
        </ElTable.Column>
        <ElTable.Column label="可见性" width="110">
          <template #default="{ row }">
            <ElTag :type="visibilityMeta(row).type">
              {{ visibilityMeta(row).label }}
            </ElTag>
          </template>
        </ElTable.Column>
        <ElTable.Column label="更新时间" width="180">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </ElTable.Column>
      </ElTable>
    </ElCard>
  </div>
</template>
