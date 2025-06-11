import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import './index.css';

// --- 牌型辅助函数 ---
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
  // 处理A2345
  const isLowAceStraight = vals.join(',') === '2,3,4,5,14';
  if (isLowAceStraight) return true;
  for (let i = 1; i < vals.length; ++i) if (vals[i] !== vals[i - 1] + 1) return false;
  return true;
};
const isStraightFlush = cards => isFlush(cards) && isStraight(cards);
const getHandRank = (cards) => {
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (cards.length < 3) return 0;
  if (cards.length === 3) {
    if (vcnt[0] === 3) return 3; // 三条
    if (vcnt[0] === 2) return 1; // 一对
    return 0; // 高牌
  }
  if (isStraightFlush(cards)) return 8; // 同花顺
  if (vcnt[0] === 4) return 7; // 四条
  if (vcnt[0] === 3 && vcnt[1] === 2) return 6; // 葫芦
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 4;
  if (vcnt[0] === 3) return 3;
  if (vcnt[0] === 2 && vcnt[1] === 2) return 2;
  if (vcnt[0] === 2) return 1;
  return 0;
};
const handRankName = ['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'];

// --- 高效AI分牌 ---
// 剪枝：只取最强的部分组合，大幅提升性能
function bestDivisionEfficient(cards) {
  const N = 40; // 尾道剪枝数量
  const M = 30; // 中道剪枝数量

  function combinations(arr, k) {
    let res = [];
    function dfs(start, path) {
      if (path.length === k) { res.push([...path]); return; }
      for (let i = start; i < arr.length; ++i) {
        path.push(arr[i]);
        dfs(i + 1, path);
        path.pop();
      }
    }
    dfs(0, []);
    return res;
  }

  const idxArr = Array.from({ length: 13 }, (_, i) => i);
  let bottomComb = combinations(idxArr, 5);
  bottomComb.sort((a, b) => {
    const ca = a.map(i => cards[i]);
    const cb = b.map(i => cards[i]);
    const ra = getHandRank(ca), rb = getHandRank(cb);
    if (rb !== ra) return rb - ra;
    const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
    const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
    return sumb - suma;
  });
  bottomComb = bottomComb.slice(0, N);

  let maxScore = -Infinity;
  let best = { top: [], middle: [], bottom: [] };

  for (const bottomIdxs of bottomComb) {
    const usedB = new Set(bottomIdxs);
    const left1 = idxArr.filter(i => !usedB.has(i));
    let middleComb = combinations(left1, 5);
    middleComb.sort((a, b) => {
      const ca = a.map(i => cards[i]);
      const cb = b.map(i => cards[i]);
      const ra = getHandRank(ca), rb = getHandRank(cb);
      if (rb !== ra) return rb - ra;
      const suma = ca.reduce((s, c) => s + valueMap[c.value], 0);
      const sumb = cb.reduce((s, c) => s + valueMap[c.value], 0);
      return sumb - suma;
    });
    middleComb = middleComb.slice(0, M);

    for (const middleIdxs of middleComb) {
      const usedM = new Set(middleIdxs);
      const topIdxs = left1.filter(i => !usedM.has(i));
      if (topIdxs.length !== 3) continue;
      const bottom = bottomIdxs.map(i => cards[i]);
      const middle = middleIdxs.map(i => cards[i]);
      const top = topIdxs.map(i => cards[i]);
      const br = getHandRank(bottom), mr = getHandRank(middle), tr = getHandRank(top);
      if (br < mr || mr < tr) continue;
      const bval = bottom.reduce((s, c) => s + valueMap[c.value], 0);
      const mval = middle.reduce((s, c) => s + valueMap[c.value], 0);
      const tval = top.reduce((s, c) => s + valueMap[c.value], 0);
      const score = br * 100000 + mr * 10000 + tr * 1000 + bval * 100 + mval * 10 + tval;
      if (score > maxScore) {
        maxScore = score;
        best = { top, middle, bottom };
      }
    }
  }
  return best;
}

// --- 统计 ---
function getInitialStats() {
  return {
    totalGames: 0,
    aiDivides: 0,
    lastResult: null,
  };
}

function App() {
  const [topPile, setTopPile] = useState([]);
  const [middlePile, setMiddlePile] = useState([]);
  const [bottomPile, setBottomPile] = useState([]);
  const [playerName] = useState('玩家1');
  const [gameStatus, setGameStatus] = useState('waiting');
  const [stats, setStats] = useState(getInitialStats());

  // 初始化
  const initGame = () => {
    const initialCards = generateInitialCards();
    setTopPile([]);
    setMiddlePile(initialCards);
    setBottomPile([]);
    setGameStatus('playing');
    setStats(s => ({ ...s, totalGames: s.totalGames + 1, lastResult: null }));
  };

  // 生成13张随机牌
  const generateInitialCards = () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const cards = [];
    suits.forEach(suit => {
      values.forEach(value => {
        cards.push({
          id: `${value}_of_${suit}`,
          value,
          suit,
          image: `${value}_of_${suit}.svg`
        });
      });
    });
    return cards.sort(() => Math.random() - 0.5).slice(0, 13);
  };

  // 任意区域之间拖拽
  const handleDrop = (target, card, from) => {
    if (from === target) return;
    if (from === 'top') setTopPile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'middle') setMiddlePile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'bottom') setBottomPile(prev => prev.filter(c => c.id !== card.id));
    if (target === 'top') setTopPile(prev => [...prev, card]);
    if (target === 'middle') setMiddlePile(prev => [...prev, card]);
    if (target === 'bottom') setBottomPile(prev => [...prev, card]);
  };

  // 高效AI分牌
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setTimeout(() => {
      const all = [...topPile, ...middlePile, ...bottomPile];
      if (all.length !== 13) {
        setGameStatus('playing');
        alert('牌数量不是13，无法AI分牌');
        return;
      }
      const result = bestDivisionEfficient(all);
      setTopPile(result.top);
      setMiddlePile(result.middle);
      setBottomPile(result.bottom);
      setGameStatus('completed');
      setStats(s => ({
        ...s,
        aiDivides: s.aiDivides + 1,
        lastResult: {
          top: handRankName[getHandRank(result.top)],
          middle: handRankName[getHandRank(result.middle)],
          bottom: handRankName[getHandRank(result.bottom)]
        }
      }));
    }, 400); // 更快
  };

  const resetGame = () => initGame();

  useEffect(() => {
    initGame();
    // eslint-disable-next-line
  }, []);

  // 统计区块
  const StatsPanel = () => (
    <div style={{
      background: '#222c36',
      color: '#fff',
      borderRadius: 8,
      padding: 12,
      maxWidth: 400,
      margin: '12px auto',
      fontSize: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <div>总局数：{stats.totalGames}</div>
      <div>AI智能分牌次数：{stats.aiDivides}</div>
      {stats.lastResult && (
        <div style={{marginTop:8}}>
          <div>上局AI牌型：</div>
          <div>头道：{stats.lastResult.top}</div>
          <div>中道：{stats.lastResult.middle}</div>
          <div>尾道：{stats.lastResult.bottom}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="game-info">
          <PlayerInfo name={playerName} status={gameStatus} />
        </div>
      </header>
      <main className="game-container new-horizontal-layout">
        <div className="main-board-column">
          <GameBoard
            topPile={topPile}
            middlePile={middlePile}
            bottomPile={bottomPile}
            onDrop={handleDrop}
            gameStatus={gameStatus}
          />
          <div className="ai-banner">
            <AIControl
              onAIDivide={handleAIDivide}
              onReset={resetGame}
              gameStatus={gameStatus}
            />
          </div>
          <StatsPanel />
        </div>
      </main>
    </div>
  );
}

export default App;
