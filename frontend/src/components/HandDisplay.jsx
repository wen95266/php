// frontend/src/components/HandDisplay.jsx
import React from 'react';
import Card from './Card';
import './HandDisplay.css';

const HandDisplay = ({ playerName, handData, isSelf, roomStatus }) => {
    // 确保 handData 和 handData.evaluated 存在
    if (!handData || !handData.evaluated ||
        (!handData.evaluated.front && !handData.specialHandType && roomStatus !== 'playing' && roomStatus !== 'dealing')) {
        // 在playing或dealing状态，即使没有evaluated也可能要显示牌（例如AI正在摆）
        // 但如果是结果展示，则必须有evaluated或specialHandType
        return (
            <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'}`}>
                <p className="player-name-display">
                    {playerName || '玩家'}{isSelf ? ' (你)' : ''}:
                    { (roomStatus === 'playing' && !handData?.submitted) ? " 摆牌中..." : " 等待数据..." }
                </p>
            </div>
        );
    }

    const {
        front, middle, back,
        evaluated, // { front: {name, type, ranks}, middle: {...}, back: {...} }
        isWuLong,
        roundPoints,
        specialHandType, // 13张特殊牌型名称
        submitted // 玩家是否已提交
    } = handData;

    const playerDisplayName = `${playerName || '玩家'}${isSelf ? ' (你)' : ''}`;

    const renderSegment = (segmentName, cards, evalResult, segmentKey) => {
        if (!evalResult || !evalResult.name) { // 如果没有评估结果或名称，则不渲染此道
            // 如果是特殊牌型，道本身可能就是空的，这没问题
            if (specialHandType) return null;
            // 否则，如果牌也为空，显示未摆放
            if (!cards || cards.length === 0) return <div className="segment-display"><strong className="segment-name">{segmentName}: (未摆放)</strong></div>;
            // 如果有牌但无评估（异常情况）
            return <div className="segment-display"><strong className="segment-name">{segmentName}: (评估错误)</strong></div>;
        }

        const segmentTitle = `${segmentName} - ${evalResult.name}`;
        // TODO: 未来可以加入与对手此道比牌的胜负标志

        return (
            <div className={`segment-display ${segmentKey}-segment`}>
                <strong className="segment-name">{segmentTitle}</strong>
                <div className="cards-in-segment hand-row">
                    {cards && cards.length > 0 ? (
                        cards.map((card) => <Card key={card?.id || `card-${segmentKey}-${Math.random()}`} card={card} />)
                    ) : (
                        // 如果是13张特殊牌型，这里可能为空，由外部控制显示
                       !specialHandType && <p className="no-cards-text">未摆放</p>
                    )}
                </div>
            </div>
        );
    };

    // 如果是游戏进行中，且该玩家还未提交，不显示三道牌详情，只显示名字和状态
    if ((roomStatus === 'playing' || roomStatus === 'dealing') && !submitted && !isSelf) { // 对手未提交时
        return (
             <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'}`}>
                <h4 className="player-name-display">{playerDisplayName}</h4>
                <p className="status-note">正在操作...</p>
            </div>
        );
    }
    // 如果是自己未提交，PlayerHand组件会处理


    return (
        <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'} ${isWuLong && !specialHandType ? 'wulong' : ''} ${specialHandType ? 'special-hand' : ''}`}>
            <div className="hand-display-header">
                <h4 className="player-name-display">{playerDisplayName}</h4>
                <div className="tags-container">
                    {isWuLong && !specialHandType && <span className="tag wulong-tag">(乌龙!)</span>}
                    {specialHandType && <span className="tag special-hand-tag">({specialHandType})</span>}
                </div>
                {/* 只有在游戏结束状态才显示本局得分 */}
                {roomStatus === 'finished' && typeof roundPoints === 'number' && (
                    <span className={`round-points-display ${roundPoints > 0 ? 'positive' : (roundPoints < 0 ? 'negative' : 'zero')}`}>
                        本局: {roundPoints > 0 ? `+${roundPoints}` : roundPoints}
                    </span>
                )}
            </div>

            {/* 如果是13张特殊牌型，可以有特殊展示方式 */}
            {specialHandType ? (
                <div className="special-hand-details">
                    <p className="special-type-announce">{specialHandType}!</p>
                    {/* 依然尝试渲染三道牌，如果后端为特殊牌型也填充了它们 */}
                    {/* 后端GameState.checkSpecial13CardHand后，如果确定是大牌，理论上不需要再摆三道， */}
                    {/* 但如果规则是特殊牌型也要按3-5-5摆出来，则后端需要填充 */}
                    {/* 为简化，如果后端在playerHands中为特殊牌型也填充了front/middle/back/evaluated，则会显示 */}
                    {evaluated.front && renderSegment('头道', front, evaluated.front, 'front')}
                    {evaluated.middle && renderSegment('中道', middle, evaluated.middle, 'middle')}
                    {evaluated.back && renderSegment('尾道', back, evaluated.back, 'back')}
                </div>
            ) : (
                <div className="all-segments">
                    {evaluated.front ? renderSegment('头道', front, evaluated.front, 'front') : <div className="segment-display"><strong className="segment-name">头道: (未提交/数据错误)</strong></div>}
                    {evaluated.middle ? renderSegment('中道', middle, evaluated.middle, 'middle') : <div className="segment-display"><strong className="segment-name">中道: (未提交/数据错误)</strong></div>}
                    {evaluated.back ? renderSegment('尾道', back, evaluated.back, 'back') : <div className="segment-display"><strong className="segment-name">尾道: (未提交/数据错误)</strong></div>}
                </div>
            )}
        </div>
    );
};

export default HandDisplay;
