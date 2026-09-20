import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    defaultHomePath: '/chat',
    enableCheckUpdates: false,
    locale: 'zh-CN',
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    companyName: 'Knowledge Hub',
    date: String(new Date().getFullYear()),
  },
  logo: {
    source: `${import.meta.env.BASE_URL}logo.svg`,
    sourceDark: `${import.meta.env.BASE_URL}logo.svg`,
  },
  theme: {
    mode: 'light',
  },
  transition: {
    // Vben 5.7 的 out-in 路由动画在第二次客户端跳转后会保留空节点，先禁用避免页面空白。
    enable: false,
  },
  tabbar: {
    // 开启多标签页以启用 vben 的 keep-alive（全局开关 = tabbar.enable && tabbar.keepAlive）；
    // 具体缓存哪些页面由各路由 meta.keepAlive 控制。
    enable: true,
  },
  widget: {
    languageToggle: false,
    themeToggle: false,
    timezone: false,
  },
});
