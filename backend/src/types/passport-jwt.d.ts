// passport-jwt 无自带类型声明，此处按项目实际用法提供最小声明
declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport-strategy';

  export interface StrategyOptions {
    /** 从请求中提取 JWT 的函数（如 fromAuthHeaderAsBearerToken） */
    jwtFromRequest: (req: unknown) => string | null;
    /** true 时忽略过期时间校验 */
    ignoreExpiration?: boolean;
    /** 校验密钥（对称）或公钥（非对称） */
    secretOrKey: string | Buffer;
    /** 校验算法，默认按密钥类型推断 */
    algorithms?: string[];
    /** 额外的 JWT 校验选项（issuer / audience 等） */
    issuer?: string;
    audience?: string;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify?: (...args: never[]) => void);
    name: string;
    authenticate(req: unknown, options?: unknown): void;
  }

  export const ExtractJwt: {
    /** 从 Authorization: Bearer <token> 头提取 */
    fromAuthHeaderAsBearerToken: () => (req: unknown) => string | null;
    fromAuthHeaderWithScheme: (
      scheme: string,
    ) => (req: unknown) => string | null;
    fromUrlQueryParameter: (name: string) => (req: unknown) => string | null;
    fromBodyField: (name: string) => (req: unknown) => string | null;
    fromExtractors: (
      extractors: Array<(req: unknown) => string | null>,
    ) => (req: unknown) => string | null;
  };
}
