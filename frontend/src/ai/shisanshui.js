// 十三水 AI理牌模块
// 后续可不断增强

/**
 * AI智能分牌
 * @param {string[]} cards 13张牌名 ["2_of_spades", ...]
 * @returns {{ head: string[], main: string[], tail: string[] }}
 */
export function aiSplit(cards) {
  // 简单随机算法（头道3张，中道5张，尾道5张）
  if (!Array.isArray(cards) || cards.length !== 13) {
    return { head: [], main: [], tail: [] };
  }
  // TODO: 可替换为更复杂的最大牌力算法
  let shuffled = [...cards].sort(() => Math.random() - 0.5);
  return {
    head: shuffled.slice(0, 3),
    main: shuffled.slice(3, 8),
    tail: shuffled.slice(8, 13)
  };
}

/**
 * 示例：后续可扩展更复杂的理牌接口和算法
 * export function aiSplitStrong(cards) { ... }
 */
