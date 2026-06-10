/**
 * SEO 元数据生成工具
 * 为不同页面生成独立的 title 和 description
 */

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
}

/**
 * 生成首页 metadata
 */
export function getHomeMetadata(): SEOMetadata {
  return {
    title: 'FireSeed - AI 互动小说平台 | 你的选择改写故事结局',
    description: 'AI 智能创作 · 多分支剧情 · 沉浸式互动阅读体验。探索科幻、悬疑、玄幻等品类的 AI 互动小说，每一个选择都将影响故事走向。',
    keywords: ['AI小说', '互动小说', '多分支剧情', 'AI创作', '在线阅读', '火种计划']
  };
}

/**
 * 生成全部作品页 metadata
 */
export function getNovelsListMetadata(): SEOMetadata {
  return {
    title: '全部作品 - FireSeed AI 小说平台',
    description: '浏览 FireSeed 平台上的所有 AI 互动小说作品，涵盖科幻、悬疑、玄幻、仙侠、都市等多个品类。',
    keywords: ['AI小说列表', '互动小说', '小说推荐', '在线阅读']
  };
}

/**
 * 生成小说详情页 metadata
 */
export function getNovelDetailMetadata(novel: { title: string; author: string; description?: string; tags?: string }): SEOMetadata {
  const desc = novel.description || `阅读 ${novel.author} 创作的 AI 互动小说《${novel.title}》，体验多分支剧情的魅力。`;
  const keywords = novel.tags ? novel.tags.split(',').map(t => t.trim()) : [];
  
  return {
    title: `${novel.title} - ${novel.author} | FireSeed`,
    description: desc,
    keywords: [...keywords, 'AI小说', '互动小说', novel.author]
  };
}

/**
 * 生成任务市场页 metadata
 */
export function getTasksMetadata(): SEOMetadata {
  return {
    title: '任务市场 - FireSeed | 发布小说任务，赚取SEED奖励',
    description: '在FireSeed任务市场发布小说创作需求，或接单创作获得SEED奖励。读者和作者的共赢平台，构建完整的创作经济生态。',
    keywords: ['小说任务', '创作任务', 'SEED奖励', '作者接单', '任务市场', '创作经济']
  };
}

/**
 * 生成任务详情页 metadata
 */
export function getTaskDetailMetadata(task: { title: string; budget: number; genre?: string }): SEOMetadata {
  const genreText = task.genre ? `【${task.genre}】` : '';
  return {
    title: `${genreText}${task.title} - ${task.budget} SEED | FireSeed任务`,
    description: `FireSeed任务：${task.title}，预算${task.budget} SEED。立即接单创作，完成任务即可获得SEED奖励。`,
    keywords: [task.title, '小说任务', 'SEED奖励', task.genre || '创作'].filter(Boolean)
  };
}

/**
 * 生成众筹广场页 metadata
 */
export function getCrowdfundingMetadata(): SEOMetadata {
  return {
    title: '众筹广场 - FireSeed | 支持喜爱的创作项目，获得专属权益',
    description: '在FireSeed众筹广场支持你喜爱的小说创作项目，成为早期支持者获得专属权益。多档位回报，限量稀缺，共创优质内容。',
    keywords: ['小说众筹', '创作众筹', 'SEED支持', '众筹广场', '早期支持', '专属权益']
  };
}

/**
 * 生成众筹详情页 metadata
 */
export function getCrowdfundingDetailMetadata(project: { title: string; target_amount: number; author_name?: string }): SEOMetadata {
  return {
    title: `${project.title} - 目标${project.target_amount} SEED | FireSeed众筹`,
    description: `支持《${project.title}》众筹项目${project.author_name ? `（作者：${project.author_name}）` : ''}，目标${project.target_amount} SEED。成为早期支持者，获得专属回报权益。`,
    keywords: [project.title, '小说众筹', 'SEED支持', '早期支持', project.author_name || ''].filter(Boolean)
  };
}

/**
 * 生成我的众筹页 metadata
 */
export function getMyCrowdfundingMetadata(): SEOMetadata {
  return {
    title: '我的众筹 - FireSeed | 管理我发起和支持的众筹项目',
    description: '查看和管理你在FireSeed平台上发起和支持的所有众筹项目，追踪项目进度，领取专属权益。',
    keywords: ['我的众筹', '众筹管理', 'SEED记录', '项目管理']
  };
}

/**
 * 生成章节阅读页 metadata
 */
export function getChapterMetadata(novelTitle: string, chapterTitle: string): SEOMetadata {
  return {
    title: `${chapterTitle} - ${novelTitle} | FireSeed`,
    description: `正在阅读《${novelTitle}》的 ${chapterTitle} 章节，体验 AI 生成的互动剧情。`,
    keywords: [novelTitle, chapterTitle, 'AI小说', '在线阅读']
  };
}

/**
 * 生成会员中心 metadata
 */
export function getVIPMetadata(): SEOMetadata {
  return {
    title: '会员中心 - FireSeed AI 小说平台',
    description: '升级 FireSeed 会员，解锁全部分支剧情、无广告阅读、专属主题等权益。支持 SEED 代币支付。',
    keywords: ['会员', 'VIP', '付费阅读', 'SEED代币']
  };
}

/**
 * 生成社区页 metadata
 */
export function getCommunityMetadata(): SEOMetadata {
  return {
    title: '火种社区 - FireSeed AI 小说平台',
    description: '加入 FireSeed 火种社区，与其他读者和创作者交流互动，分享阅读心得和创作经验。',
    keywords: ['社区', '讨论', '读者交流', '创作分享']
  };
}

/**
 * 生成可信资源页 metadata
 */
export function getResourcesMetadata(): SEOMetadata {
  return {
    title: '可信资源库 - FireSeed AI 创作工具箱',
    description: '精选 AI 创作相关工具和资源，包括大语言模型、AI 写作助手、提示词工程工具等。',
    keywords: ['AI工具', '创作资源', '写作工具', '提示词']
  };
}

/**
 * 生成商机动态页 metadata
 */
export function getOpportunitiesMetadata(): SEOMetadata {
  return {
    title: '商机动态 - FireSeed AI 小说平台',
    description: '获取最新的 AI 创作商机和行业动态，发现创作变现机会。',
    keywords: ['商机', 'AI行业', '创作变现', '动态']
  };
}

/**
 * 生成共创计划页 metadata
 */
export function getPlanMetadata(): SEOMetadata {
  return {
    title: '火种·百人AI作家共创计划 - FireSeed',
    description: '加入火种·百人AI作家共创计划，与100位AI作家一起探索互动叙事的可能性，用AI写小说。',
    keywords: ['共创计划', 'AI作家', '火种计划', '创作招募']
  };
}

/**
 * 生成下载页 metadata
 */
export function getDownloadMetadata(): SEOMetadata {
  return {
    title: '下载 - FireSeed AI 小说平台',
    description: '下载 FireSeed 客户端应用，随时随地阅读 AI 互动小说。',
    keywords: ['下载', '客户端', 'APP']
  };
}

/**
 * 生成反馈页 metadata
 */
export function getFeedbackMetadata(): SEOMetadata {
  return {
    title: '意见反馈 - FireSeed AI 小说平台',
    description: '向 FireSeed 团队提交反馈和建议，帮助我们改进平台体验。',
    keywords: ['反馈', '建议', '客服']
  };
}

/**
 * 生成推广中心 metadata
 */
export function getReferralMetadata(): SEOMetadata {
  return {
    title: '推广中心 - FireSeed AI 小说平台',
    description: '邀请好友加入 FireSeed，获得 SEED 积分奖励。',
    keywords: ['推广', '邀请', 'SEED积分', '奖励']
  };
}

/**
 * 生成技能中心 metadata
 */
export function getSkillsMetadata(): SEOMetadata {
  return {
    title: '技能中心 - FireSeed AI 小说平台',
    description: '浏览和下载 AI 创作技能，提升你的创作能力。',
    keywords: ['技能', 'AI技能', '创作工具']
  };
}

/**
 * 生成 SEED 统计页 metadata
 */
export function getSeedStatsMetadata(): SEOMetadata {
  return {
    title: 'SEED 统计 - FireSeed AI 小说平台',
    description: '查看你的 SEED 积分统计和排行榜。',
    keywords: ['SEED', '积分', '统计', '排行榜']
  };
}

/**
 * 生成个人中心 metadata
 */
export function getProfileMetadata(): SEOMetadata {
  return {
    title: '个人中心 - FireSeed AI 小说平台',
    description: '管理你的 FireSeed 账户、收藏、阅读进度和 SEED 积分。',
    keywords: ['个人中心', '账户管理', '收藏']
  };
}
