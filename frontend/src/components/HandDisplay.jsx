// frontend/src/components/HandDisplay.jsx
import React from 'react';
import Card from './Card';
import './HandDisplay.css'; // 确保CSS文件存在并按需修改

const HandDisplay = ({ playerName, handData, isSelf }) => {
    // 确保 handData 和 handData.evaluated 存在，否则显示等待信息
    if (!handData || !handData.evaluated || // 后端应该总是返回 evaluated 结构
        (!handData.evaluated.front && !handData.specialHandType)) { // 如果没有普通牌型评估且没有特殊牌型
        return (
            <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'}`}>
                <p className="player-name-display">{playerName || '玩家'}{isSelf ? ' (你)' : ''}: 等待提交或数据...</p>
            </div>
        );
    }

    const {
        front, middle, back,
        evaluated,
        isWuLong,
        roundPoints,
        specialHandType, // 新增：从后端获取的13张特殊牌型名称
        // specialHandScore // 新增：从后端获取的特殊牌型基础分 (可选显示)
    } = handData;

    const playerDisplayName = `${playerName || '玩家'}${isSelf ? ' (你)' : ''}`;

    const renderSegment = (segmentName, cards, evalResult, segmentKey) => {
        if (!evalResult) return null; // 如果某个道没有评估结果（例如在特殊牌型时）
        const segmentTitle = `${segmentName} (${evalResult.name || 'N/A'})`;
        return (
            <div className={`segment-display ${segmentKey}-segment`}>
                <strong className="segment-name">{segmentTitle}</strong>
                <div className="cards-in-segment hand-row">
                    {cards && cards.length > 0 ? (
                        cards.map((card, index) => <Card key={card?.id || `${segmentKey}-${index}-${Math.random()}`} card={card} />)
                    ) : (
                        // 如果是特殊牌型，可能道是空的或者未定义，显示特殊牌型名称来覆盖
                        !specialHandType && <p className="no-cards-text">未摆放</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`hand-display-wrapper ${isSelf ? 'self' : 'opponent'} ${isWuLong && !specialHandType ? 'wulong' : ''} ${specialHandType ? 'special-hand' : ''}`}>
            <h4 className="player-name-display">
                {playerDisplayName}
                {isWuLong && !specialHandType && <span className="tag wulong-tag">(乌龙!)</span>}
                {specialHandType && <span className="tag special-hand-tag">({specialHandType})</span>}
                {typeof roundPoints === 'number' && (
                    <span className={`round-points-display ${roundPoints > 0 ? 'positive' : (roundPoints < 0 ? 'negative' : 'zero')}`}>
                        本局: {roundPoints > 0 ? `+${roundPoints}` : roundPoints}
                    </span>
                )}
            </h4>
            {/* 如果是13张特殊牌型，优先展示特殊牌型信息，可以不展示三道具体牌（或简化展示） */}
            {specialHandType ? (
                <div className="special-hand-details">
                    {/* 仍然可以尝试渲染三道牌，如果后端 playerHands 中填充了它们的话 */}
                    {/* 或者只显示特殊牌型名称，并用一个统一的牌背/占位符表示13张牌 */}
                    <p>特殊牌型成型！</p>
                    {/* 如果后端在有 specialHandType 时也填充了 front, middle, back 和 evaluated，则下面会渲染 */}
                    {evaluated.front && renderSegment('头道', front, evaluated.front, 'front')}
                    {evaluated.middle && renderSegment('中道', middle, evaluated.middle, 'middle')}
                    {evaluated.back && renderSegment('尾道', back, evaluated.back, 'back')}
                </div>
            ) : (
                // 普通牌型展示三道
                <div className="all-segments">
                    {evaluated.front && renderSegment('头道', front, evaluated.front, 'front')}
                    {evaluated.middle && renderSegment('中道', middle, evaluated.middle, 'middle')}
                    {evaluated.back && renderSegment('尾道', back, evaluated.back, 'back')}
                </div>
            )}
        </div>
    );
};

export default HandDisplay;
