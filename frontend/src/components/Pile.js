import React from 'react';
import Card from './Card';

const Pile = ({ title, cards, onCardClick, pileType, maxCards, gameStatus }) => {
  // 彻底移除拖拽，全部用点击
  const pileClass = 'pile';
  return (
    <div className={pileClass}>
      <div className="pile-header">
        <h3>{title}</h3>
        <span>({cards.length}/{maxCards})</span>
      </div>
      <div className="cards-container">
        {cards.map((card, index) => (
          <Card
            key={`${card.id}-${index}`}
            card={card}
            disabled={gameStatus === 'completed'}
            onClick={() => onCardClick && onCardClick(card)}
          />
        ))}
        {cards.length === 0 && (
          <div className="empty-pile">点击手牌放到此处</div>
        )}
      </div>
    </div>
  );
};

export default Pile;
