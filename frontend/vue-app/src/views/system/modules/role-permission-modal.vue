<script lang="ts" setup>
import { shallowRef, useTemplateRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage, ElTree } from 'element-plus';

import { permissionApi, roleApi } from '#/api';
import type { PermissionNode, RoleItem } from '#/api';
import { ApiError } from '#/api/request';

/** 角色权限授权弹框：展示权限树并保存勾选。 */
defineOptions({ name: 'RolePermissionModal' });

const role = shallowRef<RoleItem | null>(null);
const checkedKeys = shallowRef<string[]>([]);
const permissionTree = shallowRef<PermissionNode[]>([]);
const treeRef = useTemplateRef<InstanceType<typeof ElTree>>('treeRef');
const treeProps = { children: 'children', label: 'permissionName' };

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  async onConfirm() {
    await savePermissions();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<{ role: RoleItem }>();
    role.value = data.role;
    checkedKeys.value = [];
    try {
      const [res, tree] = await Promise.all([
        roleApi.permissions(data.role.id),
        permissionApi.tree(),
      ]);
      permissionTree.value = tree;
      checkedKeys.value = res.permissionIds;
    } catch (error) {
      ElMessage.error(error instanceof ApiError ? error.message : '加载权限失败');
    }
  },
});

async function savePermissions() {
  if (!role.value) return;
  modalApi.lock();
  try {
    const checked = treeRef.value?.getCheckedKeys(false) as string[];
    await roleApi.assignPermissions(role.value.id, checked);
    ElMessage.success('已保存');
    modalApi.close();
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '保存失败');
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal
    class="w-[640px]"
    confirm-text="保存"
    content-class="px-5 py-4"
    :title="role ? `权限：${role.roleName}` : '权限'"
  >
    <ElTree
      ref="treeRef"
      :data="permissionTree"
      :default-checked-keys="checkedKeys"
      node-key="id"
      :props="treeProps"
      show-checkbox
    />
  </Modal>
</template>
