/**
 * 用户 / 角色 / 权限 / 团队接口。对照 React 端：frontend/react-app/src/api/index.ts。
 */
import { requestClient } from '#/api/request';

import type { PageResult } from './document';

export interface UserStats {
  documentCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface UserVO {
  id: string;
  username: string;
  email?: null | string;
  realName?: null | string;
  avatar?: null | string;
  status: number;
  lastLoginAt?: null | string;
  createdAt: string;
  updatedAt: string;
  roleCodes: string[];
}

export interface RoleItem {
  id: string;
  roleName: string;
  roleCode: string;
  description?: null | string;
  status?: number;
}

export interface PermissionNode {
  id: string;
  parentId: string;
  permissionName: string;
  permissionCode: string;
  permissionType: number;
  children?: PermissionNode[];
}

export interface TeamItem {
  id: string;
  teamName: string;
  teamCode?: null | string;
  description?: null | string;
  leaderId?: null | string;
  parentId?: string;
  sort?: number;
  status?: number;
  memberCount?: number;
}

export interface TeamTreeNode extends TeamItem {
  children?: TeamTreeNode[];
}

export interface TeamMember {
  userId: string;
  username: string;
  realName?: string;
  memberRole?: string;
}

type Query = Record<string, number | string | undefined>;

function toQueryString(query: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const userApi = {
  stats: () => requestClient.get<UserStats>('/users/me/stats'),
  updateMe: (body: { avatar?: string; email?: string; realName?: string }) =>
    requestClient.put<UserVO>('/users/me', body),
  changePassword: (oldPassword: string, newPassword: string) =>
    requestClient.put<{ message: string }>('/users/password/change', {
      newPassword,
      oldPassword,
    }),
  page: (query: Query) =>
    requestClient.get<PageResult<UserVO>>(`/users/page${toQueryString(query)}`),
  create: (body: Record<string, unknown>) =>
    requestClient.post<UserVO>('/users', body),
  update: (id: string, body: Record<string, unknown>) =>
    requestClient.put<UserVO>(`/users/${id}`, body),
  remove: (id: string) =>
    requestClient.delete<{ message: string }>(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    requestClient.put<{ message: string }>(`/users/${id}/password/reset`, {
      newPassword,
    }),
  getRoles: (id: string) =>
    requestClient.get<{ roleCodes: string[]; userId: string }>(
      `/users/${id}/roles`,
    ),
  assignRoles: (id: string, roleCodes: string[]) =>
    requestClient.put<{ roleCodes: string[]; userId: string }>(
      `/users/${id}/roles`,
      { roleCodes },
    ),
};

export const roleApi = {
  list: () => requestClient.get<RoleItem[]>('/roles/list'),
  create: (body: {
    description?: string;
    roleCode: string;
    roleName: string;
  }) => requestClient.post<RoleItem>('/roles', body),
  update: (id: string, body: Record<string, unknown>) =>
    requestClient.put<RoleItem>(`/roles/${id}`, body),
  remove: (id: string) =>
    requestClient.delete<{ message: string }>(`/roles/${id}`),
  permissions: (id: string) =>
    requestClient.get<{ permissionIds: string[]; roleId: string }>(
      `/roles/${id}/permissions`,
    ),
  assignPermissions: (id: string, permissionIds: string[]) =>
    requestClient.put<{ permissionIds: string[]; roleId: string }>(
      `/roles/${id}/permissions`,
      { permissionIds },
    ),
};

export const permissionApi = {
  tree: () => requestClient.get<PermissionNode[]>('/permissions/tree'),
};

export const teamApi = {
  page: (query: Query) =>
    requestClient.get<PageResult<TeamItem>>(`/teams/page${toQueryString(query)}`),
  tree: () => requestClient.get<TeamTreeNode[]>('/teams/tree'),
  mine: () => requestClient.get<TeamItem[]>('/teams/mine'),
  create: (body: Record<string, unknown>) =>
    requestClient.post<TeamItem>('/teams', body),
  update: (id: string, body: Record<string, unknown>) =>
    requestClient.put<TeamItem>(`/teams/${id}`, body),
  remove: (id: string) =>
    requestClient.delete<{ message: string }>(`/teams/${id}`),
  members: (id: string) => requestClient.get<TeamMember[]>(`/teams/${id}/members`),
  addMembers: (id: string, userIds: string[]) =>
    requestClient.post<unknown>(`/teams/${id}/members`, userIds),
  removeMembers: (id: string, userIds: string[]) =>
    requestClient.delete<unknown>(`/teams/${id}/members`, { data: userIds }),
};
