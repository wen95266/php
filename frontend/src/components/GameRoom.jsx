// frontend/src/components/GameRoom.jsx
import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card';
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError }) => {
    const [room, setRoom] = useState(initialRoom);
    const [gameMessage, setGameMessage] = useState('');
    const [myPlayer, setMyPlayer] = useState(null); // 初始为 null
    const [isMyHandSubmitted, setIsMyHandSubmitted] = useState(false);
    const [opponentPlayers, setOpponentPlayers] = useState([]);
    const [playersTimeLeft, setPlayersTimeLeft] = useState({});

    // getPlayerPositions, handleTimeLeftUpdate 保持与上次一致
    const getPlayerPositions = useCallback((players, selfId) => { /* ... (上次代码) ... */ const selfIndex = players.findIndex(p => p.id === selfId); if (selfIndex === -1) return []; const numPlayers = players.length; const opponents = []; if (numPlayers === 2) { players.forEach((p) => { if (p.id !== selfId) opponents.push({ ...p, position: 'top' }); }); } else if (numPlayers === 3) { let opponentPos = ['top', 'left']; const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)]; reorderedPlayers.slice(0, 2).forEach((p) => { if (opponentPos.length > 0) { opponents.push({ ...p, position: opponentPos.shift() }); } }); } else if (numPlayers === 4) { let opponentPos = ['left', 'top', 'right']; const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)]; reorderedPlayers.forEach((p, i) => { if (i < opponentPos.length) { opponents.push({ ...p, position: opponentPos[i]}); } }); } return opponents; }, []);
    const handleTimeLeftUpdate = useCallback(({ playerId, timeLeft }) => { setPlayersTimeLeft(prev => ({ ...prev, [playerId]: timeLeft })); }, []);


    const handleRoomUpdate = useCallback((updatedRoom) => {
        console.log("[FRONTEND GameRoom] Received roomUpdate:", updatedRoom);
        setRoom(updatedRoom); // 更新整个 room 对象

        // 安全地查找和设置 myPlayer
        const me = updatedRoom.players?.find(p => p.id === socket.id); // 使用可选链
        setMyPlayer(me || null); // 如果找不到，确保 myPlayer 是 null

        if (me) {
            setIsMyHandSubmitted(updatedRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(updatedRoom.players, me.id));
            if (updatedRoom.timeLeft) {
                setPlayersTimeLeft(updatedRoom.timeLeft);
            }
        } else {
            // 如果 'me' 未找到 (例如，玩家已离开或被踢出)，应该触发离开房间的逻辑
            console.warn("[FRONTEND GameRoom] Current player not found in updatedRoom.players. Leaving room.");
            onLeaveRoom(); // 确保 onLeaveRoom 被调用
            return;
        }
        // ... (gameMessage 设置与上次一致)
        if (updatedRoom.status === 'finished') { setGameMessage("本局结束！请查看结果。"); } else if (updatedRoom.status === 'comparing') { setGameMessage("正在比牌和计分..."); } else if (updatedRoom.status === 'playing') { const isReallySubmitted = updatedRoom.playerHands?.[me.id]?.submitted; setGameMessage(me && isReallySubmitted ? "等待其他玩家摆牌..." : "请摆牌"); } else if (updatedRoom.status === 'dealing') { setGameMessage("正在发牌..."); } else if (updatedRoom.status === 'waiting') { setGameMessage(me?.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏"); } setGlobalError('');
    }, [setGlobalError, getPlayerPositions, onLeaveRoom]);


    useEffect(() => {
        // console.log("[FRONTEND GameRoom] Initializing with initialRoom:", initialRoom);
        setRoom(initialRoom);
        // 安全地查找和设置 myPlayer
        const me = initialRoom.players?.find(p => p.id === socket.id); // 使用可选链
        setMyPlayer(me || null); // 确保初始时也是 null 如果找不到

        if (me) {
            setIsMyHandSubmitted(initialRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(initialRoom.players, me.id));
            if (initialRoom.timeLeft) {
                 setPlayersTimeLeft(initialRoom.timeLeft);
            }
            // ... (gameMessage 初始化与上次一致) ...
            if (initialRoom.status === 'waiting') { setGameMessage(me.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏"); } else if (initialRoom.status === 'playing') { setGameMessage(initialRoom.playerHands?.[me.id]?.submitted ? "等待其他玩家摆牌..." : "请摆牌"); } else if (initialRoom.status === 'dealing') { setGameMessage("正在发牌..."); } else if (initialRoom.status === 'comparing'){ setGameMessage("正在比牌计分..."); } else if (initialRoom.status === 'finished'){ setGameMessage("本局结束！请查看结果。"); } else { setGameMessage("游戏进行中..."); }
        } else if (initialRoom && Array.isArray(initialRoom.players) && initialRoom.players.length > 0) {
            // 如果 initialRoom 有玩家但找不到自己，可能是刚加入，等待第一次 roomUpdate
            console.warn("[FRONTEND GameRoom] Initializing: Current player not found in initialRoom.players. Waiting for roomUpdate.");
        }


        socket.on('roomUpdate', handleRoomUpdate);
        socket.on('game_error', (errorMessage) => { setGameMessage(''); setGlobalError(`游戏错误: ${errorMessage}`); });
        socket.on('timeLeftUpdate', handleTimeLeftUpdate);
        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            socket.off('game_error');
            socket.off('timeLeftUpdate', handleTimeLeftUpdate);
        };
    }, [initialRoom, handleRoomUpdate, setGlobalError, getPlayerPositions, handleTimeLeftUpdate]);

    // handlePlayerReady, handleSubmitHand, handleRequestNextRound, handleLeaveRoomClick, handleAddAIPlayer
    // 在调用这些函数前，确保 myPlayer 和 room 存在
    const handlePlayerReady = () => { console.log("[FRONTEND GameRoom] handlePlayerReady called."); if (!myPlayer || !room || myPlayer.isAI) { console.warn("[FRONTEND GameRoom] handlePlayerReady: Conditions not met (myPlayer, room, or isAI)."); return; } setGlobalError(''); const payload = { roomId: room.id, isReady: !myPlayer.isReady }; console.log("[FRONTEND GameRoom] Emitting 'playerReady' with payload:", payload); socket.emit('playerReady', payload, (response) => { console.log("[FRONTEND GameRoom] 'playerReady' callback response:", response); if (!response || !response.success) { const msg = `准备操作失败: ${response?.message || '未知错误'}`; setGlobalError(msg); console.error("[FRONTEND GameRoom] playerReady error:", msg); } }); };
    const handleSubmitHand = (handLayout) => { if (!myPlayer || !room) return; setGlobalError(''); const transformHandForBackend = (cards) => cards.map(c => ({ suit: c.suit, rank: c.rank, id: c.id })); socket.emit('submitHand', { roomId: room.id, front: transformHandForBackend(handLayout.front), middle: transformHandForBackend(handLayout.middle), back: transformHandForBackend(handLayout.back), }, (response) => { if (!response.success) { setGlobalError(`提交失败: ${response.message || '未知错误'}`); } }); };
    const handleRequestNextRound = () => { if (!myPlayer || !room || room.hostId !== myPlayer.id) return; setGlobalError(''); socket.emit('requestNextRound', { roomId: room.id }); };
    const handleLeaveRoomClick = () => { if(!room) return; setGlobalError(''); socket.emit('leaveRoom', { roomId: room.id }, () => { onLeaveRoom(); }); };
    const handleAddAIPlayer = () => { console.log("[FRONTEND GameRoom] handleAddAIPlayer called."); if (!room || !myPlayer ) { console.warn("[FRONTEND GameRoom] handleAddAIPlayer: Room or myPlayer not available."); return; } if (room.players.length >= (room.maxPlayers || 4)) { const msg = "房间已满，无法添加AI玩家。"; setGlobalError(msg); console.warn("[FRONTEND GameRoom] handleAddAIPlayer:", msg); return; } if (room.status !== 'waiting') { const msg = "游戏已开始或结束，无法添加AI玩家。"; setGlobalError(msg); console.warn("[FRONTEND GameRoom] handleAddAIPlayer:", msg); return; } if (myPlayer.id !== room.hostId) { const msg = "只有房主才能添加AI玩家。"; setGlobalError(msg); console.warn("[FRONTEND GameRoom] handleAddAIPlayer:", msg); return; } setGlobalError(''); const payload = { roomId: room.id }; console.log("[FRONTEND GameRoom] Emitting 'addAIPlayer' with payload:", payload); socket.emit('addAIPlayer', payload, (response) => { console.log("[FRONTEND GameRoom] 'addAIPlayer' callback response:", response); if (!response || !response.success) { const msg = `添加AI失败: ${response?.message || '未知错误'}`; setGlobalError(msg); console.error("[FRONTEND GameRoom] addAIPlayer error:", msg); } }); };


    // 在渲染前，如果 myPlayer 仍然是 null，显示加载状态
    if (!room || !myPlayer) {
        console.log("[FRONTEND GameRoom] Rendering loading state (myPlayer or room is null). myPlayer:", myPlayer, "room:", room?.id);
        return <div className="container loading-room"><p>正在加载牌桌信息或等待加入成功...</p></div>;
    }

    const formatTime = (ms) => { /* ... (与上次一致) ... */ };
    const renderOpponentArea = (opponent) => { /* ... (与上次一致, 确保内部访问 opponent.score 等是安全的) ... */ };
    const timeLeftForSelf = playersTimeLeft[myPlayer.id]; // myPlayer 此时不为 null

    // JSX 渲染部分
    return (
        <div className="game-room-container container tabletop-background">
            <div className="room-header-tabletop">
                <h2>房间: {room.id} (状态: <span className={`status-text-${room.status}`}>{room.status}</span>)</h2>
                <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button>
            </div>

            <div className="room-info-bar">
                 <p>玩家人数: {room.players.length} / {room.maxPlayers || 4}</p>
                 {/* 添加AI按钮的条件，现在 myPlayer 肯定存在 */}
                 {myPlayer.id === room.hostId && room.players.length < (room.maxPlayers || 4) && room.status === 'waiting' && (
                    <button onClick={handleAddAIPlayer} className="add-ai-button">添加电脑</button>
                 )}
            </div>

            <div className="tabletop-main">
                {opponentPlayers.map(op => renderOpponentArea(op))} {/* renderOpponentArea 内部也需要检查 op 是否有效 */}

                <div className="game-center-area">
                    <div className="game-messages-tabletop"> <p>{gameMessage || " "}</p> </div>
                    <div className="action-buttons-tabletop">
                        {/* 准备按钮，myPlayer 存在且不是AI */}
                        {room.status === 'waiting' && !myPlayer.isAI && (
                            <button onClick={handlePlayerReady} className="ready-button-tabletop">
                                {myPlayer.isReady ? '取消准备' : '点击准备'}
                            </button>
                        )}
                        {/* 开始下一局按钮，myPlayer 存在且是房主 */}
                        {room.status === 'finished' && myPlayer.id === room.hostId && (
                            <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button>
                        )}
                    </div>
                </div>

                <div className="player-area player-area-self">
                    <div className="player-info-tabletop">
                        <p className="player-name-display">
                            {myPlayer.name} (你)
                            {/* myPlayer 存在才判断 hostId */}
                            {myPlayer.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>}
                        </p>
                        <p className="player-score-display">总分: {myPlayer.score || 0}</p>
                         {room.status === 'waiting' && !myPlayer.isAI && <p className={`player-status-display ${myPlayer.isReady ? 'ready' : 'not-ready'}`}>{myPlayer.isReady ? '已准备' : '未准备'}</p>}
                         {room.status === 'playing' && (
                            <p className={`player-status-display ${isMyHandSubmitted ? 'submitted' : 'pending'}`}>
                                {isMyHandSubmitted ? '已摆牌' : '摆牌中...'}
                                {!myPlayer.isAI && !isMyHandSubmitted && typeof timeLeftForSelf === 'number' && timeLeftForSelf > 0 && (
                                    <span className={`timer-display ${timeLeftForSelf < 10000 ? 'low-time' : ''}`}>
                                        ({formatTime(timeLeftForSelf)}s)
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className="player-self-hand-interaction">
                        {/* 确保 myPlayer.cards 存在且有内容 */}
                        {room.status === 'playing' && !isMyHandSubmitted && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
                        )}
                        {isMyHandSubmitted && room.playerHands?.[myPlayer.id]?.evaluated && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished') && (
                            <div className="submitted-hand-preview">
                                <p>你的牌：</p>
                                <HandDisplay handData={room.playerHands[myPlayer.id]} playerName="" isSelf={true} roomStatus={room.status} />
                            </div>
                        )}
                         {room.status === 'dealing' && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <div className="current-hand-display hand-row">
                                {myPlayer.cards.map(card => <Card key={card.id} card={card}/>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {room.status === 'finished' && room.playerHands && (
                <div className="results-overlay-tabletop">
                    <h3>本局最终结果</h3>
                    {room.players.map(player => (
                        <HandDisplay
                            key={player.id}
                            playerName={player.name}
                            handData={room.playerHands[player.id]}
                            isSelf={player.id === myPlayer.id} // myPlayer 此时不为null
                            roomStatus={room.status}
                        />
                    ))}
                     {myPlayer.id !== room.hostId && (
                        <p className="info-message-overlay">等待房主开始下一局...</p>
                     )}
                     {myPlayer.id === room.hostId && (
                         <button onClick={handleRequestNextRound} className="next-round-button-tabletop overlay-button">开始下一局</button>
                     )}
                </div>
            )}
        </div>
    );
};

export default GameRoom;
