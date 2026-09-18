<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { teamApi } from '#/api';
import { ApiError } from '#/api/request';
import { useVbenForm, z } from '#/adapter/form';

/** 新建团队弹框。表单统一使用 useVbenForm。 */
defineOptions({ name: 'TeamCreateModal' });

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  commonConfig: { labelWidth: 72 },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入团队名称' },
      fieldName: 'teamName',
      label: '名称',
      rules: z.string().min(1, { message: '请填写团队名称' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入团队编码' },
      fieldName: 'teamCode',
      label: '编码',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入说明' },
      fieldName: 'description',
      label: '说明',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  async onConfirm() {
    await createTeam();
  },
  onOpenChange(isOpen) {
    if (isOpen) formApi.resetForm();
  },
});

async function createTeam() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const data = await formApi.getValues();
  modalApi.lock();
  try {
    await teamApi.create(data as { description: string; teamCode: string; teamName: string });
    ElMessage.success('已创建');
    modalApi.close();
    emit('success');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '创建失败');
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal content-class="px-5 py-4" title="新建团队">
    <Form />
  </Modal>
</template>
