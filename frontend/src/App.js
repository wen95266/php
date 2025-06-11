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
    // 模拟从后端获取牌组
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
    
    // 随机洗牌
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
    
    // 检查是否完成分牌
    if (topPile.length === 2 && card.pile === 'top' && bottomPile.length === 5) {
      setMiddlePile(playerCards);
      setPlayerCards([]);
    }
  };

  // AI自动分牌
  const handleAIDivide = async () => {
    setGameStatus('dividing');
    setTimeout(() => {
      const sortedCards = [...playerCards].sort((a, b) => 
        cardValue(b.value) - cardValue(a.value)
      );
      const bottom = sortedCards.slice(0, 5);
      const middle = sortedCards.slice(5, 10);
      const top = sortedCards.slice(10);
      setBottomPile(bottom);
      setMiddlePile(middle);
      setTopPile(top);
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
          {/* 删除大标题 */}
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
              /* 删除分牌完成横幅的展示，已在GameBoard处理显示 */
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
        {/* 删除底部footer */}
      </div>
    </DndProvider>
  );
}

export default App;
