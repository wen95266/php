// Web Worker for 十三水 AI分牌，极致增强版
// 优先检测至尊清龙、三顺子、三同花等特殊牌型，再极致剪枝分配
// 牌型强度更高，特殊牌型优先，炸弹/同花顺/葫芦适当加分

// --- 牌型辅助函数 ---
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 3) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
  // A2345
  const isLowAceStraight = vals.length >= 5 && vals.join(',') === '2,3,4,5,14';
  if (isLowAceStraight) return true;
  for (let i = 1; i < vals.length; ++i)
    if (vals[i] !== vals[i - 1] + 1) return false;
  return true;
};
const isStraightFlush = cards => isFlush(cards) && isStraight(cards);

const getHandRank = (cards) => {
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (cards.length < 3) return 0;
  if (cards.length === 3) {
    if (vcnt[0] === 3) return 3; // 三条
    if (vcnt[0] === 2) return 1; // 一对
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

// 生成组合
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

// 检查是否为至尊清龙（同花2~A）
function detectSupremeDragon(cards) {
  for (const suit of suits) {
    const all = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace']
      .map(v => `${v}_of_${suit}`);
    if (cards.every(c => all.includes(c.id))) return suit;
  }
  return null;
}

// 检查三顺子、三同花
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

// 检查是否全小、全大（A~8，全为2~8或8~A）
function detectAllSmallOrBig(cards) {
  let vals = cards.map(c => valueMap[c.value]);
  const allSmall = vals.every(v => v <= 8);
  const allBig = vals.every(v => v >= 8);
  if (allSmall) return '全小';
  if (allBig) return '全大';
  return null;
}

// 检查三条/三顺/三同花/全小全大/至尊清龙等特殊牌型
function detectSpecial(cards) {
  const dragon = detectSupremeDragon(cards);
  if (dragon) return { special: '至尊清龙', suit: dragon };
  const threeSF = threeStraightOrFlush(cards);
  if (threeSF) return { special: threeSF.type, ...threeSF };
  const allType = detectAllSmallOrBig(cards);
  if (allType) return { special: allType };
  return null;
}

// 极致AI分牌主逻辑
function bestDivisionExtreme(cards) {
  // 1. 优先特殊牌型
  const special = detectSpecial(cards);
  if (special) {
    if (special.special === '至尊清龙') {
      // 2-3-A头，4-5-6-7-8中，9-10-J-Q-K尾
      const sorted = cards.slice().sort((a, b) => valueMap[b.value] - valueMap[a.value]);
      return {
        special: '至尊清龙',
        top: sorted.filter(c=>['2','3','ace'].includes(c.value)),
        middle: sorted.filter(c=>['4','5','6','7','8'].includes(c.value)),
        bottom: sorted.filter(c=>['9','10','jack','queen','king'].includes(c.value))
      };
    }
    if (special.type === '三顺子' || special.type === '三同花') {
      return {
        special: special.type,
        top: special.top, middle: special.middle, bottom: special.bottom
      };
    }
    if (special.special === '全小' || special.special === '全大') {
      // 普通分法，尾中头都随意合理即可
      // 直接用下方分法
    }
  }

  // 2. 剪枝策略，极致提升N/M（如160/120），并优先炸弹/同花顺/葫芦等极强牌型
  const N = 160, M = 120;
  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  let bottomComb = combinations(idxArr, 5);
  bottomComb.sort((a, b) => {
    const ca = a.map(i => cards[i]);
    const cb = b.map(i => cards[i]);
    const ra = getHandRank(ca), rb = getHandRank(cb);
    if (rb !== ra) return rb - ra;
    // 强牌优先
    let bonusA = 0, bonusB = 0;
    if (ra >= 7) bonusA += 10000;
    if (rb >= 7) bonusB += 10000;
    if (ra === 6) bonusA += 3000;
    if (rb === 6) bonusB += 3000;
    const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
    const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
    return (rb + bonusB + sumb / 1000) - (ra + bonusA + suma / 1000);
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
      let bonusA = 0, bonusB = 0;
      if (ra >= 7) bonusA += 10000;
      if (rb >= 7) bonusB += 10000;
      if (ra === 6) bonusA += 3000;
      if (rb === 6) bonusB += 3000;
      const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
      const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
      return (rb + bonusB + sumb / 1000) - (ra + bonusA + suma / 1000);
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
      // 极致加权：四条/同花顺/葫芦、顺子、对子、点数
      let bonus = 0;
      if (br >= 7) bonus += 10000;
      if (mr >= 7) bonus += 5000;
      if (tr === 3) bonus += 200; // 头道三条
      if (br === 6) bonus += 3000;
      if (mr === 6) bonus += 1000;
      if (br === 5) bonus += 500;
      if (mr === 5) bonus += 200;
      if (tr === 1) bonus += 50; // 头道对子

      const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
      const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
      const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
      // 头道对子/三条也给加分
      const score = br * 200000 + mr * 180000 + tr * 150000 + bval * 300 + mval * 60 + tval + bonus;
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
  const result = bestDivisionExtreme(cards);
  self.postMessage(result);
};
