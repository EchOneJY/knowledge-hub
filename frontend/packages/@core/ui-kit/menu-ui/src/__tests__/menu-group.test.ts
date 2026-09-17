import type { MenuRecordRaw } from '@vben-core/typings';

import { describe, expect, it } from 'vitest';

import { hasMenuGroup, shouldRenderMenuGroup } from '../menu-group';

const groupedMenus: MenuRecordRaw[] = [
  { menuGroup: '业务配置', name: '数据员工配置', path: '/data-employees' },
  { menuGroup: '业务配置', name: '微信群列表', path: '/wechat-groups' },
  { menuGroup: '基础资料', name: '企业与项目', path: '/master-data' },
  { menuGroup: '基础资料', name: 'Skills管理', path: '/skills' },
  { menuGroup: '系统管理', name: '用户与权限', path: '/system/security' },
];

describe('menu-group', () => {
  it('按连续菜单分组各渲染一次标题', () => {
    const groupTitles = groupedMenus
      .map((menu, index) =>
        shouldRenderMenuGroup(groupedMenus, index) ? menu.menuGroup : null,
      )
      .filter((title): title is string => Boolean(title));

    expect(groupTitles).toEqual(['业务配置', '基础资料', '系统管理']);
    expect(hasMenuGroup(groupedMenus)).toBe(true);
  });

  it.each([
    { collapse: true, mode: 'vertical' as const },
    { collapse: false, mode: 'horizontal' as const },
  ])('在 $mode 模式且 collapse=$collapse 时隐藏分组标题', (options) => {
    expect(
      groupedMenus.some((_, index) =>
        shouldRenderMenuGroup(
          groupedMenus,
          index,
          options.mode,
          options.collapse,
        ),
      ),
    ).toBe(false);
  });

  it('未配置分组时保持普通菜单结构', () => {
    const menus: MenuRecordRaw[] = [{ name: '普通菜单', path: '/plain' }];

    expect(hasMenuGroup(menus)).toBe(false);
    expect(shouldRenderMenuGroup(menus, 0)).toBe(false);
  });
});
