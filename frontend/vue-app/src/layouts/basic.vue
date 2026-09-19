<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { BasicLayout, LockScreen, UserDropdown } from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';
import { hasAccessByCodes } from '#/utils/access';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const router = useRouter();

/**
 * 头像下拉菜单项。个人中心路由 hideInMenu，只能从这里进入，
 * 权限判定与 react-app AppLayout 的 can(user, 'profile') 一致（admin 短路放行）。
 */
const userMenus = computed(() =>
  hasAccessByCodes(accessStore.accessCodes, ['profile'])
    ? [
        {
          handler: () => router.push('/profile'),
          icon: 'lucide:user-round',
          text: '个人中心',
        },
      ]
    : [],
);

const avatar = computed(() => {
  return (
    (userStore.userInfo?.avatar as undefined | string) ??
    preferences.app.defaultAvatar
  );
});

async function handleLogout() {
  await authStore.logout(false);
}
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus="userMenus"
        :text="userStore.userInfo?.realName"
        description="Knowledge Hub"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
