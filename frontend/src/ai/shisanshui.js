/**
 * 十三水 AI分牌算法（造型优先版）
 * 支持依次切换五对三条、三顺子、三同花、一条龙、清一色、全大、全小、普通分法。
 */

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
function getGroups(cs) {
  const m = {};
  for(const c of cs) m[c.value] = (m[c.value]||0) + 1;
  const arr = Object.entries(m).map(([v,cnt])=>[cnt,parseInt(v)]);
  arr.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  return arr;
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
function handType(cs) {
  if (cs.length === 5) {
    if (isFlush(cs) && isStraight(cs)) return 8;
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
function headTypeCompare(a, b) {
  const ha = handType(a), hb = handType(b);
  if (ha > hb) return 1;
  if (ha < hb) return -1;
  const maxa = Math.max(...a.map(x=>x.value));
  const maxb = Math.max(...b.map(x=>x.value));
  if (maxa > maxb) return 1;
  if (maxa < maxb) return -1;
  return 0;
}

// 检测五对三条
function detectFivePairsThree(cards) {
  const cs = parse(cards);
  const groups = {};
  for (const c of cs) {
    groups[c.value] = groups[c.value] ? [...groups[c.value], c] : [c];
  }
  const pairs = [];
  let three = null;
  for (const arr of Object.values(groups)) {
    if (arr.length === 2) pairs.push(arr);
    else if (arr.length === 3) three = arr;
    else if (arr.length === 4) {
      pairs.push([arr[0], arr[1]]);
      pairs.push([arr[2], arr[3]]);
      three = arr.slice(0,3);
    }
  }
  if (pairs.length < 5 || !three) return null;
  const used = new Set();
  let usedThree = false;
  const out = [];
  for (const arr of pairs) {
    if (out.length < 5) {
      out.push(arr);
      arr.forEach(c=>used.add(c.name));
    }
  }
  for (const c of three) used.add(c.name);
  const rest = cs.filter(c=>!used.has(c.name));
  if (rest.length !== 3) return null;
  // 尽量让三条上头道
  return {
    pattern: '五对三条',
    split: {
      head: three.map(c=>c.name),
      main: out[0].concat(out[1]).map(c=>c.name),
      tail: out[2].concat(out[3],out[4],rest).slice(0,5).map(c=>c.name)
    }
  };
}

// 检测三顺子
function detectThreeStraights(cards) {
  const cs = parse(cards);
  const fives = combinations(cs,5).filter(isStraight);
  for (const first of fives) {
    const remain1 = filterCards(cs, first);
    const second = combinations(remain1,5).find(isStraight);
    if (!second) continue;
    const remain2 = filterCards(remain1, second);
    if (remain2.length!==3) continue;
    if (isStraight(remain2)) {
      return {
        pattern: '三顺子',
        split: {
          head: remain2.map(c=>c.name),
          main: second.map(c=>c.name),
          tail: first.map(c=>c.name)
        }
      };
    }
  }
  return null;
}

// 检测三同花
function detectThreeFlush(cards) {
  const cs = parse(cards);
  const fives = combinations(cs,5).filter(isFlush);
  for (const first of fives) {
    const remain1 = filterCards(cs, first);
    const second = combinations(remain1,5).find(isFlush);
    if (!second) continue;
    const remain2 = filterCards(remain1, second);
    if (remain2.length!==3) continue;
    if (isFlush(remain2)) {
      return {
        pattern: '三同花',
        split: {
          head: remain2.map(c=>c.name),
          main: second.map(c=>c.name),
          tail: first.map(c=>c.name)
        }
      };
    }
  }
  return null;
}

// 检测一条龙
function detectDragon(cards) {
  const cs = parse(cards);
  const values = cs.map(c=>c.value).sort((a,b)=>a-b);
  if ('2,3,4,5,6,7,8,9,10,11,12,13,14' === values.join(',')) {
    return {
      pattern: '一条龙',
      split: {
        head: cs.slice(0,3).map(c=>c.name),
        main: cs.slice(3,8).map(c=>c.name),
        tail: cs.slice(8,13).map(c=>c.name)
      }
    };
  }
  return null;
}

// 检测清一色
function detectFlushAll(cards) {
  const cs = parse(cards);
  if (cs.every(c=>c.suit===cs[0].suit)) {
    return {
      pattern: '清一色',
      split: {
        head: cs.slice(0,3).map(c=>c.name),
        main: cs.slice(3,8).map(c=>c.name),
        tail: cs.slice(8,13).map(c=>c.name)
      }
    };
  }
  return null;
}

// 检测全大
function detectAllBig(cards) {
  const cs = parse(cards);
  if (cs.every(c=>c.value>=10)) {
    return {
      pattern: '全大',
      split: {
        head: cs.slice(0,3).map(c=>c.name),
        main: cs.slice(3,8).map(c=>c.name),
        tail: cs.slice(8,13).map(c=>c.name)
      }
    };
  }
  return null;
}
// 检测全小
function detectAllSmall(cards) {
  const cs = parse(cards);
  if (cs.every(c=>c.value<=8)) {
    return {
      pattern: '全小',
      split: {
        head: cs.slice(0,3).map(c=>c.name),
        main: cs.slice(3,8).map(c=>c.name),
        tail: cs.slice(8,13).map(c=>c.name)
      }
    };
  }
  return null;
}

// 普通智能分法
function aiSplitStrong(cards) {
  const cs = parse(cards);
  let best = null, bestScore = -Infinity;
  const t5s = combinations(cs, 5);
  for(const tail of t5s) {
    const remain1 = filterCards(cs, tail);
    const m5s = combinations(remain1, 5);
    for(const main of m5s) {
      const head = filterCards(remain1, main);
      if (head.length !== 3) continue;
      if (headTypeCompare(tail, main) <= 0) continue;
      if (headTypeCompare(main, head) <= 0) continue;
      let score =
        handType(tail)*1e9 + handType(main)*1e6 + handType(head)*1e3;
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
  return {pattern: '普通分法', split: best};
}

// 检测所有造型（按优先级顺序）
export function detectAllPatterns(cards) {
  const detectors = [
    detectFivePairsThree,
    detectThreeStraights,
    detectThreeFlush,
    detectDragon,
    detectFlushAll,
    detectAllBig,
    detectAllSmall
  ];
  const found = [];
  for (const fn of detectors) {
    const res = fn(cards);
    if (res) found.push(res);
  }
  found.push(aiSplitStrong(cards));
  return found;
}

export function splitByPattern(cards, patternName) {
  const patterns = detectAllPatterns(cards);
  const found = patterns.find(p=>p.pattern===patternName);
  if (found) return found.split;
  return patterns[patterns.length-1].split;
}
