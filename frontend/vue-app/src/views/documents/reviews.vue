<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElButton, ElTag } from 'element-plus';

import { documentApi } from '#/api';
import type { ReviewTask } from '#/api';
import type { VbenFormProps, VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { SectionTitle } from '#/components/section-title';
import { formatTime } from '#/utils';
import ReviewActionModal from './modules/review-action-modal.vue';

/** 审核工作台：待审 / 已通过 / 已驳回三类任务。 */
defineOptions({ name: 'DocumentReviews' });

const formOptions: VbenFormProps = {
  collapsed: false,
  commonConfig: { hideLabel: true },
  // 搜索项不足两行，无需展开收起按钮
  showCollapseButton: false,
  schema: [
    {
      component: 'Select',
      componentProps: {
        clearable: false,
        options: [
          { label: '待审', value: 'pending' },
          { label: '已通过', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
        ],
      },
      defaultValue: 'pending',
      fieldName: 'status',
      label: '状态',
    },
  ],
  submitButtonOptions: { content: '搜索' },
  wrapperClass: 'grid-cols-1 md:grid-cols-4',
};

async function queryTasks(
  params: { page?: { currentPage?: number; pageSize?: number } },
  formValues: Record<string, unknown>,
) {
  return await documentApi.reviewTasks({
    page: params.page?.currentPage ?? 1,
    pageSize: params.page?.pageSize ?? 10,
    status: String(formValues.status ?? 'pending'),
  });
}

const gridOptions: VxeTableGridOptions<ReviewTask> = {
  autoResize: true,
  columns: [
    { field: 'documentId', minWidth: 220, slots: { default: 'document' }, title: '文档' },
    { field: 'reviewResult', slots: { default: 'result' }, title: '结果', width: 110 },
    { field: 'reviewComment', minWidth: 220, title: '意见' },
    { field: 'createdAt', formatter: ({ cellValue }) => formatTime(cellValue), title: '提交时间', width: 170 },
    { field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 130 },
  ],
  pagerConfig: { enabled: true, pageSize: 10 },
  proxyConfig: {
    ajax: { query: queryTasks },
    autoLoad: true,
    response: { result: 'items', total: 'total' },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [ReviewGrid, reviewGridApi] = useVbenVxeGrid<ReviewTask>({
  formOptions,
  gridOptions,
});

const [ReviewModal, reviewModalApi] = useVbenModal({
  connectedComponent: ReviewActionModal,
});

function openReview(row: ReviewTask, nextAction: 'approve' | 'reject') {
  reviewModalApi.setData({ action: nextAction, task: row }).open();
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <ReviewGrid>
        <template #table-title>
          <SectionTitle icon="lucide:bell" title="审核工作台" />
        </template>
        <template #document="{ row }">
          <a class="text-primary hover:underline" @click="$router.push(`/documents/${row.documentId}`)">
            {{ row.documentId }}
          </a>
        </template>
        <template #result="{ row }">
          <ElTag v-if="row.reviewResult == null">待审</ElTag>
          <ElTag v-else-if="row.reviewResult === 1" type="success">通过</ElTag>
          <ElTag v-else type="danger">驳回</ElTag>
        </template>
        <template #actions="{ row }">
          <template v-if="row.reviewResult == null">
            <ElButton link type="success" @click="openReview(row, 'approve')">通过</ElButton>
            <ElButton link type="danger" @click="openReview(row, 'reject')">驳回</ElButton>
          </template>
          <span v-else>-</span>
        </template>
      </ReviewGrid>
    </div>

    <ReviewModal @success="reviewGridApi.reload()" />
  </div>
</template>
