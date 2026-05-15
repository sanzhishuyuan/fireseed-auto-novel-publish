/**
 * lib/markdown-flow.ts
 * MarkdownFlow 集成工具：变量注入 + 交互语法完整解析
 *
 * 完整语法参考：https://markdownflow.ai/docs/specification/interaction
 *
 * 支持的语法：
 *   {{variable}}               → 运行时变量替换
 *   ?[%{{var}} A | B]          → 单选按钮（single select）
 *   ?[%{{var}} A || B || C]   → 多选选项（multi-select）
 *   ?[%{{var}}...输入提示]      → 自由文本输入
 *   ?[%{{var}} A//val1 | B]    → 按钮ID（显示 vs 存储值分离）
 *   ?[Option1 | ...自定义]      → 按钮+输入组合
 *   ===保留内容===              → 多行保留内容块
 */

export interface MarkdownFlowContext {
  reader_name?: string;
  reader_balance?: number;
  novel_title?: string;
  chapter_title?: string;
  chapter_num?: number;
  total_chapters?: number;
  [key: string]: any;
}

export interface InteractiveChoice {
  text: string;
  /** 存储值（有别于显示文本时使用） */
  value?: string;
  branch?: string;
  is_custom?: boolean;
  /** 是否为多选模式 */
  multi?: boolean;
  /** 是否为输入框 */
  input?: boolean;
}

export interface MarkdownFlowParseResult {
  /** 注入变量后的正文 */
  content: string;
  /** 从语法中提取的交互选项 */
  choices: InteractiveChoice[];
  /** 是否含有交互元素 */
  hasInteractions: boolean;
  /** 提取的变量映射 */
  variables: Record<string, string>;
}

/** 解析按钮 ID 语法： "显示文本//存储值" 或纯文本 */
function parseOptionText(raw: string): { display: string; value: string } {
  const trimmed = raw.trim();
  const idx = trimmed.indexOf('//');
  if (idx > 0) {
    return { display: trimmed.slice(0, idx).trim(), value: trimmed.slice(idx + 2).trim() };
  }
  return { display: trimmed, value: trimmed };
}

/**
 * 变量替换：将 {{var}} 替换为上下文中的实际值
 * 未找到的变量保留原样显示
 */
function injectVariables(text: string, context: MarkdownFlowContext): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const val = context[varName];
    if (val === undefined || val === null) return match;
    return String(val);
  });
}

/**
 * 解析完整 MarkdownFlow 交互语法
 * 支持：单选 |、多选 ||、输入 ...、ID //
 */
function extractInteractions(text: string): { text: string; choices: InteractiveChoice[]; variables: Record<string, string> } {
  const choices: InteractiveChoice[] = [];
  const variables: Record<string, string> = {};
  let result = text;
  let choiceIndex = 0;

  // 匹配交互标记： ?[ ... ]
  // 分组：1 = 变量名（可选）, 2 = 内容部分
  const pattern = /\?\[\s*(?:\%\{\{(\w+)\}\})?\s*([^\]]+?)\s*\]/g;

  result = result.replace(pattern, (match, varName, bodyStr: string) => {
    const choiceId = varName || `choice_${choiceIndex++}`;
    const parts: InteractiveChoice[] = [];
    let hasInput = false;

    // 检测是否有输入框（...hint）
    const inputMatch = bodyStr.match(/\.\.\.(.+)/);
    let inputHint = '';
    let buttonsPart = bodyStr;
    if (inputMatch) {
      inputHint = inputMatch[1].trim();
      buttonsPart = bodyStr.slice(0, inputMatch.index).trim();
      hasInput = true;
      parts.push({
        text: inputHint || '输入...',
        value: `__input__${choiceId}`,
        branch: `${choiceId}_input`,
        input: true,
      });
    }

    // 先检测多选（|| 分隔）
    if (buttonsPart.includes('||')) {
      const options = buttonsPart.split('||').map((s: string) => s.trim()).filter((s: string) => s && !s.startsWith('...'));
      options.forEach((opt: string, i: number) => {
        const { display, value } = parseOptionText(opt);
        parts.push({
          text: display,
          value,
          branch: `${choiceId}_${i}`,
          multi: true,
        });
      });
    } else if (buttonsPart.includes('|')) {
      // 单选（| 分隔）
      const options = buttonsPart.split('|').map((s: string) => s.trim()).filter((s: string) => s && !s.startsWith('...'));
      options.forEach((opt: string, i: number) => {
        const { display, value } = parseOptionText(opt);
        parts.push({
          text: display,
          value,
          branch: `${choiceId}_${i}`,
        });
      });
    } else if (!hasInput) {
      // 纯继续按钮
      parts.push({
        text: buttonsPart.trim() || 'Continue',
        value: 'continue',
        branch: `${choiceId}_0`,
      });
    }

    // 记录变量
    if (varName) {
      variables[varName] = parts.map(p => p.value || p.text).join(', ');
    }

    // 合并到全局 choices（去重）
    for (const p of parts) {
      if (!choices.some(c => c.text === p.text && c.branch === p.branch)) {
        choices.push(p);
      }
    }

    // 替换为前端交互组件占位
    return `<div class="markdown-flow-choice" data-choice-id="${choiceId}" data-options='${JSON.stringify(parts)}'></div>`;
  });

  return { text: result, choices, variables };
}

/**
 * 解析保留内容标记 ===text===
 * 支持多行
 */
function extractPreservedBlocks(text: string): string {
  return text.replace(/===([\s\S]+?)===/g, (match, content) => {
    // 保留内容加粗显示（提示读者这些内容被锁定）
    return `**${content.trim()}**`;
  });
}

/**
 * 完整处理管道：变量注入 → 保留内容 → 交互提取
 */
export function processMarkdownFlow(
  content: string,
  context: MarkdownFlowContext = {}
): MarkdownFlowParseResult {
  // 1. 变量注入
  let processed = injectVariables(content, context);

  // 2. 保留内容标记
  processed = extractPreservedBlocks(processed);

  // 3. 提取交互选项
  const { text, choices, variables } = extractInteractions(processed);

  return {
    content: text,
    choices,
    hasInteractions: choices.length > 0,
    variables,
  };
}

/**
 * 从章节正文中解析 MarkdownFlow 语法并返回 choices
 */
export function extractChoicesFromContent(content: string): InteractiveChoice[] {
  const { choices } = processMarkdownFlow(content, {});
  return choices;
}

/**
 * 检测文本是否包含 MarkdownFlow 语法
 */
export function hasMarkdownFlowSyntax(text: string): boolean {
  return /\{\{\w+\}\}/.test(text) || /\?\[/.test(text) || /===.+?===/.test(text);
}
