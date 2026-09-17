import type { MenuRecordRaw } from '@vben-core/typings';

type MenuGroupMode = 'horizontal' | 'vertical';

function hasMenuGroup(menus: MenuRecordRaw[]) {
  return menus.some((menu) => Boolean(menu.menuGroup));
}

function shouldRenderMenuGroup(
  menus: MenuRecordRaw[],
  index: number,
  mode: MenuGroupMode = 'vertical',
  collapse = false,
) {
  if (mode !== 'vertical' || collapse) {
    return false;
  }

  const menu = menus[index];
  if (!menu) {
    return false;
  }

  return Boolean(
    menu.menuGroup && menu.menuGroup !== menus[index - 1]?.menuGroup,
  );
}

export { hasMenuGroup, shouldRenderMenuGroup };
