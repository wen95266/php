import React from 'react';
import { useDrag } from 'react-dnd';

const Card = ({ card, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CARD',
    // 关键：拖拽时带上完整card对象
    item: { card },
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
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
};

export default Card;
