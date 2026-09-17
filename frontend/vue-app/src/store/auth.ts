/**
 * 登录态 store。对照参考项目 apps/web-admin/src/store/auth.ts，
 * 但适配本仓库后端：/auth/login 返回 accessToken + refreshToken + userInfo。
 */
import type { Recordable } from '@vben/types';

import type { AuthUser } from '#/api';

import { shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import { getUserInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = shallowRef(false);

  /**
   * 异步处理登录操作
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | AuthUser = null;
    try {
      loginLoading.value = true;
      const loginResult = await loginApi({
        password: params.password,
        username: params.username,
      });

      if (loginResult.accessToken) {
        accessStore.setAccessToken(loginResult.accessToken);
        accessStore.setRefreshToken(loginResult.refreshToken);

        userInfo = await fetchUserInfo();

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(preferences.app.defaultHomePath);
        }

        ElNotification({
          message: `${$t('authentication.loginSuccessDesc')}:${displayName(userInfo)}`,
          title: $t('authentication.loginSuccess'),
          type: 'success',
        });
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  /**
   * 清理登录态并返回登录页。
   * @param redirect 是否记录当前地址供登录后回跳
   * @param requestRemoteLogout 会话已失效时传 false，避免退出接口再次触发失效拦截
   */
  async function logout(
    redirect: boolean = true,
    requestRemoteLogout: boolean = true,
  ) {
    if (requestRemoteLogout) {
      try {
        await logoutApi();
      } catch {
        // 远端退出失败不应阻断本地登录态清理（JWT 无状态，丢弃 token 即可）
      }
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    const userInfo = await getUserInfoApi();
    userStore.setUserInfo({
      avatar: userInfo.avatar ?? '',
      // Vben 的 UserInfo 布局字段；本仓库没有工作台描述，给空串
      desc: '',
      homePath: preferences.app.defaultHomePath,
      // 管理员在 UI 层通过 ROLE_ADMIN 短路（见 router/access.ts），codes 里必须含角色
      realName: userInfo.realName ?? userInfo.username,
      roles: userInfo.roles ?? [],
      token: '',
      userId: userInfo.userId,
      username: userInfo.username,
    });
    // 角色码 + 权限码都放进 accessCodes，供 meta.authority 与 v-access 指令判定
    accessStore.setAccessCodes([
      ...(userInfo.roles ?? []),
      ...(userInfo.permissions ?? []),
    ]);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});

function displayName(user: AuthUser | null) {
  if (!user) return '';
  return user.realName?.trim() || user.username;
}
