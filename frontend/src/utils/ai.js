// AI分牌与策略模块

import { VALUES, SUITS } from "./cardUtils";

// 牌面点数转换
function valueNum(val) {
  if (val === "A") return 14;
  if (val === "K") return 13;
  if (val === "Q") return 12;
  if (val === "J") return 11;
  return Number(val);
}

// 对牌按点数降序排序
function sortByValueDesc(cards) {
  return cards.slice().sort((a, b) => valueNum(b.value) - valueNum(a.value));
}

// 统计点数和花色
function getCounts(hand) {
  const valueCount = {};
  const suitCount = {};
  for (const c of hand) {
    const v = valueNum(c.value);
    valueCount[v] = (valueCount[v] || 0) + 1;
    suitCount[c.suit] = (suitCount[c.suit] || 0) + 1;
  }
  return { valueCount, suitCount };
}

// 检查顺子，返回牌值数组（大到小）或null
function getStraight(cards) {
  let vals = Array.from(new Set(cards.map(c => valueNum(c.value)))).sort((a,b)=>b-a);
  if (vals.length < 5) return null;
  // 特殊A2345
  if (vals[0] === 14 && vals.includes(5) && vals.includes(4) && vals.includes(3) && vals.includes(2)) {
    return [5,4,3,2,14].slice(0,5);
  }
  for (let i = 0; i <= vals.length - 5; ++i) {
    let ok = true;
    for (let j = 1; j < 5; ++j) {
      if (vals[i+j] !== vals[i]+ -j) { ok = false; break; }
    }
    if (ok) return vals.slice(i, i+5);
  }
  return null;
}

// 检查同花，返回花色和相关牌
function getFlush(cards) {
  const { suitCount } = getCounts(cards);
  for (let s in suitCount) {
    if (suitCount[s] >= 5) {
      return cards.filter(c => c.suit === s).sort((a,b)=>valueNum(b.value)-valueNum(a.value)).slice(0,5);
    }
  }
  return null;
}

// 检查同花顺，返回牌数组
function getStraightFlush(cards) {
  const { suitCount } = getCounts(cards);
  for (let s in suitCount) {
    if (suitCount[s] >= 5) {
      const suited = cards.filter(c => c.suit === s);
      const straight = getStraight(suited);
      if (straight) {
        // 找出具体的牌
        let res = [];
        for (let v of straight) {
          let idx = suited.findIndex(c => valueNum(c.value) === v && !res.includes(c));
          if (idx !== -1) res.push(suited[idx]);
        }
        if (res.length === 5) return res;
      }
    }
  }
  return null;
}

// 检查四条，返回四条和单牌
function getFourOfKind(cards) {
  const { valueCount } = getCounts(cards);
  let quad = null, kicker = null;
  for (let v in valueCount) {
    if (valueCount[v] === 4) quad = Number(v);
  }
  if (quad !== null) {
    let quadCards = cards.filter(c => valueNum(c.value) === quad);
    let remain = cards.filter(c => valueNum(c.value) !== quad);
    kicker = sortByValueDesc(remain)[0];
    return [...quadCards, kicker];
  }
  return null;
}

// 检查葫芦，返回三条和一对
function getFullHouse(cards) {
  const { valueCount } = getCounts(cards);
  let triple = null, pair = null;
  for (let v=14; v>=2; --v) {
    if (valueCount[v] >= 3 && triple === null) triple = v;
    else if (valueCount[v] >= 2 && pair === null) pair = v;
  }
  if (triple && pair && triple !== pair) {
    let res = [
      ...cards.filter(c => valueNum(c.value) === triple).slice(0,3),
      ...cards.filter(c => valueNum(c.value) === pair).slice(0,2)
    ];
    return res;
  }
  return null;
}

// 检查三条，返回三条和2单张
function getThreeOfKind(cards) {
  const { valueCount } = getCounts(cards);
  let triple = null;
  for (let v=14; v>=2; --v) {
    if (valueCount[v] >= 3 && triple === null) triple = v;
  }
  if (triple) {
    let res = [
      ...cards.filter(c => valueNum(c.value) === triple).slice(0,3),
      ...sortByValueDesc(cards.filter(c => valueNum(c.value) !== triple)).slice(0,2)
    ];
    return res;
  }
  return null;
}

// 检查两对
function getTwoPair(cards) {
  const { valueCount } = getCounts(cards);
  let pairs = [];
  for (let v=14; v>=2; --v) {
    if (valueCount[v] >= 2) pairs.push(v);
    if (pairs.length === 2) break;
  }
  if (pairs.length === 2) {
    let res = [
      ...cards.filter(c => valueNum(c.value) === pairs[0]).slice(0,2),
      ...cards.filter(c => valueNum(c.value) === pairs[1]).slice(0,2),
      ...sortByValueDesc(cards.filter(c => valueNum(c.value) !== pairs[0] && valueNum(c.value) !== pairs[1])).slice(0,1)
    ];
    return res;
  }
  return null;
}

// 检查一对
function getOnePair(cards) {
  const { valueCount } = getCounts(cards);
  let pair = null;
  for (let v=14; v>=2; --v) {
    if (valueCount[v] >= 2 && pair === null) pair = v;
  }
  if (pair) {
    let res = [
      ...cards.filter(c => valueNum(c.value) === pair).slice(0,2),
      ...sortByValueDesc(cards.filter(c => valueNum(c.value) !== pair)).slice(0,3)
    ];
    return res;
  }
  return null;
}

// 获取最大牌（散牌）
function getHighCards(cards, n=5) {
  return sortByValueDesc(cards).slice(0, n);
}

// --- 新增：全排列分牌 (智能+穷举) ---
// 生成所有可能的[5,5,3]分牌
function* splitHandAllWays(cards) {
  // 13张牌中选5张为尾道
  for (let i = 0; i < (1 << 13); ++i) {
    if (countBits(i) !== 5) continue;
    let tail = [];
    let restIdx = [];
    for (let j = 0; j < 13; ++j) {
      if (i & (1 << j)) tail.push(cards[j]);
      else restIdx.push(j);
    }
    // 剩下8张中选5张为中道
    for (let k = 0; k < (1 << 8); ++k) {
      if (countBits(k) !== 5) continue;
      let mid = [];
      let head = [];
      for (let l = 0; l < 8; ++l) {
        if (k & (1 << l)) mid.push(cards[restIdx[l]]);
        else head.push(cards[restIdx[l]]);
      }
      if (head.length === 3)
        yield [head, mid, tail];
    }
  }
}

// 计算二进制中1的个数
function countBits(x) {
  let cnt = 0;
  while (x) { cnt += x & 1; x >>= 1; }
  return cnt;
}

// 评估单个分牌（简单评估：尾>中>头，且每道牌型越大越好，和牌力分数相关）
function evalSplit([head, mid, tail]) {
  // 牌型权重: 四条9 葫芦8 同花6 顺子5 三条4 两对3 一对2 散牌1
  function getScore(cards) {
    let v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-9
    if (getStraightFlush(cards)) v[9] = 1;
    else if (getFourOfKind(cards)) v[8] = 1;
    else if (getFullHouse(cards)) v[7] = 1;
    else if (getFlush(cards)) v[6] = 1;
    else if (getStraight(cards)) v[5] = 1;
    else if (getThreeOfKind(cards)) v[4] = 1;
    else if (getTwoPair(cards)) v[3] = 1;
    else if (getOnePair(cards)) v[2] = 1;
    else v[1] = 1;
    return v.findIndex(x => x === 1);
  }
  let t = getScore(tail), m = getScore(mid), h = getScore(head);
  // 尾道分权重大于中道，中道大于头道
  return t * 100 + m * 10 + h;
}

// --- AI智能分牌主函数 ---
// 支持“第n种分牌”，用于每次点击变换不同牌型
let aiSplitCache = {};
export function advancedAiSplit(hand, nth = 0) {
  // 缓存（保证同一手牌遍历时不重复大量运算）
  const key = hand.map(c => c.value + c.suit).sort().join(",") + ":" + nth;
  if (aiSplitCache[key]) return aiSplitCache[key];

  // 生成所有合法分牌，并排序
  let allSplits = [];
  let idx = 0;
  for (let split of splitHandAllWays(hand)) {
    // 检查头<=中<=尾
    if (!isLegalOrder(split)) continue;
    allSplits.push(split);
    // 限制最大枚举数量，防止太慢
    if (allSplits.length > 6000) break;
  }
  // 按“最优”优先（评分高的在前）
  allSplits.sort((a, b) => evalSplit(b) - evalSplit(a));
  // 支持变换：取第 nth 种
  let pick = allSplits[nth % allSplits.length] || allSplits[0];
  aiSplitCache[key] = pick;
  return pick;
}

// 判断分牌顺序是否合法（头<=中<=尾）
function isLegalOrder([head, mid, tail]) {
  // 牌型权重: 四条9 葫芦8 同花6 顺子5 三条4 两对3 一对2 散牌1
  function getScore(cards) {
    if (getStraightFlush(cards)) return 9;
    if (getFourOfKind(cards)) return 8;
    if (getFullHouse(cards)) return 7;
    if (getFlush(cards)) return 6;
    if (getStraight(cards)) return 5;
    if (getThreeOfKind(cards)) return 4;
    if (getTwoPair(cards)) return 3;
    if (getOnePair(cards)) return 2;
    return 1;
  }
  let h = getScore(head), m = getScore(mid), t = getScore(tail);
  if (h > m || m > t) return false;
  return true;
}

// 仍保留简单分牌
export function simpleAiSplit(hand) {
  const sorted = sortByValueDesc(hand);
  return [
    sorted.slice(0, 3),
    sorted.slice(3, 8),
    sorted.slice(8, 13)
  ];
}

// AI分牌“变换”接口：每次调用返回不同分牌（最优、次优、再次优...循环）
let splitIndexMap = {};
export function cycleAiSplit(hand, uniqueKey = "default") {
  if (!splitIndexMap[uniqueKey]) splitIndexMap[uniqueKey] = 0;
  const idx = splitIndexMap[uniqueKey];
  const result = advancedAiSplit(hand, idx);
  splitIndexMap[uniqueKey]++;
  return result;
}
