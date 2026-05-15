/**
 * lib/markdown-flow.ts
 * MarkdownFlow 集成工具：变量注入 + 交互语法解析
 *
 * 支持的 MarkdownFlow 语法：
 *   {{variable}}             → 运行时变量替换
 *   ?[%{{var}} A | B | C]   → 读者交互选择
 *   ===保留内容===            → AI 处理时不修改的内容区块
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
  branch?: string;
  is_custom?: boolean;
}

export interface MarkdownFlowParseResult {
  /** 注入变量后的正文 */
  content: string;
  /** 从语法中提取的交互选项 */
  choices: InteractiveChoice[];
  /** 是否含有交互元素 */
  hasInteractions: boolean;
}

/**
 * 变量替换：将 {{var}} 替换为上下文中的实际值
 * 未找到的变量保留原样显示
 */
function injectVariables(text: string, context: MarkdownFlowContext): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const val = context[varName];
    if (val === undefined || val === null) return match; // 保留未找到的变量
    return String(val);
  });
}

/**
 * 提取并渲染交互选择语法
 * ?[%{{var}} 选项1 | 选项2 | 选项3]
 * 
 * 返回替换后的内容和提取的选项列表
 */
function extractInteractions(text: string): { text: string; choices: InteractiveChoice[] } {
  const choices: InteractiveChoice[] = [];
  let result = text;
  let choiceIndex = 0;

  // 匹配所有交互标记： ?[%{{varName}} Option1 | Option2] 或 ?[选项1 | 选项2]
  const pattern = /\?\[\s*(?:\%\{\{(\w+)\}\})?\s*([^\]]+?)\s*\]/g;
  
  result = result.replace(pattern, (match, varName, optionsStr) => {
    // 解析选项
    const optionTexts = optionsStr.split('|').map((s: string) => s.trim()).filter(Boolean);
    const choiceId = varName || `choice_${choiceIndex++}`;
    
    optionTexts.forEach((text: string, i: number) => {
      if (text && !text.startsWith('...')) {
        choices.push({
          text,
          branch: `${choiceId}_${i}`,
        });
      }
    });

    // 返回占位标记，前端渲染时替换为交互组件
    if (choices.length > 0) {
      // If a variable name exists, render an interactive area
      return `<div class="markdown-flow-choice" data-choice-id="${choiceId}" data-options='${JSON.stringify(optionTexts)}'></div>`;
    }
    return match;
  });

  return { text: result, choices };
}

/**
 * 解析保留内容标记 ===text===
 */
function extractPreservedBlocks(text: string): string {
  return text.replace(/===(.+?)===/g, '**$1**');
}

/**
 * 完整处理管道：先注入变量，再提取交互，最后处理保留内容
 * 返回处理后的内容和提取的选项
 */
export function processMarkdownFlow(
  content: string,
  context: MarkdownFlowContext = {}
): MarkdownFlowParseResult {
  // 1. 变量注入
  let processed = injectVariables(content, context);

  // 2. 保留内容标记
  processed = extractPreservedBlocks(processed);

  // 3. 提取交互选项（必须在变量注入之后，以便变量已替换）
  const { text, choices } = extractInteractions(processed);

  // 4. 如果content中已有choices（从数据库），合并它们
  return {
    content: text,
    choices,
    hasInteractions: choices.length > 0,
  };
}

/**
 * 从章节正文中解析 MarkdownFlow 语法并返回 choices
 * 用于在发布 API 中自动将内联语法转为结构化 choices
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
