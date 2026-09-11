import { BadRequestException } from '@nestjs/common';
import { FileParserService } from './file-parser.service';
import type { RustfsService } from '../../storage/rustfs.service';

describe('FileParserService', () => {
  const service = new FileParserService({ isEnabled: () => false } as RustfsService);

  it('支持 JSON 扩展名', () => {
    expect(service.isSupported('json')).toBe(true);
    expect(service.isSupported('JSON')).toBe(true);
    expect(service.supportedList()).toContain('json');
  });

  it('将合法 JSON 格式化为 Markdown 代码块', async () => {
    const result = await service.parse({
      originalname: 'data.json',
      buffer: Buffer.from('{"name":"知识库","tags":["JSON","文档"]}'),
    });

    expect(result).toContain('```json');
    expect(result).toContain('"name": "知识库"');
    expect(result).toContain('"JSON"');
  });

  it('拒绝无效 JSON 并返回业务错误', async () => {
    await expect(
      service.parse({ originalname: 'data.json', buffer: Buffer.from('{invalid') }),
    ).rejects.toThrow(BadRequestException);
  });
});
