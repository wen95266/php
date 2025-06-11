// Web Worker for AI分牌

// 牌型判断辅助函数
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
  // 处理A2345
  const isLowAceStraight = vals.join(',') === '2,3,4,5,14';
  if (isLowAceStraight) return true;
  for (let i = 1; i < vals.length; ++i) if (vals[i] !== vals[i - 1] + 1) return false;
  return true;
};
const isStraightFlush = cards => isFlush(cards) && isStraight(cards);
const getHandRank = (cards) => {
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (cards.length < 3) return 0;
  if (cards.length === 3) {
    if (vcnt[0] === 3) return 3; // 三条
    if (vcnt[0] === 2) return 1; // 一对
    return 0; // 高牌
  }
  if (isStraightFlush(cards)) return 8; // 同花顺
  if (vcnt[0] === 4) return 7; // 四条
  if (vcnt[0] === 3 && vcnt[1] === 2) return 6; // 葫芦
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 4;
  if (vcnt[0] === 3) return 3;
  if (vcnt[0] === 2 && vcnt[1] === 2) return 2;
  if (vcnt[0] === 2) return 1;
  return 0;
};

// 剪枝高效AI分牌
function bestDivisionEfficient(cards) {
  const N = 40; // 尾道剪枝数量
  const M = 30; // 中道剪枝数量

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
      if (br < mr || mr < tr) continue;
      const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
      const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
      const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
      const score = br * 100000 + mr * 10000 + tr * 1000 + bval * 100 + mval * 10 + tval;
      if (score > maxScore) {
        maxScore = score;
        best = { top, middle, bottom };
      }
    }
  }
  return best;
}

// Worker 接口
self.onmessage = function(e) {
  const { cards } = e.data;
  if (!cards || cards.length !== 13) {
    self.postMessage({ error: '扑克牌数量必须为13' });
    return;
  }
  const result = bestDivisionEfficient(cards);
  self.postMessage(result);
};
