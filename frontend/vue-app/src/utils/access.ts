/**
 * 权限判定工具：复刻 React 端 frontend/react-app/src/utils.ts 的语义。
 *
 * 后端对 ROLE_ADMIN 展开的 ADMIN_OPERATION_PERMISSIONS 不含菜单码
 * （dashboard/profile），所以前端必须保留「管理员拥有全部权限」的短路判断，
 * 否则 admin 会看不到个人中心等入口。
 */

/** ROLE_ADMIN 直接放行；否则要求 codes 与用户 accessCodes 有交集 */
export function hasAccessByCodes(
  userCodes: string[],
  requiredCodes: string[] | string | undefined,
) {
  if (!requiredCodes || (Array.isArray(requiredCodes) && !requiredCodes.length)) {
    return true;
  }
  const required = Array.isArray(requiredCodes) ? requiredCodes : [requiredCodes];
  if (userCodes.includes('ROLE_ADMIN')) return true;
  return required.some((code) => userCodes.includes(code));
}

export function isAdmin(userCodes: string[]) {
  return userCodes.includes('ROLE_ADMIN');
}

export function isReviewer(userCodes: string[]) {
  return userCodes.includes('ROLE_ADMIN') || userCodes.includes('ROLE_REVIEWER');
}
