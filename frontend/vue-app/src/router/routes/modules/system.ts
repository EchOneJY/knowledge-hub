import type { RouteRecordRaw } from 'vue-router';

/**
 * 系统管理。权限映射对照 React 端 App.tsx（isAdmin 判定 + system:* 权限码）。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'SystemUsers',
    path: '/system/users',
    component: () => import('#/views/system/users.vue'),
    meta: {
      authority: ['system:user'],
      icon: 'lucide:user-cog',
      menuGroup: '系统管理',
      order: -15,
      title: '用户管理',
    },
  },
  {
    name: 'SystemRoles',
    path: '/system/roles',
    component: () => import('#/views/system/roles.vue'),
    meta: {
      authority: ['system:role'],
      icon: 'lucide:shield-check',
      menuGroup: '系统管理',
      order: -14,
      title: '角色权限',
    },
  },
  {
    name: 'SystemTeams',
    path: '/system/teams',
    component: () => import('#/views/system/teams.vue'),
    meta: {
      authority: ['system:team'],
      icon: 'lucide:users',
      menuGroup: '系统管理',
      order: -13,
      title: '团队管理',
    },
  },
];

export default routes;
