// 十三水AI分牌 - 升级版
// 优先识别炸弹、葫芦、顺子、同花、三条、两对、对子、最大牌
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
// --- 识别各种牌型 ---
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
  for (let r in counts) if (counts[r]===n) {
    return cards.filter(x=>parseCard(x).rank===r);
  }
  return [];
}
function findPairs(cards) {
  let counts = countByRank(cards), arr=[];
  for(let r in counts) if(counts[r]===2) arr.push(cards.filter(x=>parseCard(x).rank===r));
  return arr;
}
function findTrips(cards) {
  let counts = countByRank(cards), arr=[];
  for(let r in counts) if(counts[r]===3) arr.push(cards.filter(x=>parseCard(x).rank===r));
  return arr;
}
function findBomb(cards) { // 炸弹
  return findNOfAKind(cards,4);
}
function findFullHouse(cards) {
  let trips = findTrips(cards);
  if(!trips.length) return [];
  let left = cards.filter(c=>!trips[0].includes(c));
  let pairs = findPairs(left);
  if(pairs.length) return trips[0].concat(pairs[0]);
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
  // A2345
  if(pts.includes(14) && pts.includes(2)&&pts.includes(3)&&pts.includes(4)&&pts.includes(5)){
    let used={}, arr=[];
    for(let pt of [14,5,4,3,2]){
      let c = cards.find(x=>parseCard(x).point===pt && !used[x]);
      if(c) { arr.push(c); used[c]=1; }
    }
    if(arr.length===want) return arr;
  }
  return [];
}
function handScore(cards){
  if(cards.length===5){
    if(findBomb(cards).length===4) return 80000 + Math.max(...cards.map(c=>parseCard(c).point));
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
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => parseCard(b).point - parseCard(a).point);
}

// --- AI分牌主函数 ---
export function aiSplit(cards){
  if(!Array.isArray(cards)||cards.length!==13) return {head:[],main:[],tail:[]};
  let best = null, bestScore = -1;
  // 尾道优先找炸弹、葫芦、同花、顺子、三条、两对、对子
  let tailTypes = [
    ()=>findBomb(cards),
    ()=>findFullHouse(cards),
    ()=>findFlush(cards,5),
    ()=>findStraight(cards,5),
    ()=>findTrips(cards)[0]||[],
    ()=>findPairs(cards).flat().slice(0,4), //两对
    ()=>findPairs(cards)[0]||[],
    ()=>[]
  ];
  for(let getTail of tailTypes){
    let tail = getTail();
    if(tail.length<5) tail = sortByPointDesc(cards).slice(0,5);
    let left8 = cards.filter(c=>!tail.includes(c));
    // 中道找炸弹、葫芦、同花、顺子、三条、两对、对子
    let mainTypes = [
      ()=>findBomb(left8),
      ()=>findFullHouse(left8),
      ()=>findFlush(left8,5),
      ()=>findStraight(left8,5),
      ()=>findTrips(left8)[0]||[],
      ()=>findPairs(left8).flat().slice(0,4),
      ()=>findPairs(left8)[0]||[],
      ()=>[]
    ];
    for(let getMain of mainTypes){
      let main = getMain();
      if(main.length<5) main = sortByPointDesc(left8).slice(0,5);
      let left3 = left8.filter(c=>!main.includes(c));
      // 头道找三条、对子
      let head = findTrips(left3)[0] || findPairs(left3)[0] || sortByPointDesc(left3);
      head = head.slice(0,3);
      // 不倒水
      let h = handScore(head), m = handScore(main), t = handScore(tail);
      if(t < m || m < h) continue;
      let total = h + m + t;
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
