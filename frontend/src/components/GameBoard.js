import React from 'react';
import Pile from './Pile';
import Card from './Card';

const GameBoard = ({ 
  topPile, 
  middlePile, 
  bottomPile, 
  playerCards, 
  onDrop, 
  gameStatus 
}) => {
  return (
    <div className="game-board">
      {/* 头道 - 3张牌 */}
      <Pile 
        title="头道" 
        cards={topPile} 
        onDrop={onDrop} 
        pileType="top" 
        maxCards={3}
        gameStatus={gameStatus}
      />
      
      {/* 中道 - 5张牌 */}
      <Pile 
        title={playerCards.length > 0 ? "手牌" : "中道"} 
        cards={playerCards.length > 0 ? playerCards : middlePile} 
        onDrop={onDrop} 
        pileType={playerCards.length > 0 ? "middle" : "hand"} 
        maxCards={playerCards.length > 0 ? 13 : 5}
        gameStatus={gameStatus}
      />
      
      {/* 尾道 - 5张牌 */}
      <Pile 
        title="尾道" 
        cards={bottomPile} 
        onDrop={onDrop} 
        pileType="bottom" 
        maxCards={5}
        gameStatus={gameStatus}
      />
      
      {/* 状态显示 */}
      <div className="game-status">
        {gameStatus === 'dividing' && (
          <div className="ai-dividing">
            <div className="spinner"></div>
            <p>AI正在分牌中...</p>
          </div>
        )}
        {/* 分牌完成横幅已移除 */}
      </div>
    </div>
  );
};

export default GameBoard;
