// frontend/src/components/Card.jsx
import React from 'react';
import { getCardImagePath } from '../utils/cardUtils';
import './Card.css'; // We'll add some basic styling

const Card = ({ card, isSelected, onClick, style }) => {
    const imagePath = getCardImagePath(card);
    const cardClass = `game-card ${isSelected ? 'selected' : ''} ${card ? '' : 'facedown'}`;

    return (
        <div className={cardClass} onClick={onClick ? () => onClick(card) : undefined} style={style}>
            <img src={imagePath} alt={card ? `${card.rank} of ${card.suit}` : 'Card Back'} />
        </div>
    );
};

export default Card;
