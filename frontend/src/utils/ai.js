// AI分牌与策略模块

import { VALUES } from "./cardUtils";

// 对牌按点数降序排序
function sortByValueDesc(cards) {
  return cards.slice().sort((a, b) => VALUES.indexOf(b.value) - VALUES.indexOf(a.value));
}

// 简易AI分牌：头道最大3张，中道次大5张，尾道剩余
export function simpleAiSplit(hand) {
  const sorted = sortByValueDesc(hand);
  return [
    sorted.slice(0, 3),
    sorted.slice(3, 8),
    sorted.slice(8, 13)
  ];
}

// 进阶AI分牌（可进一步完善，如自动检测顺子/同花等）
export function advancedAiSplit(hand) {
  // 暂时同 simpleAiSplit，也可扩展更复杂算法
  return simpleAiSplit(hand);
}
