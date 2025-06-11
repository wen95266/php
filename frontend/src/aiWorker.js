// 极致分法&三条带对优先&多分法返回
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
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

function scoreDivision(top, middle, bottom) {
  const br = getHandRank(bottom), mr = getHandRank(middle), tr = getHandRank(top);
  let bonus = 0;
  // 葛底斯堡之战：三条带对优先（葫芦结构）
  if (mr === 6 || br === 6) bonus += 8000;
  if (br === 6) bonus += 20000; // 尾道葫芦
  if (mr === 6) bonus += 12000; // 中道葫芦
  if (br === 7) bonus += 50000; // 尾道炸弹
  if (mr === 7) bonus += 32000; // 中道炸弹
  if (tr === 3) bonus += 10000;
  if (tr === 1) bonus += 1000;
  // 头道对子带高牌再加分
  if (tr === 1 && top.some(c => valueMap[c.value] > 10)) bonus += 500;
  // 总点数辅分
  const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
  const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
  const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
  return br * 200000 + mr * 180000 + tr * 150000 + bval * 300 + mval * 60 + tval + bonus;
}

function enumerateDivisions(cards, maxResults = 8) {
  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  let resultArr = [];
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
  bottomComb = bottomComb.slice(0, 80);

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
    middleComb = middleComb.slice(0, 40);

    for (const middleIdxs of middleComb) {
      const usedM = new Set(middleIdxs);
      const topIdxs = left1.filter(i => !usedM.has(i));
      if (topIdxs.length !== 3) continue;
      const bottom = bottomIdxs.map(i => cards[i]);
      const middle = middleIdxs.map(i => cards[i]);
      const top = topIdxs.map(i => cards[i]);
      const br = getHandRank(bottom), mr = getHandRank(middle), tr = getHandRank(top);
      if (br < mr || mr < tr) continue; // 不倒水
      const score = scoreDivision(top, middle, bottom);
      resultArr.push({ top, middle, bottom, score });
    }
  }
  // 按分数降序
  resultArr.sort((a, b) => b.score - a.score);
  // 去重（只保留不同分法）
  let checked = new Set();
  let uniqueArr = [];
  for (let r of resultArr) {
    const sig = JSON.stringify([
      r.top.map(c=>c.id).sort(),
      r.middle.map(c=>c.id).sort(),
      r.bottom.map(c=>c.id).sort()
    ]);
    if (!checked.has(sig)) {
      checked.add(sig);
      uniqueArr.push(r);
    }
    if (uniqueArr.length >= maxResults) break;
  }
  return uniqueArr.map(r => ({ top: r.top, middle: r.middle, bottom: r.bottom }));
}

self.onmessage = function(e) {
  const { cards } = e.data;
  if (!cards || cards.length !== 13) {
    self.postMessage({ error: '扑克牌数量必须为13' });
    return;
  }
  const results = enumerateDivisions(cards, 8); // 返回8种高分分法
  self.postMessage({ results });
};
