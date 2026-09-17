import { describe, expect, it } from 'vitest';

import { hasAccessByCodes, isReviewer } from '../access';
describe('hasAccessByCodes', () => {
  it('无 authority 要求时放行', () => {
    expect(hasAccessByCodes([], undefined)).toBe(true);
    expect(hasAccessByCodes([], [])).toBe(true);
  });

  it('普通用户命中权限码放行', () => {
    const codes = ['document:list', 'search'];
    expect(hasAccessByCodes(codes, 'document:list')).toBe(true);
    expect(hasAccessByCodes(codes, ['search'])).toBe(true);
  });

  it('普通用户缺少权限码时拒绝', () => {
    expect(hasAccessByCodes(['search'], 'document:list')).toBe(false);
  });

  it('ROLE_ADMIN 短路放行任意权限码（后端不返回菜单码，见权限服务）', () => {
    expect(hasAccessByCodes(['ROLE_ADMIN'], 'profile')).toBe(true);
    expect(hasAccessByCodes(['ROLE_ADMIN'], ['document:review'])).toBe(true);
  });
});

describe('isReviewer', () => {
  it('审核员或管理员为 true，普通用户为 false', () => {
    expect(isReviewer(['ROLE_REVIEWER'])).toBe(true);
    expect(isReviewer(['ROLE_ADMIN'])).toBe(true);
    expect(isReviewer(['ROLE_USER'])).toBe(false);
  });
});
