<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElButton } from 'element-plus';

import { teamApi } from '#/api';
import type { TeamItem } from '#/api';
import type { VbenFormProps, VxeTableGridOptions } from '#/adapter';
import { useVbenVxeGrid } from '#/adapter';
import { SectionTitle } from '#/components/section-title';
import TeamCreateModal from './modules/team-create-modal.vue';
import TeamMembersModal from './modules/team-members-modal.vue';

/** 团队管理：搜索、创建、成员维护。 */
defineOptions({ name: 'SystemTeams' });

const formOptions: VbenFormProps = {
  collapsed: false,
  commonConfig: { hideLabel: true },
  // 搜索项不足两行，无需展开收起按钮
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      componentProps: { clearable: true, placeholder: '团队名称' },
      fieldName: 'teamName',
      label: '团队名称',
    },
  ],
  submitButtonOptions: { content: '搜索' },
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-4',
};

async function queryTeams(
  params: { page?: { currentPage?: number; pageSize?: number } },
  formValues: Record<string, unknown>,
) {
  return await teamApi.page({
    page: params.page?.currentPage ?? 1,
    pageSize: params.page?.pageSize ?? 10,
    teamName: String(formValues.teamName ?? '').trim() || undefined,
  });
}

const gridOptions: VxeTableGridOptions<TeamItem> = {
  autoResize: true,
  columns: [
    { field: 'teamName', minWidth: 180, title: '名称' },
    { field: 'teamCode', minWidth: 140, title: '编码' },
    { field: 'description', minWidth: 240, title: '说明' },
    { field: 'memberCount', title: '成员数', width: 110 },
    { field: 'actions', fixed: 'right', slots: { default: 'actions' }, title: '操作', width: 110 },
  ],
  pagerConfig: { enabled: true, pageSize: 10 },
  proxyConfig: { ajax: { query: queryTeams }, autoLoad: true, response: { result: 'items', total: 'total' } },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, zoom: true },
};

const [TeamGrid, teamGridApi] = useVbenVxeGrid<TeamItem>({ formOptions, gridOptions });

const [TeamCreate, teamCreateApi] = useVbenModal({
  connectedComponent: TeamCreateModal,
});
const [TeamMembers, teamMembersApi] = useVbenModal({
  connectedComponent: TeamMembersModal,
});

function openMembers(row: TeamItem) {
  teamMembersApi.setData({ team: row }).open();
}
</script>

<template>
  <!-- 固定高度：页面不滚动，表格内部滚动 -->
  <div class="flex h-[calc(100vh-50px)] flex-col p-4">
    <div class="min-h-0 flex-1 overflow-hidden rounded-lg">
      <TeamGrid>
        <template #table-title>
          <SectionTitle icon="lucide:users-round" title="团队管理" />
        </template>
        <template #toolbar-tools>
          <ElButton class="mr-2" type="primary" @click="teamCreateApi.open()">新建团队</ElButton>
        </template>
        <template #actions="{ row }">
          <ElButton link type="primary" @click="openMembers(row)">成员</ElButton>
        </template>
      </TeamGrid>
    </div>

    <TeamCreate @success="teamGridApi.reload()" />
    <TeamMembers />
  </div>
</template>
