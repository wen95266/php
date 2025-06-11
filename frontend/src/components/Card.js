import React from 'react';
import { useDrag } from 'react-dnd';

const Card = ({ card, from, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CARD',
    item: { card, from },
    canDrag: !disabled,
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [card, from, disabled]);

  return (
    <div
      ref={drag}
      className={`card ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'grab' }}
    >
      <img
        src={`/cards/${card.image}`}
        alt={`${card.value} of ${card.suit}`}
        className="card-image"
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
};

export default Card;
