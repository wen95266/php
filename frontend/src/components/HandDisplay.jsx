// frontend/src/components/HandDisplay.jsx
import React from 'react';
import Card from './Card';
import './HandDisplay.css';

const HandDisplay = ({ playerName, handData, isSelf, isWinnerSegment }) => {
    if (!handData || !handData.evaluated) { // 后端应该总是返回 evaluated 结构
        return (
            <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'}`}>
                <p className="player-name">{playerName || '玩家'}{isSelf ? ' (你)' : ''}: 等待提交或数据...</p>
            </div>
        );
    }

    const { front, middle, back, evaluated, isWuLong, roundPoints } = handData;
    const playerDisplayName = `${playerName || '玩家'}${isSelf ? ' (你)' : ''}`;

    const renderSegment = (segmentName, cards, evalResult, segmentKey) => {
        const winnerClass = isWinnerSegment && isWinnerSegment[segmentKey] && isWinnerSegment[segmentKey].includes(handData.playerId) ? 'winner-segment' : '';
        const segmentTitle = `${segmentName} (${evalResult?.name || 'N/A'})`;
        return (
            <div className={`segment-display ${winnerClass}`}>
                <strong className="segment-name">{segmentTitle}</strong>
                <div className="cards-in-segment hand-row">
                    {cards && cards.length > 0 ? (
                        cards.map((card, index) => <Card key={card?.id || `${segmentKey}-${index}`} card={card} />)
                    ) : (
                        <p className="no-cards-text">未摆放</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'} ${isWuLong ? 'wulong' : ''}`}>
            <h4 className="player-name">
                {playerDisplayName}
                {isWuLong && <span className="wulong-tag">(乌龙!)</span>}
                {typeof roundPoints === 'number' && <span className="round-points">(本局: {roundPoints > 0 ? `+${roundPoints}` : roundPoints})</span>}
            </h4>
            <div className="all-segments">
                {evaluated.front && renderSegment('头道', front, evaluated.front, 'front')}
                {evaluated.middle && renderSegment('中道', middle, evaluated.middle, 'middle')}
                {evaluated.back && renderSegment('尾道', back, evaluated.back, 'back')}
            </div>
        </div>
    );
};

export default HandDisplay;
