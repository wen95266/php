// 极致AI分牌算法【加强防倒水】
// 返回: { head: [3], main: [5], tail: [5] }

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

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
  const vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  // 特判 A2345
  if (vs[4] === 14 && vs[0] === 2 && vs[1] === 3 && vs[2] === 4 && vs[3] === 5) return true;
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
  // 返回 [牌型,主值,副值, kicker...]
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

export function aiSplit(cards) {
  if (typeof cards[0] === 'object' && cards[0].name) cards = cards.map(c=>c.name);
  const cs = parse(cards);

  let best = null;
  let bestScore = -Infinity;

  // 穷举所有尾道
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = cs.filter(c => !tail.includes(c));
    // 穷举所有中道
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = remain1.filter(c => !main.includes(c));
      // 必须：尾道 > 中道 >= 头道
      if (compareHand(tail, main) < 0) continue; // 尾道必须大于等于中道
      if (compareHand(main, head) < 0) continue; // 中道必须大于等于头道
      // 【严格防倒水】如果有相等，优先跳过
      if (compareHand(tail, main) === 0 || compareHand(main, head) === 0) continue;
      // 评分（权重可微调，尾道>中道>头道，且优先考虑牌型，其次考虑数值）
      const tScore = handScore(tail);
      const mScore = handScore(main);
      const hScore = handScore(head);
      const score =
        tScore[0]*100000000 + tScore[1]*1000000 + mScore[0]*100000 + mScore[1]*1000 + hScore[0]*100 + hScore[1];
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
  // 如果没有严格合法分组，放宽“允许尾道=中道 或 中道=头道”，但绝不允许倒水
  if (!best) {
    let relaxBest = null, relaxScore = -Infinity;
    for(const tail of t5s) {
      const remain1 = cs.filter(c => !tail.includes(c));
      const m5s = combinations(remain1, 5);
      for(const main of m5s) {
        const head = remain1.filter(c => !main.includes(c));
        if (compareHand(tail, main) < 0) continue;
        if (compareHand(main, head) < 0) continue;
        const tScore = handScore(tail);
        const mScore = handScore(main);
        const hScore = handScore(head);
        const score =
          tScore[0]*100000000 + tScore[1]*1000000 + mScore[0]*100000 + mScore[1]*1000 + hScore[0]*100 + hScore[1];
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
  // 仍无分组，直接切
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
