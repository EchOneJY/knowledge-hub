<script lang="ts" setup>
import { shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElButton,
  ElMessage,
  ElMessageBox,
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

import DocumentEditModal from './modules/document-edit-modal.vue';

/** 文档列表：对照 React 端 DocumentsPage，搜索与分页使用 VXE Grid。 */
defineOptions({ name: 'Documents' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const userId = userStore.userInfo?.userId as undefined | string;

const canCreate = hasAccessByCodes(accessStore.accessCodes, ['document:create']);
const canEdit = hasAccessByCodes(accessStore.accessCodes, ['document:edit']);
const canDelete = hasAccessByCodes(accessStore.accessCodes, ['document:delete']);
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
    { field: 'title', minWidth: 240, slots: { default: 'title' }, title: '标题' },
    { field: 'summary', minWidth: 200, showOverflow: 'tooltip', formatter: ({ cellValue }) => cellValue || '-', title: '摘要' },
    { field: 'fileType', formatter: ({ row }) => fileTypeLabel(row), title: '文件类型', width: 100 },
    { field: 'teamName', formatter: ({ cellValue }) => cellValue || '-', title: '所属团队', width: 140 },
    { field: 'authorName', formatter: ({ cellValue }) => cellValue || '-', title: '作者', width: 120 },
    { field: 'status', slots: { default: 'status' }, title: '状态', width: 100 },
    { field: 'isPublic', slots: { default: 'visibility' }, title: '可见性', width: 110 },
    { field: 'updatedAt', formatter: ({ cellValue }) => formatTime(cellValue), title: '更新时间', width: 170 },
    { align: 'center', field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 160 },
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

// 新建/编辑文档弹框:setData({ id }) 传空为新建,传 id 为编辑
const [DocumentEdit, docEditApi] = useVbenModal({
  connectedComponent: DocumentEditModal,
});

function openCreate() {
  docEditApi.setData({}).open();
}
function openEdit(row: DocumentItem) {
  docEditApi.setData({ id: row.id }).open();
}

function canWrite(row: DocumentItem) {
  return canWriteDocument(accessStore.accessCodes, userId, row);
}

/** 文件类型标签:优先后端持久化字段,历史/手写文档按标题后缀回退 */
function fileTypeLabel(row: DocumentItem) {
  if (row.fileType) return row.fileType.toUpperCase();
  const base = (row.title || '').split(/[/\\]/).pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx <= 0 || idx === base.length - 1) return 'MD';
  return base.slice(idx + 1).toUpperCase();
}

/** 原文件在 RustFS 公开地址:预览新标签打开,下载走 a[download] 兜底 */
function preview(row: DocumentItem) {
  if (row.fileUrl) window.open(row.fileUrl, '_blank');
}
function download(row: DocumentItem) {
  if (!row.fileUrl) return;
  const a = document.createElement('a');
  a.href = row.fileUrl;
  a.download = '';
  a.target = '_blank';
  a.click();
}

async function onUploadParse(option: { file: File }) {
  const form = new FormData();
  form.append('file', option.file);
  uploading.value = true;
  try {
    const res = await documentApi.uploadParse(form);
    ElMessage.success('已解析为草稿，可在弹框中设置公开或团队');
    docEditApi.setData({ id: res.documentId }).open();
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

/** 删除已归档文档：软删除且不可恢复，删除前二次确认 */
async function remove(row: DocumentItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除文档「${row.title}」？此操作不可恢复。`,
      '删除确认',
      { cancelButtonText: '取消', confirmButtonText: '删除', type: 'warning' },
    );
  } catch {
    return; // 用户取消
  }
  try {
    await documentApi.remove(row.id);
    ElMessage.success('已删除');
    await documentGridApi.reload();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '删除失败');
  }
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[var(--vben-content-height)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <DocumentGrid>
        <template #table-title>
          <SectionTitle title="文档管理列表">
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
          <ElButton class="ml-2" type="primary" @click="openCreate()">新建文档</ElButton>
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
          <template v-if="row.fileUrl">
            <ElButton link type="primary" @click="preview(row)">预览</ElButton>
            <ElButton link type="primary" @click="download(row)">下载</ElButton>
          </template>
          <template v-if="canEdit && canWrite(row)">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton v-if="row.status === 0" link type="success" @click="publish(row)">发布</ElButton>
          </template>
          <!-- 仅已归档(status===2)文档可删除:需 delete 权限且为作者/管理员 -->
          <ElButton
            v-if="canDelete && canWrite(row) && row.status === 2"
            link
            type="danger"
            @click="remove(row)"
          >删除</ElButton>
        </template>
      </DocumentGrid>
    </div>
    <DocumentEdit @success="documentGridApi.reload()" />
  </div>
</template>
