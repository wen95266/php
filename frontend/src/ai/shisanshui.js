// 十三水 极致AI分牌算法-终极防倒水（严禁倒水！）
// 兼容A2345顺子/花色、唯一牌名判断，所有分组绝无倒水！

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};

function parse(cards) {
  return cards.map(c => {
    const [rank, , suit] = c.split(/_of_|_/);
    return {rank, suit, name: c, value: CARD_ORDER[rank]};
  });
}
function isFlush(cs) {
  return cs.every(c => c.suit === cs[0].suit);
}
function isStraight(cs) {
  let vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  // A2345
  if (vs.length===5 && vs.toString()==='2,3,4,5,14') return true;
  for(let i=1;i<vs.length;i++) if(vs[i]-vs[i-1]!==1) return false;
  return true;
}
function isStraightFlush(cs) {
  return isFlush(cs) && isStraight(cs);
}
function getGroups(cs) {
  const m = {};
  for(const c of cs) m[c.value] = (m[c.value]||0) + 1;
  const arr = Object.entries(m).map(([v,cnt])=>[cnt,parseInt(v)]);
  arr.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  return arr;
}
function handType(cs) {
  if (cs.length === 5) {
    if (isStraightFlush(cs)) return 8; // 同花顺
    if (getGroups(cs)[0][0] === 4) return 7; // 四条
    if (getGroups(cs)[0][0] === 3 && getGroups(cs)[1][0] === 2) return 6; // 葫芦
    if (isFlush(cs)) return 5;
    if (isStraight(cs)) return 4;
    if (getGroups(cs)[0][0] === 3) return 3; // 三条
    if (getGroups(cs)[0][0] === 2 && getGroups(cs)[1][0] === 2) return 2; // 两对
    if (getGroups(cs)[0][0] === 2) return 1; // 一对
    return 0; // 高牌
  } else if (cs.length === 3) {
    if (getGroups(cs)[0][0] === 3) return 3; // 三条
    if (getGroups(cs)[0][0] === 2) return 1; // 一对
    return 0; // 高牌
  }
  return 0;
}
function handScore(cs) {
  const type = handType(cs);
  const groups = getGroups(cs);
  const values = groups.map(g=>g[1]);
  while(values.length < cs.length) values.push(0);
  return [type, ...values];
}
function compareHand(a, b) {
  const sa = handScore(a);
  const sb = handScore(b);
  for(let i=0;i<sa.length;i++) {
    if (sa[i] > sb[i]) return 1;
    if (sa[i] < sb[i]) return -1;
  }
  return 0;
}
function combinations(arr, n) {
  const res = [];
  (function f(start, path) {
    if (path.length === n) { res.push(path); return; }
    for (let i = start; i < arr.length; i++) {
      f(i+1, path.concat([arr[i]]));
    }
  })(0, []);
  return res;
}

// 用唯一name判断分组，绝不出现“同一张牌重复”或遗漏
function filterCards(origin, picked) {
  const names = new Set(picked.map(c=>c.name));
  return origin.filter(c => !names.has(c.name));
}

export function aiSplit(cards) {
  if (!cards || cards.length!==13) return {head:[],main:[],tail:[]};
  if (typeof cards[0] === 'object' && cards[0].name) cards = cards.map(c=>c.name);
  const cs = parse(cards);

  let best = null, bestScore = -Infinity;

  // 所有尾道组合
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = filterCards(remain1, main);
      // 必须严格: 尾道>中道>头道
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      // 评分
      const tScore = handScore(tail);
      const mScore = handScore(main);
      const hScore = handScore(head);
      let bonus = 0;
      if (tScore[0] === 8) bonus += 5000000;
      if (tScore[0] === 7) bonus += 2000000;
      if (tScore[0] === 6) bonus += 100000;
      if (mScore[0] === 8) bonus += 500000;
      if (mScore[0] === 7) bonus += 200000;
      if (mScore[0] === 6) bonus += 50000;
      if (hScore[0] === 3) bonus += 10000;
      const score =
        tScore[0]*100000000 + tScore[1]*1000000 + mScore[0]*100000 + mScore[1]*1000 + hScore[0]*100 + hScore[1] + bonus;
      if (score > bestScore) {
        bestScore = score;
        best = {
          head: head.map(c=>c.name),
          main: main.map(c=>c.name),
          tail: tail.map(c=>c.name)
        };
      }
    }
  }

  // 如果没有严格合法分组，放宽为 >=（但绝无倒水，等于也不会出现头>中或中>尾）
  if (!best) {
    let relaxBest = null, relaxScore = -Infinity;
    for(const tail of t5s) {
      const remain1 = filterCards(cs, tail);
      const m5s = combinations(remain1, 5);
      for(const main of m5s) {
        const head = filterCards(remain1, main);
        if (compareHand(tail, main) < 0) continue;
        if (compareHand(main, head) < 0) continue;
        const tScore = handScore(tail);
        const mScore = handScore(main);
        const hScore = handScore(head);
        let bonus = 0;
        if (tScore[0] === 8) bonus += 5000000;
        if (tScore[0] === 7) bonus += 2000000;
        if (tScore[0] === 6) bonus += 100000;
        if (mScore[0] === 8) bonus += 500000;
        if (mScore[0] === 7) bonus += 200000;
        if (mScore[0] === 6) bonus += 50000;
        if (hScore[0] === 3) bonus += 10000;
        const score =
          tScore[0]*100000000 + tScore[1]*1000000 + mScore[0]*100000 + mScore[1]*1000 + hScore[0]*100 + hScore[1] + bonus;
        if (score > relaxScore) {
          relaxScore = score;
          relaxBest = {
            head: head.map(c=>c.name),
            main: main.map(c=>c.name),
            tail: tail.map(c=>c.name)
          };
        }
      }
    }
    if (relaxBest) return relaxBest;
  }

  // 兜底防错
  if (!best) {
    const arr = [...cards];
    best = {
      head: arr.slice(0,3),
      main: arr.slice(3,8),
      tail: arr.slice(8,13)
    };
  }
  return best;
}
