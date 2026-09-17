/**
 * 认证接口。对照 React 端：frontend/react-app/src/api/index.ts 的 authApi。
 * 后端无响应包装，直接返回裸对象。
 */
import { baseRequestClient, requestClient } from '#/api/request';

import type { AuthUser, LoginResult } from './types';

export async function loginApi(data: { password: string; username: string }) {
  return requestClient.post<LoginResult>('/auth/login', data);
}

/** 供请求层 401 拦截器调用；用 baseRequestClient 避免递归触发拦截 */
export async function refreshTokenApi(refreshToken: string) {
  return baseRequestClient.post<LoginResult>('/auth/refresh', {
    refreshToken,
  });
}

export async function logoutApi() {
  return requestClient.post<{ message: string }>('/auth/logout');
}

export async function getUserInfoApi() {
  return requestClient.get<AuthUser>('/auth/me');
}
