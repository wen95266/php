// frontend/src/components/HandDisplay.jsx
import React from 'react';
import Card from './Card';
import './HandDisplay.css';

const HandDisplay = ({ playerName, handData, isSelf, isWuLong }) => {
    if (!handData || (!handData.front && !handData.evaluated)) { // Check if handData or its segments exist
      return <div className="hand-display"><p>{playerName || '玩家'}: 等待提交...</p></div>;
    }

    const { front, middle, back, evaluated } = handData;
    
    const renderSegment = (segmentName, cards, evalResult) => (
        <div className="segment-display">
            <strong>{segmentName} ({evalResult?.name || 'N/A'}):</strong>
            <div className="hand-row">
                {cards && cards.length > 0 ? (
                    cards.map((card, index) => <Card key={card.id || index} card={card} />)
                ) : (
                    <p>未摆放</p>
                )}
            </div>
        </div>
    );

    return (
        <div className={`hand-display ${isSelf ? 'self-hand' : ''} ${isWuLong ? 'wulong-hand' : ''}`}>
            <h4>{playerName || '玩家'}{isSelf ? ' (你)' : ''} {isWuLong ? <span style={{color: 'red'}}>(乌龙!)</span> : ''}</h4>
            {evaluated && evaluated.front && renderSegment('头道', front, evaluated.front)}
            {evaluated && evaluated.middle && renderSegment('中道', middle, evaluated.middle)}
            {evaluated && evaluated.back && renderSegment('尾道', back, evaluated.back)}
            {!evaluated && (front || middle || back) && <p>牌型正在处理或未提交完整...</p>}
        </div>
    );
};

export default HandDisplay;
