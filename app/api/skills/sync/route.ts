import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, verifyAdminToken, ADMIN_PASSWORD } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/skills/sync
 * 从 GitHub/Gitee/ClawHub 提取 SKILL.md 元数据（管理员工具）
 * body: { repo_url: string, repo_type?: string, admin_key?: string }
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const parsed = safeParseJSON(bodyText);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  // 支持 admin_key 直接在body中传入
  const bodyKey = (body.admin_key || '').trim();
  if (!bodyKey || bodyKey !== ADMIN_PASSWORD) {
    const admin = requireAdmin(request, 'skill.manage');
    if (admin instanceof Response) return admin;
  }

  try {
    let repoUrl = (body.repo_url || '').trim();
    const repoType = (body.repo_type || '').trim().toLowerCase();

    if (!repoUrl) {
      return NextResponse.json({ success: false, error: '请输入仓库URL或ClawHub Slug' }, { status: 400 });
    }

    let isClawHub = repoType === 'clawhub' || repoUrl.includes('clawhub.ai');

    // ===== ClawHub 导入 =====
    if (isClawHub) {
      // 从 URL 或直接 slug 提取 slug
      let slug = repoUrl;
      const slugMatch = repoUrl.match(/clawhub\.ai\/(?:skills|publishers\/[^/]+\/skills)\/([^/\s?#]+)/i);
      if (slugMatch) slug = slugMatch[1];
      slug = slug.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
      if (!slug) {
        return NextResponse.json({ success: false, error: '无法识别 ClawHub Slug' }, { status: 400 });
      }

      const CLAWHUB_API = 'https://clawhub.ai/api/v1';

      // 1) 获取技能元数据
      let skillMeta: any;
      try {
        const metaRes = await fetch(`${CLAWHUB_API}/skills/${slug}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!metaRes.ok) {
          return NextResponse.json({ success: false, error: `ClawHub 未找到技能 "${slug}"` }, { status: 404 });
        }
        skillMeta = await metaRes.json();
      } catch {
        return NextResponse.json({ success: false, error: '无法连接 ClawHub API' }, { status: 502 });
      }

      // 2) 获取 SKILL.md 内容
      let chRawContent = '';
      try {
        const fileRes = await fetch(`${CLAWHUB_API}/skills/${slug}/file?path=SKILL.md`, {
          signal: AbortSignal.timeout(10000),
        });
        if (fileRes.ok) chRawContent = await fileRes.text();
      } catch { /* SKILL.md 非必需 */ }

      const s = skillMeta.skill || skillMeta;
      const latestVer = skillMeta.latestVersion || {};
      const meta = s.metadata || {};
      const tags = Array.isArray(meta.tags) ? meta.tags.join(',') : (s.tags ? Object.keys(s.tags).join(',') : '');

      return NextResponse.json({
        success: true,
        repo_url: `https://clawhub.ai/skills/${slug}`,
        repo_path: slug,
        repo_type: 'clawhub',
        metadata: {
          name: slug,
          title: s.displayName || slug,
          description: s.summary || '',
          author: skillMeta.owner?.handle || skillMeta.owner?.displayName || '',
          icon_emoji: '🔌',
          version: latestVer.version || Object.values(s.tags || {})[0] || '',
          tags,
        },
        raw_preview: chRawContent ? chRawContent.slice(0, 500) : '',
      });
    }

    // ===== GitHub / Gitee =====
    // 标准化 URL：提取 owner/repo
    let rawContent = '';
    let usedUrl = '';
    let repoPath = '';
    if (repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)) {
      repoPath = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)![1].replace(/\.git$/, '');
      repoUrl = `https://github.com/${repoPath}`;
    } else if (repoUrl.match(/gitee\.com\/([^/]+\/[^/]+)/)) {
      repoPath = repoUrl.match(/gitee\.com\/([^/]+\/[^/]+)/)![1].replace(/\.git$/, '');
      repoUrl = `https://gitee.com/${repoPath}`;
    } else {
      return NextResponse.json({ success: false, error: '仅支持 GitHub、Gitee 和 ClawHub' }, { status: 400 });
    }

    // 根据仓库类型选择 raw URL 格式
    const isGitee = repoUrl.includes('gitee.com');

    if (isGitee) {
      // Gitee raw URL: https://gitee.com/{owner}/{repo}/raw/{branch}/{file}
      // 注意：Gitee 对无 User-Agent 的请求有限流，必须加标头
      const fetchOpts = { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'FireSeed-Skill-Sync/1.0' } };
      const giteeRawUrls = [
        `https://gitee.com/${repoPath}/raw/main/SKILL.md`,
        `https://gitee.com/${repoPath}/raw/master/SKILL.md`,
        `https://gitee.com/${repoPath}/raw/main/README.md`,
        `https://gitee.com/${repoPath}/raw/master/README.md`,
      ];
      for (const url of giteeRawUrls) {
        try {
          const res = await fetch(url, fetchOpts);
          if (res.ok && res.status === 200) {
            rawContent = await res.text();
            usedUrl = url;
            break;
          }
        } catch { /* try next */ }
      }
    } else {
      // GitHub raw URL: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file}
      const ghRawUrls = [
        `https://raw.githubusercontent.com/${repoPath}/main/SKILL.md`,
        `https://raw.githubusercontent.com/${repoPath}/master/SKILL.md`,
        `https://raw.githubusercontent.com/${repoPath}/main/README.md`,
        `https://raw.githubusercontent.com/${repoPath}/master/README.md`,
      ];
      for (const url of ghRawUrls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (res.ok) {
            rawContent = await res.text();
            usedUrl = url;
            break;
          }
        } catch { /* try next */ }
      }
    }

    if (!rawContent) {
      return NextResponse.json({ success: false, error: '无法获取仓库文件，请确认仓库存在且有 SKILL.md 或 README.md' }, { status: 404 });
    }

    // 解析 frontmatter
    const frontmatter: Record<string, any> = {};
    const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const kv = line.match(/^(\w+):\s*(.+)/);
        if (kv) {
          let val: any = kv[2].trim();
          // 处理数组（trigger 等）
          if (val.startsWith('[') || val === '') {
            // 跳过数组类型，或尝试解析
          }
          frontmatter[kv[1]] = val;
        }
      }
    }

    // 提取描述：frontmatter.description > README 前200字
    let description = frontmatter.description || '';
    if (!description && usedUrl.includes('README')) {
      const body = rawContent.replace(/^---[\s\S]*?---\n*/, '');
      description = body.replace(/#+\s*/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    return NextResponse.json({
      success: true,
      repo_url: repoUrl,
      repo_path: repoPath,
      metadata: {
        name: frontmatter.name || repoPath.split('/')[1] || '',
        title: frontmatter.title || frontmatter.name || repoPath.split('/')[1] || '',
        description: description || '',
        author: frontmatter.author || repoPath.split('/')[0] || '',
        icon_emoji: frontmatter.icon_emoji || '📦',
        version: frontmatter.version || '',
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(',') : (frontmatter.tags || ''),
        trigger: Array.isArray(frontmatter.trigger) ? frontmatter.trigger : [],
      },
      raw_preview: rawContent.slice(0, 500),
    });
  } catch (error) {
    console.error('[Skills Sync] Error:', error);
    return NextResponse.json({ success: false, error: '同步失败' }, { status: 500 });
  }
}
