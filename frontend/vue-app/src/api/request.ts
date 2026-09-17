/**
 * 请求层：基于 @vben/request 的 RequestClient。
 *
 * 与参考项目（dkpc-agent-web）的差异——本仓库后端（NestJS）：
 * - 无全局响应包装，直接返回裸 JSON 对象/数组，靠 HTTP 状态码表意；
 *   因此 responseReturn 用 'body'，并注册 defaultResponseInterceptor 仅剥离 AxiosResponse 包装。
 * - 鉴权头是标准的 Authorization: Bearer <token>，而非自定义 Token 头。
 * - 刷新接口返回 { accessToken, refreshToken, userInfo }，而非纯字符串。
 * - 错误统一转成 ApiError（status + message）抛给页面，由页面提示，
 *   与 React 端 frontend/react-app/src/api/client.ts 行为一致。
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { refreshTokenApi } from './core/auth';

/** 从后端错误体提取 message；ValidationPipe 的 message 可能是字符串数组 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message)) {
    return message.filter((x) => typeof x === 'string').join('；') || fallback;
  }
  return fallback;
}

/** 业务错误类：页面用 instanceof 区分并读取 status（对照 React 端 ApiError） */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(
  baseURL: string,
  options?: RequestClientOptions,
) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /** 重新认证逻辑 */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired.');
    const accessStore = useAccessStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      // 动态 import 避免与 store/auth.ts 的静态依赖成环
      const { useAuthStore } = await import('#/store');
      await useAuthStore().logout(true, false);
    }
  }

  /**
   * 刷新 token：后端返回 { accessToken, refreshToken, userInfo }，
   * 需把两个 token 都写回 accessStore，并返回新 accessToken。
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi(accessStore.refreshToken as string);
    accessStore.setAccessToken(resp.accessToken);
    return resp.accessToken;
  }

  // 请求头：标准 Bearer 鉴权
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      delete config.headers.Authorization;
      if (accessStore.accessToken) {
        config.headers.Authorization = `Bearer ${accessStore.accessToken}`;
      }
      return config;
    },
  });

  // 后端返回裸 JSON；body 模式需要该拦截器剥离 AxiosResponse 包装
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token 过期的处理（401 → 刷新 → 重放）
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken: (token) => (token ? `Bearer ${token}` : null),
    }),
  );

  // 统一转成 ApiError 抛给页面；提示由页面负责（与 React 端一致，避免双重弹窗）
  client.addResponseInterceptor({
    rejected: async (error: any) => {
      const status: number = error?.response?.status ?? 0;
      const message = extractErrorMessage(
        error?.response?.data,
        error?.message || '请求失败',
      );
      throw new ApiError(status, message);
    },
  });

  return client;
}

/** 后端返回裸 JSON；body 模式需要 defaultResponseInterceptor 剥离 AxiosResponse 包装 */
export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'body',
});

/** 不带拦截器的裸客户端：仅用于 /auth/refresh 自身，避免刷新请求递归触发 401 拦截 */
export const baseRequestClient = new RequestClient({ baseURL: apiURL });
