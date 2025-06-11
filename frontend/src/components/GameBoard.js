import React from 'react';
import Pile from './Pile';

const GameBoard = ({
  topPile,
  middlePile,
  bottomPile,
  playerCards,
  onCardPlace,
  gameStatus
}) => {
  // 点击手牌时，选择目标区
  return (
    <div className="game-board">
      {/* 头道 */}
      <Pile
        title="头道"
        cards={topPile}
        pileType="top"
        maxCards={3}
        gameStatus={gameStatus}
        onCardClick={null}
      />
      {/* 中道 */}
      <Pile
        title="中道"
        cards={middlePile}
        pileType="middle"
        maxCards={5}
        gameStatus={gameStatus}
        onCardClick={null}
      />
      {/* 尾道 */}
      <Pile
        title="尾道"
        cards={bottomPile}
        pileType="bottom"
        maxCards={5}
        gameStatus={gameStatus}
        onCardClick={null}
      />
      {/* 手牌区（点击出牌） */}
      <Pile
        title="手牌"
        cards={playerCards}
        pileType="hand"
        maxCards={13}
        gameStatus={gameStatus}
        onCardClick={card => onCardPlace(card)}
      />
      <div className="game-status">
        {gameStatus === 'dividing' && (
          <div className="ai-dividing">
            <div className="spinner"></div>
            <p>AI正在分牌中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
