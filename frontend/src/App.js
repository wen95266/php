import React, { useState, useEffect, useRef } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import './index.css';

// 牌型辅助
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
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
    if (vcnt[0] === 3) return 3;
    if (vcnt[0] === 2) return 1;
    return 0;
  }
  if (isStraightFlush(cards)) return 8;
  if (vcnt[0] === 4) return 7;
  if (vcnt[0] === 3 && vcnt[1] === 2) return 6;
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 4;
  if (vcnt[0] === 3) return 3;
  if (vcnt[0] === 2 && vcnt[1] === 2) return 2;
  if (vcnt[0] === 2) return 1;
  return 0;
};
const handRankName = ['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'];

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
  const workerRef = useRef(null);
  const [aiLoading, setAiLoading] = useState(false);
  // 新增：多分法支持
  const [aiDivisions, setAiDivisions] = useState([]);
  const [aiDivisionIndex, setAiDivisionIndex] = useState(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./aiWorker.js', import.meta.url));
    return () => { workerRef.current && workerRef.current.terminate(); };
  }, []);

  const initGame = () => {
    const initialCards = generateInitialCards();
    setTopPile([]);
    setMiddlePile(initialCards);
    setBottomPile([]);
    setGameStatus('playing');
    setStats(s => ({ ...s, totalGames: s.totalGames + 1, lastResult: null }));
    setAiDivisions([]);
    setAiDivisionIndex(0);
  };

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

  // 拖拽
  const handleDrop = (target, card, from) => {
    if (from === target) return;
    if (from === 'top') setTopPile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'middle') setMiddlePile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'bottom') setBottomPile(prev => prev.filter(c => c.id !== card.id));
    if (target === 'top') setTopPile(prev => [...prev, card]);
    if (target === 'middle') setMiddlePile(prev => [...prev, card]);
    if (target === 'bottom') setBottomPile(prev => [...prev, card]);
    setAiDivisions([]);
    setAiDivisionIndex(0);
  };

  // WebWorker AI分牌（多分法可切换）
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setAiLoading(true);
    const all = [...topPile, ...middlePile, ...bottomPile];
    if (all.length !== 13) {
      setAiLoading(false);
      setGameStatus('playing');
      alert('牌数量不是13，无法AI分牌');
      return;
    }
    // 如果已有分法可切换，直接切换
    if (aiDivisions.length > 0 && aiDivisionIndex < aiDivisions.length - 1) {
      const nextIndex = aiDivisionIndex + 1;
      const next = aiDivisions[nextIndex];
      setTopPile(next.top);
      setMiddlePile(next.middle);
      setBottomPile(next.bottom);
      setAiDivisionIndex(nextIndex);
      setGameStatus('completed');
      setStats(s => ({
        ...s,
        aiDivides: s.aiDivides + 1,
        lastResult: {
          top: handRankName[getHandRank(next.top)],
          middle: handRankName[getHandRank(next.middle)],
          bottom: handRankName[getHandRank(next.bottom)]
        }
      }));
      setAiLoading(false);
      return;
    }
    // 新请求
    workerRef.current.postMessage({ cards: all });
    workerRef.current.onmessage = (e) => {
      setAiLoading(false);
      const d = e.data;
      if (d.error) {
        setGameStatus('playing');
        alert(d.error);
        return;
      }
      const options = d.results || [];
      if (options.length === 0) {
        setGameStatus('playing');
        alert('AI未能找到合法分法');
        return;
      }
      setAiDivisions(options);
      setAiDivisionIndex(0);
      setTopPile(options[0].top);
      setMiddlePile(options[0].middle);
      setBottomPile(options[0].bottom);
      setGameStatus('completed');
      setStats(s => ({
        ...s,
        aiDivides: s.aiDivides + 1,
        lastResult: {
          top: handRankName[getHandRank(options[0].top)],
          middle: handRankName[getHandRank(options[0].middle)],
          bottom: handRankName[getHandRank(options[0].bottom)]
        }
      }));
    };
  };

  const resetGame = () => {
    setAiDivisions([]);
    setAiDivisionIndex(0);
    initGame();
  };

  useEffect(() => {
    initGame();
    // eslint-disable-next-line
  }, []);

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
          {aiLoading && (
            <div style={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#2ecc71',
              margin: '16px 0'
            }}>AI分牌中，请稍候...</div>
          )}
          <StatsPanel />
        </div>
      </main>
    </div>
  );
}

export default App;
