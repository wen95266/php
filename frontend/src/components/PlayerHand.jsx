// frontend/src/components/PlayerHand.jsx
import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus }) => {
    const [hand, setHand] = useState([]);
    const [front, setFront] = useState([]);
    const [middle, setMiddle] = useState([]);
    const [back, setBack] = useState([]);
    const [selectedCardFromHand, setSelectedCardFromHand] = useState(null);
    // 新增撤销堆栈
    const [actionStack, setActionStack] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        setHand(initialCards ? [...initialCards] : []);
        setFront([]); setMiddle([]); setBack([]);
        setSelectedCardFromHand(null);
        setActionStack([]);
    }, [initialCards]);

    // 操作记录
    const recordAction = (type, payload) => {
        setActionStack(stack => [...stack, { type, payload }]);
    };

    const handleSelectCardFromHand = (card) => {
        setSelectedCardFromHand(prev => (prev && prev.id === card.id ? null : card));
    };

    const addSelectedToSegment = (segmentSetter, segmentCards, segmentLimit, segmentKey) => {
        if (!selectedCardFromHand) { alert("请先从手牌中选择一张牌。"); return; }
        if (segmentCards.length >= segmentLimit) { alert("这道已经满了！"); return; }
        segmentSetter(prevSegment => [...prevSegment, selectedCardFromHand]);
        setHand(prevHand => prevHand.filter(c => c.id !== selectedCardFromHand.id));
        recordAction('add', { card: selectedCardFromHand, to: segmentKey });
        setSelectedCardFromHand(null);
    };

    const moveCardFromSegmentToHand = (card, segmentSetter, segmentCards, segmentKey) => {
        segmentSetter(segmentCards.filter(c => c.id !== card.id));
        setHand(prevHand => [...prevHand, card]);
        recordAction('remove', { card, from: segmentKey });
        if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
            setSelectedCardFromHand(null);
        }
    };

    // 撤销上一步
    const handleUndo = () => {
        if (actionStack.length === 0) return;
        const last = actionStack[actionStack.length - 1];
        setActionStack(prev => prev.slice(0, -1));
        if (last.type === "add") {
            // 删除segment最后一张，回到hand
            const { card, to } = last.payload;
            if (to === 'front') setFront(f => f.slice(0, -1));
            if (to === 'middle') setMiddle(m => m.slice(0, -1));
            if (to === 'back') setBack(b => b.slice(0, -1));
            setHand(h => [...h, card]);
        } else if (last.type === "remove") {
            const { card, from } = last.payload;
            setHand(h => h.filter(c => c.id !== card.id));
            if (from === 'front') setFront(f => [...f, card]);
            if (from === 'middle') setMiddle(m => [...m, card]);
            if (from === 'back') setBack(b => [...b, card]);
        }
    };

    // 全部重置
    const handleReset = () => {
        setHand([...initialCards]);
        setFront([]); setMiddle([]); setBack([]);
        setSelectedCardFromHand(null);
        setActionStack([]);
    };

    const canSubmit = front.length === 3 && middle.length === 5 && back.length === 5;
    const handleSubmit = () => {
        if (!canSubmit) { alert("摆牌不完整！头道3张，中道5张，尾道5张。"); return; }
        setShowConfirm(true); // 弹窗确认
    };
    const confirmSubmit = () => {
        setShowConfirm(false);
        onSubmitHand({ front, middle, back });
    };

    if (roomStatus !== 'playing') { return <p className="status-message">等待游戏开始或发牌...</p>; }
    if (!initialCards || initialCards.length === 0) { return <p className="status-message">等待发牌...</p>; }
    return (
        <div className="player-hand-area container">
            <h4>你的手牌 ({hand.length}张)</h4>
            <div style={{marginBottom:10}}>
                <button onClick={handleUndo} disabled={actionStack.length === 0}>撤销上一步</button>
                <button onClick={handleReset} style={{marginLeft:8}}>全部重置</button>
            </div>
            <p className="instructions">点击手牌选择，然后点击对应道加入。点击已摆放的牌可移回手牌。</p>
            <div className="current-hand-display hand-row">
                {hand.map(card => (
                    <Card key={card.id} card={card} isSelected={selectedCardFromHand?.id === card.id} onClick={() => handleSelectCardFromHand(card)} />
                ))}
                {hand.length === 0 && <p>手牌已全部摆放</p>}
            </div>
            {selectedCardFromHand && <p className="selection-info">已选择: {selectedCardFromHand.rank} of {selectedCardFromHand.suit}</p>}
            <div className="segments-layout">
                <div className="segment-area">
                    <strong className="segment-title">头道 (3张) [{front.length}/3]</strong>
                    <button onClick={() => addSelectedToSegment(setFront, front, 3, 'front')} disabled={!selectedCardFromHand || front.length >= 3}>加入头道</button>
                    <button onClick={() => { setFront([]); setHand(h => [...h, ...front]); }} style={{marginLeft:5}} disabled={front.length === 0}>重置</button>
                    <div className="segment-display hand-row front-segment">
                        {front.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setFront, front, 'front')} />)}
                    </div>
                </div>
                <div className="segment-area">
                    <strong className="segment-title">中道 (5张) [{middle.length}/5]</strong>
                    <button onClick={() => addSelectedToSegment(setMiddle, middle, 5, 'middle')} disabled={!selectedCardFromHand || middle.length >= 5}>加入中道</button>
                    <button onClick={() => { setMiddle([]); setHand(h => [...h, ...middle]); }} style={{marginLeft:5}} disabled={middle.length === 0}>重置</button>
                    <div className="segment-display hand-row middle-segment">
                        {middle.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setMiddle, middle, 'middle')} />)}
                    </div>
                </div>
                <div className="segment-area">
                    <strong className="segment-title">尾道 (5张) [{back.length}/5]</strong>
                    <button onClick={() => addSelectedToSegment(setBack, back, 5, 'back')} disabled={!selectedCardFromHand || back.length >= 5}>加入尾道</button>
                    <button onClick={() => { setBack([]); setHand(h => [...h, ...back]); }} style={{marginLeft:5}} disabled={back.length === 0}>重置</button>
                    <div className="segment-display hand-row back-segment">
                        {back.map(card => <Card key={card.id} card={card} onClick={() => moveCardFromSegmentToHand(card, setBack, back, 'back')} />)}
                    </div>
                </div>
            </div>
            <button className="submit-hand-button" onClick={handleSubmit} disabled={!canSubmit}> 确认摆牌 </button>
            {/* 提交确认弹窗 */}
            {showConfirm && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 280 }}>
                        <p>确定要提交当前摆牌吗？</p>
                        <button onClick={confirmSubmit} style={{marginRight:8, background:"#4caf50"}}>确定</button>
                        <button onClick={() => setShowConfirm(false)}>取消</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerHand;
