/**
 * 十三水 极致AI分牌算法 - 支持WebWorker异步/同步
 * 用法：
 *   aiSplit(cards, ({head,main,tail}) => {...});
 */

// 常量定义
const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

// --- 基础牌型与工具函数 ---
function parse(cards) {
  return cards.map(c => {
    const [rank, , suit] = c.split(/_of_|_/);
    return {rank, suit, name: c, value: CARD_ORDER[rank]};
  });
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
  const s = cs[0].suit;
  return cs.every(c => c.suit === s);
}
function isAllBig(cs) {
  return cs.every(c => c.value >= 10);
}
function isAllSmall(cs) {
  return cs.every(c => c.value <= 8);
}
function isAllOdd(cs) {
  return cs.every(c => c.value % 2 === 1);
}
function isAllEven(cs) {
  return cs.every(c => c.value % 2 === 0);
}
function isDragon(cs) {
  const vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  for (let i=1;i<vs.length;i++) if (vs[i]!==vs[i-1]+1) return false;
  return true;
}
function specialType(cs) {
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
  if (hScore[0]===3) score += 8e7; // 头道三条
  if (tScore[0]===8) score += 7e8; // 尾道同花顺
  if (tScore[0]===7) score += 3e8; // 尾道四条
  if (tScore[0]===6) score += 1e8; // 尾道葫芦
  if (mScore[0]===8) score += 2e8; // 中道同花顺
  if (mScore[0]===7) score += 1e8; // 中道四条
  if (mScore[0]===6) score += 2e7; // 中道葫芦
  const special = specialType(allCards);
  if (special) score += 1e10;
  if (compareHand(tail, main) <= 0) score -= 5e8;
  if (compareHand(main, head) <= 0) score -= 5e8;
  if (hScore[0]===1) score += 5e5; // 头道对子
  score += Math.max(...head.map(c=>c.value)) * 1000;
  score += Math.max(...tail.map(c=>c.value)) * 500;
  if (hScore[0]===0 && Math.max(...head.map(c=>c.value))<10) score -= 2e5; // 头道无对子且低牌减分
  return score;
}

// --- Worker代码字符串（所有依赖函数内联，确保无 parse 未定义问题） ---
const workerCode = `
  function parse(cards) {
    return cards.map(function(c) {
      var x = c.split(/_of_|_/);
      var rank = x[0], suit = x[2] || x[1];
      var order = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'jack':11,'queen':12,'king':13,'ace':14};
      return {rank:rank, suit:suit, name:c, value:order[rank]};
    });
  }
  function isFlush(cs) { return cs.length > 0 && cs.every(function(c){return c.suit===cs[0].suit;}); }
  function isStraight(cs) {
    var vs = cs.map(function(c){return c.value;}).sort(function(a,b){return a-b;});
    if (cs.length===5 && vs.toString()==='2,3,4,5,14') return true;
    for(var i=1;i<vs.length;i++) if(vs[i]-vs[i-1]!==1) return false;
    return true;
  }
  function isStraightFlush(cs) { return isFlush(cs) && isStraight(cs); }
  function getGroups(cs) {
    var m = {}; for(var i=0;i<cs.length;i++){ var v=cs[i].value; m[v]=(m[v]||0)+1;}
    var arr = Object.keys(m).map(function(v){return [m[v],parseInt(v)];});
    arr.sort(function(a,b){return b[0]-a[0]||b[1]-a[1];});
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
    var type = handType(cs);
    var groups = getGroups(cs);
    var values = groups.map(function(g){return g[1];});
    while(values.length < cs.length) values.push(0);
    return [type].concat(values);
  }
  function compareHand(a, b) {
    var sa = handScore(a), sb = handScore(b);
    for(var i=0;i<sa.length;i++) {
      if (sa[i] > sb[i]) return 1;
      if (sa[i] < sb[i]) return -1;
    }
    return 0;
  }
  function combinations(arr, n) {
    var res = [];
    function f(start, path) {
      if (path.length === n) { res.push(path); return; }
      for (var i = start; i < arr.length; i++) {
        f(i+1, path.concat([arr[i]]));
      }
    }
    f(0, []);
    return res;
  }
  function filterCards(origin, picked) {
    var names = {};
    for(var i=0;i<picked.length;i++) names[picked[i].name]=1;
    return origin.filter(function(c){return !names[c.name];});
  }
  function isAllOneSuit(cs) {
    var s = cs[0].suit;
    return cs.every(function(c){return c.suit===s;});
  }
  function isAllBig(cs) {
    return cs.every(function(c){return c.value>=10;});
  }
  function isAllSmall(cs) {
    return cs.every(function(c){return c.value<=8;});
  }
  function isAllOdd(cs) {
    return cs.every(function(c){return c.value%2===1;});
  }
  function isAllEven(cs) {
    return cs.every(function(c){return c.value%2===0;});
  }
  function isDragon(cs) {
    var vs = cs.map(function(c){return c.value;}).sort(function(a,b){return a-b;});
    for(var i=1;i<vs.length;i++) if(vs[i]!==vs[i-1]+1) return false;
    return true;
  }
  function specialType(cs) {
    if (isAllOneSuit(cs)) return "清一色";
    if (isAllBig(cs)) return "全大";
    if (isAllSmall(cs)) return "全小";
    if (isAllOdd(cs)) return "全奇";
    if (isAllEven(cs)) return "全偶";
    if (isDragon(cs)) return "青龙";
    return null;
  }
  function smartScore(tail, main, head, allCards) {
    var tScore = handScore(tail), mScore = handScore(main), hScore = handScore(head);
    var score =
      tScore[0]*1e9 + tScore[1]*1e7 +
      mScore[0]*1e6 + mScore[1]*1e4 +
      hScore[0]*1e3 + hScore[1]*10;
    if (hScore[0]===3) score += 8e7;
    if (tScore[0]===8) score += 7e8;
    if (tScore[0]===7) score += 3e8;
    if (tScore[0]===6) score += 1e8;
    if (mScore[0]===8) score += 2e8;
    if (mScore[0]===7) score += 1e8;
    if (mScore[0]===6) score += 2e7;
    var special = specialType(allCards);
    if (special) score += 1e10;
    if (compareHand(tail, main) <= 0) score -= 5e8;
    if (compareHand(main, head) <= 0) score -= 5e8;
    if (hScore[0]===1) score += 5e5;
    score += Math.max.apply(null, head.map(function(c){return c.value;})) * 1000;
    score += Math.max.apply(null, tail.map(function(c){return c.value;})) * 500;
    if (hScore[0]===0 && Math.max.apply(null, head.map(function(c){return c.value;}))<10) score -= 2e5;
    return score;
  }
  onmessage = function(e) {
    var cards = e.data;
    var cs = parse(cards);
    var best = null, bestScore = -Infinity;
    var t5s = combinations(cs, 5);
    for(var ti=0; ti<t5s.length; ti++) {
      var tail = t5s[ti];
      var remain1 = filterCards(cs, tail);
      var m5s = combinations(remain1, 5);
      for(var mi=0; mi<m5s.length; mi++) {
        var main = m5s[mi];
        var head = filterCards(remain1, main);
        if (head.length !== 3) continue;
        if (compareHand(tail, main) <= 0) continue;
        if (compareHand(main, head) <= 0) continue;
        var score = smartScore(tail, main, head, cs);
        if (score > bestScore) {
          bestScore = score;
          best = {
            head: head.map(function(c){return c.name;}),
            main: main.map(function(c){return c.name;}),
            tail: tail.map(function(c){return c.name;})
          };
        }
      }
    }
    if (!best) {
      var relaxBest = null, relaxScore = -Infinity;
      for(var ti=0; ti<t5s.length; ti++) {
        var tail = t5s[ti];
        var remain1 = filterCards(cs, tail);
        var m5s = combinations(remain1, 5);
        for(var mi=0; mi<m5s.length; mi++) {
          var main = m5s[mi];
          var head = filterCards(remain1, main);
          if (head.length !== 3) continue;
          if (compareHand(tail, main) < 0) continue;
          if (compareHand(main, head) < 0) continue;
          var score = smartScore(tail, main, head, cs);
          if (score > relaxScore) {
            relaxScore = score;
            relaxBest = {
              head: head.map(function(c){return c.name;}),
              main: main.map(function(c){return c.name;}),
              tail: tail.map(function(c){return c.name;})
            };
          }
        }
      }
      best = relaxBest;
    }
    if (!best) {
      var arr = cards.slice();
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
