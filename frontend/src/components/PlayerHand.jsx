import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

// 拖拽逻辑
function useDragAndDrop({ hand, front, back, setHand, setFront, setBack }) {
    const [dragCard, setDragCard] = useState(null);

    function handleDragStart(card, from) {
        setDragCard({ card, from });
    }
    function handleDrop(to) {
        if (!dragCard) return;
        const { card, from } = dragCard;
        // 只允许从手牌区拖到头道/尾道，或从头道/尾道拖回手牌区
        if (from === to) {
            setDragCard(null);
            return;
        }
        // 从原区移除
        if (from === 'hand') setHand(prev => prev.filter(c => c.id !== card.id));
        if (from === 'front') setFront(prev => prev.filter(c => c.id !== card.id));
        if (from === 'back') setBack(prev => prev.filter(c => c.id !== card.id));
        // 加入目标区
        if (to === 'hand') setHand(prev => [...prev, card]);
        if (to === 'front') setFront(prev => prev.length < 3 ? [...prev, card] : prev);
        if (to === 'back') setBack(prev => prev.length < 5 ? [...prev, card] : prev);
        setDragCard(null);
    }
    return {
        dragCard,
        handleDragStart,
        handleDrop,
    };
}

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus, aiPlayers = [] }) => {
    const [hand, setHand] = useState([]);
    const [front, setFront] = useState([]);
    const [back, setBack] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        setHand(initialCards ? [...initialCards] : []);
        setFront([]); setBack([]);
    }, [initialCards]);

    // 拖拽工具
    const dragDrop = useDragAndDrop({ hand, front, back, setHand, setFront, setBack });

    // 剩余5张自动定为中道，提交时处理
    const isFrontFull = front.length === 3;
    const isBackFull = back.length === 5;
    const middle = hand.length === 5 && isFrontFull && isBackFull ? hand : [];

    // 能否提交
    const canSubmit = isFrontFull && isBackFull && hand.length === 5;

    const handleSubmit = () => {
        if (!canSubmit) { alert("头道3张、尾道5张，剩余5张自动为中道！"); return; }
        setShowConfirm(true);
    };
    const confirmSubmit = () => {
        setShowConfirm(false);
        onSubmitHand({ front, middle: hand, back });
    };

    const handleReset = () => {
        setHand([...initialCards]);
        setFront([]); setBack([]);
    };

    // 拖拽Props
    function getCardDraggable(card, from) {
        return {
            draggable: true,
            onDragStart: () => dragDrop.handleDragStart(card, from),
        };
    }
    function getDropZoneProps(zone) {
        return {
            onDragOver: e => e.preventDefault(),
            onDrop: () => dragDrop.handleDrop(zone),
        };
    }

    if (roomStatus !== 'playing') { return <p className="status-message">等待游戏开始或发牌...</p>; }
    if (!initialCards || initialCards.length === 0) { return <p className="status-message">等待发牌...</p>; }

    return (
        <div className="player-hand-5rows">
            {/* 1. 顶部横幅：AI玩家状态 */}
            <div className="playerhand-5rows-ai-banner">
                {aiPlayers && aiPlayers.length === 3
                    ? aiPlayers.map((ai, idx) => (
                        <div key={ai.id || idx} className="ai-status-block">
                            <span className="ai-name">{ai.name || `电脑${idx + 1}`}</span>
                            <span className="ai-score">分: {ai.score ?? 0}</span>
                        </div>
                    ))
                    : [1,2,3].map((no) => (
                        <div key={no} className="ai-status-block">
                            <span className="ai-name">{`电脑-${no}`}</span>
                            <span className="ai-score">分: 0</span>
                        </div>
                    ))}
            </div>
            {/* 2. 头道 */}
            <div className="playerhand-5rows-segment" {...getDropZoneProps('front')}>
                <span className="segment-title">头道 (3张) [{front.length}/3]</span>
                <div className="segment-cards hand-row">
                    {front.map(card => (
                        <div key={card.id} {...getCardDraggable(card, 'front')}>
                            <Card card={card} />
                        </div>
                    ))}
                </div>
            </div>
            {/* 3. 手牌区 */}
            <div className="playerhand-5rows-segment" {...getDropZoneProps('hand')}>
                <span className="segment-title">手牌区 [{hand.length}]</span>
                <div className="segment-cards hand-row">
                    {hand.map(card => (
                        <div key={card.id} {...getCardDraggable(card, 'hand')}>
                            <Card card={card} />
                        </div>
                    ))}
                </div>
            </div>
            {/* 4. 尾道 */}
            <div className="playerhand-5rows-segment" {...getDropZoneProps('back')}>
                <span className="segment-title">尾道 (5张) [{back.length}/5]</span>
                <div className="segment-cards hand-row">
                    {back.map(card => (
                        <div key={card.id} {...getCardDraggable(card, 'back')}>
                            <Card card={card} />
                        </div>
                    ))}
                </div>
            </div>
            {/* 5. 按钮区 */}
            <div className="playerhand-5rows-actionbar">
                <button className="submit-hand-button" onClick={handleSubmit} disabled={!canSubmit}>确认摆牌</button>
                <button className="reset-hand-button" onClick={handleReset}>重置摆牌</button>
            </div>
            {showConfirm && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <p>确定要提交当前摆牌吗？</p>
                        <button onClick={confirmSubmit} className="submit-hand-button">确定</button>
                        <button onClick={() => setShowConfirm(false)}>取消</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerHand;
