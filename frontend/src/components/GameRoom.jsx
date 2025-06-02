// frontend/src/components/GameRoom.jsx
import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card';
import './GameRoom.css'; // 使用新的牌桌样式

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError }) => {
    const [room, setRoom] = useState(initialRoom);
    const [gameMessage, setGameMessage] = useState(''); // 游戏过程中的主要提示信息
    const [myPlayer, setMyPlayer] = useState(null);
    const [isMyHandSubmitted, setIsMyHandSubmitted] = useState(false);
    const [opponentPlayers, setOpponentPlayers] = useState([]); // 其他玩家列表

    // 根据玩家人数和自己的位置，确定其他玩家在牌桌上的位置 (简化版)
    // 返回一个对象数组，每个对象包含 player 数据和 position (e.g., 'top', 'left', 'right')
    const getPlayerPositions = useCallback((players, selfId) => {
        const selfIndex = players.findIndex(p => p.id === selfId);
        if (selfIndex === -1) return []; // 自己不在玩家列表中

        const numPlayers = players.length;
        const opponents = [];
        // 简单布局：假设自己总是在底部，其他玩家按顺序填补 top, left, right
        // 这是一个非常简化的布局逻辑，真实游戏需要更复杂的计算
        if (numPlayers === 2) {
            players.forEach((p, i) => {
                if (p.id !== selfId) opponents.push({ ...p, position: 'top' });
            });
        } else if (numPlayers === 3) {
            let opponentPos = ['top', 'left'];
            players.forEach((p) => {
                if (p.id !== selfId) {
                    if (opponentPos.length > 0) {
                        opponents.push({ ...p, position: opponentPos.shift() });
                    }
                }
            });
        } else if (numPlayers === 4) {
            let opponentPos = ['left', 'top', 'right']; // 假设自己是bottom
             // 找到自己的索引
            const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)];

            reorderedPlayers.forEach((p, i) => {
                // 简单示例，左，顶，右
                if (i < opponentPos.length) {
                     opponents.push({ ...p, position: opponentPos[i]});
                }
            });
        }
        return opponents;
    }, []);


    const handleRoomUpdate = useCallback((updatedRoom) => {
        console.log("TableTop RoomUpdate:", updatedRoom);
        setRoom(updatedRoom);
        const me = updatedRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);

        if (me) {
            setIsMyHandSubmitted(updatedRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(updatedRoom.players, me.id));
        } else {
            // 如果自己不在房间了 (例如被踢出或发生错误)
            onLeaveRoom(); // 触发离开房间逻辑
            return;
        }


        if (updatedRoom.status === 'finished') {
            setGameMessage("本局结束！请查看结果。");
        } else if (updatedRoom.status === 'playing') {
            setGameMessage(me && updatedRoom.playerHands?.[me.id]?.submitted ? "等待其他玩家摆牌..." : "请摆牌 (点击手牌选择,再点对应道)");
        } else if (updatedRoom.status === 'dealing') {
            setGameMessage("正在发牌...");
        } else if (updatedRoom.status === 'waiting') {
            setGameMessage(me?.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏");
        }
        setGlobalError('');
    }, [setGlobalError, getPlayerPositions, onLeaveRoom]);

    useEffect(() => {
        setRoom(initialRoom);
        const me = initialRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        if (me) {
            setIsMyHandSubmitted(initialRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(initialRoom.players, me.id));
        }

        socket.on('roomUpdate', handleRoomUpdate);
        socket.on('game_error', (errorMessage) => {
            setGameMessage('');
            setGlobalError(`游戏错误: ${errorMessage}`);
        });

        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            socket.off('game_error');
        };
    }, [initialRoom, handleRoomUpdate, setGlobalError, getPlayerPositions]);

    const handlePlayerReady = () => {
        if (!myPlayer) return;
        setGlobalError('');
        socket.emit('playerReady', { roomId: room.id, isReady: !myPlayer.isReady });
    };

    const handleSubmitHand = (handLayout) => {
        if (!myPlayer) return;
        setGlobalError('');
        const transformHandForBackend = (cards) => cards.map(c => ({ suit: c.suit, rank: c.rank, id: c.id }));
        socket.emit('submitHand', {
            roomId: room.id,
            front: transformHandForBackend(handLayout.front),
            middle: transformHandForBackend(handLayout.middle),
            back: transformHandForBackend(handLayout.back),
        }, (response) => {
            if (response.success) {
                setIsMyHandSubmitted(true);
            } else {
                setGlobalError(`提交失败: ${response.message || '未知错误'}`);
            }
        });
    };
    
    const handleRequestNextRound = () => {
        if (!myPlayer || room.hostId !== myPlayer.id) return;
        setGlobalError('');
        socket.emit('requestNextRound', { roomId: room.id });
    };

    const handleLeaveRoomClick = () => {
        setGlobalError('');
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom();
        });
    };

    if (!room || !myPlayer) {
        return <div className="container loading-room"><p>正在加载牌桌...</p></div>;
    }

    // 渲染单个对手区域
    const renderOpponentArea = (opponent) => {
        const opponentHandData = room.playerHands?.[opponent.id];
        const showSubmittedHand = opponentHandData?.submitted && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished');

        return (
            <div key={opponent.id} className={`player-area player-area-opponent-${opponent.position}`}>
                <div className="player-info-tabletop">
                    <p className="player-name-display">{opponent.name} {opponent.id === room.hostId ? '(房主)' : ''}</p>
                    <p className="player-score-display">总分: {opponent.score || 0}</p>
                    {room.status === 'waiting' && <p className={`player-status-display ${opponent.isReady ? 'ready' : 'not-ready'}`}>{opponent.isReady ? '已准备' : '未准备'}</p>}
                    {room.status === 'playing' && <p className={`player-status-display ${opponentHandData?.submitted ? 'submitted' : 'pending'}`}>{opponentHandData?.submitted ? '已摆牌' : '摆牌中...'}</p>}
                </div>
                <div className="opponent-cards-display">
                    {showSubmittedHand ? (
                        <HandDisplay handData={opponentHandData} playerName="" isSelf={false}/> // 简化，不显示名字
                    ) : ( room.status === 'playing' || room.status === 'dealing' ?
                        <div className="hand-row">
                            {Array(13).fill(null).map((_, i) => <Card key={`fd-${opponent.id}-${i}`} facedownProp={true} />)}
                        </div>
                        : null // 其他状态不显示牌背
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="game-room-container container tabletop-background"> {/* 添加一个用于背景图的类 */}
            <div className="room-header-tabletop">
                <h2>房间: {room.id} (状态: {room.status})</h2>
                <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button>
            </div>

            <div className="room-info-bar">
                 <p>玩家人数: {room.players.length} / {room.maxPlayers || 4}</p>
            </div>

            <div className="tabletop-main">
                {/* 对手区域渲染 */}
                {opponentPlayers.map(op => renderOpponentArea(op))}

                {/* 牌桌中心区域: 消息和按钮 */}
                <div className="game-center-area">
                    <div className="game-messages-tabletop">
                        <p>{gameMessage}</p>
                    </div>
                    <div className="action-buttons-tabletop">
                        {room.status === 'waiting' && (
                            <button onClick={handlePlayerReady} className="ready-button-tabletop">
                                {myPlayer.isReady ? '取消准备' : '点击准备'}
                            </button>
                        )}
                        {room.status === 'finished' && myPlayer.id === room.hostId && (
                            <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button>
                        )}
                    </div>
                </div>

                {/* 当前玩家区域 */}
                <div className="player-area player-area-self">
                    <div className="player-info-tabletop">
                        <p className="player-name-display">{myPlayer.name} (你) {myPlayer.id === room.hostId ? '(房主)' : ''}</p>
                        <p className="player-score-display">总分: {myPlayer.score || 0}</p>
                         {room.status === 'waiting' && <p className={`player-status-display ${myPlayer.isReady ? 'ready' : 'not-ready'}`}>{myPlayer.isReady ? '已准备' : '未准备'}</p>}
                         {room.status === 'playing' && <p className={`player-status-display ${isMyHandSubmitted ? 'submitted' : 'pending'}`}>{isMyHandSubmitted ? '已摆牌' : '摆牌中...'}</p>}
                    </div>

                    <div className="player-self-hand-interaction">
                        {room.status === 'playing' && !isMyHandSubmitted && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
                        )}
                        {room.status === 'playing' && isMyHandSubmitted && (
                            <div className="container"><p>你的牌已提交，等待其他玩家。 你提交的牌:</p>
                            <HandDisplay handData={room.playerHands?.[myPlayer.id]} playerName="" isSelf={true}/>
                            </div>
                        )}
                         {(room.status === 'comparing' || room.status === 'dealing' && !isMyHandSubmitted) && myPlayer.cards && myPlayer.cards.length > 0 && (
                            // 发牌阶段或比牌前，如果自己还没提交，显示自己的手牌(未摆放)
                            <div className="hand-row current-hand-display">
                                {myPlayer.cards.map(card => <Card key={card.id} card={card}/>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 游戏结果覆盖层 */}
            {(room.status === 'comparing' || room.status === 'finished') && room.playerHands && (
                <div className="results-overlay-tabletop">
                    <h3>本局结果</h3>
                    {room.players.map(player => (
                        <HandDisplay
                            key={player.id}
                            playerName={player.name}
                            handData={room.playerHands[player.id]}
                            isSelf={player.id === myPlayer.id}
                        />
                    ))}
                     {room.status === 'finished' && myPlayer.id !== room.hostId && (
                        <p className="info-message">等待房主开始下一局...</p>
                     )}
                     {/* 房主开始下一局按钮已在 game-center-area 处理 */}
                </div>
            )}
        </div>
    );
};

export default GameRoom;
