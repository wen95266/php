// frontend/src/components/PlayerHand.jsx
import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PlayerHand.css';

const PlayerHand = ({ initialCards, onSubmitHand, roomStatus }) => {
    const [hand, setHand] = useState([]); // Player's 13 cards
    const [front, setFront] = useState([]);
    const [middle, setMiddle] = useState([]);
    const [back, setBack] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]); // Cards selected from 'hand'

    useEffect(() => {
        // Initialize hand when initialCards change (e.g., new round)
        setHand(initialCards || []);
        setFront([]);
        setMiddle([]);
        setBack([]);
        setSelectedCards([]);
    }, [initialCards]);

    const handleCardClickInHand = (card) => {
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    };

    const handleCardClickInSegment = (card, segmentSetter, segmentCards) => {
        // Move card back to hand
        segmentSetter(segmentCards.filter(c => c.id !== card.id));
        setHand(prevHand => [...prevHand, card]); // Add back to main hand
    };

    const moveToSegment = (segmentSetter, segmentCards, segmentLimit) => {
        if (selectedCards.length === 0) return;

        const cardsToMove = selectedCards.slice(0, segmentLimit - segmentCards.length);
        if (cardsToMove.length === 0) return; // Segment full or no suitable cards

        segmentSetter(prevSegment => [...prevSegment, ...cardsToMove]);
        setHand(prevHand => prevHand.filter(hc => !cardsToMove.some(mc => mc.id === hc.id)));
        setSelectedCards(prevSelected => prevSelected.filter(sc => !cardsToMove.some(mc => mc.id === sc.id)));
    };
    
    const canSubmit = front.length === 3 && middle.length === 5 && back.length === 5;

    const handleSubmit = () => {
        if (!canSubmit) {
            alert("请将13张牌完整摆放到三道中。头道3张，中道5张，尾道5张。");
            return;
        }
        onSubmitHand({ front, middle, back });
    };
    
    if (roomStatus !== 'playing') {
        return <p>等待游戏开始或等待其他玩家...</p>;
    }
    
    if (!hand && !front && !middle && !back) {
        return <p>等待发牌...</p>
    }

    return (
        <div className="player-hand-area">
            <h4>你的手牌 (点击选择，再点击对应道加入):</h4>
            <div className="current-hand hand-row">
                {hand.map(card => (
                    <Card
                        key={card.id}
                        card={card}
                        isSelected={selectedCards.some(sc => sc.id === card.id)}
                        onClick={() => handleCardClickInHand(card)}
                    />
                ))}
            </div>
             {selectedCards.length > 0 && <p>已选择: {selectedCards.map(c=>c.id).join(', ')}</p>}

            <div className="segments">
                <div className="segment">
                    <strong>头道 (3张)</strong>
                    <button onClick={() => moveToSegment(setFront, front, 3)} disabled={selectedCards.length === 0}>加入头道</button>
                    <div className="hand-row">
                        {front.map(card => <Card key={card.id} card={card} onClick={() => handleCardClickInSegment(card, setFront, front)} />)}
                    </div>
                </div>
                <div className="segment">
                    <strong>中道 (5张)</strong>
                    <button onClick={() => moveToSegment(setMiddle, middle, 5)} disabled={selectedCards.length === 0}>加入中道</button>
                    <div className="hand-row">
                        {middle.map(card => <Card key={card.id} card={card} onClick={() => handleCardClickInSegment(card, setMiddle, middle)} />)}
                    </div>
                </div>
                <div className="segment">
                    <strong>尾道 (5张)</strong>
                    <button onClick={() => moveToSegment(setBack, back, 5)} disabled={selectedCards.length === 0}>加入尾道</button>
                    <div className="hand-row">
                        {back.map(card => <Card key={card.id} card={card} onClick={() => handleCardClickInSegment(card, setBack, back)} />)}
                    </div>
                </div>
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit}>确认摆牌</button>
        </div>
    );
};

export default PlayerHand;
