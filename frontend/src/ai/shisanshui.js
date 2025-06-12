// 十三水 AI理牌模块（智能增强版：避免倒水、优先成牌型、对子优先头道、顺子优先中尾道）
// 后续可继续增强牌型识别与分牌策略

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};
const SUIT_ORDER = ['spades','hearts','diamonds','clubs'];

/**
 * 解析卡牌
 * @param {string} card '10_of_spades'
 * @returns {{rank:string,suit:string,point:number}}
 */
function parseCard(card) {
  const [rank, , suit] = card.split(/_of_|_/);
  return { rank, suit, point: CARD_ORDER[rank] };
}

/**
 * 统计手牌点数和花色
 * @param {string[]} cards 
 * @returns {{ranks: Object, suits: Object}}
 */
function analyze(cards) {
  const ranks = {}, suits = {};
  for (const c of cards) {
    const {rank, suit} = parseCard(c);
    ranks[rank] = (ranks[rank]||0)+1;
    suits[suit] = (suits[suit]||0)+1;
  }
  return { ranks, suits };
}

/**
 * 按点数从大到小排序
 */
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => {
    const pa = parseCard(a), pb = parseCard(b);
    return pb.point - pa.point;
  });
}

/**
 * 查找顺子
 * @param {string[]} cards 
 * @param {number} wantLen 
 * @returns {string[]|null}
 */
function findStraight(cards, wantLen=5) {
  // 仅按点数，不分花色
  let uniquePoints = Array.from(new Set(cards.map(c=>parseCard(c).point))).sort((a,b)=>a-b);
  for (let i=uniquePoints.length-wantLen; i>=0; i--) {
    let seq = uniquePoints.slice(i,i+wantLen);
    if (seq[wantLen-1] - seq[0] === wantLen-1) {
      // 找到顺子
      let straight = [];
      let used = {};
      for (let pt of seq) {
        let card = cards.find(c => parseCard(c).point===pt && !used[c]);
        straight.push(card);
        used[card]=true;
      }
      if (straight.length===wantLen) return straight;
    }
  }
  // 特例A2345
  if (uniquePoints.includes(14) && uniquePoints.includes(2) && uniquePoints.includes(3) && uniquePoints.includes(4) && uniquePoints.includes(5)) {
    let straight = [];
    let used = {};
    for (let pt of [14,5,4,3,2]) {
      let card = cards.find(c => parseCard(c).point===pt && !used[c]);
      straight.push(card);
      used[card]=true;
    }
    if (straight.length===wantLen) return straight;
  }
  return null;
}

/**
 * 查对子/三条/炸弹
 * @param {string[]} cards 
 * @param {number} wantNum (对子2,三条3,炸弹4)
 * @returns {string[]} 返回指定点数的所有牌
 */
function findOfAKind(cards, wantNum) {
  const {ranks} = analyze(cards);
  let found = Object.entries(ranks).find(([rank,count])=>count>=wantNum);
  if (found) {
    return cards.filter(c=>parseCard(c).rank===found[0]).slice(0,wantNum);
  }
  return [];
}

/**
 * 智能分牌
 * 1. 优先尾道找顺子/炸弹/三条/对子/高牌
 * 2. 中道找顺子/三条/对子/高牌
 * 3. 头道优先对子、次之高牌
 * 4. 保证尾≥中≥头，不倒水
 */
export function aiSplit(cards) {
  if (!Array.isArray(cards) || cards.length !== 13) {
    return { head: [], main: [], tail: [] };
  }
  let left = [...cards];
  let tail = [], main = [], head = [];

  // 1. 尾道优先顺子
  let straight5 = findStraight(left,5);
  if (straight5) {
    tail = straight5;
    left = left.filter(c=>!tail.includes(c));
  } else {
    // 尾道优先炸弹
    let bomb = findOfAKind(left,4);
    if (bomb.length===4) {
      tail = bomb;
      left = left.filter(c=>!tail.includes(c));
      // 补最大单牌
      tail = tail.concat(sortByPointDesc(left).slice(0,1));
      left = left.filter(c=>!tail.includes(c));
      // 再补最大二张
      if (tail.length<5) {
        let rest = sortByPointDesc(left).slice(0,5-tail.length);
        tail = tail.concat(rest);
        left = left.filter(c=>!tail.includes(c));
      }
    } else {
      // 尾道优先三条
      let trips = findOfAKind(left,3);
      if (trips.length===3) {
        tail = trips;
        left = left.filter(c=>!tail.includes(c));
        tail = tail.concat(sortByPointDesc(left).slice(0,2));
        left = left.filter(c=>!tail.includes(c));
      } else {
        // 尾道优先两对
        let pair1 = findOfAKind(left,2);
        if (pair1.length===2) {
          left = left.filter(c=>!pair1.includes(c));
          let pair2 = findOfAKind(left,2);
          if (pair2.length===2) {
            tail = pair1.concat(pair2);
            left = left.filter(c=>!pair2.includes(c));
            tail = tail.concat(sortByPointDesc(left).slice(0,1));
            left = left.filter(c=>!tail.includes(c));
          } else {
            tail = pair1.concat(sortByPointDesc(left).slice(0,3));
            left = left.filter(c=>!tail.includes(c));
          }
        } else {
          // 尾道高牌
          tail = sortByPointDesc(left).slice(0,5);
          left = left.filter(c=>!tail.includes(c));
        }
      }
    }
  }
  // 2. 中道优先顺子
  let straight5m = findStraight(left,5);
  if (straight5m) {
    main = straight5m;
    left = left.filter(c=>!main.includes(c));
  } else {
    // 中道三条
    let trips = findOfAKind(left,3);
    if (trips.length===3) {
      main = trips;
      left = left.filter(c=>!main.includes(c));
      main = main.concat(sortByPointDesc(left).slice(0,2));
      left = left.filter(c=>!main.includes(c));
    } else {
      // 中道两对
      let pair1 = findOfAKind(left,2);
      if (pair1.length===2) {
        left = left.filter(c=>!pair1.includes(c));
        let pair2 = findOfAKind(left,2);
        if (pair2.length===2) {
          main = pair1.concat(pair2);
          left = left.filter(c=>!pair2.includes(c));
          main = main.concat(sortByPointDesc(left).slice(0,1));
          left = left.filter(c=>!main.includes(c));
        } else {
          main = pair1.concat(sortByPointDesc(left).slice(0,3));
          left = left.filter(c=>!main.includes(c));
        }
      } else {
        main = sortByPointDesc(left).slice(0,5);
        left = left.filter(c=>!main.includes(c));
      }
    }
  }
  // 3. 头道优先三条、对子
  let headTrips = findOfAKind(left,3);
  if (headTrips.length===3) {
    head = headTrips;
  } else {
    let headPair = findOfAKind(left,2);
    if (headPair.length===2) {
      head = headPair.concat(sortByPointDesc(left.filter(c=>!headPair.includes(c))).slice(0,1));
    } else {
      head = sortByPointDesc(left).slice(0,3);
    }
  }

  // 4. 检查倒水（点数和），如有则交换头道与中道、尾道
  const power = arr => arr.map(c=>CARD_ORDER[parseCard(c).rank]).reduce((a,b)=>a+b,0);
  let tailPower = power(tail), mainPower = power(main), headPower = power(head);
  let tryCount = 0;
  while ((tailPower < mainPower || mainPower < headPower) && tryCount < 8) {
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

  return {
    head,
    main,
    tail
  };
}
