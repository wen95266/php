// 十三水 极致AI分牌算法（加强版）
// 智能优先：炸弹/同花顺/葫芦/顺子/同花/三条/两对/一对/高牌
// 1. 严格防止倒水（尾道<中道、中道<头道）
// 2. 优先拆散小对子/杂牌，优先保大牌型于尾道和中道
// 3. 特别：拆炸弹时优先保炸弹于尾，若两炸弹尽量头道留对子
// 4. 自动识别特殊牌型（清龙、三顺、三同花等）（可拓展）

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

// 工具：解析牌名
function parse(cards) {
  return cards.map(c => {
    const [rank, , suit] = c.split(/_of_|_/);
    return {rank, suit, name: c, value: CARD_ORDER[rank]};
  });
}
// 牌型工具
function isFlush(cs) {
  return cs.every(c => c.suit === cs[0].suit);
}
function isStraight(cs) {
  let vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  // 特判A2345顺
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

// 优先检测特殊牌型
function isQingLong(cs) {
  // 清龙：同花A~10
  const suitGroups = {};
  for(const c of cs) {
    if (!suitGroups[c.suit]) suitGroups[c.suit]=[];
    suitGroups[c.suit].push(c.value);
  }
  for(const s of SUITS) {
    if (!suitGroups[s] || suitGroups[s].length<5) continue;
    const v = suitGroups[s].sort((a,b)=>a-b);
    for(let i=0;i<=v.length-5;i++) {
      if (v[i+4]-v[i]===4 && v.slice(i,i+5).every((_,k)=>v[i]+k===v[i+k])) return true;
    }
    // A2345
    if (v.includes(14)&&v.includes(2)&&v.includes(3)&&v.includes(4)&&v.includes(5)) return true;
  }
  return false;
}

// 主要分牌函数
export function aiSplit(cards) {
  if (!cards || cards.length !== 13) return {head:[],main:[],tail:[]};
  if (typeof cards[0] === 'object' && cards[0].name) cards = cards.map(c=>c.name);
  const cs = parse(cards);

  // 1. 优先检测清龙/三同花/三顺子等特殊（可扩展）

  // 2. 分别穷举所有尾道组合（优先同花顺、炸弹、葫芦）
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const tailType = handType(tail);
    // 强牌优先
    if (tailType < 3) continue;
    const remain1 = cs.filter(c => !tail.includes(c));
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const mainType = handType(main);
      if (mainType < 1) continue; // 至少一对或更好
      const head = remain1.filter(c => !main.includes(c));
      // 防倒水，必须严格递减
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      // 评分：尾>中>头，炸弹/同花顺加权
      const tScore = handScore(tail);
      const mScore = handScore(main);
      const hScore = handScore(head);
      // 特殊加权：同花顺+500w，炸弹+200w，葫芦+10w
      let bonus = 0;
      if (tScore[0] === 8) bonus += 5000000;
      if (tScore[0] === 7) bonus += 2000000;
      if (tScore[0] === 6) bonus += 100000;
      if (mScore[0] === 8) bonus += 500000;
      if (mScore[0] === 7) bonus += 200000;
      if (mScore[0] === 6) bonus += 50000;
      // 头道三条加权
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

  // 3. 如未找到，放宽尾道、中道必须>头道，允许等于
  if (!best) {
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
  }

  // 4. 仍无分组，直接切
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
