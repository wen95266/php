import React from 'react';

const Card = ({ card, disabled, onClick }) => {
  return (
    <div
      className={`card ${disabled ? 'disabled' : ''}`}
      style={{ opacity: disabled ? 0.7 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={!disabled ? onClick : undefined}
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
