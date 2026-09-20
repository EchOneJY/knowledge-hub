import type { RouteRecordRaw } from 'vue-router';

/**
 * 文档中心。权限映射对照 React 端 App.tsx：list/详情 → document:list。
 * 新建/编辑已改为列表页 VbenModal 弹框（入口按 document:create/document:edit 控制）。
 * 管理员短路见 router/access.ts。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Documents',
    path: '/documents',
    component: () => import('#/views/documents/index.vue'),
    meta: {
      authority: ['document:list'],
      icon: 'lucide:file-text',
      keepAlive: true,
      menuGroup: '文档管理',
      order: -20,
      title: '文档管理',
    },
  },
  {
    name: 'DocumentDetail',
    path: '/documents/:id',
    component: () => import('#/views/documents/detail.vue'),
    meta: {
      authority: ['document:list'],
      hideInMenu: true,
      title: '文档详情',
    },
  },
  {
    name: 'DocumentReviews',
    path: '/documents/reviews',
    component: () => import('#/views/documents/reviews.vue'),
    meta: {
      authority: ['document:review'],
      icon: 'lucide:bell',
      keepAlive: true,
      menuGroup: '文档管理',
      order: -19,
      title: '审核工作台',
    },
  },
];

export default routes;
