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

// 智能AI分牌：优先保尾道强牌型，其次中道，最后头道
export function advancedAiSplit(hand) {
  let cards = hand.slice();
  // 先给尾道找最大牌型
  let tail = null;
  tail = getStraightFlush(cards) ||
         getFourOfKind(cards) ||
         getFullHouse(cards) ||
         getFlush(cards) ||
         getStraight(cards) && getHighCards(cards.filter(c => getStraight(cards).includes(valueNum(c.value))), 5) ||
         getThreeOfKind(cards) ||
         getTwoPair(cards) ||
         getOnePair(cards) ||
         getHighCards(cards, 5);
  // 移除已选
  let used = new Set(tail.map(c => c.value+"_"+c.suit));
  let remain1 = cards.filter(c => !used.has(c.value+"_"+c.suit));
  // 给中道找最大牌型
  let mid = null;
  mid = getStraightFlush(remain1) ||
        getFourOfKind(remain1) ||
        getFullHouse(remain1) ||
        getFlush(remain1) ||
        getStraight(remain1) && getHighCards(remain1.filter(c => getStraight(remain1).includes(valueNum(c.value))), 5) ||
        getThreeOfKind(remain1) ||
        getTwoPair(remain1) ||
        getOnePair(remain1) ||
        getHighCards(remain1, 5);
  used = new Set([...tail, ...mid].map(c => c.value+"_"+c.suit));
  let remain2 = cards.filter(c => !used.has(c.value+"_"+c.suit));
  // 剩余3张为头道
  let head = sortByValueDesc(remain2).slice(0, 3);
  return [head, mid, tail];
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
