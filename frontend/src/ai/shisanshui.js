/**
 * 十三水 极致AI分牌算法 - 多线程(WebWorker)+特殊牌型识别+极致评分
 * - 彻底防倒水
 * - 强制优先特殊牌型（清龙、三顺子、三同花、全小、全大、连对等）
 * - WebWorker多线程穷举，不卡主线程
 * - 结构清晰、可扩展
 * 
 * 用法（React）：
 *   import { aiSplit } from '../ai/shisanshui';
 *   aiSplit(cards, result => { setHead(result.head); setMain(result.main); setTail(result.tail); });
 */

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

// --- 工具函数 ---
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
function combinations(arr, n, start = 0, path = [], res = []) {
  // 避免递归溢出：用循环分批处理
  if (arr.length < n) return [];
  let stack = [{start, path:[]}];
  while (stack.length) {
    let {start, path} = stack.pop();
    if (path.length === n) { res.push(path); continue; }
    for (let i = arr.length - 1; i >= start; i--) {
      stack.push({start: i+1, path: [arr[i], ...path]});
    }
  }
  return res;
}
function filterCards(origin, picked) {
  const names = new Set(picked.map(c=>c.name));
  return origin.filter(c => !names.has(c.name));
}

// --- 特殊牌型检测 ---
function isQingLong(cs) {
  for (const s of SUITS) {
    const has = RANKS.map(r => cs.some(c=>c.suit===s&&c.rank===r));
    if (has.every(x=>x)) return true;
  }
  return false;
}
function isSanShun(cs) {
  // 三顺子（暴力分组尝试所有3+5+5,5+5+3,5+3+5等）
  let vals = cs.map(c=>c.value).sort((a,b)=>a-b);
  function isSeq(arr) {
    arr = arr.slice().sort((a,b)=>a-b);
    // A2345
    if (arr.length===5 && arr.toString()==='2,3,4,5,14') return true;
    for(let i=1;i<arr.length;i++) if(arr[i]-arr[i-1]!==1) return false;
    return true;
  }
  for (let x=3;x<=5;x++) for(let y=3;y<=5;y++) {
    let z=13-x-y;
    if (z<3||z>5) continue;
    let combs = combinations(cs,x);
    for (const arr1 of combs) {
      let left1 = filterCards(cs, arr1);
      let combs2 = combinations(left1,y);
      for (const arr2 of combs2) {
        let arr3 = filterCards(left1, arr2);
        if (isSeq(arr1.map(c=>c.value)) && isSeq(arr2.map(c=>c.value)) && isSeq(arr3.map(c=>c.value))) return true;
      }
    }
  }
  return false;
}
function isSanTongHua(cs) {
  // 三同花
  let suits = {};
  for(const c of cs) suits[c.suit]=(suits[c.suit]||0)+1;
  let nums = Object.values(suits);
  nums.sort((a,b)=>b-a);
  return nums[0]>=5&&nums[1]>=5&&nums[2]>=3;
}
function isQuanDa(cs) {
  return cs.every(c=>c.value>=10);
}
function isQuanXiao(cs) {
  return cs.every(c=>c.value<=8);
}
function isLianDui(cs) {
  const groups = getGroups(cs);
  const pairs = groups.filter(g=>g[0]===2).map(g=>g[1]).sort((a,b)=>a-b);
  let cnt=1,maxCnt=1;
  for(let i=1;i<pairs.length;i++) {
    if (pairs[i]===pairs[i-1]+1) {cnt++;maxCnt=Math.max(maxCnt,cnt);}
    else cnt=1;
  }
  return maxCnt>=3;
}

// --- 评分体系 ---
function smartScore(tail, main, head) {
  const tScore = handScore(tail);
  const mScore = handScore(main);
  const hScore = handScore(head);
  let score =
    tScore[0]*1e9 + tScore[1]*1e7 + mScore[0]*1e6 + mScore[1]*1e4 + hScore[0]*1e3 + hScore[1]*10;
  // 特殊牌型加权
  if (isQingLong([...tail,...main,...head])) score += 1e11;
  if (isSanShun([...tail,...main,...head])) score += 1e10;
  if (isSanTongHua([...tail,...main,...head])) score += 5e9;
  if (isQuanDa([...tail,...main,...head])) score += 2e9;
  if (isQuanXiao([...tail,...main,...head])) score += 2e9;
  if (isLianDui([...tail,...main,...head])) score += 1e9;
  if (hScore[0]===3) score += 8e7;
  if (tScore[0]===8) score += 7e8;
  if (tScore[0]===7) score += 3e8;
  if (tScore[0]===6) score += 1e8;
  if (mScore[0]===8) score += 2e8;
  if (mScore[0]===7) score += 1e8;
  if (mScore[0]===6) score += 2e7;
  return score;
}

// --- WebWorker代码字符串 ---
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
${isQingLong.toString()}
${isSanShun.toString()}
${isSanTongHua.toString()}
${isQuanDa.toString()}
${isQuanXiao.toString()}
${isLianDui.toString()}
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
      if (compareHand(tail, main) <= 0) continue;
      if (compareHand(main, head) <= 0) continue;
      const score = smartScore(tail, main, head);
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
  // 放宽
  if (!best) {
    let relaxBest = null, relaxScore = -Infinity;
    for(const tail of t5s) {
      const remain1 = filterCards(cs, tail);
      const m5s = combinations(remain1, 5);
      for(const main of m5s) {
        const head = filterCards(remain1, main);
        if (compareHand(tail, main) < 0) continue;
        if (compareHand(main, head) < 0) continue;
        const score = smartScore(tail, main, head);
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

// --- 主函数：支持WebWorker多线程分牌 ---
export function aiSplit(cards, cb) {
  // cb(result) 异步回调
  if (!cards || cards.length!==13) {
    if (cb) cb({head:[],main:[],tail:[]});
    return {head:[],main:[],tail:[]};
  }
  if (typeof window.Worker !== 'undefined') {
    // WebWorker分线程不阻塞主界面
    const blob = new Blob([workerCode], {type:'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = function(e) {
      if (cb) cb(e.data);
      worker.terminate();
    };
    worker.postMessage(cards);
    // 返回空，等待回调
    return;
  } else {
    // 不支持Worker则主线程分牌（极端慢）
    const cs = parse(cards);
    let best = null, bestScore = -Infinity;
    const t5s = combinations(cs, 5);
    for(const tail of t5s) {
      const remain1 = filterCards(cs, tail);
      const m5s = combinations(remain1, 5);
      for(const main of m5s) {
        const head = filterCards(remain1, main);
        if (compareHand(tail, main) <= 0) continue;
        if (compareHand(main, head) <= 0) continue;
        const score = smartScore(tail, main, head);
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
          if (compareHand(tail, main) < 0) continue;
          if (compareHand(main, head) < 0) continue;
          const score = smartScore(tail, main, head);
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
