import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import './index.css';

// AI分牌算法
function getBestAIDivision(cards) {
  const valueMap = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
  };
  const sorted = [...cards].sort((a, b) => valueMap[b.value] - valueMap[a.value]);
  return {
    top: sorted.slice(10, 13),
    middle: sorted.slice(5, 10),
    bottom: sorted.slice(0, 5),
  };
}

function App() {
  const [playerCards, setPlayerCards] = useState([]);
  const [topPile, setTopPile] = useState([]);
  const [middlePile, setMiddlePile] = useState([]);
  const [bottomPile, setBottomPile] = useState([]);
  const [playerName, setPlayerName] = useState('玩家1');
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, completed
  const [selectedZone, setSelectedZone] = useState(null);

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

  // 点击手牌弹出选择区
  const handleCardPlace = (card) => {
    if (!card) return;
    // 简单弹窗，可用更优UI替换
    const pile = window.prompt('放到哪个区？输入: top, middle, bottom');
    if (!pile) return;
    if (pile === 'top' && topPile.length < 3) {
      setPlayerCards(prev => prev.filter(c => c.id !== card.id));
      setTopPile(prev => [...prev, card]);
    } else if (pile === 'middle' && middlePile.length < 5) {
      setPlayerCards(prev => prev.filter(c => c.id !== card.id));
      setMiddlePile(prev => [...prev, card]);
    } else if (pile === 'bottom' && bottomPile.length < 5) {
      setPlayerCards(prev => prev.filter(c => c.id !== card.id));
      setBottomPile(prev => [...prev, card]);
    }
  };

  // 前端AI分牌
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setTimeout(() => {
      const aiResult = getBestAIDivision([
        ...topPile, ...middlePile, ...bottomPile, ...playerCards
      ]);
      setTopPile(aiResult.top);
      setMiddlePile(aiResult.middle);
      setBottomPile(aiResult.bottom);
      setPlayerCards([]);
      setGameStatus('completed');
    }, 1200);
  };

  // 重置游戏
  const resetGame = () => {
    initGame();
  };

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
              playerCards={playerCards}
              onCardPlace={handleCardPlace}
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
