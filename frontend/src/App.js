import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './index.css';

function App() {
  const [playerCards, setPlayerCards] = useState([]);
  const [topPile, setTopPile] = useState([]);
  const [middlePile, setMiddlePile] = useState([]);
  const [bottomPile, setBottomPile] = useState([]);
  const [playerName, setPlayerName] = useState('玩家1');
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, completed

  // 初始化游戏
  const initGame = () => {
    const initialCards = generateInitialCards();
    setPlayerCards(initialCards);
    setTopPile([]);
    setMiddlePile([]);
    setBottomPile([]);
    setGameStatus('playing');
  };

  // 生成初始牌组
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

  // 处理拖放操作
  const handleDrop = (pile, card) => {
    if (pile === 'top' && topPile.length >= 3) return;
    if (pile === 'bottom' && bottomPile.length >= 5) return;

    setPlayerCards(prev => prev.filter(c => c.id !== card.id));
    switch (pile) {
      case 'top':
        setTopPile(prev => [...prev, card]);
        break;
      case 'middle':
        setMiddlePile(prev => [...prev, card]);
        break;
      case 'bottom':
        setBottomPile(prev => [...prev, card]);
        break;
      default:
        break;
    }
  };

  // AI自动分牌（修复：只分配剩余手牌，合并到已分区）
  const handleAIDivide = async () => {
    setGameStatus('dividing');
    setTimeout(() => {
      // 1. 保留已分区的牌
      const currentTop = [...topPile];
      const currentMiddle = [...middlePile];
      const currentBottom = [...bottomPile];
      const remainingCards = [...playerCards];

      // 2. 分配剩余未分的牌
      const sortedCards = [...remainingCards].sort((a, b) =>
        cardValue(b.value) - cardValue(a.value)
      );
      const topNeed = 3 - currentTop.length;
      const middleNeed = 5 - currentMiddle.length;
      const bottomNeed = 5 - currentBottom.length;

      // 防止负数，优先分底道，再中道，再头道
      const bottomAI = bottomNeed > 0 ? sortedCards.splice(0, bottomNeed) : [];
      const middleAI = middleNeed > 0 ? sortedCards.splice(0, middleNeed) : [];
      const topAI = topNeed > 0 ? sortedCards.splice(0, topNeed) : [];

      setTopPile([...currentTop, ...topAI]);
      setMiddlePile([...currentMiddle, ...middleAI]);
      setBottomPile([...currentBottom, ...bottomAI]);
      setPlayerCards([]);
      setGameStatus('completed');
    }, 1500);
  };

  // 计算牌面值
  const cardValue = (value) => {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    return values[value] || 0;
  };

  // 重置游戏
  const resetGame = () => {
    initGame();
  };

  useEffect(() => {
    initGame();
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
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
              playerCards={playerCards}
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
    </DndProvider>
  );
}

export default App;
