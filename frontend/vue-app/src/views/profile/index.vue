<script lang="ts" setup>
import { onMounted, reactive, shallowRef } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import {
  ElButton,
  ElCard,
  ElCol,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElRow,
  ElTag,
} from 'element-plus';

import { teamApi, userApi } from '#/api';
import type { TeamItem, UserStats } from '#/api';
import { ApiError } from '#/api/request';
import { SectionTitle } from '#/components/section-title';
import { StatCard } from '#/components/stat-card';

/** 个人中心：统计、资料维护、密码修改。 */
defineOptions({ name: 'Profile' });

const userStore = useUserStore();
const stats = shallowRef<UserStats | null>(null);
const teams = shallowRef<TeamItem[]>([]);
const savingProfile = shallowRef(false);
const savingPassword = shallowRef(false);

const profileForm = reactive({
  email: String(userStore.userInfo?.email ?? ''),
  realName: String(userStore.userInfo?.realName ?? ''),
});
const passwordForm = reactive({ newPassword: '', oldPassword: '' });

async function saveProfile() {
  savingProfile.value = true;
  try {
    const updated = await userApi.updateMe({
      email: profileForm.email,
      realName: profileForm.realName,
    });
    userStore.setUserInfo({
      ...userStore.userInfo,
      userId: userStore.userInfo?.userId ?? '',
      username: userStore.userInfo?.username ?? '',
      avatar: updated.avatar ?? '',
      email: updated.email ?? '',
      realName: updated.realName ?? updated.username,
    });
    ElMessage.success('已更新');
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '更新失败');
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  if (!passwordForm.oldPassword || passwordForm.newPassword.length < 6) {
    ElMessage.warning('请填写原密码，新密码至少 6 位');
    return;
  }
  savingPassword.value = true;
  try {
    await userApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    ElMessage.success('密码已修改');
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '修改失败');
  } finally {
    savingPassword.value = false;
  }
}

onMounted(() => {
  userApi.stats().then((res) => (stats.value = res)).catch(() => undefined);
  teamApi.mine().then((res) => (teams.value = res)).catch(() => undefined);
});
</script>

<template>
  <div class="flex h-[var(--vben-content-height)] flex-col p-4">
    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto">
    <ElRow :gutter="16">
      <ElCol :span="8">
        <StatCard icon="lucide:file-text" label="我的文档" :value="stats?.documentCount ?? 0" />
      </ElCol>
      <ElCol :span="8">
        <StatCard icon="lucide:eye" label="浏览" tone="purple" :value="stats?.viewCount ?? 0" />
      </ElCol>
      <ElCol :span="8">
        <StatCard icon="lucide:thumbs-up" label="点赞" tone="green" :value="stats?.likeCount ?? 0" />
      </ElCol>
    </ElRow>

    <ElCard shadow="never">
      <template #header>
        <SectionTitle icon="lucide:user-round" title="资料" />
      </template>
      <ElForm class="max-w-md" label-position="top">
        <ElFormItem label="用户名">
          <ElInput :model-value="userStore.userInfo?.username" disabled />
        </ElFormItem>
        <ElFormItem label="所在团队">
          <div v-if="teams.length" class="flex flex-wrap gap-2">
            <ElTag v-for="team in teams" :key="team.id">{{ team.teamName }}</ElTag>
          </div>
          <span v-else class="text-muted-foreground">暂未加入团队</span>
        </ElFormItem>
        <ElFormItem label="姓名">
          <ElInput v-model="profileForm.realName" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="profileForm.email" />
        </ElFormItem>
        <ElButton :loading="savingProfile" type="primary" @click="saveProfile">
          <IconifyIcon class="mr-1" icon="lucide:save" />
          保存资料
        </ElButton>
      </ElForm>
    </ElCard>

    <ElCard shadow="never">
      <template #header>
        <SectionTitle icon="lucide:lock-keyhole" title="修改密码" />
      </template>
      <ElForm class="max-w-md" label-position="top">
        <ElFormItem label="原密码" required>
          <ElInput v-model="passwordForm.oldPassword" show-password type="password" />
        </ElFormItem>
        <ElFormItem label="新密码" required>
          <ElInput v-model="passwordForm.newPassword" show-password type="password" />
        </ElFormItem>
        <ElButton :loading="savingPassword" type="primary" @click="changePassword">
          <IconifyIcon class="mr-1" icon="lucide:key-round" />
          修改密码
        </ElButton>
      </ElForm>
    </ElCard>
    </div>
  </div>
</template>
