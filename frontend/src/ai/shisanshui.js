// 十三水 AI理牌模块（极致增强版）
// 1. 特殊牌型优先（一条龙、清一色、全小、全大、全黑、全红）
// 2. 牌型权重可配置
// 3. 策略可配置（头道对子优先等）
// 4. 性能优化（剪枝）

const CONFIG = {
  SPECIALS: [
    { name: "一条龙", check: isDragon, score: 200000 },
    { name: "清一色", check: isFlushAll, score: 180000 },
    { name: "全大", check: isAllBig, score: 170000 },
    { name: "全小", check: isAllSmall, score: 170000 },
    { name: "全黑", check: isAllBlack, score: 160000 },
    { name: "全红", check: isAllRed, score: 160000 },
  ],
  HAND_SCORE: {
    straightFlush: 90000,
    bomb: 80000,
    fullHouse: 70000,
    flush: 60000,
    straight: 50000,
    trips: 40000,
    twoPair: 30000,
    pair: 20000,
    high: 10000,
    // 头道
    headTrips: 4000,
    headPair: 2000,
    headHigh: 1000,
  },
  STRATEGY: {
    head: ['trips', 'pair', 'high'],
    main: ['straightFlush', 'bomb', 'fullHouse', 'flush', 'straight', 'trips', 'twoPair', 'pair', 'high'],
    tail: ['straightFlush', 'bomb', 'fullHouse', 'flush', 'straight', 'trips', 'twoPair', 'pair', 'high'],
    maxHeadComb: 20,
    maxMainComb: 10
  }
};

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];

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
// ---------- 特殊牌型 ----------
function isDragon(cards) {
  let points = uniq(cards.map(c=>parseCard(c).point));
  return points.length === 13 && points.includes(14) && points.includes(2) && points.includes(3);
}
function isFlushAll(cards) {
  let suit = parseCard(cards[0]).suit;
  return cards.every(c=>parseCard(c).suit===suit);
}
function isAllBig(cards) {
  return cards.every(c=>CARD_ORDER[parseCard(c).rank]>=8);
}
function isAllSmall(cards) {
  return cards.every(c=>CARD_ORDER[parseCard(c).rank]<=8);
}
function isAllBlack(cards) {
  return cards.every(c=>['spades','clubs'].includes(parseCard(c).suit));
}
function isAllRed(cards) {
  return cards.every(c=>['hearts','diamonds'].includes(parseCard(c).suit));
}
// ---------- 牌型识别 ----------
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
// --------- 评分函数 ---------
function handScore(cards, which='tail') {
  if (cards.length === 5) {
    if (findStraightFlush(cards,5).length===5) return CONFIG.HAND_SCORE.straightFlush + maxPoint(cards);
    if (findBomb(cards).length===4) return CONFIG.HAND_SCORE.bomb + maxPoint(cards);
    if (findFullHouse(cards).length===5) return CONFIG.HAND_SCORE.fullHouse + maxPoint(cards);
    if (findFlush(cards,5).length===5) return CONFIG.HAND_SCORE.flush + maxPoint(cards);
    if (findStraight(cards,5).length===5) return CONFIG.HAND_SCORE.straight + maxPoint(cards);
    if (findTrips(cards).length===3) return CONFIG.HAND_SCORE.trips + maxPoint(cards);
    if (findTwoPair(cards).length===4) return CONFIG.HAND_SCORE.twoPair + maxPoint(cards);
    if (findPair(cards).length===2) return CONFIG.HAND_SCORE.pair + maxPoint(cards);
    return CONFIG.HAND_SCORE.high + maxPoint(cards); // 高牌
  } else if (cards.length === 3) {
    if (findTrips(cards).length===3) return CONFIG.HAND_SCORE.headTrips + maxPoint(cards);
    if (findPair(cards).length===2) return CONFIG.HAND_SCORE.headPair + maxPoint(cards);
    return CONFIG.HAND_SCORE.headHigh + maxPoint(cards);
  }
  return 0;
}

// --------- 特殊牌型优先 ---------
function checkSpecial(cards) {
  for (const spec of CONFIG.SPECIALS) {
    if (spec.check(cards)) return { name: spec.name, score: spec.score };
  }
  return null;
}

// --------- 主AI分牌 ---------
export function aiSplit(cards) {
  if (!Array.isArray(cards) || cards.length !== 13) return { head: [], main: [], tail: [] };

  // 特殊牌型优先
  let special = checkSpecial(cards);
  if (special) {
    let sorted = sortByPointDesc(cards);
    return {
      head: sorted.slice(10,13),
      main: sorted.slice(5,10),
      tail: sorted.slice(0,5),
      special: special.name
    };
  }

  let best = null, bestScore = -1;
  let headCandidates = [];
  let { maxHeadComb } = CONFIG.STRATEGY;
  let tried = new Set();
  for (const t of CONFIG.STRATEGY.head) {
    let combs = combinations(cards, 3, path => {
      if (t==='trips') return findTrips(path).length===3;
      if (t==='pair') return findPair(path).length===2;
      if (t==='high') return true;
      return false;
    });
    for (const c of combs) {
      let key = c.slice().sort().join(',');
      if (!tried.has(key)) { headCandidates.push(c); tried.add(key); }
      if (headCandidates.length >= maxHeadComb) break;
    }
    if (headCandidates.length >= maxHeadComb) break;
  }

  for (let head of headCandidates) {
    let left10 = cards.filter(c=>!head.includes(c));
    let mainCandidates = [], { maxMainComb } = CONFIG.STRATEGY;
    let triedMain = new Set();
    for (const t of CONFIG.STRATEGY.main) {
      let combs = combinations(left10, 5, path => {
        if (t==='straightFlush') return findStraightFlush(path,5).length===5;
        if (t==='bomb') return findBomb(path).length===4;
        if (t==='fullHouse') return findFullHouse(path).length===5;
        if (t==='flush') return findFlush(path,5).length===5;
        if (t==='straight') return findStraight(path,5).length===5;
        if (t==='trips') return findTrips(path).length===3;
        if (t==='twoPair') return findTwoPair(path).length===4;
        if (t==='pair') return findPair(path).length===2;
        if (t==='high') return true;
        return false;
      });
      for (const c of combs) {
        let key = c.slice().sort().join(',');
        if (!triedMain.has(key)) { mainCandidates.push(c); triedMain.add(key); }
        if (mainCandidates.length >= maxMainComb) break;
      }
      if (mainCandidates.length >= maxMainComb) break;
    }
    for (let main of mainCandidates) {
      let tail = left10.filter(c=>!main.includes(c));
      if (tail.length !== 5) continue;
      // 检查不倒水
      let h = handScore(head,'head'), m = handScore(main,'main'), t = handScore(tail,'tail');
      if (t < m || m < h) continue;
      let total = h + m + t;
      if (total > bestScore) {
        bestScore = total;
        best = { head, main, tail };
      }
    }
  }
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
