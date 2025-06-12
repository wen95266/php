// 极致AI分牌算法（十三水 分牌 极致版）
// 返回: { head: [3], main: [5], tail: [5] }

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

// 将13张牌转为结构体{rank,suit,name}
function parse(cards) {
  return cards.map(c => {
    const [rank, , suit] = c.split(/_of_|_/);
    return {rank, suit, name: c, value: CARD_ORDER[rank]};
  });
}

// 牌型判断
function isStraightFlush(cs) {
  return isFlush(cs) && isStraight(cs);
}
function isFlush(cs) {
  return cs.every(c => c.suit === cs[0].suit);
}
function isStraight(cs) {
  const vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  for(let i=1;i<vs.length;i++) if(vs[i]-vs[i-1]!==1) return false;
  return true;
}
function getGroups(cs) {
  // 返回[[同牌数,牌值],...]
  const m = {};
  for(const c of cs) m[c.value] = (m[c.value]||0) + 1;
  const arr = Object.entries(m).map(([v,cnt])=>[cnt,parseInt(v)]);
  arr.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  return arr;
}
function handType(cs) {
  // 3/5张牌型
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
// 牌型权重（用于比大小）
function handScore(cs) {
  // 返回 [牌型,主值,副值, kicker...]
  const type = handType(cs);
  const groups = getGroups(cs);
  const values = groups.map(g=>g[1]);
  while(values.length < cs.length) values.push(0);
  return [type, ...values];
}

// 比较两个分组的大小
function compareHand(a, b) {
  const sa = handScore(a);
  const sb = handScore(b);
  for(let i=0;i<sa.length;i++) {
    if (sa[i] > sb[i]) return 1;
    if (sa[i] < sb[i]) return -1;
  }
  return 0;
}

// 穷举所有5张组合
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

// 极致AI分牌主函数
export function aiSplit(cards) {
  // 输入: 13张牌名字符串数组
  // 输出: { head:[3], main:[5], tail:[5] }
  if (typeof cards[0] === 'object' && cards[0].name) cards = cards.map(c=>c.name);
  const cs = parse(cards);

  let best = null;
  let bestScore = -Infinity;
  // 穷举尾道5张
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = cs.filter(c => !tail.includes(c));
    // 穷举中道5张
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = remain1.filter(c => !main.includes(c));
      // 比较大小: tail >= main >= head
      if (compareHand(tail, main) < 0) continue;
      if (compareHand(main, head) < 0) continue;
      // 评分: 尾道权重最大
      const tScore = handScore(tail);
      const mScore = handScore(main);
      const hScore = handScore(head);
      // 综合评分: 牌型*100000+主值*1000+副值*10+kicker
      const score =
        tScore[0]*10000000 + tScore[1]*100000 + tScore[2]*1000 + tScore[3]*10 +
        mScore[0]*100000 + mScore[1]*1000 + mScore[2]*10 + mScore[3] +
        hScore[0]*1000 + hScore[1]*10 + hScore[2];
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
  // 若没找到（特殊极端），随机切
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
