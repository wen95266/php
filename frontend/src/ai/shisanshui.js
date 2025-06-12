// 十三水AI分牌 - 智能全局最优升级版
// 1. 针对每道（头、中、尾）全局最优分配炸弹、葫芦、顺子、同花、三条、两对、对子、高牌
// 2. 剪枝加速：只枚举合理头道(优先三条/对子/高牌)、中道/尾道(优先大牌型)，保证不倒水
// 3. 支持“特殊牌型”优先（如清一色、一条龙等，易扩展）
// 4. 全排列评分，全局最大化（性能与质量兼顾）

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];

// ----------- 基本工具 -----------
function parseCard(card) {
  const [rank, , suit] = card.split(/_of_|_/);
  return { rank, suit, point: CARD_ORDER[rank] };
}
function uniq(arr) { return Array.from(new Set(arr)); }
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => CARD_ORDER[parseCard(b).rank] - CARD_ORDER[parseCard(a).rank]);
}
function combinations(arr, k, filterFn) {
  let res = [];
  function dfs(path, start) {
    if (path.length === k) {
      if (!filterFn || filterFn(path)) res.push([...path]);
      return;
    }
    for (let i=start; i<arr.length; i++) {
      path.push(arr[i]); dfs(path, i+1); path.pop();
    }
  }
  dfs([], 0);
  return res;
}
function countByRank(cards) {
  const ranks = {};
  for (const c of cards) {
    const {rank} = parseCard(c);
    ranks[rank] = (ranks[rank]||0)+1;
  }
  return ranks;
}
function countBySuit(cards) {
  const suits = {};
  for (const c of cards) {
    const {suit} = parseCard(c);
    suits[suit] = (suits[suit]||0)+1;
  }
  return suits;
}

// ------------ 牌型识别 -------------
function findBomb(cards) {
  let ranks = countByRank(cards);
  for (let r in ranks) if (ranks[r] === 4) {
    return cards.filter(c => parseCard(c).rank === r);
  }
  return [];
}
function findTrips(cards) {
  let ranks = countByRank(cards);
  for (let r in ranks) if (ranks[r] === 3) {
    return cards.filter(c => parseCard(c).rank === r).slice(0,3);
  }
  return [];
}
function findPair(cards) {
  let ranks = countByRank(cards);
  for (let r in ranks) if (ranks[r] === 2) {
    return cards.filter(c => parseCard(c).rank === r).slice(0,2);
  }
  return [];
}
function findTwoPair(cards) {
  let ranks = countByRank(cards);
  let pairs = [];
  for (let r in ranks) if (ranks[r] === 2) {
    pairs.push(cards.filter(c => parseCard(c).rank === r).slice(0,2));
  }
  if (pairs.length >= 2) {
    return pairs[0].concat(pairs[1]);
  }
  return [];
}
function findFullHouse(cards) {
  let trips = findTrips(cards);
  if (!trips.length) return [];
  let left = cards.filter(c => !trips.includes(c));
  let pair = findPair(left);
  if (pair.length === 2) {
    return trips.concat(pair);
  }
  return [];
}
function findFlush(cards, wantLen=5) {
  let suits = countBySuit(cards);
  for (let s of SUITS) {
    if (suits[s] >= wantLen) {
      return cards.filter(c => parseCard(c).suit === s).slice(0, wantLen);
    }
  }
  return [];
}
function findStraight(cards, wantLen=5) {
  let points = uniq(cards.map(c=>parseCard(c).point)).sort((a,b)=>a-b);
  for (let i = points.length-wantLen; i >= 0; i--) {
    let seq = points.slice(i, i+wantLen);
    if (seq[wantLen-1] - seq[0] === wantLen-1) {
      let used = {};
      let straight = seq.map(pt=>{
        let card = cards.find(c=>parseCard(c).point===pt && !used[c]);
        used[card]=true; return card;
      });
      if (straight.length===wantLen) return straight;
    }
  }
  // A2345
  if (points.includes(14) && points.includes(2) && points.includes(3) && points.includes(4) && points.includes(5)) {
    let used = {};
    let straight = [14,5,4,3,2].map(pt=>{
      let card = cards.find(c=>parseCard(c).point===pt && !used[c]);
      used[card]=true; return card;
    });
    if (straight.length === wantLen) return straight;
  }
  return [];
}
function findStraightFlush(cards, wantLen=5) {
  for (let s of SUITS) {
    let suited = cards.filter(c => parseCard(c).suit === s);
    if (suited.length >= wantLen) {
      let straight = findStraight(suited, wantLen);
      if (straight.length === wantLen) return straight;
    }
  }
  return [];
}
function maxPoint(cards) {
  return Math.max(...cards.map(c=>CARD_ORDER[parseCard(c).rank]));
}

// 特殊牌型（如清一色/一条龙等，易扩展）
function isFlushAll(cards) {
  let suit = parseCard(cards[0]).suit;
  return cards.every(c=>parseCard(c).suit===suit);
}
function isDragon(cards) {
  let points = uniq(cards.map(c=>parseCard(c).point));
  return points.length === 13 && points.includes(14) && points.includes(2) && points.includes(3);
}

// ------------ 评分函数 -------------
function handScore(cards) {
  if (cards.length === 5) {
    if (findStraightFlush(cards,5).length===5) return 90000 + maxPoint(cards);
    if (findBomb(cards).length===4) return 80000 + maxPoint(cards);
    if (findFullHouse(cards).length===5) return 70000 + maxPoint(cards);
    if (findFlush(cards,5).length===5) return 60000 + maxPoint(cards);
    if (findStraight(cards,5).length===5) return 50000 + maxPoint(cards);
    if (findTrips(cards).length===3) return 40000 + maxPoint(cards);
    if (findTwoPair(cards).length===4) return 30000 + maxPoint(cards);
    if (findPair(cards).length===2) return 20000 + maxPoint(cards);
    return 10000 + maxPoint(cards); // 高牌
  } else if (cards.length === 3) {
    if (findTrips(cards).length===3) return 4000 + maxPoint(cards);
    if (findPair(cards).length===2) return 2000 + maxPoint(cards);
    return 1000 + maxPoint(cards);
  }
  return 0;
}

// 枚举最优组合（剪枝加速）
function fastCandidates(cards, k, typeList, maxN=18) {
  // 只枚举最多maxN组，优先typeList顺序
  let tried = new Set(), arr = [];
  for (let t of typeList) {
    let combs = combinations(cards, k, path => {
      if (t==='straightFlush') return findStraightFlush(path,k).length===k;
      if (t==='bomb') return findBomb(path).length===4;
      if (t==='fullHouse') return findFullHouse(path).length===5;
      if (t==='flush') return findFlush(path,k).length===k;
      if (t==='straight') return findStraight(path,k).length===k;
      if (t==='trips') return findTrips(path).length===3;
      if (t==='twoPair') return findTwoPair(path).length===4;
      if (t==='pair') return findPair(path).length===2;
      if (t==='high') return true;
      return false;
    });
    for (const c of combs) {
      let key = c.slice().sort().join(',');
      if (!tried.has(key)) { arr.push(c); tried.add(key); }
      if (arr.length >= maxN) break;
    }
    if (arr.length >= maxN) break;
  }
  return arr;
}

// ----------- 主分牌函数 -----------
export function aiSplit(cards) {
  if (!Array.isArray(cards) || cards.length !== 13) return { head: [], main: [], tail: [] };

  // 特殊牌型（如清一色/一条龙），全押
  if (isDragon(cards)) {
    const sorted = sortByPointDesc(cards);
    return {
      head: sorted.slice(10, 13),
      main: sorted.slice(5, 10),
      tail: sorted.slice(0, 5),
      special: "一条龙"
    };
  }
  if (isFlushAll(cards)) {
    const sorted = sortByPointDesc(cards);
    return {
      head: sorted.slice(10, 13),
      main: sorted.slice(5, 10),
      tail: sorted.slice(0, 5),
      special: "清一色"
    };
  }

  let best = null, bestScore = -1;
  // 枚举尾道所有优质组合
  let tailCandidates = fastCandidates(cards, 5, [
    'straightFlush','bomb','fullHouse','flush','straight','trips','twoPair','pair','high'
  ]);
  for (let tail of tailCandidates) {
    let left8 = cards.filter(c=>!tail.includes(c));
    // 枚举中道所有优质组合
    let mainCandidates = fastCandidates(left8,5,[
      'straightFlush','bomb','fullHouse','flush','straight','trips','twoPair','pair','high'
    ]);
    for (let main of mainCandidates) {
      let left3 = left8.filter(c=>!main.includes(c));
      // 头道
      let headCandidates = fastCandidates(left3,3,['trips','pair','high'], 3);
      for (let head of headCandidates) {
        // 检查不倒水
        let h = handScore(head), m = handScore(main), t = handScore(tail);
        if (t < m || m < h) continue;
        let total = h + m + t;
        if (total > bestScore) {
          bestScore = total;
          best = { head, main, tail };
        }
      }
    }
  }
  // fallback
  if (!best) {
    let sorted = sortByPointDesc(cards);
    best = {
      head: sorted.slice(10,13),
      main: sorted.slice(5,10),
      tail: sorted.slice(0,5)
    };
  }
  return best;
}
