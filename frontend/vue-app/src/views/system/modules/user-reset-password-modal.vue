<script lang="ts" setup>
import { shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElInput, ElMessage } from 'element-plus';

import { userApi } from '#/api';
import type { UserVO } from '#/api';
import { ApiError } from '#/api/request';

/** 重置用户密码弹框。 */
defineOptions({ name: 'UserResetPasswordModal' });

const user = shallowRef<UserVO | null>(null);
const newPassword = shallowRef('');

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    resetPassword();
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    user.value = modalApi.getData<{ user: UserVO }>().user;
    newPassword.value = '';
  },
});

async function resetPassword() {
  if (!user.value) return;
  if (newPassword.value.length < 6) {
    ElMessage.warning('新密码至少 6 位');
    return;
  }
  modalApi.lock();
  try {
    await userApi.resetPassword(user.value.id, newPassword.value);
    ElMessage.success('已重置');
    modalApi.close();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '重置失败');
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal
    class="w-[460px]"
    content-class="px-5 py-4"
    :title="user ? `重置 ${user.username} 的密码` : '重置密码'"
  >
    <ElInput v-model="newPassword" placeholder="新密码，至少 6 位" show-password type="password" />
  </Modal>
</template>
