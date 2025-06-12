// 十三水极致智能分牌AI
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

// 牌型评分函数（大牌型优先，点数为次）
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

// 枚举所有5张组合（前1000高分剪枝）
function topKCombinations(cards, k, topN=1000) {
  let res = [];
  const n = cards.length;
  function dfs(start, path) {
    if (path.length === k) {
      res.push(path.slice());
      return;
    }
    for (let i = start; i < n; ++i) {
      path.push(cards[i]);
      dfs(i + 1, path);
      path.pop();
      if (res.length >= topN) return;
    }
  }
  dfs(0, []);
  // 按牌型分数降序，仅保留topN
  return res.map(c => ({c, s: handScore(c)}))
            .sort((a, b) => b.s - a.s)
            .slice(0, topN)
            .map(x => x.c);
}

// AI分牌主函数
export function aiSplit(cards){
  if(!Array.isArray(cards)||cards.length!==13) return {head:[],main:[],tail:[]};
  let best = null, bestScore = -1;
  // 尾道所有高分5张组合（最多1000种）
  let tailCombs = topKCombinations(cards, 5, 1000);
  for(let tail of tailCombs){
    let left8 = cards.filter(c=>!tail.includes(c));
    // 中道所有高分5张组合（最多100种）
    let mainCombs = topKCombinations(left8, 5, 100);
    for(let main of mainCombs){
      let head = left8.filter(c=>!main.includes(c));
      if(head.length!==3) continue;
      // 不倒水
      let h = handScore(head), m = handScore(main), t = handScore(tail);
      if(t < m || m < h) continue;
      // 评分：尾道权重最高
      let total = h + m*1.5 + t*2 + t*0.01 + m*0.003 + h*0.0001;
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
