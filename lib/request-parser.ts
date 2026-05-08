/**
 * 安全解析请求体 JSON，区分 SyntaxError（400）和其他错误（500）
 *
 * 所有 POST/PUT API Route 应使用此函数替代裸 JSON.parse()，
 * 避免非法请求体导致未捕获 SyntaxError 返回 500 Internal Server Error。
 *
 * @example
 * const body = safeParseJSON(bodyText);
 * if (!body.success) return body.response; // 400 Bad Request
 * const { username } = body.data;
 */
import { NextResponse } from 'next/server';

export function safeParseJSON(bodyText: string): {
  success: true;
  data: any;
} | {
  success: false;
  response: Response;
} {
  try {
    const data = JSON.parse(bodyText);
    return { success: true as const, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false as const,
        response: NextResponse.json(
          { success: false, error: '请求体格式错误', code: 'INVALID_JSON' },
          { status: 400 }
        ),
      };
    }
    // 非 JSON 解析错误，留给外层 catch 处理
    throw error;
  }
}
