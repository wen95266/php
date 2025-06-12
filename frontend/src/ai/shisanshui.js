// 十三水极致AI分牌：全排列+强力剪枝+牌型优先+高性能
// 能自动识别炸弹、葫芦、顺子、同花、三条、两对、对子、最大牌型，输出最优不倒水组合。

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};

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
function sortByPointDesc(cards) {
  return [...cards].sort((a, b) => parseCard(b).point - parseCard(a).point);
}
function findNOfAKind(cards, n) {
  let counts = countByRank(cards);
  let result = [];
  for (let r in counts) if (counts[r]===n) {
    result.push(cards.filter(x=>parseCard(x).rank===r));
  }
  return result;
}
function findPairs(cards) { return findNOfAKind(cards, 2); }
function findTrips(cards) { return findNOfAKind(cards, 3); }
function findBombs(cards) { return findNOfAKind(cards, 4); }
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

// 牌力评分（已分牌型优先级，点数补充）
function handScore(cards){
  if(cards.length===5){
    if(findBombs(cards).length) return 800000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findFullHouse(cards).length===5) return 700000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findFlush(cards,5).length===5 && findStraight(cards,5).length===5) return 650000 + Math.max(...cards.map(c=>parseCard(c).point)); //同花顺
    if(findFlush(cards,5).length===5) return 600000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findStraight(cards,5).length===5) return 500000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findTrips(cards).length) return 400000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length>=2) return 300000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length===1) return 200000 + Math.max(...cards.map(c=>parseCard(c).point));
    return 100000 + Math.max(...cards.map(c=>parseCard(c).point));
  }else if(cards.length===3){
    if(findTrips(cards).length) return 4000 + Math.max(...cards.map(c=>parseCard(c).point));
    if(findPairs(cards).length) return 2000 + Math.max(...cards.map(c=>parseCard(c).point));
    return 1000 + Math.max(...cards.map(c=>parseCard(c).point));
  }
  return 0;
}

// 快速组合算法（n个元素的所有组合，最大数量剪枝）
function k_combinations(set, k, limit=2000) {
  if (k > set.length || k === 0) return [];
  if (k === set.length) return [set];
  let combs = [];
  function helper(start, path) {
    if (combs.length >= limit) return;
    if (path.length === k) { combs.push(path.slice()); return; }
    for (let i = start; i < set.length; i++) {
      path.push(set[i]);
      helper(i+1, path);
      path.pop();
      if (combs.length >= limit) break;
    }
  }
  helper(0, []);
  return combs;
}

// 优先提取所有大牌型（炸弹、同花顺、同花、顺子、葫芦、三条、两对、对子），并尝试分配到尾道/中道
function extractAllCombos(cards) {
  let combos = [];
  // 炸弹
  let bombs = findBombs(cards);
  for(let bomb of bombs) combos.push({type:"bomb", cards:bomb});
  // 同花顺
  let flush = findFlush(cards,5);
  let straight = findStraight(flush,5);
  if(flush.length===5 && straight.length===5) combos.push({type:"straight_flush", cards:flush});
  // 同花
  if(flush.length===5) combos.push({type:"flush", cards:flush});
  // 顺子
  let str = findStraight(cards,5);
  if(str.length===5) combos.push({type:"straight", cards:str});
  // 葫芦
  let fh = findFullHouse(cards);
  if(fh.length===5) combos.push({type:"fullhouse", cards:fh});
  // 三条
  let trips = findTrips(cards);
  for(let t of trips) combos.push({type:"trips", cards:t});
  // 两对
  let pairs = findPairs(cards);
  if(pairs.length>=2) combos.push({type:"twopairs", cards:pairs[0].concat(pairs[1])});
  // 对子
  if(pairs.length) combos.push({type:"pair", cards:pairs[0]});
  return combos;
}

// 极致AI分牌主函数
export function aiSplit(cards){
  if(!Array.isArray(cards)||cards.length!==13) return {head:[],main:[],tail:[]};
  let best = null, bestScore = -1;

  // 第一轮，全排列剪枝法（尾、中道最多各2000种）
  let tailCombs = k_combinations(cards, 5, 2000);
  for(let tail of tailCombs){
    let left8 = cards.filter(c=>!tail.includes(c));
    let mainCombs = k_combinations(left8, 5, 100);
    for(let main of mainCombs){
      let head = left8.filter(c=>!main.includes(c));
      if(head.length!==3) continue;
      // 不倒水
      let h = handScore(head), m = handScore(main), t = handScore(tail);
      if(t < m || m < h) continue;
      // 极致评分：大牌型优先，点数次之
      // 尾道权重最高
      let total = h + m*1.5 + t*2 + t*0.01 + m*0.003 + h*0.0001;
      if(total > bestScore){
        best = {head, main, tail};
        bestScore = total;
      }
    }
  }

  // 第二轮，若未找到合规方案（极少数情况），用大牌型优先法兜底
  if(!best){
    // 优先炸弹/同花顺/同花/顺子/葫芦/三条/两对/对子分配到尾道>中道>头道
    let c = [...cards];
    let tail = [], main = [], head = [];
    let combos = extractAllCombos(c);

    // 尾道优先
    for(let type of ["bomb","straight_flush","flush","straight","fullhouse","trips","twopairs","pair"]) {
      let found = combos.find(x=>x.type===type && x.cards.length===5);
      if(found) { tail = found.cards; c = c.filter(k=>!tail.includes(k)); break; }
    }
    if(tail.length<5) { tail = sortByPointDesc(c).slice(0,5); c = c.filter(k=>!tail.includes(k)); }

    // 中道优先
    combos = extractAllCombos(c);
    for(let type of ["bomb","straight_flush","flush","straight","fullhouse","trips","twopairs","pair"]) {
      let found = combos.find(x=>x.type===type && x.cards.length===5);
      if(found) { main = found.cards; c = c.filter(k=>!main.includes(k)); break; }
    }
    if(main.length<5) { main = sortByPointDesc(c).slice(0,5); c = c.filter(k=>!main.includes(k)); }

    // 头道
    head = sortByPointDesc(c).slice(0,3);

    best = {head, main, tail};
  }
  return best;
}
