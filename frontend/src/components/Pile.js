import React from 'react';
import Card from './Card';
import { useDrop } from 'react-dnd';

const Pile = ({ title, cards, onDrop, pileType, maxCards, gameStatus }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CARD',
    drop: (item) => onDrop(pileType, item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const isFull = cards.length >= maxCards;
  const pileClass = isFull ? 'pile full' : 'pile';
  const pileStyle = {
    backgroundColor: isOver ? '#4a5568' : '#2d3748',
    border: isOver ? '2px dashed #63b3ed' : '2px solid #4a5568',
  };

  return (
    <div className={pileClass} style={pileStyle} ref={drop}>
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
          />
        ))}
        
        {cards.length === 0 && (
          <div className="empty-pile">拖拽扑克牌到此处</div>
        )}
        
        {isFull && (
          <div className="pile-full-message">此区域已满</div>
        )}
      </div>
    </div>
  );
};

export default Pile;
