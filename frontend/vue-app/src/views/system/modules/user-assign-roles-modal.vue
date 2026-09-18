<script lang="ts" setup>
import { shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage, ElOption, ElSelect } from 'element-plus';

import { roleApi, userApi } from '#/api';
import type { RoleItem, UserVO } from '#/api';
import { ApiError } from '#/api/request';

/** 分配用户角色弹框。 */
defineOptions({ name: 'UserAssignRolesModal' });

const emit = defineEmits<{ success: [] }>();

const user = shallowRef<UserVO | null>(null);
const roleCodes = shallowRef<string[]>([]);
const roles = shallowRef<RoleItem[]>([]);

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    assignRoles();
  },
  onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<{ user: UserVO }>();
    user.value = data.user;
    roleCodes.value = [...(data.user.roleCodes ?? [])];
    if (!roles.value.length) {
      roleApi.list().then((rows) => (roles.value = rows)).catch(() => undefined);
    }
  },
});

async function assignRoles() {
  if (!user.value) return;
  modalApi.lock();
  try {
    await userApi.assignRoles(user.value.id, roleCodes.value);
    ElMessage.success('已保存');
    modalApi.close();
    emit('success');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '保存失败');
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal
    class="w-[460px]"
    confirm-text="保存"
    content-class="px-5 py-4"
    :title="user ? `分配角色：${user.username}` : '分配角色'"
  >
    <ElSelect v-model="roleCodes" class="w-full" multiple>
      <ElOption v-for="role in roles" :key="role.id" :label="role.roleName" :value="role.roleCode" />
    </ElSelect>
  </Modal>
</template>
