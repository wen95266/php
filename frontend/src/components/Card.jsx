// frontend/src/components/Card.jsx
import React from 'react';
import { getCardImagePath } from '../utils/cardUtils';
import './Card.css';

const Card = ({ card, isSelected, onClick, className, style, facedownProp }) => {
    // 如果 card 对象中有 facedown 属性，则优先使用它
    // 否则，如果 card 为 null 或 undefined，也视为牌背
    const isFaceDown = facedownProp || !card || card.facedown;
    const imagePath = getCardImagePath(isFaceDown ? { facedown: true } : card);
    const cardId = card ? card.id : 'facedown';

    const cardClasses = [
        'game-card',
        className,
        isSelected ? 'selected' : '',
        isFaceDown ? 'facedown' : '',
        card ? `suit-${card.suit}` : '', // 用于按花色给牌上色 (可选)
        card ? `rank-${card.rank}` : '',
    ].filter(Boolean).join(' '); // 过滤掉空字符串并合并

    return (
        <div
            className={cardClasses}
            onClick={onClick && card && !isFaceDown ? () => onClick(card) : undefined} // 只有牌面朝上且有点击事件时才响应
            style={style}
            title={card && !isFaceDown ? `${card.rank} of ${card.suit}` : 'Card'}
        >
            <img src={imagePath} alt={card && !isFaceDown ? `${card.rank} of ${card.suit}` : 'Card Back'} />
        </div>
    );
};

export default Card;
