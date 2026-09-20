import { clearAuth, getAccessToken, getRefreshToken, setAuth } from '../auth'
import type { AuthUser } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback
  const message = (body as { message?: unknown }).message
  if (typeof message === 'string') return message
  if (Array.isArray(message)) return message.filter((x) => typeof x === 'string').join('；')
  return fallback
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const data = (await res.json()) as {
          accessToken: string
          refreshToken: string
          userInfo: AuthUser
        }
        setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.userInfo,
        })
        return true
      } catch {
        return false
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers)
  const isForm = init.body instanceof FormData
  if (!isForm && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    const ok = await tryRefresh()
    if (ok) return request<T>(path, init, false)
    clearAuth()
    throw new ApiError(401, '未登录或登录已过期')
  }

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data, res.statusText || '请求失败'))
  }
  return data as T
}

export function get<T>(path: string) {
  return request<T>(path)
}

/** 带鉴权拉取二进制（文件下载/预览）；复用 401 刷新逻辑，返回 Blob */
export async function getBlob(path: string, retry = true): Promise<Blob> {
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { headers })

  if (res.status === 401 && retry) {
    const ok = await tryRefresh()
    if (ok) return getBlob(path, false)
    clearAuth()
    throw new ApiError(401, '未登录或登录已过期')
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || '文件下载失败')
  }
  return res.blob()
}

export function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function put<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function del<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'DELETE',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
