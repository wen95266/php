/**
 * 十三水 AI分牌算法合集 - 支持多种分牌风格，每次点击切换
 * 用法：
 *   import { aiSplitVariants } from './shisanshui';
 *   aiSplitVariants[idx].fn(cards, ({head,main,tail}) => {...});
 */

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUIT_ORDER = { spades: 4, hearts: 3, clubs: 2, diamonds: 1 };

function parse(cards) {
  return cards.map(c => {
    const [rank, , suit] = c.split(/_of_|_/);
    return {rank, suit, name: c, value: CARD_ORDER[rank]};
  });
}
function getMaxCard(cs) {
  return cs.reduce((max, c) => {
    if (c.value > max.value) return c;
    if (c.value === max.value && SUIT_ORDER[c.suit] > SUIT_ORDER[max.suit]) return c;
    return max;
  }, cs[0]);
}
function isFlush(cs) {
  return cs.length > 0 && cs.every(c => c.suit === cs[0].suit);
}
function isStraight(cs) {
  let vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  if (cs.length===5 && vs.toString()==='2,3,4,5,14') return true;
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
    if (isStraightFlush(cs)) return 8;
    if (getGroups(cs)[0][0] === 4) return 7;
    if (getGroups(cs)[0][0] === 3 && getGroups(cs)[1][0] === 2) return 6;
    if (isFlush(cs)) return 5;
    if (isStraight(cs)) return 4;
    if (getGroups(cs)[0][0] === 3) return 3;
    if (getGroups(cs)[0][0] === 2 && getGroups(cs)[1][0] === 2) return 2;
    if (getGroups(cs)[0][0] === 2) return 1;
    return 0;
  } else if (cs.length === 3) {
    if (getGroups(cs)[0][0] === 3) return 3;
    if (getGroups(cs)[0][0] === 2) return 1;
    return 0;
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
  const typeA = handType(a), typeB = handType(b);
  if ((typeA === 5 || typeA === 8 || typeA === 4) && typeA === typeB) {
    const maxA = getMaxCard(a), maxB = getMaxCard(b);
    if (maxA.value > maxB.value) return 1;
    if (maxA.value < maxB.value) return -1;
    if (SUIT_ORDER[maxA.suit] > SUIT_ORDER[maxB.suit]) return 1;
    if (SUIT_ORDER[maxA.suit] < SUIT_ORDER[maxB.suit]) return -1;
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
function filterCards(origin, picked) {
  const names = new Set(picked.map(c=>c.name));
  return origin.filter(c => !names.has(c.name));
}
function specialType(cs) {
  const isAllOneSuit = cs.every(c=>c.suit===cs[0].suit);
  const vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  const isDragon = vs.join(',')==='2,3,4,5,6,7,8,9,10,11,12,13,14';
  const isAllBig = vs.every(v=>v>=10);
  const isAllSmall = vs.every(v=>v<=8);
  if (isDragon) return "青龙";
  if (isAllOneSuit) return "清一色";
  if (isAllBig) return "全大";
  if (isAllSmall) return "全小";
  return null;
}

// --- 策略一：最大尾道（经典强AI） ---
function aiSplitStrong(cards, cb) {
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  const cs = parse(cards);
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = filterCards(remain1, main);
      if (head.length !== 3) continue;
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      let score =
        handScore(tail)[0]*1e9 + handScore(main)[0]*1e6 + handScore(head)[0]*1e3;
      score += Math.max(...tail.map(c=>c.value))*1000;
      score += Math.max(...head.map(c=>c.value))*500;
      if (specialType(cs)) score += 1e10;
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
  if (!best) {
    const arr = [...cards];
    best = {
      head: arr.slice(0,3),
      main: arr.slice(3,8),
      tail: arr.slice(8,13)
    };
  }
  if (cb) cb(best);
  return best;
}

// --- 策略二：头道对子优先 ---
function aiSplitHeadPair(cards, cb) {
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  const cs = parse(cards);
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = filterCards(remain1, main);
      if (head.length !== 3) continue;
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      const hType = handType(head);
      let score = hType*1e8 + handScore(tail)[0]*1e6 + handScore(main)[0]*1e4;
      if (hType===1) score += 2e8; // 头道对子加很多分
      if (hType===3) score += 5e8; // 头道三条极大加分
      if (specialType(cs)) score += 1e10;
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
  if (!best) {
    const arr = [...cards];
    best = {
      head: arr.slice(0,3),
      main: arr.slice(3,8),
      tail: arr.slice(8,13)
    };
  }
  if (cb) cb(best);
  return best;
}

// --- 策略三：优先同花/花色 ---
function aiSplitSuit(cards, cb) {
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  const cs = parse(cards);
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    if (!isFlush(tail)) continue; // 优先尾道同花
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      if (!isFlush(main)) continue; // 优先两道同花
      const head = filterCards(remain1, main);
      if (head.length !== 3) continue;
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      let score = 2e9 + handScore(tail)[0]*1e7 + handScore(main)[0]*1e5 + handScore(head)[0]*1e3;
      if (specialType(cs)) score += 1e10;
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
  if (!best) {
    // 如果没有两道同花，退化为经典AI
    return aiSplitStrong(cards, cb);
  }
  if (cb) cb(best);
  return best;
}

// --- 策略四：随机（娱乐/灵感） ---
function aiSplitRandom(cards, cb) {
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  let arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const best = {
    head: arr.slice(0,3),
    main: arr.slice(3,8),
    tail: arr.slice(8,13)
  };
  if (cb) cb(best);
  return best;
}

// --- 策略合集，前端按钮循环切换使用 ---
export const aiSplitVariants = [
  { name: "最大尾道", fn: aiSplitStrong },
  { name: "头道对子", fn: aiSplitHeadPair },
  { name: "双道同花", fn: aiSplitSuit },
  { name: "随机娱乐", fn: aiSplitRandom }
];

// 兼容老用法
export const aiSplit = aiSplitStrong;
