/**
 * 十三水 极致AI分牌算法 - 支持WebWorker异步/同步
 * 用法：
 *   aiSplit(cards, ({head,main,tail}) => {...});
 */
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
  // 5张手牌
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
// 细化评分
function handScore(cs) {
  const type = handType(cs);
  const groups = getGroups(cs);
  const values = groups.map(g=>g[1]);
  while(values.length < cs.length) values.push(0);
  // 加强对子、三条、顺子等的比较
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
function filterCards(origin, picked) {
  const names = new Set(picked.map(c=>c.name));
  return origin.filter(c => !names.has(c.name));
}

// --- 特殊牌型识别 ---
function isAllOneSuit(cs) {
  // 全部同花
  const s = cs[0].suit;
  return cs.every(c => c.suit === s);
}
function isAllBig(cs) {
  // 全大: 10/J/Q/K/A
  return cs.every(c => c.value >= 10);
}
function isAllSmall(cs) {
  // 全小: 2-8
  return cs.every(c => c.value <= 8);
}
function isAllOdd(cs) {
  return cs.every(c => c.value % 2 === 1);
}
function isAllEven(cs) {
  return cs.every(c => c.value % 2 === 0);
}
function isDragon(cs) {
  // 青龙: 13连顺花色不同
  const vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  for (let i=1;i<vs.length;i++) if (vs[i]!==vs[i-1]+1) return false;
  // 花色允许不同
  return true;
}
function specialType(cs) {
  // 返回特殊牌型名称，没有则返回null
  if (isAllOneSuit(cs)) return "清一色";
  if (isAllBig(cs)) return "全大";
  if (isAllSmall(cs)) return "全小";
  if (isAllOdd(cs)) return "全奇";
  if (isAllEven(cs)) return "全偶";
  if (isDragon(cs)) return "青龙";
  return null;
}

// --- 评分体系增强 ---
function smartScore(tail, main, head, allCards) {
  const tScore = handScore(tail);
  const mScore = handScore(main);
  const hScore = handScore(head);
  let score =
    tScore[0]*1e9 + tScore[1]*1e7 +
    mScore[0]*1e6 + mScore[1]*1e4 +
    hScore[0]*1e3 + hScore[1]*10;
  // 头道三条加分
  if (hScore[0]===3) score += 8e7;
  // 特殊加权
  if (tScore[0]===8) score += 7e8; // 尾道同花顺
  if (tScore[0]===7) score += 3e8; // 尾道四条
  if (tScore[0]===6) score += 1e8; // 尾道葫芦
  if (mScore[0]===8) score += 2e8; // 中道同花顺
  if (mScore[0]===7) score += 1e8; // 中道四条
  if (mScore[0]===6) score += 2e7; // 中道葫芦

  // 特殊牌型加成（最大加分）
  const special = specialType(allCards);
  if (special) score += 1e10;

  // 保证尾>中>头
  if (compareHand(tail, main) <= 0) score -= 5e8;
  if (compareHand(main, head) <= 0) score -= 5e8;

  // 头道对子优先
  if (hScore[0]===1) score += 5e5;
  // 头道高张
  score += Math.max(...head.map(c=>c.value)) * 1000;

  // 尾道高张
  score += Math.max(...tail.map(c=>c.value)) * 500;

  // 剪枝：如果头道是非常弱鸡（无对子且牌很小），减分
  if (hScore[0]===0 && Math.max(...head.map(c=>c.value))<10) score -= 2e5;

  return score;
}

// --- Worker代码 ---
const workerCode = `
${parse.toString()}
${isFlush.toString()}
${isStraight.toString()}
${isStraightFlush.toString()}
${getGroups.toString()}
${handType.toString()}
${handScore.toString()}
${compareHand.toString()}
${combinations.toString()}
${filterCards.toString()}
${isAllOneSuit.toString()}
${isAllBig.toString()}
${isAllSmall.toString()}
${isAllOdd.toString()}
${isAllEven.toString()}
${isDragon.toString()}
${specialType.toString()}
${smartScore.toString()}
onmessage = function(e) {
  const cards = e.data;
  const cs = parse(cards);
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = filterCards(remain1, main);
      // 剪枝
      if (head.length !== 3) continue;
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      const score = smartScore(tail, main, head, cs);
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
  // 放宽为 >=
  if (!best) {
    let relaxBest = null, relaxScore = -Infinity;
    for(const tail of t5s) {
      const remain1 = filterCards(cs, tail);
      const m5s = combinations(remain1, 5);
      for(const main of m5s) {
        const head = filterCards(remain1, main);
        if (head.length !== 3) continue;
        if (compareHand(tail, main) < 0) continue;
        if (compareHand(main, head) < 0) continue;
        const score = smartScore(tail, main, head, cs);
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
    best = relaxBest;
  }
  if (!best) {
    const arr = [...cards];
    best = {
      head: arr.slice(0,3),
      main: arr.slice(3,8),
      tail: arr.slice(8,13)
    };
  }
  postMessage(best);
};
`;

// --- 主导出函数 ---
export function aiSplit(cards, cb) {
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  if (typeof window !== "undefined" && window.Worker) {
    // 异步worker
    const blob = new Blob([workerCode], {type:'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = function(e) {
      if (cb) cb(e.data);
      worker.terminate();
    };
    worker.postMessage(cards);
    // 返回undefined（异步）
    return;
  } else {
    // fallback同步
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
        const score = smartScore(tail, main, head, cs);
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
      let relaxBest = null, relaxScore = -Infinity;
      for(const tail of t5s) {
        const remain1 = filterCards(cs, tail);
        const m5s = combinations(remain1, 5);
        for(const main of m5s) {
          const head = filterCards(remain1, main);
          if (head.length !== 3) continue;
          if (compareHand(tail, main) < 0) continue;
          if (compareHand(main, head) < 0) continue;
          const score = smartScore(tail, main, head, cs);
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
      best = relaxBest;
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
}
