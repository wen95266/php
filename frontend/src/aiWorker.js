// Web Worker for AI分牌，极致增强：
// - 剪枝参数提升，优先特殊牌型、对子、顺子、同花顺、炸弹等
// - 检测至尊清龙、三顺、三同花等特殊并优先返回
// - 支持多结果返回（仅返回最佳方案）

const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
  // A2345
  const isLowAceStraight = vals.join(',') === '2,3,4,5,14';
  if (isLowAceStraight) return true;
  for (let i = 1; i < vals.length; ++i) if (vals[i] !== vals[i - 1] + 1) return false;
  return true;
};
const isStraightFlush = cards => isFlush(cards) && isStraight(cards);
const isAllOneSuit = cards => cards.length === 13 && ['hearts', 'diamonds', 'spades', 'clubs'].some(suit =>
  cards.every(card => card.suit === suit)
);

// 检测至尊清龙
function detectSupremeDragon(cards) {
  // 2~A同花顺
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  for (const suit of suits) {
    const all = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace']
      .map(v => `${v}_of_${suit}`);
    if (cards.every(c => all.includes(c.id))) return suit;
  }
  return null;
}

const getHandRank = (cards) => {
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (cards.length < 3) return 0;
  if (cards.length === 3) {
    if (vcnt[0] === 3) return 3;
    if (vcnt[0] === 2) return 1;
    return 0;
  }
  if (isStraightFlush(cards)) return 8;
  if (vcnt[0] === 4) return 7;
  if (vcnt[0] === 3 && vcnt[1] === 2) return 6;
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 4;
  if (vcnt[0] === 3) return 3;
  if (vcnt[0] === 2 && vcnt[1] === 2) return 2;
  if (vcnt[0] === 2) return 1;
  return 0;
};

function combinations(arr, k) {
  let res = [];
  function dfs(start, path) {
    if (path.length === k) { res.push([...path]); return; }
    for (let i = start; i < arr.length; ++i) {
      path.push(arr[i]);
      dfs(i + 1, path);
      path.pop();
    }
  }
  dfs(0, []);
  return res;
}

// 判断三顺子/三同花
function threeStraightOrFlush(cards) {
  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  for (const bIdx of combinations(idxArr, 5)) {
    const left1 = idxArr.filter(i => !bIdx.includes(i));
    for (const mIdx of combinations(left1, 5)) {
      const tIdx = left1.filter(i => !mIdx.includes(i));
      const b = bIdx.map(i => cards[i]);
      const m = mIdx.map(i => cards[i]);
      const t = tIdx.map(i => cards[i]);
      if (isStraight(b) && isStraight(m) && isStraight(t)) return {type:'三顺子', top:t, middle:m, bottom:b};
      if (isFlush(b) && isFlush(m) && isFlush(t)) return {type:'三同花', top:t, middle:m, bottom:b};
    }
  }
  return null;
}

function bestDivisionEnhanced(cards) {
  // 至尊清龙
  if (detectSupremeDragon(cards)) {
    // 直接顺序分配即可
    const suits = ['hearts','diamonds','clubs','spades'];
    for (const suit of suits) {
      const test = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'].map(v => `${v}_of_${suit}`);
      if(cards.every(c=>test.includes(c.id))) {
        // 尾道最大: 9 10 J Q K, 中道: 4 5 6 7 8, 头道: 2 3 A
        const sorted = cards.slice().sort((a, b) => valueMap[b.value] - valueMap[a.value]);
        return {
          special: '至尊清龙',
          top: sorted.filter(c=>['2','3','ace'].includes(c.value)),
          middle: sorted.filter(c=>['4','5','6','7','8'].includes(c.value)),
          bottom: sorted.filter(c=>['9','10','jack','queen','king'].includes(c.value))
        };
      }
    }
  }
  // 三顺/三同花
  const sp = threeStraightOrFlush(cards);
  if (sp) {
    return {
      special: sp.type,
      top: sp.top, middle: sp.middle, bottom: sp.bottom
    };
  }

  // 剪枝参数可放大，极致优化
  const N = 80; // 尾道
  const M = 60; // 中道

  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  let bottomComb = combinations(idxArr, 5);
  bottomComb.sort((a, b) => {
    const ca = a.map(i => cards[i]);
    const cb = b.map(i => cards[i]);
    const ra = getHandRank(ca), rb = getHandRank(cb);
    if (rb !== ra) return rb - ra;
    const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
    const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
    return sumb - suma;
  });
  bottomComb = bottomComb.slice(0, N);

  let maxScore = -Infinity;
  let best = { top: [], middle: [], bottom: [] };

  for (const bottomIdxs of bottomComb) {
    const usedB = new Set(bottomIdxs);
    const left1 = idxArr.filter(i => !usedB.has(i));
    let middleComb = combinations(left1, 5);
    middleComb.sort((a, b) => {
      const ca = a.map(i => cards[i]);
      const cb = b.map(i => cards[i]);
      const ra = getHandRank(ca), rb = getHandRank(cb);
      if (rb !== ra) return rb - ra;
      const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
      const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
      return sumb - suma;
    });
    middleComb = middleComb.slice(0, M);

    for (const middleIdxs of middleComb) {
      const usedM = new Set(middleIdxs);
      const topIdxs = left1.filter(i => !usedM.has(i));
      if (topIdxs.length !== 3) continue;
      const bottom = bottomIdxs.map(i => cards[i]);
      const middle = middleIdxs.map(i => cards[i]);
      const top = topIdxs.map(i => cards[i]);
      const br = getHandRank(bottom), mr = getHandRank(middle), tr = getHandRank(top);
      // 不倒水
      if (br < mr || mr < tr) continue;
      // 若尾/中有炸弹、葫芦等，进一步加分
      let bonus = 0;
      if (br >= 7) bonus += 10000; // 尾道四条/同花顺
      if (mr >= 7) bonus += 5000; // 中道四条/同花顺
      if (br === 6) bonus += 3000; // 尾道葫芦
      if (mr === 6) bonus += 1000; // 中道葫芦
      if (br === 5) bonus += 500; // 尾道同花
      if (mr === 5) bonus += 200;
      // 分数体系
      const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
      const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
      const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
      const score = br * 100000 + mr * 10000 + tr * 1000 + bval * 100 + mval * 10 + tval + bonus;
      if (score > maxScore) {
        maxScore = score;
        best = { top, middle, bottom };
      }
    }
  }
  return best;
}

self.onmessage = function(e) {
  const { cards } = e.data;
  if (!cards || cards.length !== 13) {
    self.postMessage({ error: '扑克牌数量必须为13' });
    return;
  }
  const result = bestDivisionEnhanced(cards);
  self.postMessage(result);
};
