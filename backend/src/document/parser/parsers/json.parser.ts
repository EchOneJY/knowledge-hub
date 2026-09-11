import { BadRequestException } from '@nestjs/common';
import { cleanMarkdown } from '../utils/markdown.util';

/**
 * 将 JSON 文件解析为 Markdown。
 *
 * 先校验必须是合法 JSON，再格式化输出到代码块中，便于后续 Markdown 编辑与检索。
 */
export function parseJson(buffer: Buffer): string {
  // JSON.parse 不接受 UTF-8 BOM，先移除以兼容常见编辑器输出
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');

  try {
    const value = JSON.parse(text) as unknown;
    return cleanMarkdown(`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`JSON 文件格式无效: ${message}`);
  }
}
