import { NextResponse } from 'next/server';

/**
 * 统一 API 响应工具
 * 遵循 API 升级方案设计：统一 {success, data, error, request_id} 格式
 */

export interface ApiMeta {
  page?: number;
  page_size?: number;
  total?: number;
  has_more?: boolean;
}

/**
 * 成功响应
 */
export function apiSuccess(data: any, meta?: ApiMeta) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
    request_id: crypto.randomUUID().slice(0, 8),
  });
}

/**
 * 错误响应
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      request_id: crypto.randomUUID().slice(0, 8),
      status_code: status,
    },
    { status }
  );
}
