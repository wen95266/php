// frontend/src/components/GameRoom.jsx
import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card'; // 用于显示牌背
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError }) => {
    const [room, setRoom] = useState(initialRoom);
    const [localMessage, setLocalMessage] = useState(''); // 房间内消息
    const [myPlayer, setMyPlayer] = useState(null);
    const [isMyHandSubmitted, setIsMyHandSubmitted] = useState(false);

    // useCallback for socket event handlers to avoid re-registering on every render
    const handleRoomUpdate = useCallback((updatedRoom) => {
        console.log("RoomUpdate received in GameRoom:", updatedRoom);
        setRoom(updatedRoom);
        const me = updatedRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        setIsMyHandSubmitted(updatedRoom.playerHands?.[socket.id]?.submitted || false);

        if (updatedRoom.status === 'finished') {
            setLocalMessage("本局结束！查看结果。");
        } else if (updatedRoom.status === 'playing') {
            setLocalMessage(me && updatedRoom.playerHands?.[me.id]?.submitted ? "等待其他玩家摆牌..." : "请摆牌...");
        } else if (updatedRoom.status === 'dealing') {
            setLocalMessage("正在发牌...");
        } else if (updatedRoom.status === 'waiting') {
            setLocalMessage("等待玩家准备...");
        }
        setGlobalError(''); // 清除全局错误
    }, [setGlobalError]);

    useEffect(() => {
        // Initial setup based on prop
        setRoom(initialRoom);
        const me = initialRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        setIsMyHandSubmitted(initialRoom.playerHands?.[socket.id]?.submitted || false);
        setLocalMessage(initialRoom.status === 'waiting' ? "等待玩家准备..." : "游戏进行中...");

        socket.on('roomUpdate', handleRoomUpdate);
        // Specific error from game logic if backend emits it
        socket.on('game_error', (errorMessage) => {
            setLocalMessage(''); // 清除本地消息，显示游戏错误
            setGlobalError(`游戏错误: ${errorMessage}`);
        });


        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            socket.off('game_error');
        };
    }, [initialRoom, handleRoomUpdate, setGlobalError]);


    const handlePlayerReady = () => {
        if (!myPlayer) return;
        setGlobalError('');
        setLocalMessage('发送准备状态...');
        socket.emit('playerReady', { roomId: room.id, isReady: !myPlayer.isReady }, (response) => {
            if (!response || !response.success) {
                const msg = `操作失败: ${response?.message || '未知错误'}`;
                setLocalMessage('');
                setGlobalError(msg);
            }
            // Room update will refresh the local message
        });
    };

    const handleSubmitHand = (handLayout) => { // { front: [Card], middle: [Card], back: [Card] }
        if (!myPlayer) return;
        setGlobalError('');
        setLocalMessage('提交手牌中...');

        // 将Card对象转换为后端期望的简单对象（如果后端只接收suit和rank）
        // 假设后端 Card 类构造函数需要 suit 和 rank
        const transformHandForBackend = (cards) => cards.map(c => ({ suit: c.suit, rank: c.rank, id: c.id }));

        socket.emit('submitHand', {
            roomId: room.id,
            front: transformHandForBackend(handLayout.front),
            middle: transformHandForBackend(handLayout.middle),
            back: transformHandForBackend(handLayout.back),
        }, (response) => {
            if (response.success) {
                // setLocalMessage('手牌已提交，等待其他玩家...'); // RoomUpdate会处理
                setIsMyHandSubmitted(true); // 立即更新本地状态
            } else {
                setLocalMessage('');
                setGlobalError(`提交失败: ${response.message || '未知错误'}`);
            }
        });
    };
    
    const handleRequestNextRound = () => {
        if (!myPlayer || room.hostId !== myPlayer.id) return;
        setGlobalError('');
        setLocalMessage('请求开始下一局...');
        socket.emit('requestNextRound', { roomId: room.id }, (response) => {
            if (!response || !response.success) {
                const msg = `无法开始下一局: ${response?.message || '未知错误'}`;
                setLocalMessage('');
                setGlobalError(msg);
            }
            // RoomUpdate will reset status and messages
        });
    };

    const handleLeaveRoomClick = () => {
        setGlobalError('');
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom(); // Callback to App.jsx to set currentRoom to null
        });
    };

    if (!room || !myPlayer) {
        return <div className="container loading-room"><p>正在加载房间信息...</p></div>;
    }

    return (
        <div className="game-room-container container">
            <div className="room-header">
                <h2>房间号: {room.id}</h2>
                <button onClick={handleLeaveRoomClick} className="leave-button">离开房间</button>
            </div>
            <p className="room-status">状态: {room.status} {localMessage && `- ${localMessage}`}</p>

            <div className="players-list">
                <h3>玩家 ({room.players.length}/{room.maxPlayers || 4}):</h3>
                <ul>
                    {room.players.map(player => (
                        <li key={player.id} className={player.id === myPlayer.id ? 'current-player' : ''}>
                            <span className="player-name-ingame">{player.name}</span>
                            {player.id === room.hostId && <span className="host-tag">(房主)</span>}
                            {room.status === 'waiting' && (
                                <span className={`status-tag ${player.isReady ? 'ready' : 'not-ready'}`}>
                                    {player.isReady ? '已准备' : '未准备'}
                                </span>
                            )}
                            {room.status === 'playing' && room.playerHands[player.id]?.submitted &&
                                <span className="status-tag submitted">(已摆牌)</span>}
                            <span className="player-score">总分: {player.score || 0}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {room.status === 'waiting' && (
                <button onClick={handlePlayerReady} className="ready-button">
                    {myPlayer.isReady ? '取消准备' : '点击准备'}
                </button>
            )}

            {room.status === 'playing' && !isMyHandSubmitted && myPlayer.cards && myPlayer.cards.length > 0 && (
                <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
            )}
            {room.status === 'playing' && isMyHandSubmitted && (
                <p className="info-message">你的牌已提交，等待其他玩家...</p>
            )}


            {/* 其他玩家的牌背 (仅在playing状态且对方未提交时) */}
            {room.status === 'playing' && (
                <div className="opponents-preview-area">
                    <h4>其他玩家状态:</h4>
                    {room.players.filter(p => p.id !== myPlayer.id).map(opponent => (
                        <div key={opponent.id} className="opponent-preview">
                            <p>{opponent.name}:
                                {room.playerHands[opponent.id]?.submitted ?
                                    <span className="status-tag submitted-dark"> 已提交</span> :
                                    <span className="status-tag pending-dark"> 摆牌中...</span>}
                            </p>
                            {!room.playerHands[opponent.id]?.submitted && (
                                <div className="opponent-facedown-cards hand-row">
                                    {Array(13).fill(null).map((_, i) => <Card key={`fd-${opponent.id}-${i}`} facedownProp={true} />)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 结果展示区 */}
            {(room.status === 'comparing' || room.status === 'finished') && room.playerHands && (
                <div className="results-area">
                    <h3>本局结果:</h3>
                    {room.players.map(player => (
                        <HandDisplay
                            key={player.id}
                            playerName={player.name}
                            handData={room.playerHands[player.id]} // 后端应确保 playerHands 包含所有玩家的数据
                            isSelf={player.id === myPlayer.id}
                            // isWinnerSegment={room.comparisonResults?.segmentWinners} // 可选，如果后端提供了每道赢家
                        />
                    ))}
                </div>
            )}
            
            {room.status === 'finished' && myPlayer.id === room.hostId && (
                 <button onClick={handleRequestNextRound} className="next-round-button">开始下一局 (仅房主)</button>
            )}
            {room.status === 'finished' && myPlayer.id !== room.hostId && (
                 <p className="info-message">等待房主开始下一局...</p>
            )}
        </div>
    );
};

export default GameRoom;
