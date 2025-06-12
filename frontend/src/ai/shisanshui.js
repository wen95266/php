// 十三水 AI理牌模块（增强版）
// 优先满足顺子、同花顺、炸弹、葫芦、同花、三条、两对、对子、最大高牌，且保证不倒水。

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUITS = ['spades','hearts','diamonds','clubs'];

// 解析牌
function parseCard(card) {
  const [rank, , suit] = card.split(/_of_|_/);
  return { rank, suit, point: CARD_ORDER[rank] };
}

// 按点数从大到小
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => CARD_ORDER[parseCard(b).rank] - CARD_ORDER[parseCard(a).rank]);
}

// 按点数从小到大
function sortByPointAsc(cards) {
  return [...cards].sort((a, b) => CARD_ORDER[parseCard(a).rank] - CARD_ORDER[parseCard(b).rank]);
}

// 统计点数和花色数量
function analyze(cards) {
  const ranks = {}, suits = {};
  for (const c of cards) {
    const {rank, suit} = parseCard(c);
    ranks[rank] = (ranks[rank]||0)+1;
    suits[suit] = (suits[suit]||0)+1;
  }
  return { ranks, suits };
}

// 查找炸弹
function findBomb(cards) {
  const { ranks } = analyze(cards);
  for (let r in ranks) if (ranks[r] === 4) {
    return cards.filter(c => parseCard(c).rank === r);
  }
  return [];
}

// 查找三条
function findTrips(cards) {
  const { ranks } = analyze(cards);
  for (let r in ranks) if (ranks[r] === 3) {
    return cards.filter(c => parseCard(c).rank === r).slice(0,3);
  }
  return [];
}

// 查找对子
function findPair(cards) {
  const { ranks } = analyze(cards);
  for (let r in ranks) if (ranks[r] === 2) {
    return cards.filter(c => parseCard(c).rank === r).slice(0,2);
  }
  return [];
}

// 查找两对
function findTwoPair(cards) {
  const { ranks } = analyze(cards);
  let pairs = [];
  for (let r in ranks) if (ranks[r] === 2) {
    pairs.push(cards.filter(c => parseCard(c).rank === r).slice(0,2));
  }
  if (pairs.length >= 2) {
    return pairs[0].concat(pairs[1]);
  }
  return [];
}

// 查找葫芦（三条+一对）
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

// 查找同花
function findFlush(cards, wantLen = 5) {
  const { suits } = analyze(cards);
  for (let s of SUITS) {
    if (suits[s] >= wantLen) {
      return cards.filter(c => parseCard(c).suit === s).slice(0, wantLen);
    }
  }
  return [];
}

// 查找顺子（最多找A2345、10JQKA）
function findStraight(cards, wantLen = 5) {
  let points = Array.from(new Set(cards.map(c=>parseCard(c).point))).sort((a,b)=>a-b);
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
  // 特殊顺子A2345
  if (points.includes(14) && points.includes(2) && points.includes(3) && points.includes(4) && points.includes(5)) {
    let used = {};
    let straight = [14,5,4,3,2].map(pt=>{
      let card = cards.find(c=>parseCard(c).point===pt && !used[c]);
      used[card] = true; return card;
    });
    if (straight.length === wantLen) return straight;
  }
  return [];
}

// 查找同花顺
function findStraightFlush(cards, wantLen = 5) {
  for (let s of SUITS) {
    let suited = cards.filter(c => parseCard(c).suit === s);
    if (suited.length >= wantLen) {
      let straight = findStraight(suited, wantLen);
      if (straight.length === wantLen) return straight;
    }
  }
  return [];
}

// 分配一组5张牌，优先同花顺>炸弹>葫芦>同花>顺子>三条>两对>对子>高牌
function pickBestFive(cards) {
  let straightFlush = findStraightFlush(cards, 5);
  if (straightFlush.length === 5) return straightFlush;
  let bomb = findBomb(cards);
  if (bomb.length === 4) {
    let left = cards.filter(c=>!bomb.includes(c));
    return bomb.concat(sortByPointDesc(left).slice(0, 1));
  }
  let fullHouse = findFullHouse(cards);
  if (fullHouse.length === 5) return fullHouse;
  let flush = findFlush(cards, 5);
  if (flush.length === 5) return flush;
  let straight = findStraight(cards, 5);
  if (straight.length === 5) return straight;
  let trips = findTrips(cards);
  if (trips.length === 3) {
    let left = cards.filter(c=>!trips.includes(c));
    return trips.concat(sortByPointDesc(left).slice(0,2));
  }
  let twoPair = findTwoPair(cards);
  if (twoPair.length === 4) {
    let left = cards.filter(c=>!twoPair.includes(c));
    return twoPair.concat(sortByPointDesc(left).slice(0,1));
  }
  let pair = findPair(cards);
  if (pair.length === 2) {
    let left = cards.filter(c=>!pair.includes(c));
    return pair.concat(sortByPointDesc(left).slice(0,3));
  }
  return sortByPointDesc(cards).slice(0,5);
}

// 分配头道（3张），优先三条>对子>高牌
function pickBestThree(cards) {
  let trips = findTrips(cards);
  if (trips.length === 3) return trips;
  let pair = findPair(cards);
  if (pair.length === 2) {
    let left = cards.filter(c=>!pair.includes(c));
    return pair.concat(sortByPointDesc(left).slice(0,1));
  }
  return sortByPointDesc(cards).slice(0,3);
}

// 计算牌力和
function power(arr) {
  return arr.map(c=>CARD_ORDER[parseCard(c).rank]).reduce((a,b)=>a+b,0);
}

/**
 * AI智能分牌
 * @param {string[]} cards 13张牌名
 */
export function aiSplit(cards) {
  if (!Array.isArray(cards) || cards.length !== 13) {
    return { head: [], main: [], tail: [] };
  }
  let used = new Set();

  // 尾道优先最大牌型
  let tail = pickBestFive(cards);
  tail.forEach(c=>used.add(c));
  // 中道优先最大牌型（去除已用牌）
  let leftForMain = cards.filter(c=>!used.has(c));
  let main = pickBestFive(leftForMain);
  main.forEach(c=>used.add(c));
  // 头道优先三条/对子/高牌
  let leftForHead = cards.filter(c=>!used.has(c));
  let head = pickBestThree(leftForHead);

  // 检查倒水，调整最小头道/中道与最大中道/尾道
  let tailPower = power(tail), mainPower = power(main), headPower = power(head);
  let tryCount = 0;
  while ((tailPower < mainPower || mainPower < headPower) && tryCount < 10) {
    // 尾道和中道倒水，交换最小尾道与最大中道
    if (tailPower < mainPower) {
      const tailMin = tail.reduce((min, c) => CARD_ORDER[parseCard(c).rank] < CARD_ORDER[parseCard(min).rank] ? c : min, tail[0]);
      const mainMax = main.reduce((max, c) => CARD_ORDER[parseCard(c).rank] > CARD_ORDER[parseCard(max).rank] ? c : max, main[0]);
      const tailIdx = tail.indexOf(tailMin);
      const mainIdx = main.indexOf(mainMax);
      if (tailIdx>-1 && mainIdx>-1) {
        [tail[tailIdx], main[mainIdx]] = [main[mainIdx], tail[tailIdx]];
      }
    }
    // 中道和头道倒水，交换最小中道与最大头道
    if (mainPower < headPower) {
      const mainMin = main.reduce((min, c) => CARD_ORDER[parseCard(c).rank] < CARD_ORDER[parseCard(min).rank] ? c : min, main[0]);
      const headMax = head.reduce((max, c) => CARD_ORDER[parseCard(c).rank] > CARD_ORDER[parseCard(max).rank] ? c : max, head[0]);
      const mainIdx = main.indexOf(mainMin);
      const headIdx = head.indexOf(headMax);
      if (mainIdx>-1 && headIdx>-1) {
        [main[mainIdx], head[headIdx]] = [head[headIdx], main[mainIdx]];
      }
    }
    tailPower = power(tail); mainPower = power(main); headPower = power(head);
    tryCount++;
  }

  return { head, main, tail };
}
