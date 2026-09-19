<script lang="ts" setup>
import { shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElButton,
  ElMessage,
  ElUpload,
} from 'element-plus';

import { documentApi } from '#/api';
import type { DocumentItem } from '#/api';
import { ApiError } from '#/api/request';
import type { VbenFormProps, VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { DocStatusTag } from '#/components/doc-status-tag';
import { FileTypeIcon } from '#/components/file-type-icon';
import { SectionTitle } from '#/components/section-title';
import { DOC_STATUS, canWriteDocument, formatTime, visibilityMeta } from '#/utils';
import { hasAccessByCodes } from '#/utils/access';

/** 文档列表：对照 React 端 DocumentsPage，搜索与分页使用 VXE Grid。 */
defineOptions({ name: 'Documents' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const userId = userStore.userInfo?.userId as undefined | string;

const canCreate = hasAccessByCodes(accessStore.accessCodes, ['document:create']);
const canEdit = hasAccessByCodes(accessStore.accessCodes, ['document:edit']);
const uploading = shallowRef(false);

const formOptions: VbenFormProps = {
  collapsed: false,
  commonConfig: { hideLabel: true },
  resetButtonOptions: { content: '重置' },
  // 搜索项不足两行，无需展开收起按钮
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '标题搜索' },
      fieldName: 'title',
      label: '标题',
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: Object.entries(DOC_STATUS).map(([value, meta]) => ({
          label: meta.label,
          value: Number(value),
        })),
        placeholder: '状态',
      },
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: [
          { label: '全部文档', value: 0 },
          { label: '仅我的', value: 1 },
        ],
        placeholder: '归属',
      },
      defaultValue: 0,
      fieldName: 'mineOnly',
      label: '归属',
    },
  ],
  submitButtonOptions: { content: '搜索' },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-4',
};

async function queryDocuments(
  params: { page?: { currentPage?: number; pageSize?: number } },
  formValues: Record<string, unknown>,
) {
  const mineOnly = Number(formValues.mineOnly ?? 0) === 1;
  const status = formValues.status as number | undefined;
  const title = String(formValues.title ?? '').trim();
  return await documentApi.list({
    authorId: mineOnly ? userId : undefined,
    page: params.page?.currentPage ?? 1,
    pageSize: params.page?.pageSize ?? 10,
    status,
    title: title || undefined,
  });
}

const gridOptions: VxeTableGridOptions<DocumentItem> = {
  autoResize: true,
  columns: [
    { field: 'title', minWidth: 260, slots: { default: 'title' }, title: '标题' },
    { field: 'status', slots: { default: 'status' }, title: '状态', width: 110 },
    { field: 'isPublic', slots: { default: 'visibility' }, title: '可见性', width: 120 },
    { field: 'updatedAt', formatter: ({ cellValue }) => formatTime(cellValue), title: '更新时间', width: 170 },
    { field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 150 },
  ],
  pagerConfig: { enabled: true, pageSize: 10 },
  proxyConfig: {
    ajax: { query: queryDocuments },
    autoLoad: true,
    response: { result: 'items', total: 'total' },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [DocumentGrid, documentGridApi] = useVbenVxeGrid<DocumentItem>({
  formOptions,
  gridOptions,
});

function canWrite(row: DocumentItem) {
  return canWriteDocument(accessStore.accessCodes, userId, row);
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
  return false;
}

async function publish(row: DocumentItem) {
  try {
    await documentApi.publish(row.id);
    ElMessage.success('已提交发布');
    await documentGridApi.reload();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '发布失败');
  }
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <DocumentGrid>
        <template #table-title>
          <SectionTitle title="可见文档">
            <span class="text-muted-foreground ml-1 hidden text-xs font-normal lg:inline">
              只展示你能看的文档：公开、所在团队，以及自己写的；编辑 / 发布仅作者或管理员可用
            </span>
          </SectionTitle>
        </template>
        <template v-if="canCreate" #toolbar-tools>
          <ElUpload
            :show-file-list="false"
            :http-request="onUploadParse as any"
            accept=".md,.txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.json"
            class="ml-2 inline-block"
          >
            <ElButton :loading="uploading">上传解析</ElButton>
          </ElUpload>
          <ElButton class="ml-2" type="primary" @click="router.push('/documents/new')">新建文档</ElButton>
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
        <template #actions="{ row }">
          <template v-if="canEdit && canWrite(row)">
            <ElButton link type="primary" @click="router.push(`/documents/${row.id}/edit`)">编辑</ElButton>
            <ElButton v-if="row.status === 0" link type="success" @click="publish(row)">发布</ElButton>
          </template>
        </template>
      </DocumentGrid>
    </div>
  </div>
</template>
