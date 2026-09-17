/** 后端返回的登录用户（对照 react-app 的 AuthUser） */
export interface AuthUser {
  userId: string;
  username: string;
  realName?: null | string;
  email?: null | string;
  avatar?: null | string;
  roles: string[];
  permissions: string[];
  teamIds?: string[];
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  userInfo: AuthUser;
}
