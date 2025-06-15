// AI分牌与策略模块（增强智能版，含健壮性校验）

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

// 检查分牌是否合法且无重复/遗漏
function isLegalSplitResult(split, srcHand) {
  if (!Array.isArray(split) || split.length !== 3) return false;
  if (split[0].length !== 3 || split[1].length !== 5 || split[2].length !== 5) return false;
  const all = [...split[0], ...split[1], ...split[2]];
  if (all.length !== 13) return false;
  // 检查是否有重复
  const seen = {};
  for (const c of all) {
    const k = c.value + "_" + c.suit;
    if (seen[k]) return false;
    seen[k] = 1;
  }
  // 检查是否和原始手牌完全一致
  if (srcHand) {
    const srcKeys = srcHand.map(c => c.value + "_" + c.suit).sort();
    const allKeys = all.map(c => c.value + "_" + c.suit).sort();
    for (let i = 0; i < 13; ++i) if (srcKeys[i] !== allKeys[i]) return false;
  }
  return true;
}

// --- 增强AI分牌：优先大牌道，合理分配头道 ---
// 优先保证尾道为最大牌型（如同花顺、炸弹、葫芦、同花、顺子等），头道尽量大一对或散牌，避免头道被鸡蛋。
function enhancedAiSplit(hand) {
  let remain = hand.slice();
  // 1. 优先取同花顺
  let straightFlush = getStraightFlush(remain);
  if (straightFlush) {
    remain = remain.filter(c => !straightFlush.includes(c));
    // 再取尾道最大，头道最大
    let tail = straightFlush;
    let mid = getHighCards(remain, 5);
    let head = getHighCards(remain.filter(c => !mid.includes(c)), 3);
    if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
  }
  // 2. 四条
  let four = getFourOfKind(remain);
  if (four) {
    remain = remain.filter(c => !four.includes(c));
    let tail = four;
    let mid = getFullHouse(remain) || getHighCards(remain, 5);
    if (mid) {
      let head = getHighCards(remain.filter(c => !mid.includes(c)), 3);
      if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
    }
  }
  // 3. 葫芦
  let fullhouse = getFullHouse(remain);
  if (fullhouse) {
    remain = remain.filter(c => !fullhouse.includes(c));
    let tail = fullhouse;
    let mid = getFullHouse(remain) || getHighCards(remain, 5);
    if (mid) {
      let head = getHighCards(remain.filter(c => !mid.includes(c)), 3);
      if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
    }
  }
  // 4. 同花
  let flush = getFlush(remain);
  if (flush) {
    remain = remain.filter(c => !flush.includes(c));
    let tail = flush;
    let mid = getStraight(remain) ? getHighCards(remain, 5) : getHighCards(remain, 5);
    let head = getHighCards(remain.filter(c => !mid.includes(c)), 3);
    if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
  }
  // 5. 顺子
  let straight = getStraight(remain);
  if (straight) {
    let tail = [];
    for (let v of straight) {
      let idx = remain.findIndex(c => valueNum(c.value) === v && !tail.includes(c));
      if (idx !== -1) tail.push(remain[idx]);
    }
    remain = remain.filter(c => !tail.includes(c));
    let mid = getHighCards(remain, 5);
    let head = getHighCards(remain.filter(c => !mid.includes(c)), 3);
    if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
  }
  // 6. 普通高牌分配（优先头道一对，避免鸡蛋）
  let sorted = sortByValueDesc(hand);
  // 尝试给头道留一对
  let { valueCount } = getCounts(sorted);
  let headPairValue = Object.keys(valueCount).find(v => valueCount[v] === 2);
  if (headPairValue) {
    let head = sorted.filter(c => valueNum(c.value) == headPairValue).slice(0, 2);
    let others = sorted.filter(c => valueNum(c.value) != headPairValue);
    head.push(others[0]);
    // 余下10张分中、尾
    let mid = others.slice(1, 6);
    let tail = others.slice(6, 11);
    if (isLegalOrder([head, mid, tail]) && isLegalSplitResult([head, mid, tail], hand)) return [head, mid, tail];
  }
  // 最后暴力均分
  let fallback = [
    sorted.slice(0, 3),
    sorted.slice(3, 8),
    sorted.slice(8, 13)
  ];
  if (isLegalSplitResult(fallback, hand)) return fallback;
  // 兜底（随机合法分牌）
  for (let t = 0; t < 2000; ++t) {
    let shuf = hand.slice();
    for (let i = shuf.length - 1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuf[i], shuf[j]] = [shuf[j], shuf[i]];
    }
    let split = [shuf.slice(0, 3), shuf.slice(3, 8), shuf.slice(8, 13)];
    if (isLegalOrder(split) && isLegalSplitResult(split, hand)) return split;
  }
  // 极端兜底
  return [hand.slice(0,3), hand.slice(3,8), hand.slice(8,13)];
}

// --- 原来的智能遍历接口，允许多种分法 ---
// 生成所有可能的[5,5,3]分牌
function* splitHandAllWays(cards) {
  for (let i = 0; i < (1 << 13); ++i) {
    if (countBits(i) !== 5) continue;
    let tail = [];
    let restIdx = [];
    for (let j = 0; j < 13; ++j) {
      if (i & (1 << j)) tail.push(cards[j]);
      else restIdx.push(j);
    }
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

function countBits(x) {
  let cnt = 0;
  while (x) { cnt += x & 1; x >>= 1; }
  return cnt;
}

function evalSplit([head, mid, tail]) {
  function getScore(cards) {
    let v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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
  return t * 100 + m * 10 + h;
}

function isLegalOrder([head, mid, tail]) {
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

// 允许“第n种”分牌（智能增强+遍历最优/次优）
let aiSplitCache = {};
export function advancedAiSplit(hand, nth = 0) {
  // 先用增强AI分一次
  if (nth === 0) {
    const result = enhancedAiSplit(hand);
    // 健壮性校验
    if (isLegalSplitResult(result, hand)) return result;
    // fallback
    return [
      hand.slice(0, 3),
      hand.slice(3, 8),
      hand.slice(8, 13)
    ];
  }
  // 缓存
  const key = hand.map(c => c.value + c.suit).sort().join(",") + ":" + nth;
  if (aiSplitCache[key]) return aiSplitCache[key];
  let allSplits = [];
  for (let split of splitHandAllWays(hand)) {
    if (!isLegalOrder(split)) continue;
    // 健壮性校验
    if (!isLegalSplitResult(split, hand)) continue;
    allSplits.push(split);
    if (allSplits.length > 6000) break;
  }
  allSplits.sort((a, b) => evalSplit(b) - evalSplit(a));
  let pick = allSplits[nth % allSplits.length] || allSplits[0];
  aiSplitCache[key] = pick;
  return pick;
}

// 可多次点击切换分牌
let splitIndexMap = {};
export function cycleAiSplit(hand, uniqueKey = "default") {
  if (!splitIndexMap[uniqueKey]) splitIndexMap[uniqueKey] = 0;
  const idx = splitIndexMap[uniqueKey];
  let result = advancedAiSplit(hand, idx);

  // 健壮性校验和兜底
  if (!isLegalSplitResult(result, hand)) {
    result = [
      hand.slice(0, 3),
      hand.slice(3, 8),
      hand.slice(8, 13)
    ];
  }

  splitIndexMap[uniqueKey]++;
  return result;
}

// 简单分牌
export function simpleAiSplit(hand) {
  const sorted = sortByValueDesc(hand);
  return [
    sorted.slice(0, 3),
    sorted.slice(3, 8),
    sorted.slice(8, 13)
  ];
}
