<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { roleApi } from '#/api';
import { ApiError } from '#/api/request';
import { useVbenForm, z } from '#/adapter/form';

/** 新建角色弹框。表单统一使用 useVbenForm。 */
defineOptions({ name: 'RoleCreateModal' });

const emit = defineEmits<{ success: [] }>();

const [Form, formApi] = useVbenForm({
  commonConfig: { labelWidth: 72 },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入角色名称' },
      fieldName: 'roleName',
      label: '角色名称',
      rules: z.string().min(1, { message: '请填写角色名称' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入角色编码' },
      fieldName: 'roleCode',
      label: '角色编码',
      rules: z.string().min(1, { message: '请填写角色编码' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入描述', rows: 3, type: 'textarea' },
      fieldName: 'description',
      label: '描述',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  async onConfirm() {
    await createRole();
  },
  onOpenChange(isOpen) {
    if (isOpen) formApi.resetForm();
  },
});

async function createRole() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const data = await formApi.getValues();
  modalApi.lock();
  try {
    await roleApi.create(data as { description: string; roleCode: string; roleName: string });
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
  <Modal content-class="px-5 py-4" title="新建角色">
    <Form />
  </Modal>
</template>
