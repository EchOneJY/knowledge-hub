<script lang="ts" setup>
import { shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElInput, ElMessage } from 'element-plus';

import { documentApi } from '#/api';
import type { ReviewTask } from '#/api';
import { ApiError } from '#/api/request';

/** 审核通过 / 驳回弹框。对照 react-app 审核工作台弹框逻辑。 */
defineOptions({ name: 'ReviewActionModal' });

const emit = defineEmits<{ success: [] }>();

const task = shallowRef<ReviewTask | null>(null);
const action = shallowRef<'approve' | 'reject'>('approve');
const comment = shallowRef('');

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    submitReview();
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    // 打开时从共享数据读取当前行与动作
    const data = modalApi.getData<{ action: 'approve' | 'reject'; task: ReviewTask }>();
    task.value = data.task;
    action.value = data.action;
    comment.value = data.action === 'approve' ? '内容符合规范，准予发布' : '';
  },
});

async function submitReview() {
  const current = task.value;
  if (!current) return;
  if (action.value === 'reject' && !comment.value.trim()) {
    ElMessage.error('驳回必须填写意见');
    return;
  }
  modalApi.lock();
  try {
    if (action.value === 'approve') {
      await documentApi.approve(current.id, comment.value || undefined);
    } else {
      await documentApi.reject(current.id, comment.value.trim());
    }
    ElMessage.success('已提交');
    modalApi.close();
    emit('success');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '操作失败');
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal
    content-class="px-5 py-4"
    :title="action === 'approve' ? '审核通过' : '审核驳回'"
  >
    <ElInput v-model="comment" :rows="3" type="textarea" />
  </Modal>
</template>
