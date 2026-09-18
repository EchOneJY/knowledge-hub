<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { roleApi, userApi } from '#/api';
import { ApiError } from '#/api/request';
import { useVbenForm, z } from '#/adapter/form';

/** 新建用户弹框。表单统一使用 useVbenForm。 */
defineOptions({ name: 'UserCreateModal' });

const emit = defineEmits<{ success: [] }>();

let rolesLoaded = false;

const [Form, formApi] = useVbenForm({
  commonConfig: { labelWidth: 72 },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入用户名' },
      fieldName: 'username',
      label: '用户名',
      rules: z.string().min(1, { message: '请填写用户名' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '至少 6 位', showPassword: true, type: 'password' },
      fieldName: 'password',
      label: '密码',
      rules: z.string().min(6, { message: '密码至少 6 位' }),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入姓名' },
      fieldName: 'realName',
      label: '姓名',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入邮箱' },
      fieldName: 'email',
      label: '邮箱',
    },
    {
      component: 'Select',
      componentProps: { multiple: true, options: [], placeholder: '请选择角色' },
      fieldName: 'roleCodes',
      label: '角色',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  async onConfirm() {
    await createUser();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    formApi.resetForm();
    if (rolesLoaded) return;
    try {
      const rows = await roleApi.list();
      // 角色选项动态注入到 Select schema
      formApi.updateSchema([
        {
          componentProps: {
            multiple: true,
            options: rows.map((role) => ({ label: role.roleName, value: role.roleCode })),
            placeholder: '请选择角色',
          },
          fieldName: 'roleCodes',
        },
      ]);
      rolesLoaded = true;
    } catch {
      // 角色加载失败不阻塞新建，留空即可
    }
  },
});

async function createUser() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const data = await formApi.getValues();
  modalApi.lock();
  try {
    await userApi.create(data as {
      email: string;
      password: string;
      realName: string;
      roleCodes: string[];
      username: string;
    });
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
  <Modal content-class="px-5 py-4" title="新建用户">
    <Form />
  </Modal>
</template>
