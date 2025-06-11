// Web Worker for 十三水 AI分牌，进一步强化：
// 1. 优先头道三条（冲三），三条大优先（如 AAA > 999）
// 2. 有三条时，除非拆三条能让中道/尾道成四条/同花顺/葫芦，否则绝不拆三条
// 3. 头道对子优先级提升，避免头道纯高牌
// 4. 剪枝智能更激进，尾道/中道优先炸弹、同花顺、葫芦

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

// 尝试头道三条所有分法，优先级：三条点数大优先
function tryHeadThreeOfAKind(cards) {
  // 找到所有三条组合
  const valueCount = countBy(cards, 'value');
  const threeKinds = Object.keys(valueCount)
    .filter(k => valueCount[k] >= 3)
    .sort((a, b) => valueMap[b] - valueMap[a]); // 大三条优先
  if (threeKinds.length === 0) return null;
  const idxArr = Array.from({ length: 13 }, (_, i) => i);

  let best = null;
  let bestScore = -Infinity;

  for (const v of threeKinds) {
    const ixs = idxArr.filter(i => cards[i].value === v);
    const threeComb = combinations(ixs, 3);
    for (const headComb of threeComb) {
      const usedH = new Set(headComb);
      const left1 = idxArr.filter(i => !usedH.has(i));
      // 尾道优先选炸弹、同花顺、葫芦
      let tailComb = combinations(left1, 5);
      tailComb.sort((a, b) => {
        const ca = a.map(i => cards[i]);
        const cb = b.map(i => cards[i]);
        const ra = getHandRank(ca), rb = getHandRank(cb);
        if (rb !== ra) return rb - ra;
        const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
        const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
        return sumb - suma;
      });
      tailComb = tailComb.slice(0, 30); // 剪枝
      for (const tail of tailComb) {
        const usedT = new Set(tail);
        const midIdx = left1.filter(i => !usedT.has(i));
        if (midIdx.length !== 5) continue;
        const head = headComb.map(i => cards[i]);
        const middle = midIdx.map(i => cards[i]);
        const tailC = tail.map(i => cards[i]);
        // 不倒水
        const br = getHandRank(tailC), mr = getHandRank(middle), tr = getHandRank(head);
        if (br < mr || mr < tr) continue;

        // 如果拆了三条能使中道/尾道变成四条/同花顺/葫芦，则允许，否则只保留本三条冲三分法
        // 检查三条实体是否被拆
        const allValues = cards.map(c => c.value);
        const threeCountAll = allValues.filter(val => val === v).length;
        const threeCountHead = head.filter(c => c.value === v).length;
        const threeCountMid = middle.filter(c => c.value === v).length;
        const threeCountTail = tailC.filter(c => c.value === v).length;
        // 若头道3张，其它0张，才允许
        if (threeCountHead !== 3 || threeCountMid > 0 || threeCountTail > 0) continue;

        // 评分：三条大优先，头道三条极高分
        let bonus = 10000000 + tr * 10000 + valueMap[v] * 3000;
        bonus += br * 6000 + mr * 3000;
        bonus += tailC.reduce((s, c) => s + valueMap[c.value], 0) * 100;
        bonus += middle.reduce((s, c) => s + valueMap[c.value], 0) * 10;
        bonus += head.reduce((s, c) => s + valueMap[c.value], 0);
        if (bonus > bestScore) {
          bestScore = bonus;
          best = { top: head, middle, bottom: tailC, special: "头道三条" };
        }
      }
    }
  }
  return best;
}

// 头道对子优先（如有两个对子，头道优先放最大对子）
function tryHeadPair(cards) {
  const valueCount = countBy(cards, 'value');
  const pairs = Object.keys(valueCount)
    .filter(k => valueCount[k] >= 2)
    .sort((a, b) => valueMap[b] - valueMap[a]);
  if (pairs.length === 0) return null;
  const idxArr = Array.from({ length: 13 }, (_, i) => i);

  let best = null;
  let bestScore = -Infinity;

  for (const v of pairs) {
    const ixs = idxArr.filter(i => cards[i].value === v);
    const pairComb = combinations(ixs, 2);
    for (const headComb of pairComb) {
      const usedH = new Set(headComb);
      const left1 = idxArr.filter(i => !usedH.has(i));
      let tailComb = combinations(left1, 5);
      tailComb.sort((a, b) => {
        const ca = a.map(i => cards[i]);
        const cb = b.map(i => cards[i]);
        const ra = getHandRank(ca), rb = getHandRank(cb);
        if (rb !== ra) return rb - ra;
        const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
        const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
        return sumb - suma;
      });
      tailComb = tailComb.slice(0, 20);
      for (const tail of tailComb) {
        const usedT = new Set(tail);
        const midIdx = left1.filter(i => !usedT.has(i));
        if (midIdx.length !== 5) continue;
        const head = headComb.map(i => cards[i]);
        const middle = midIdx.map(i => cards[i]);
        const tailC = tail.map(i => cards[i]);
        // 不倒水
        const br = getHandRank(tailC), mr = getHandRank(middle), tr = getHandRank(head);
        if (br < mr || mr < tr) continue;
        let bonus = 1000000 + tr * 3000 + valueMap[v] * 400;
        bonus += br * 3000 + mr * 1500;
        bonus += tailC.reduce((s, c) => s + valueMap[c.value], 0) * 30;
        bonus += middle.reduce((s, c) => s + valueMap[c.value], 0) * 6;
        bonus += head.reduce((s, c) => s + valueMap[c.value], 0);
        if (bonus > bestScore) {
          bestScore = bonus;
          best = { top: head, middle, bottom: tailC, special: "头道对子" };
        }
      }
    }
  }
  return best;
}

// 极致分牌主逻辑
function bestDivisionExtreme(cards) {
  // 1. 优先头道三条（大三条优先，且不拆三条）
  const headThree = tryHeadThreeOfAKind(cards);
  if (headThree) return headThree;

  // 2. 头道对子
  const headPair = tryHeadPair(cards);
  if (headPair) return headPair;

  // 3. 原有极致剪枝
  const N = 180, M = 150;
  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  let bottomComb = combinations(idxArr, 5);
  bottomComb.sort((a, b) => {
    const ca = a.map(i => cards[i]);
    const cb = b.map(i => cards[i]);
    const ra = getHandRank(ca), rb = getHandRank(cb);
    if (rb !== ra) return rb - ra;
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
      let bonus = 0;
      if (br >= 7) bonus += 10000;
      if (mr >= 7) bonus += 5000;
      if (tr === 3) bonus += 200; // 头道三条
      if (br === 6) bonus += 3000;
      if (mr === 6) bonus += 1000;
      if (br === 5) bonus += 500;
      if (mr === 5) bonus += 200;
      if (tr === 1) bonus += 100; // 头道对子
      const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
      const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
      const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
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
