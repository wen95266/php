// frontend/src/components/PlayerHand.jsx
import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus }) => {
    const [hand, setHand] = useState([]); // 玩家的13张牌 (未摆放的)
    const [front, setFront] = useState([]); // 头道
    const [middle, setMiddle] = useState([]); // 中道
    const [back, setBack] = useState([]); // 尾道
    const [selectedCardFromHand, setSelectedCardFromHand] = useState(null); // 当前从手牌中选中的牌

    useEffect(() => {
        setHand(initialCards ? [...initialCards] : []); // 深拷贝以避免直接修改prop
        setFront([]);
        setMiddle([]);
        setBack([]);
        setSelectedCardFromHand(null);
    }, [initialCards]);

    const handleSelectCardFromHand = (card) => {
        if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
            setSelectedCardFromHand(null); //再次点击取消选择
        } else {
            setSelectedCardFromHand(card);
        }
    };

    const addSelectedToSegment = (segmentSetter, segmentCards, segmentLimit) => {
        if (!selectedCardFromHand) {
            alert("请先从手牌中选择一张牌。");
            return;
        }
        if (segmentCards.length >= segmentLimit) {
            alert("这道已经满了！");
            return;
        }

        // 添加到对应道
        segmentSetter(prevSegment => [...prevSegment, selectedCardFromHand]);
        // 从手牌中移除
        setHand(prevHand => prevHand.filter(c => c.id !== selectedCardFromHand.id));
        setSelectedCardFromHand(null); // 清除选择
    };

    const moveCardFromSegmentToHand = (card, segmentSetter, segmentCards) => {
        // 从对应道移除
        segmentSetter(segmentCards.filter(c => c.id !== card.id));
        // 添加回手牌
        setHand(prevHand => [...prevHand, card]);
        // 如果选中的牌是被移回的牌，也清除选择
        if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
            setSelectedCardFromHand(null);
        }
    };

    const canSubmit = front.length === 3 && middle.length === 5 && back.length === 5;

    const handleSubmit = () => {
        if (!canSubmit) {
            alert("摆牌不完整！头道3张，中道5张，尾道5张。");
            return;
        }
        // 提交的牌应该是Card对象数组
        onSubmitHand({ front, middle, back });
    };

    if (roomStatus !== 'playing') {
        return <p className="status-message">等待游戏开始或发牌...</p>;
    }
    if (!initialCards || initialCards.length === 0) {
        return <p className="status-message">等待发牌...</p>;
    }

    return (
        <div className="player-hand-area container">
            <h4>你的手牌 ({hand.length}张)</h4>
            <p className="instructions">点击手牌选择，然后点击对应道加入。点击已摆放的牌可移回手牌。</p>
            <div className="current-hand-display hand-row">
                {hand.map(card => (
                    <Card
                        key={card.id}
                        card={card}
                        isSelected={selectedCardFromHand?.id === card.id}
                        onClick={() => handleSelectCardFromHand(card)}
                    />
                ))}
                {hand.length === 0 && <p>手牌已全部摆放</p>}
            </div>
            {selectedCardFromHand && <p className="selection-info">已选择: {selectedCardFromHand.id}</p>}

            <div className="segments-layout">
                <div className="segment-area">
                    <strong className="segment-title">头道 (3张) [{front.length}/3]</strong>
                    <button onClick={() => addSelectedToSegment(setFront, front, 3)} disabled={!selectedCardFromHand || front.length >= 3}>加入头道</button>
                    <div className="segment-display hand-row front-segment">
                        {front.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setFront, front)} />)}
                    </div>
                </div>

                <div className="segment-area">
                    <strong className="segment-title">中道 (5张) [{middle.length}/5]</strong>
                    <button onClick={() => addSelectedToSegment(setMiddle, middle, 5)} disabled={!selectedCardFromHand || middle.length >= 5}>加入中道</button>
                    <div className="segment-display hand-row middle-segment">
                        {middle.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setMiddle, middle)} />)}
                    </div>
                </div>

                <div className="segment-area">
                    <strong className="segment-title">尾道 (5张) [{back.length}/5]</strong>
                    <button onClick={() => addSelectedToSegment(setBack, back, 5)} disabled={!selectedCardFromHand || back.length >= 5}>加入尾道</button>
                    <div className="segment-display hand-row back-segment">
                        {back.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setBack, back)} />)}
                    </div>
                </div>
            </div>

            <button className="submit-hand-button" onClick={handleSubmit} disabled={!canSubmit}>
                确认摆牌
            </button>
        </div>
    );
};

export default PlayerHand;
