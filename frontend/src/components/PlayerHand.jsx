import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

// 拖拽逻辑
function useDragAndDrop({ areas, setAreas }) {
    const [dragCard, setDragCard] = useState(null);

    function handleDragStart(card, fromAreaIdx) {
        setDragCard({ card, fromAreaIdx });
    }

    function handleDrop(toAreaIdx) {
        if (!dragCard) return;
        const { card, fromAreaIdx } = dragCard;
        if (fromAreaIdx === toAreaIdx) {
            setDragCard(null);
            return;
        }
        // 从原区移除，加到目标区
        setAreas(prev => {
            const newAreas = prev.map(a => [...a]);
            newAreas[fromAreaIdx] = newAreas[fromAreaIdx].filter(c => c.id !== card.id);
            newAreas[toAreaIdx].push(card);
            return newAreas;
        });
        setDragCard(null);
    }
    return {
        dragCard,
        handleDragStart,
        handleDrop,
    };
}

// 自动识别头道/中道/尾道
function getAreaNames(areas) {
    const counts = areas.map(a => a.length);
    const sortedCounts = [...counts].sort((a, b) => a - b);
    // 判断是否正好3/5/5
    if (sortedCounts[0] === 3 && sortedCounts[1] === 5 && sortedCounts[2] === 5) {
        // 按数量自动命名
        const mapping = {};
        areas.forEach((a, idx) => {
            if (a.length === 3) mapping[idx] = '头道';
            else if (a.length === 5 && !Object.values(mapping).includes('中道')) mapping[idx] = '中道';
            else if (a.length === 5) mapping[idx] = '尾道';
            else mapping[idx] = '';
        });
        return mapping;
    }
    // 未达到3/5/5，区域只叫“理牌区A/B/C”
    return {0: '理牌区A', 1: '理牌区B', 2: '理牌区C'};
}

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus }) => {
    // 三理牌区，初始所有牌在第0区
    const [areas, setAreas] = useState([[], [], []]);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        setAreas([[...(initialCards || [])], [], []]);
    }, [initialCards]);

    const dragDrop = useDragAndDrop({ areas, setAreas });

    const areaNames = getAreaNames(areas);
    // 是否满足3/5/5
    const counts = areas.map(a => a.length);
    const canSubmit = [...counts].sort((a, b) => a - b).join(',') === '3,5,5';

    // 提交
    const handleSubmit = () => {
        if (!canSubmit) { alert("请将三组牌分为3、5、5张！"); return; }
        setShowConfirm(true);
    };
    const confirmSubmit = () => {
        setShowConfirm(false);
        // 提交时，按名字映射
        let front = [], middle = [], back = [];
        Object.entries(areaNames).forEach(([idx, name]) => {
            if (name === '头道') front = areas[idx];
            if (name === '中道') middle = areas[idx];
            if (name === '尾道') back = areas[idx];
        });
        onSubmitHand({ front, middle, back });
    };

    const handleReset = () => {
        setAreas([[...(initialCards || [])], [], []]);
    };

    // 拖拽Props
    function getCardDraggable(card, fromIdx) {
        return {
            draggable: true,
            onDragStart: () => dragDrop.handleDragStart(card, fromIdx),
        };
    }
    function getDropZoneProps(toIdx) {
        return {
            onDragOver: e => e.preventDefault(),
            onDrop: () => dragDrop.handleDrop(toIdx),
        };
    }

    if (roomStatus !== 'playing') { return <p className="status-message">等待游戏开始或发牌...</p>; }
    if (!initialCards || initialCards.length === 0) { return <p className="status-message">等待发牌...</p>; }

    return (
        <div className="player-hand-dnd-area">
            <div className="playerhand-mainzone">
                {[0, 1, 2].map(idx => (
                    <div className="playerhand-segment handzone-segment"
                         key={idx}
                         {...getDropZoneProps(idx)}>
                        <div className="segment-title">{areaNames[idx]} [{areas[idx].length}]</div>
                        <div className="segment-cards hand-row">
                            {areas[idx].map(card => (
                                <div key={card.id} {...getCardDraggable(card, idx)}>
                                    <Card card={card} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="playerhand-actionbar">
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
