import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { BasicLayout, IFrameView } from '#/layouts';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 前端静态路由 + meta.authority 过滤。
 * 本仓库后端没有菜单接口；权限码来自 /auth/me（roles + permissions），
 * 由 store/auth.ts 写入 accessStore.accessCodes。
 */
async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    // 没有权限的路由跳转 403 页
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
