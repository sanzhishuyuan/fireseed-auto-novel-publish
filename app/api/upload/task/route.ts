import { NextRequest } from 'next/server';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/task
 * 上传任务提交附件
 * body: multipart/form-data 中的 file 字段
 */
export const POST = withRoute({ auth: 'user' }, async (request: NextRequest, ctx) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_REQUIRED', '请选择要上传的文件', 400);
    }

    // 校验文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('VALIDATION_FILE_TOO_LARGE', '文件大小不能超过 10MB', 400);
    }

    // 校验文件类型
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/x-markdown',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'application/x-zip-compressed',
      'image/jpeg', 'image/png', 'image/webp',
    ];

    // 如果类型不在白名单中但也不是空的，检查扩展名
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ['.md', '.txt', '.pdf', '.doc', '.docx', '.zip', '.jpg', '.jpeg', '.png', '.webp'];

    if (file.type && !allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return apiError('VALIDATION_FILE_TYPE', `不支持的文件类型: ${file.type || ext}`, 400);
    }

    // 确保上传目录存在
    const uploadsDir = path.join(process.cwd(), '.uploads', 'tasks');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 使用 UUID 重命名文件，保留扩展名
    const safeExt = ext || '.bin';
    const savedName = `${uuidv4()}${safeExt}`;
    const filePath = path.join(uploadsDir, savedName);

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // 返回文件信息
    const fileUrl = `/api/upload/task/${savedName}`;

    return apiSuccess({
      url: fileUrl,
      fileName: file.name,
      savedName,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
    });
  } catch (error) {
    console.error('[Upload Task] 上传失败:', error);
    return apiError('UPLOAD_FAILED', '文件上传失败', 500);
  }
});
