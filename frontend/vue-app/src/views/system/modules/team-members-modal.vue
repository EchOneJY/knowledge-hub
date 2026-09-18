<script lang="ts" setup>
import { shallowRef } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  ElButton,
  ElMessage,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { teamApi, userApi } from '#/api';
import type { TeamItem, TeamMember } from '#/api';
import { ApiError } from '#/api/request';

/** 团队成员管理弹框：搜索添加、移出成员。 */
defineOptions({ name: 'TeamMembersModal' });

const team = shallowRef<TeamItem | null>(null);
const members = shallowRef<TeamMember[]>([]);
const selectedUserId = shallowRef<string>();
const userOptions = shallowRef<Array<{ label: string; value: string }>>([]);
const searching = shallowRef(false);

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<{ team: TeamItem }>();
    team.value = data.team;
    selectedUserId.value = undefined;
    userOptions.value = [];
    try {
      await loadMembers(data.team.id);
    } catch (error) {
      ElMessage.error(error instanceof ApiError ? error.message : '加载成员失败');
    }
  },
});

async function loadMembers(teamId: string) {
  members.value = await teamApi.members(teamId);
}

async function searchUsers(query: string) {
  const keyword = query.trim();
  if (!keyword) {
    userOptions.value = [];
    return;
  }
  searching.value = true;
  try {
    const res = await userApi.page({ keyword, page: 1, pageSize: 20 });
    const taken = new Set(members.value.map((member) => member.userId));
    userOptions.value = res.items
      .filter((user) => !taken.has(user.id) && user.username.toLowerCase().includes(keyword.toLowerCase()))
      .map((user) => ({
        label: user.realName ? `${user.username}（${user.realName}）` : user.username,
        value: user.id,
      }));
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '搜索用户失败');
  } finally {
    searching.value = false;
  }
}

async function addMember() {
  if (!team.value || !selectedUserId.value) {
    ElMessage.warning('请先搜索并选择成员');
    return;
  }
  try {
    await teamApi.addMembers(team.value.id, [selectedUserId.value]);
    await loadMembers(team.value.id);
    selectedUserId.value = undefined;
    userOptions.value = [];
    ElMessage.success('已添加');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '添加失败');
  }
}

async function removeMember(row: TeamMember) {
  if (!team.value) return;
  try {
    await teamApi.removeMembers(team.value.id, [row.userId]);
    await loadMembers(team.value.id);
    ElMessage.success('已移出');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '移出失败');
  }
}
</script>

<template>
  <Modal
    class="w-[680px]"
    content-class="px-5 py-4"
    :footer="false"
    :title="team ? `成员：${team.teamName}` : '成员'"
  >
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <ElSelect
        v-model="selectedUserId"
        class="!w-80"
        clearable
        filterable
        remote
        :loading="searching"
        placeholder="按用户名搜索"
        :remote-method="searchUsers"
      >
        <ElOption v-for="option in userOptions" :key="option.value" :label="option.label" :value="option.value" />
      </ElSelect>
      <ElButton type="primary" @click="addMember">添加</ElButton>
    </div>
    <ElTable border :data="members" row-key="userId">
      <ElTableColumn label="用户名" prop="username" />
      <ElTableColumn label="姓名" prop="realName" />
      <ElTableColumn label="角色" prop="memberRole" />
      <ElTableColumn label="操作" width="90">
        <template #default="{ row }">
          <ElPopconfirm :title="`确定将 ${row.username} 移出团队？`" @confirm="removeMember(row as TeamMember)">
            <ElButton link type="danger">踢出</ElButton>
          </ElPopconfirm>
        </template>
      </ElTableColumn>
    </ElTable>
  </Modal>
</template>
