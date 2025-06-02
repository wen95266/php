// frontend/src/components/GameRoom.jsx
import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card'; // For displaying opponent facedown cards
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom }) => {
    const [room, setRoom] = useState(initialRoom);
    const [message, setMessage] = useState('');
    const [myCards, setMyCards] = useState([]);
    const [submittedHand, setSubmittedHand] = useState(false);

    useEffect(() => {
        setRoom(initialRoom); // Update room when initialRoom prop changes (e.g., joining a new room)
        const me = initialRoom.players.find(p => p.id === socket.id);
        if (me) setMyCards(me.cards || []);
        setSubmittedHand(initialRoom.playerHands?.[socket.id]?.submitted || false);
    }, [initialRoom]);

    useEffect(() => {
        const handleRoomUpdate = (updatedRoom) => {
            console.log("RoomUpdate received:", updatedRoom);
            setRoom(updatedRoom);
            const me = updatedRoom.players.find(p => p.id === socket.id);
            if (me) {
                setMyCards(me.cards || []); // Update my cards if dealt
            }
            // Update submitted status based on new room data
            setSubmittedHand(updatedRoom.playerHands?.[socket.id]?.submitted || false);

            if (updatedRoom.status === 'finished') {
                setMessage("本局结束！");
            } else if (updatedRoom.status === 'playing') {
                 setMessage("请摆牌...");
            } else if (updatedRoom.status === 'waiting') {
                 setMessage("等待玩家准备...");
            }
        };

        socket.on('roomUpdate', handleRoomUpdate);
        // Could add specific event for errors from server here
        // socket.on('gameError', (errorMessage) => setMessage(`错误: ${errorMessage}`));

        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            // socket.off('gameError');
        };
    }, []); // Empty dependency array to run only once for listeners

    const handleReady = () => {
        const me = room.players.find(p => p.id === socket.id);
        if (!me) return;
        socket.emit('playerReady', { roomId: room.id, isReady: !me.isReady }, (response) => {
            if (!response.success) {
                setMessage(`错误: ${response.message}`);
            } else {
                 setMessage(me.isReady ? '已取消准备' : '已准备');
            }
        });
    };

    const handleSubmitHand = (handData) => { // { front: [], middle: [], back: [] } card objects
        socket.emit('submitHand', { roomId: room.id, ...handData }, (response) => {
            if (response.success) {
                setMessage('手牌已提交，等待其他玩家...');
                setSubmittedHand(true);
            } else {
                setMessage(`提交失败: ${response.message}`);
                alert(`提交失败: ${response.message}`); // Also alert for critical errors
            }
        });
    };

    const handleLeave = () => {
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom();
        });
    };
    
    const handleNextRound = () => {
        socket.emit('requestNextRound', {roomId: room.id}, (response) => {
            if (response.success) {
                setMessage("已请求下一局，等待玩家准备。");
                setSubmittedHand(false); // Reset for next round
            } else {
                setMessage(`无法开始下一局: ${response.message}`);
            }
        });
    };

    const me = room.players.find(p => p.id === socket.id);

    return (
        <div className="game-room-container">
            <h2>房间: {room.id}</h2>
            <p>状态: {room.status} {message && `- ${message}`}</p>
            <button onClick={handleLeave}>离开房间</button>

            <div className="players-info">
                <h3>玩家列表 (你标记为蓝色):</h3>
                <ul>
                    {room.players.map(player => (
                        <li key={player.id} className={player.id === socket.id ? 'self-player-name' : ''}>
                            {player.name} (ID: {player.id.substring(0,4)})
                            {room.hostId === player.id && ' (房主)'}
                            {room.status === 'waiting' && ` - ${player.isReady ? '已准备' : '未准备'}`}
                            {room.playerHands[player.id]?.submitted && room.status === 'playing' && ' (已提交)'}
                             - 得分: {player.score} { room.status === 'finished' && `(本局: ${player.roundPoints})`}
                        </li>
                    ))}
                </ul>
            </div>

            {room.status === 'waiting' && me && (
                <button onClick={handleReady}>
                    {me.isReady ? '取消准备' : '准备开始'}
                </button>
            )}

            {/* Player's own hand for arranging */}
            {room.status === 'playing' && !submittedHand && me && (
                <PlayerHand initialCards={myCards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
            )}
            {room.status === 'playing' && submittedHand && <p>你的牌已提交，等待其他玩家...</p>}


            {/* Displaying hands: either submitted or during comparison/finished state */}
            {(room.status === 'comparing' || room.status === 'finished' || (room.status === 'playing' && submittedHand)) && (
                <div className="all-hands-display">
                    <h3>所有玩家的牌:</h3>
                    {room.players.map(player => (
                        <HandDisplay
                            key={player.id}
                            playerName={player.name}
                            handData={room.playerHands[player.id]}
                            isSelf={player.id === socket.id}
                            isWuLong={room.playerHands[player.id]?.isWuLong}
                        />
                    ))}
                </div>
            )}
            
            {/* Display opponents' facedown cards during 'playing' state if they haven't submitted */}
            {room.status === 'playing' && (
                <div className="opponents-area">
                    <h4>其他玩家:</h4>
                    {room.players.filter(p => p.id !== socket.id).map(opponent => (
                        <div key={opponent.id} className="opponent-hand-preview">
                            <p>{opponent.name} {room.playerHands[opponent.id]?.submitted ? '(已提交)' : '(摆牌中...)'}</p>
                            {!room.playerHands[opponent.id]?.submitted && (
                                <div className="hand-row">
                                    {Array(13).fill(null).map((_, i) => <Card key={i} card={null} />)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {room.status === 'finished' && room.hostId === socket.id && (
                 <button onClick={handleNextRound}>开始下一局 (仅房主)</button>
            )}
            {room.status === 'finished' && room.hostId !== socket.id && (
                 <p>等待房主开始下一局...</p>
            )}

            {/* Optional: Display raw comparison results for debugging */}
            {/* {room.status === 'finished' && room.comparisonResults && (
                <div className="debug-comparison">
                    <h4>比牌结果详情:</h4>
                    <pre>{JSON.stringify(room.comparisonResults, null, 2)}</pre>
                </div>
            )} */}
        </div>
    );
};

export default GameRoom;
