// 十三水AI分牌 - 进阶优化版
// 优先识别炸弹、葫芦、同花、顺子、三条、两对、对子，确保不倒水，搜索多种组合评分选最优

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

function countByRank(cards) {
  const c = {};
  for (const x of cards) {
    const r = parseCard(x).rank;
    c[r] = (c[r]||0)+1;
  }
  return c;
}
function findNOfAKind(cards, n) {
  let counts = countByRank(cards);
  let result = [];
  for (let r in counts) if (counts[r]===n) {
    result.push(cards.filter(x=>parseCard(x).rank===r));
  }
  return result;
}
function findPairs(cards) {
  return findNOfAKind(cards, 2);
}
function findTrips(cards) {
  return findNOfAKind(cards, 3);
}
function findBombs(cards) {
  return findNOfAKind(cards, 4);
}
function findFullHouse(cards) {
  let trips = findTrips(cards);
  for (let t of trips) {
    let left = cards.filter(c=>!t.includes(c));
    let pairs = findPairs(left);
    if (pairs.length) return t.concat(pairs[0]);
  }
  return [];
}
function findFlush(cards, want=5) {
  let s = {};
  for(const c of cards){
    let suit = parseCard(c).suit;
    s[suit] = (s[suit]||[]).concat([c]);
  }
  for(let k in s) if(s[k].length>=want) return s[k].slice(0,want);
  return [];
}
function findStraight(cards, want=5) {
  let pts = uniq(cards.map(c=>parseCard(c).point)).sort((a,b)=>a-b);
  for(let i=pts.length-want; i>=0; i--){
    let seq = pts.slice(i,i+want);
    if(seq[want-1]-seq[0]===want-1){
      let used={}, arr=[];
      for(let pt of seq){
        let c = cards.find(x=>parseCard(x).point===pt && !used[x]);
        if(c) { arr.push(c); used[c]=1; }
      }
      if(arr.length===want) return arr;
    }
  }
  // A2345顺子
  if(pts.includes(14) && pts.includes(2)&&pts.includes(3)&&pts.includes(4)&&pts.includes(5)){
    let used={}, arr=[];
    for(let pt of [5,4,3,2,14]){
      let c = cards.find(x=>parseCard(x).point===pt && !used[x]);
      if(c) { arr.push(c); used[c]=1; }
    }
    if(arr.length===want) return arr;
  }
  return [];
}
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => parseCard(b).point - parseCard(a).point);
}

// 综合牌力打分（可根据需要调整权重）
function handScore(cards){
  if(cards.length===5){
    if(findBombs(cards).length) return 80000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findFullHouse(cards).length===5) return 70000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findFlush(cards,5).length===5) return 60000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findStraight(cards,5).length===5) return 50000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findTrips(cards).length) return 40000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length>=2) return 30000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length===1) return 20000 + Math.max(...cards.map(c=>parseCard(c).point));
    return 10000 + Math.max(...cards.map(c=>parseCard(c).point));
  }else if(cards.length===3){
    if(findTrips(cards).length) return 4000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length) return 2000 + Math.max(...cards.map(c=>parseCard(c).point));
    return 1000 + Math.max(...cards.map(c=>parseCard(c).point));
  }
  return 0;
}

// 多种分法全排列尝试，选最优
function combine(arr, n) {
  if (n === 0) return [[]];
  if (arr.length < n) return [];
  if (arr.length === n) return [arr];
  let res = [];
  for (let i = 0; i <= arr.length - n; i++) {
    let head = arr[i];
    let tailComb = combine(arr.slice(i+1), n-1);
    for (let t of tailComb) res.push([head, ...t]);
  }
  return res;
}

export function aiSplit(cards){
  if(!Array.isArray(cards)||cards.length!==13) return {head:[],main:[],tail:[]};
  let best = null, bestScore = -1;

  // Step1: 枚举所有尾道的合理5张组合（优先炸弹>葫芦>同花>顺>三条>两对>对子>高牌）
  let triedTail = new Set();
  let tailCandidates = [];
  let bomb = findBombs(cards);
  if(bomb.length) tailCandidates.push(bomb[0]);
  else {
    let fh = findFullHouse(cards);
    if(fh.length) tailCandidates.push(fh);
    let flush = findFlush(cards,5);
    if(flush.length) tailCandidates.push(flush);
    let straight = findStraight(cards,5);
    if(straight.length) tailCandidates.push(straight);
    let trips = findTrips(cards);
    if(trips.length) tailCandidates.push(trips[0].concat(combine(cards.filter(c=>!trips[0].includes(c)),2)[0]));
    let pairs = findPairs(cards);
    if(pairs.length>=2) tailCandidates.push(pairs[0].concat(pairs[1]).concat(combine(cards.filter(c=>!pairs[0].includes(c)&&!pairs[1].includes(c)),1)[0]));
    if(pairs.length===1) tailCandidates.push(pairs[0].concat(combine(cards.filter(c=>!pairs[0].includes(c)),3)[0]));
  }
  tailCandidates.push(sortByPointDesc(cards).slice(0,5));

  // 尾道候选去重
  let uniqTail = [];
  for(let t of tailCandidates) {
    if(t && t.length===5){
      let key = t.slice().sort().join(',');
      if(!triedTail.has(key)) { uniqTail.push(t); triedTail.add(key);}
    }
  }

  // Step2: 对每个尾道，枚举所有可能的中道
  for(let tail of uniqTail){
    let left8 = cards.filter(c=>!tail.includes(c));
    let mainCandidates = [];
    let bombM = findBombs(left8);
    if(bombM.length) mainCandidates.push(bombM[0]);
    else {
      let fhM = findFullHouse(left8);
      if(fhM.length) mainCandidates.push(fhM);
      let flushM = findFlush(left8,5);
      if(flushM.length) mainCandidates.push(flushM);
      let straightM = findStraight(left8,5);
      if(straightM.length) mainCandidates.push(straightM);
      let tripsM = findTrips(left8);
      if(tripsM.length) mainCandidates.push(tripsM[0].concat(combine(left8.filter(c=>!tripsM[0].includes(c)),2)[0]));
      let pairsM = findPairs(left8);
      if(pairsM.length>=2) mainCandidates.push(pairsM[0].concat(pairsM[1]).concat(combine(left8.filter(c=>!pairsM[0].includes(c)&&!pairsM[1].includes(c)),1)[0]));
      if(pairsM.length===1) mainCandidates.push(pairsM[0].concat(combine(left8.filter(c=>!pairsM[0].includes(c)),3)[0]));
    }
    mainCandidates.push(sortByPointDesc(left8).slice(0,5));

    // 中道去重
    let triedMain = new Set();
    let uniqMain = [];
    for(let m of mainCandidates){
      if(m && m.length===5){
        let key = m.slice().sort().join(',');
        if(!triedMain.has(key)) { uniqMain.push(m); triedMain.add(key);}
      }
    }

    // Step3: 对头道所有分法
    for(let main of uniqMain){
      let left3 = left8.filter(c=>!main.includes(c));
      if(left3.length!==3) continue;
      let head = findTrips(left3)[0] || findPairs(left3)[0] || sortByPointDesc(left3);
      head = head.slice(0,3);

      // 不倒水约束
      let h = handScore(head), msc = handScore(main), t = handScore(tail);
      if(t < msc || msc < h) continue;
      let total = h + msc + t + t*0.01 + msc*0.002 + h*0.0001; // 保证权重大牌优先
      if(total > bestScore){
        best = {head, main, tail};
        bestScore = total;
      }
    }
  }

  // fallback
  if(!best){
    let sorted = sortByPointDesc(cards);
    best = {
      head: sorted.slice(10,13),
      main: sorted.slice(5,10),
      tail: sorted.slice(0,5)
    };
  }
  return best;
}
