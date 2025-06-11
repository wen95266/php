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

  // 修复拖拽后图片不显示：始终用/cards/前缀
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
        onError={e => { e.target.style.display = 'none'; }} // 防止加载失败显示空白
      />
    </div>
  );
};

export default Card;
