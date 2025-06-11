// frontend/src/components/PlayerHand.jsx
import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

// 拖拽工具
function useDragAndDrop({ hand, front, middle, back, setHand, setFront, setMiddle, setBack }) {
    // 当前被拖拽的卡牌
    const [dragCard, setDragCard] = useState(null);

    // 拖开始
    function handleDragStart(card, from) {
        setDragCard({ card, from });
    }
    // 拖到某道
    function handleDrop(to) {
        if (!dragCard) return;
        const { card, from } = dragCard;
        // 防止重复
        if (
            (to === 'front' && front.find(c => c.id === card.id)) ||
            (to === 'middle' && middle.find(c => c.id === card.id)) ||
            (to === 'back' && back.find(c => c.id === card.id))
        ) {
            setDragCard(null);
            return;
        }
        // 从原区移除
        if (from === 'hand') setHand(prev => prev.filter(c => c.id !== card.id));
        if (from === 'front') setFront(prev => prev.filter(c => c.id !== card.id));
        if (from === 'middle') setMiddle(prev => prev.filter(c => c.id !== card.id));
        if (from === 'back') setBack(prev => prev.filter(c => c.id !== card.id));

        // 加入目标区
        if (to === 'front') setFront(prev => prev.length < 3 ? [...prev, card] : prev);
        if (to === 'middle') setMiddle(prev => prev.length < 5 ? [...prev, card] : prev);
        if (to === 'back') setBack(prev => prev.length < 5 ? [...prev, card] : prev);

        setDragCard(null);
    }
    // 拖到手牌区（回手）
    function handleDropToHand() {
        if (!dragCard) return;
        const { card, from } = dragCard;
        if (from === 'hand') return setDragCard(null);
        if (from === 'front') setFront(prev => prev.filter(c => c.id !== card.id));
        if (from === 'middle') setMiddle(prev => prev.filter(c => c.id !== card.id));
        if (from === 'back') setBack(prev => prev.filter(c => c.id !== card.id));
        setHand(prev => [...prev, card]);
        setDragCard(null);
    }
    return {
        dragCard,
        handleDragStart,
        handleDrop,
        handleDropToHand,
    };
}

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus }) => {
    const [hand, setHand] = useState([]);
    const [front, setFront] = useState([]);
    const [middle, setMiddle] = useState([]);
    const [back, setBack] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        setHand(initialCards ? [...initialCards] : []);
        setFront([]); setMiddle([]); setBack([]);
    }, [initialCards]);

    // 拖拽工具
    const dragDrop = useDragAndDrop({ hand, front, middle, back, setHand, setFront, setMiddle, setBack });

    // 判断当前理牌进度
    const isFrontFull = front.length === 3;
    const isBackFull = back.length === 5;
    const isMiddleFull = middle.length === 5;
    const canSubmit = isFrontFull && isMiddleFull && isBackFull;

    // 入口区名字
    let handAreaName = "手牌区";
    if (isFrontFull && !isMiddleFull && isBackFull) handAreaName = "中道区";
    else if (isFrontFull && isBackFull && isMiddleFull) handAreaName = "全部已分配";

    const handleSubmit = () => {
        if (!canSubmit) { alert("头道3张，中道5张，尾道5张！"); return; }
        setShowConfirm(true);
    };
    const confirmSubmit = () => {
        setShowConfirm(false);
        onSubmitHand({ front, middle, back });
    };

    // 重置
    const handleReset = () => {
        setHand([...initialCards]);
        setFront([]); setMiddle([]); setBack([]);
    };

    // 拖拽事件绑定
    function getCardDraggable(card, from) {
        return {
            draggable: true,
            onDragStart: (e) => { dragDrop.handleDragStart(card, from); },
        };
    }
    function getDropZoneProps(zone) {
        return {
            onDragOver: e => e.preventDefault(),
            onDrop: () => dragDrop.handleDrop(zone),
        };
    }
    function getHandDropZoneProps() {
        return {
            onDragOver: e => e.preventDefault(),
            onDrop: () => dragDrop.handleDropToHand(),
        };
    }

    if (roomStatus !== 'playing') { return <p className="status-message">等待游戏开始或发牌...</p>; }
    if (!initialCards || initialCards.length === 0) { return <p className="status-message">等待发牌...</p>; }
    return (
        <div className="player-hand-dnd-area">
            {/* 顶部横幅：AI玩家信息 */}
            <div className="playerhand-ai-banner">
                <div className="ai-seat ai-seat-left">
                    <div className="ai-avatar"></div>
                    <div className="ai-info"><div>AI-1</div><div>分: 0</div></div>
                </div>
                <div className="ai-seat ai-seat-center">
                    <div className="ai-avatar"></div>
                    <div className="ai-info"><div>AI-2</div><div>分: 0</div></div>
                </div>
                <div className="ai-seat ai-seat-right">
                    <div className="ai-avatar"></div>
                    <div className="ai-info"><div>AI-3</div><div>分: 0</div></div>
                </div>
            </div>
            {/* 中部分区 */}
            <div className="playerhand-mainzone">
                {/* 头道 */}
                <div className="playerhand-segment" {...getDropZoneProps('front')}>
                    <div className="segment-title">头道 (3张) [{front.length}/3]</div>
                    <div className="segment-cards hand-row">
                        {front.map(card => (
                            <div key={card.id} {...getCardDraggable(card, 'front')}>
                                <Card card={card} />
                            </div>
                        ))}
                    </div>
                </div>
                {/* 手牌/中道入口 */}
                <div className="playerhand-segment handzone-segment" {...getHandDropZoneProps()}>
                    <div className="segment-title">{handAreaName} [{hand.length}]</div>
                    <div className="segment-cards hand-row">
                        {hand.map(card => (
                            <div key={card.id} {...getCardDraggable(card, 'hand')}>
                                <Card card={card} />
                            </div>
                        ))}
                    </div>
                </div>
                {/* 中道 */}
                <div className="playerhand-segment" {...getDropZoneProps('middle')}>
                    <div className="segment-title">中道 (5张) [{middle.length}/5]</div>
                    <div className="segment-cards hand-row">
                        {middle.map(card => (
                            <div key={card.id} {...getCardDraggable(card, 'middle')}>
                                <Card card={card} />
                            </div>
                        ))}
                    </div>
                </div>
                {/* 尾道 */}
                <div className="playerhand-segment" {...getDropZoneProps('back')}>
                    <div className="segment-title">尾道 (5张) [{back.length}/5]</div>
                    <div className="segment-cards hand-row">
                        {back.map(card => (
                            <div key={card.id} {...getCardDraggable(card, 'back')}>
                                <Card card={card} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* 底部按钮横幅 */}
            <div className="playerhand-actionbar">
                <button className="submit-hand-button" onClick={handleSubmit} disabled={!canSubmit}>确认摆牌</button>
                <button className="reset-hand-button" onClick={handleReset}>重置摆牌</button>
                <button className="exit-hand-button" onClick={() => window.location.reload()}>退出游戏</button>
            </div>
            {/* 提交确认弹窗 */}
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
