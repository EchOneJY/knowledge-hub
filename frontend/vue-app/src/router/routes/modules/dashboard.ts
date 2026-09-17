import type { RouteRecordRaw } from 'vue-router';

/**
 * 首页大盘：登录即可见（无 authority）。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:layout-dashboard',
      order: -30,
      title: '首页大盘',
    },
  },
];

export default routes;
