// turndown 无自带类型声明，此处按项目实际用法提供最小声明
declare module 'turndown' {
  export interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    codeBlockStyle?: 'indented' | 'fenced';
    bulletListMarker?: '-' | '+' | '*';
    hr?: string;
    emDelimiter?: '_' | '*';
    strongDelimiter?: '**' | '__';
    linkStyle?: 'inlined' | 'referenced';
  }

  /** GFM 等插件插件的通用签名：接收 service 实例注册扩展 */
  type TurndownPlugin = (service: TurndownService) => void;

  export class TurndownService {
    constructor(options?: TurndownOptions);
    /** 注册插件 */
    use(plugin: TurndownPlugin | TurndownPlugin[]): this;
    /** HTML 字符串 → Markdown */
    turndown(input: string): string;
    /** 自定义节点转换规则 */
    addRule(key: string, rule: Record<string, unknown>): this;
    keep(filter: string | string[] | ((node: unknown) => boolean)): this;
    remove(filter: string | string[] | ((node: unknown) => boolean)): this;
  }

  export default TurndownService;
}
