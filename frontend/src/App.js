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
const isStraight = cards => {
  if (cards.length < 5) return false;
  const vals = Array.from(new Set(cards.map(c => valueMap[c.value]))).sort((a, b) => a - b);
  if (vals.length !== cards.length) return false;
  for (let i = 1; i < vals.length; ++i) if (vals[i] !== vals[i - 1] + 1) return vals.join(',') === "2,3,4,5,14"; // A2345
  return true;
};
const getHandRank = (cards) => {
  // 返回数字大表示牌型大
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (isFlush(cards) && isStraight(cards)) return 8; // 同花顺
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

// --- 智能AI分牌（最大尾道，同花顺>四条>葫芦>同花>顺子...） ---
function smartDivide(cards) {
  // 枚举尾道5张最大，然后中道5张最大，剩下3张头道
  function combinations(arr, k, start = 0, path = [], res = []) {
    if (path.length === k) { res.push([...path]); return res; }
    for (let i = start; i < arr.length; ++i) {
      path.push(arr[i]);
      combinations(arr, k, i + 1, path, res);
      path.pop();
    }
    return res;
  }
  let maxRank = -1, best = null;
  for (const bottomIdxs of combinations([...Array(cards.length).keys()], 5)) {
    const bottom = bottomIdxs.map(i => cards[i]);
    const left1 = cards.filter((_, i) => !bottomIdxs.includes(i));
    for (const middleIdxs of combinations([...Array(left1.length).keys()], 5)) {
      const middle = middleIdxs.map(i => left1[i]);
      const top = left1.filter((_, i) => !middleIdxs.includes(i));
      // 检查道型强度
      const bottomRank = getHandRank(bottom);
      const middleRank = getHandRank(middle);
      const topRank = getHandRank(top);
      // 十三水要求尾>中>头，但这里只要求最大尾道和最大总rank
      const totalRank = bottomRank * 100 + middleRank * 10 + topRank;
      if (totalRank > maxRank) {
        maxRank = totalRank;
        best = { top, middle, bottom };
      }
    }
  }
  return best || { top: [], middle: [], bottom: [] };
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

  // 智能AI分牌
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setTimeout(() => {
      const all = [...topPile, ...middlePile, ...bottomPile];
      if (all.length !== 13) {
        setGameStatus('playing');
        alert('牌数量不是13，无法AI分牌');
        return;
      }
      const result = smartDivide(all);
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
    }, 1200);
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
