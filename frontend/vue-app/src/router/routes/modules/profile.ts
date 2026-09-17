import type { RouteRecordRaw } from 'vue-router';

/**
 * 个人中心。后端对 ROLE_ADMIN 不返回 profile 菜单码，靠 router/access.ts
 * 的管理员短路放行；普通用户需要 profile 权限码（init.sql 已给 ROLE_USER 种子）。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/profile/index.vue'),
    meta: {
      authority: ['profile'],
      hideInMenu: true,
      title: '个人中心',
    },
  },
];

export default routes;
