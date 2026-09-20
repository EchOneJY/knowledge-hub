<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElButton, ElTag } from 'element-plus';

import { userApi } from '#/api';
import type { UserVO } from '#/api';
import type { VbenFormProps, VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { SectionTitle } from '#/components/section-title';
import { formatTime } from '#/utils';
import UserAssignRolesModal from './modules/user-assign-roles-modal.vue';
import UserCreateModal from './modules/user-create-modal.vue';
import UserResetPasswordModal from './modules/user-reset-password-modal.vue';

/** 用户管理：搜索、创建、重置密码、分配角色。 */
defineOptions({ name: 'SystemUsers' });

const formOptions: VbenFormProps = {
  collapsed: false,
  commonConfig: { hideLabel: true },
  // 搜索项不足两行，无需展开收起按钮
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '用户名 / 姓名 / 邮箱' },
      fieldName: 'keyword',
      label: '关键词',
    },
  ],
  submitButtonOptions: { content: '搜索' },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-4',
};

async function queryUsers(
  params: { page?: { currentPage?: number; pageSize?: number } },
  formValues: Record<string, unknown>,
) {
  return await userApi.page({
    keyword: String(formValues.keyword ?? '').trim() || undefined,
    page: params.page?.currentPage ?? 1,
    pageSize: params.page?.pageSize ?? 10,
  });
}

const gridOptions: VxeTableGridOptions<UserVO> = {
  autoResize: true,
  columns: [
    { field: 'username', minWidth: 140, title: '用户名' },
    { field: 'realName', minWidth: 120, title: '姓名' },
    { field: 'email', minWidth: 180, title: '邮箱' },
    { field: 'roleCodes', minWidth: 180, slots: { default: 'roles' }, title: '角色' },
    { field: 'status', slots: { default: 'status' }, title: '状态', width: 90 },
    { field: 'lastLoginAt', formatter: ({ cellValue }) => formatTime(cellValue), title: '最近登录', width: 160 },
    { field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 160 },
  ],
  pagerConfig: { enabled: true, pageSize: 10 },
  proxyConfig: {
    ajax: { query: queryUsers },
    autoLoad: true,
    response: { result: 'items', total: 'total' },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [UserGrid, userGridApi] = useVbenVxeGrid<UserVO>({ formOptions, gridOptions });

const [UserCreate, userCreateApi] = useVbenModal({
  connectedComponent: UserCreateModal,
});
const [UserResetPassword, userResetPasswordApi] = useVbenModal({
  connectedComponent: UserResetPasswordModal,
});
const [UserAssignRoles, userAssignRolesApi] = useVbenModal({
  connectedComponent: UserAssignRolesModal,
});

function openRoles(row: UserVO) {
  userAssignRolesApi.setData({ user: row }).open();
}

function openPassword(row: UserVO) {
  userResetPasswordApi.setData({ user: row }).open();
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[var(--vben-content-height)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <UserGrid>
        <template #table-title>
          <SectionTitle title="用户管理" />
        </template>
        <template #toolbar-tools>
          <ElButton class="mr-2" type="primary" @click="userCreateApi.open()">新建用户</ElButton>
        </template>
        <template #roles="{ row }">
          <ElTag v-for="code in row.roleCodes" :key="code" class="mr-1">{{ code }}</ElTag>
        </template>
        <template #status="{ row }">
          <ElTag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</ElTag>
        </template>
        <template #actions="{ row }">
          <ElButton link type="primary" @click="openPassword(row)">重置密码</ElButton>
          <ElButton link type="primary" @click="openRoles(row)">角色</ElButton>
        </template>
      </UserGrid>
    </div>

    <UserCreate @success="userGridApi.reload()" />
    <UserResetPassword />
    <UserAssignRoles @success="userGridApi.reload()" />
  </div>
</template>
