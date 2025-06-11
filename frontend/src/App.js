import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import './index.css';

function App() {
  const [topPile, setTopPile] = useState([]);
  const [middlePile, setMiddlePile] = useState([]);
  const [bottomPile, setBottomPile] = useState([]);
  const [playerName] = useState('玩家1');
  const [gameStatus, setGameStatus] = useState('waiting');

  // 初始化
  const initGame = () => {
    const initialCards = generateInitialCards();
    setTopPile([]);
    setMiddlePile(initialCards); // 初始牌全部放中道
    setBottomPile([]);
    setGameStatus('playing');
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

  // AI分牌
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setTimeout(() => {
      // 合并全部再AI分配
      const all = [...topPile, ...middlePile, ...bottomPile];
      const valueMap = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
      };
      const sorted = all.sort((a, b) => valueMap[b.value] - valueMap[a.value]);
      setTopPile(sorted.slice(10, 13));
      setMiddlePile(sorted.slice(5, 10));
      setBottomPile(sorted.slice(0, 5));
      setGameStatus('completed');
    }, 1200);
  };

  const resetGame = () => initGame();

  useEffect(() => {
    initGame();
  }, []);

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
        </div>
      </main>
    </div>
  );
}

export default App;
