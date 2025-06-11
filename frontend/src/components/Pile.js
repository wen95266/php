import React from 'react';
import Card from './Card';
import { useDrop } from 'react-dnd';

const Pile = ({ title, cards, pileType, onDrop, gameStatus }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CARD',
    drop: (item) => {
      onDrop && onDrop(pileType, item.card, item.from);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver(),
    }),
  }), [pileType, onDrop]);

  return (
    <div className="pile" ref={drop} style={{ background: isOver ? '#4a5568' : undefined }}>
      <div className="pile-header">
        <h3>{title}</h3>
        <span>({cards.length})</span>
      </div>
      <div className="cards-container">
        {cards.map((card, idx) => (
          <Card
            key={`${card.id}-${idx}`}
            card={card}
            from={pileType}
            disabled={gameStatus === 'completed'}
          />
        ))}
        {cards.length === 0 && (
          <div className="empty-pile">拖拽扑克牌到此处</div>
        )}
      </div>
    </div>
  );
};

export default Pile;
