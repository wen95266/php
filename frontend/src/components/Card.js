import React from 'react';
import { useDrag } from 'react-dnd';

const Card = ({ card, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CARD',
    item: { id: card.id, value: card.value, suit: card.suit },
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      className={`card ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <img 
        src={`/cards/${card.image}`} 
        alt={`${card.value} of ${card.suit}`}
        className="card-image"
      />
      <div className="card-value">{card.value.toUpperCase()}</div>
    </div>
  );
};

export default Card;
