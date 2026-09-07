import { ValueTransformer } from 'typeorm';

/**
 * Postgres BIGINT ↔ JS string
 * 雪花 ID 超过 Number 安全整数范围，必须用字符串，否则会丢精度。
 */
export const bigintTransformer: ValueTransformer = {
  // 写入：原样交给驱动,pg 会把字符串按 bigint 处理
  to: (value: string | null | undefined): string | null | undefined => value,
  // 读出：驱动可能给出 string 或 number,统一转成 string
  from: (
    value: string | number | null | undefined,
  ): string | null | undefined => (value == null ? value : String(value)),
};
