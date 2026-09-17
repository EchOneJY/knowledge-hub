<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElButton,
  ElCheckbox,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElUpload,
} from 'element-plus';

import { documentApi } from '#/api';
import type { DocumentItem } from '#/api';
import { ApiError } from '#/api/request';
import { DocStatusTag } from '#/components/doc-status-tag';
import { FileTypeIcon } from '#/components/file-type-icon';
import { DOC_STATUS, formatTime } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

/**
 * 文档列表。对照 React 端 frontend/react-app/src/pages/DocumentsPage.tsx
 */
defineOptions({ name: 'Documents' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();

const canCreate = hasAccessByCodes(accessStore.accessCodes, [
  'document:create',
]);
const canEdit = hasAccessByCodes(accessStore.accessCodes, ['document:edit']);
const userId = userStore.userInfo?.userId as undefined | string;

const filters = reactive<{ mineOnly: boolean; status?: number; title: string }>(
  { mineOnly: false, title: '' },
);
const page = ref(1);
const pageSize = 10;
const total = ref(0);
const items = ref<DocumentItem[]>([]);
const loading = ref(false);
const uploading = ref(false);

const statusOptions = Object.entries(DOC_STATUS).map(([k, v]) => ({
  label: v.label,
  value: Number(k),
}));

/** 作者或管理员可改文档（对照 react-app canWriteDocument） */
function canWriteDocument(doc: { authorId?: null | string }) {
  const codes = accessStore.accessCodes;
  if (codes.includes('ROLE_ADMIN')) return true;
  return Boolean(doc.authorId && doc.authorId === userId);
}

function visibilityMeta(doc: DocumentItem) {
  if (doc.isPublic) return { label: '公开', type: 'success' as const };
  if (doc.teamId) return { label: '团队可见', type: 'primary' as const };
  return { label: '仅自己', type: 'info' as const };
}

async function load(nextPage = page.value) {
  loading.value = true;
  try {
    const res = await documentApi.list({
      authorId: filters.mineOnly ? userId : undefined,
      page: nextPage,
      pageSize,
      status: filters.status,
      title: filters.title.trim() || undefined,
    });
    items.value = res.items;
    total.value = res.total;
    page.value = nextPage;
  } catch (error) {
    ElMessage.error(
      error instanceof ApiError ? error.message : '加载失败',
    );
  } finally {
    loading.value = false;
  }
}

async function onUploadParse(option: { file: File }) {
  const form = new FormData();
  form.append('file', option.file);
  uploading.value = true;
  try {
    const res = await documentApi.uploadParse(form);
    ElMessage.success('已解析为草稿，可在编辑页设置公开或团队');
    await router.push(`/documents/${res.documentId}/edit`);
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '上传失败');
  } finally {
    uploading.value = false;
  }
  // 阻断 el-upload 的默认行为（不自己发请求）
  return false;
}

async function publish(row: DocumentItem) {
  try {
    await documentApi.publish(row.id);
    ElMessage.success('已提交发布');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '发布失败');
  }
}

onMounted(() => {
  void load(1);
});
</script>

<template>
  <div class="p-4">
    <p class="mb-4 text-sm text-muted-foreground">
      列表只展示你能看的文档：公开、所在团队，以及自己写的。编辑 / 发布仅作者或管理员可用。
    </p>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input
        v-model="filters.title"
        placeholder="标题搜索"
        class="bg-background h-8 w-60 rounded-md border px-3 text-sm"
        @keydown.enter="load(1)"
      />
      <ElSelect
        v-model="filters.status"
        placeholder="状态"
        clearable
        class="!w-36"
      >
        <ElOption
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </ElSelect>
      <ElCheckbox v-model="filters.mineOnly">仅我的</ElCheckbox>
      <ElButton @click="load(1)">查询</ElButton>
      <template v-if="canCreate">
        <ElButton
          type="primary"
          @click="router.push('/documents/new')"
        >
          新建文档
        </ElButton>
        <ElUpload
          :show-file-list="false"
          :http-request="onUploadParse as any"
          accept=".md,.txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.json"
        >
          <ElButton :loading="uploading">上传解析</ElButton>
        </ElUpload>
      </template>
    </div>

    <ElTable v-loading="loading" row-key="id" :data="items">
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
      <ElTable.Column label="操作" width="160">
        <template #default="{ row }">
          <template v-if="canEdit && canWriteDocument(row)">
            <a
              class="cursor-pointer text-primary hover:underline"
              @click="router.push(`/documents/${row.id}/edit`)"
            >
              编辑
            </a>
            <a
              v-if="row.status === 0"
              class="ml-3 cursor-pointer text-primary hover:underline"
              @click="publish(row)"
            >
              发布
            </a>
          </template>
        </template>
      </ElTable.Column>
    </ElTable>

    <div class="mt-4 flex justify-end">
      <ElPagination
        layout="total, prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="(p: number) => load(p)"
      />
    </div>
  </div>
</template>
