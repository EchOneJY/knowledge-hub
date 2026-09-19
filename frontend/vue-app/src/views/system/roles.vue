<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElButton } from 'element-plus';

import { roleApi } from '#/api';
import type { RoleItem } from '#/api';
import type { VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { SectionTitle } from '#/components/section-title';
import RoleCreateModal from './modules/role-create-modal.vue';
import RolePermissionModal from './modules/role-permission-modal.vue';

/** 角色权限：角色列表与权限树授权。 */
defineOptions({ name: 'SystemRoles' });

async function queryRoles() {
  return { items: await roleApi.list(), total: 0 };
}

const gridOptions: VxeTableGridOptions<RoleItem> = {
  autoResize: true,
  columns: [
    { field: 'roleName', minWidth: 160, title: '角色名称' },
    { field: 'roleCode', minWidth: 160, title: '角色编码' },
    { field: 'description', minWidth: 240, title: '描述' },
    { field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 120 },
  ],
  pagerConfig: { enabled: false },
  proxyConfig: { ajax: { query: queryRoles }, autoLoad: true, response: { result: 'items', total: 'total' } },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [RoleGrid, roleGridApi] = useVbenVxeGrid<RoleItem>({ gridOptions });

const [RoleCreate, roleCreateApi] = useVbenModal({
  connectedComponent: RoleCreateModal,
});
const [RolePermission, rolePermissionApi] = useVbenModal({
  connectedComponent: RolePermissionModal,
});

function openPermissions(row: RoleItem) {
  rolePermissionApi.setData({ role: row }).open();
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <RoleGrid>
        <template #table-title>
          <SectionTitle title="角色权限" />
        </template>
        <template #toolbar-tools>
          <ElButton class="mr-2" type="primary" @click="roleCreateApi.open()">新建角色</ElButton>
        </template>
        <template #actions="{ row }">
          <ElButton link type="primary" @click="openPermissions(row)">权限</ElButton>
        </template>
      </RoleGrid>
    </div>

    <RoleCreate @success="roleGridApi.reload()" />
    <RolePermission />
  </div>
</template>
