import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { loginApi } from '../core/auth';
import { requestClient } from '../request';

describe('认证接口响应拆包', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('登录接口应返回响应体而非 AxiosResponse', async () => {
    const body = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 7200,
      userInfo: {
        userId: '1',
        username: 'admin',
        roles: ['ROLE_ADMIN'],
        permissions: [],
      },
    };

    requestClient.instance.defaults.adapter = async (config: any): Promise<any> => ({
      config,
      data: body,
      headers: {},
      request: {},
      status: 201,
      statusText: 'Created',
    });

    await expect(
      loginApi({ password: 'password', username: 'admin' }),
    ).resolves.toBe(body);
  });
});
