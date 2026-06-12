/**
 * 雾隐酒馆 — 骰子引擎
 * 支持标准 TRPG 骰子语法：D20, 2D6, D20+5, 3D8+2, D20>15, D100, 3D6K1, 4D6D1
 */

export interface DiceResult {
  expression: string;
  results: number[];
  total: number;
  modifier: number;
  detail: string;       // 如 "13 (8+5)"
  success?: boolean;
  successThreshold?: number;
}

/**
 * 解析骰子表达式并执行掷骰
 * 支持语法:
 *   D20          → 1个20面骰
 *   2D6          → 2个6面骰之和
 *   D20+5        → D20 + 加值
 *   3D8+2        → 3D8 + 加值
 *   D20>15       → D20 判定 (≥15 成功)
 *   D100         → 百分骰
 *   3D6K1        → 3D6 取最高1个
 *   4D6D1        → 4D6 去掉最低1个
 *   D20+5>15     → D20 + 加值后判定
 */
export function rollDice(input: string): DiceResult {
  const expr = input.trim().toUpperCase();

  // 解析判定阈值 (>N)
  let successThreshold: number | undefined;
  let baseExpr = expr;
  const thresholdMatch = expr.match(/^(.+?)>(\d+)$/);
  if (thresholdMatch) {
    baseExpr = thresholdMatch[1].trim();
    successThreshold = parseInt(thresholdMatch[2], 10);
  }

  // 解析加值 (+N)
  let modifier = 0;
  let diceExpr = baseExpr;
  const modifierMatch = baseExpr.match(/^(.+?)([+-]\d+)$/);
  if (modifierMatch) {
    diceExpr = modifierMatch[1].trim();
    modifier = parseInt(modifierMatch[2], 10);
  }

  // 解析骰子部分 (XdY 或 dY)
  const diceMatch = diceExpr.match(/^(\d+)?[Dd](\d+)$/);
  if (!diceMatch) {
    // 纯数字常量
    const constVal = parseInt(diceExpr, 10);
    if (!isNaN(constVal)) {
      const total = constVal + modifier;
      return {
        expression: input,
        results: [constVal],
        modifier,
        total,
        detail: `${total}`,
        success: successThreshold !== undefined ? total >= successThreshold : undefined,
        successThreshold,
      };
    }
    throw new Error(`无法解析骰子表达式: ${input}`);
  }

  const count = parseInt(diceMatch[1] || '1', 10);
  const sides = parseInt(diceMatch[2], 10);

  if (count < 1 || count > 100) throw new Error(`骰子数量超出范围 (1-100): ${count}`);
  if (sides < 2 || sides > 1000) throw new Error(`骰子面数超出范围 (2-1000): ${sides}`);

  // 掷骰
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  // 应用 K/D 操作
  // 注意: 表达式中的 K/D 已经在前面的步骤中被剥离
  // 我们可以检查原始输入中是否有 K/D
  let finalResults = [...results];
  const keepMatch = expr.match(/(\d+)[Dd]\d+[Kk](\d+)/);
  const dropMatch = expr.match(/(\d+)[Dd]\d+[Dd](\d+)/);

  if (keepMatch && baseExpr.includes('K')) {
    const keepCount = parseInt(keepMatch[2], 10);
    finalResults = results.sort((a, b) => b - a).slice(0, keepCount);
  } else if (dropMatch && baseExpr.includes('D')) {
    const dropCount = parseInt(dropMatch[2], 10);
    finalResults = results.sort((a, b) => a - b).slice(dropCount);
  }

  const sum = finalResults.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  // 格式化详情
  const parts = finalResults.map(String);
  const detail = modifier !== 0
    ? `${total} (${parts.join('+')}${modifier >= 0 ? '+' : ''}${modifier})`
    : `${total} (${parts.join('+')})`;

  return {
    expression: input,
    results: finalResults,
    modifier,
    total,
    detail,
    success: successThreshold !== undefined ? total >= successThreshold : undefined,
    successThreshold,
  };
}

/**
 * 从 AI GM 输出中提取骰子标记并执行
 * 格式: [[D20+5]] 或 [[2D6]] 或 [[D20+5>15]]
 */
export function extractAndRollDice(text: string): { cleanText: string; rolls: DiceResult[] } {
  const pattern = /\[\[([\s\S]*?)\]\]/g;
  const rolls: DiceResult[] = [];
  let match;

  let cleanText = text.replace(pattern, (_, expr) => {
    try {
      const result = rollDice(expr.trim());
      rolls.push(result);
      return `**🎲 ${result.detail}**`;
    } catch {
      return `[${expr}]`;
    }
  });

  return { cleanText, rolls };
}

/**
 * 格式化骰子结果为可读文本
 */
export function formatDiceResult(result: DiceResult): string {
  let output = `🎲 ${result.expression} → **${result.total}**`;
  if (result.results.length > 1) {
    output += ` (${result.results.join(', ')})`;
  }
  if (result.modifier !== 0) {
    output += ` 调整值: ${result.modifier >= 0 ? '+' : ''}${result.modifier}`;
  }
  if (result.success !== undefined) {
    output += result.success ? ' ✅ **成功!**' : ' ❌ **失败!**';
  }
  return output;
}
