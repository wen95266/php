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
    const [myPlayer, setMyPlayer] = useState(null);
    const [isMyHandSubmitted, setIsMyHandSubmitted] = useState(false);
    const [opponentPlayers, setOpponentPlayers] = useState([]);
    const [playersTimeLeft, setPlayersTimeLeft] = useState({}); // { playerId: timeLeftInMs }

    const getPlayerPositions = useCallback((players, selfId) => { /* ... (与上次代码一致) ... */ const selfIndex = players.findIndex(p => p.id === selfId); if (selfIndex === -1) return []; const numPlayers = players.length; const opponents = []; if (numPlayers === 2) { players.forEach((p) => { if (p.id !== selfId) opponents.push({ ...p, position: 'top' }); }); } else if (numPlayers === 3) { let opponentPos = ['top', 'left']; const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)]; reorderedPlayers.slice(0, 2).forEach((p) => { if (opponentPos.length > 0) { opponents.push({ ...p, position: opponentPos.shift() }); } }); } else if (numPlayers === 4) { let opponentPos = ['left', 'top', 'right']; const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)]; reorderedPlayers.forEach((p, i) => { if (i < opponentPos.length) { opponents.push({ ...p, position: opponentPos[i]}); } }); } return opponents; }, []);

    const handleRoomUpdate = useCallback((updatedRoom) => {
        console.log("TableTop RoomUpdate (for countdown check):", updatedRoom);
        setRoom(updatedRoom);
        const me = updatedRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);

        if (me) {
            setIsMyHandSubmitted(updatedRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(updatedRoom.players, me.id));
            if (updatedRoom.timeLeft) { // 从 roomUpdate 中获取最新的 timeLeft
                setPlayersTimeLeft(updatedRoom.timeLeft);
                console.log("Updated playersTimeLeft from roomUpdate:", updatedRoom.timeLeft);
            }
        } else {
            onLeaveRoom();
            return;
        }
        // ... (gameMessage 设置与上次一致)
        if (updatedRoom.status === 'finished') { setGameMessage("本局结束！请查看结果。"); } else if (updatedRoom.status === 'comparing') { setGameMessage("正在比牌和计分..."); } else if (updatedRoom.status === 'playing') { const isReallySubmitted = updatedRoom.playerHands?.[me.id]?.submitted; setGameMessage(me && isReallySubmitted ? "等待其他玩家摆牌..." : "请摆牌"); } else if (updatedRoom.status === 'dealing') { setGameMessage("正在发牌..."); } else if (updatedRoom.status === 'waiting') { setGameMessage(me?.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏"); } setGlobalError('');
    }, [setGlobalError, getPlayerPositions, onLeaveRoom]);

    const handleTimeLeftUpdate = useCallback(({ playerId, timeLeft }) => {
        // console.log(`Received timeLeftUpdate for ${playerId}: ${timeLeft}ms`);
        setPlayersTimeLeft(prev => ({
            ...prev,
            [playerId]: timeLeft
        }));
    }, []);

    useEffect(() => {
        setRoom(initialRoom);
        const me = initialRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        if (me) {
            setIsMyHandSubmitted(initialRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(initialRoom.players, me.id));
            if (initialRoom.timeLeft) { // 初始化 timeLeft
                 setPlayersTimeLeft(initialRoom.timeLeft);
            }
            // ... (gameMessage 初始化与上次一致) ...
            if (initialRoom.status === 'waiting') { setGameMessage(me.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏"); } else if (initialRoom.status === 'playing') { setGameMessage(initialRoom.playerHands?.[me.id]?.submitted ? "等待其他玩家摆牌..." : "请摆牌"); } else if (initialRoom.status === 'dealing') { setGameMessage("正在发牌..."); } else if (initialRoom.status === 'comparing'){ setGameMessage("正在比牌计分..."); } else if (initialRoom.status === 'finished'){ setGameMessage("本局结束！请查看结果。"); } else { setGameMessage("游戏进行中..."); }
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

    const handlePlayerReady = () => { /* ... (与上次一致) ... */ };
    const handleSubmitHand = (handLayout) => { /* ... (与上次一致) ... */ };
    const handleRequestNextRound = () => { /* ... (与上次一致) ... */ };
    const handleLeaveRoomClick = () => { /* ... (与上次一致) ... */ };
    const handleAddAIPlayer = () => { /* ... (与上次一致) ... */ };

    if (!room || !myPlayer) { return <div className="container loading-room"><p>正在加载牌桌...</p></div>; }

    const formatTime = (ms) => {
        if (typeof ms !== 'number' || ms <= 0) return "0"; // 如果时间小于等于0，直接显示0
        return Math.ceil(ms / 1000);
    };

    const renderOpponentArea = (opponent) => {
        const opponentHandData = room.playerHands?.[opponent.id];
        const showHandDisplayForOpponent = opponentHandData?.submitted && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished');
        const timeLeftForOpponent = playersTimeLeft[opponent.id]; // 从 state 中获取

        return (
            <div key={opponent.id} className={`player-area player-area-opponent-${opponent.position || 'top'}`}>
                <div className="player-info-tabletop">
                    <p className="player-name-display">
                        {opponent.name}
                        {opponent.isAI && <span className="ai-tag">[AI]</span>}
                        {opponent.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>}
                    </p>
                    <p className="player-score-display">总分: {opponent.score || 0}</p>
                    {room.status === 'waiting' && ( <p className={`player-status-display ${opponent.isReady ? 'ready' : 'not-ready'}`}> {opponent.isAI ? '已准备' : (opponent.isReady ? '已准备' : '未准备')} </p> )}
                    {room.status === 'playing' && (
                         <p className={`player-status-display ${opponentHandData?.submitted ? 'submitted' : 'pending'}`}>
                            {opponentHandData?.submitted ? '已摆牌' : (opponent.isAI ? '思考中...' : '摆牌中...')}
                            {/* 只为非AI且未提交的对手显示倒计时 */}
                            {!opponent.isAI && !opponentHandData?.submitted && typeof timeLeftForOpponent === 'number' && timeLeftForOpponent > 0 && (
                                <span className={`timer-display ${timeLeftForOpponent < 10000 ? 'low-time' : ''}`}> ({formatTime(timeLeftForOpponent)}s)</span>
                            )}
                         </p>
                    )}
                </div>
                <div className="opponent-cards-display"> {showHandDisplayForOpponent && opponentHandData?.evaluated ? ( <HandDisplay handData={opponentHandData} playerName="" isSelf={false} roomStatus={room.status} /> ) : ( (room.status === 'playing' || room.status === 'dealing') && Array.isArray(opponent.cards) ? ( <div className="hand-row"> {opponent.cards.map((card, i) => <Card key={card?.id || `fd-${opponent.id}-${i}`} card={card} facedownProp={true} />)} </div> ) : room.status !== 'waiting' && <div className="hand-row"><p className="no-cards-placeholder">- 等待操作 -</p></div> )} </div>
            </div>
        );
    };

    const timeLeftForSelf = playersTimeLeft[myPlayer.id]; // 从 state 中获取

    return (
        <div className="game-room-container container tabletop-background">
            <div className="room-header-tabletop"> <h2>房间: {room.id} (状态: <span className={`status-text-${room.status}`}>{room.status}</span>)</h2> <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button> </div>
            <div className="room-info-bar"> <p>玩家人数: {room.players.length} / {room.maxPlayers || 4}</p> {myPlayer.id === room.hostId && room.players.length < (room.maxPlayers || 4) && room.status === 'waiting' && ( <button onClick={handleAddAIPlayer} className="add-ai-button">添加电脑</button> )} </div>

            <div className="tabletop-main">
                {opponentPlayers.map(op => renderOpponentArea(op))}

                <div className="game-center-area">
                    <div className="game-messages-tabletop"> <p>{gameMessage || " "}</p> </div>
                    <div className="action-buttons-tabletop"> {room.status === 'waiting' && !myPlayer.isAI && ( <button onClick={handlePlayerReady} className="ready-button-tabletop"> {myPlayer.isReady ? '取消准备' : '点击准备'} </button> )} {room.status === 'finished' && myPlayer.id === room.hostId && ( <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button> )} </div>
                </div>

                <div className="player-area player-area-self">
                    <div className="player-info-tabletop">
                        <p className="player-name-display"> {myPlayer.name} (你) {myPlayer.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>} </p>
                        <p className="player-score-display">总分: {myPlayer.score || 0}</p>
                         {room.status === 'waiting' && !myPlayer.isAI && <p className={`player-status-display ${myPlayer.isReady ? 'ready' : 'not-ready'}`}>{myPlayer.isReady ? '已准备' : '未准备'}</p>}
                         {room.status === 'playing' && (
                            <p className={`player-status-display ${isMyHandSubmitted ? 'submitted' : 'pending'}`}>
                                {isMyHandSubmitted ? '已摆牌' : '摆牌中...'}
                                {/* 只为非AI且未提交的自己显示倒计时 */}
                                {!myPlayer.isAI && !isMyHandSubmitted && typeof timeLeftForSelf === 'number' && timeLeftForSelf > 0 && (
                                    <span className={`timer-display ${timeLeftForSelf < 10000 ? 'low-time' : ''}`}>
                                        ({formatTime(timeLeftForSelf)}s)
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className="player-self-hand-interaction"> {room.status === 'playing' && !isMyHandSubmitted && myPlayer.cards && myPlayer.cards.length > 0 && ( <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} /> )} {isMyHandSubmitted && room.playerHands?.[myPlayer.id]?.evaluated && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished') && ( <div className="submitted-hand-preview"> <p>你的牌：</p> <HandDisplay handData={room.playerHands[myPlayer.id]} playerName="" isSelf={true} roomStatus={room.status} /> </div> )} {room.status === 'dealing' && myPlayer.cards && myPlayer.cards.length > 0 && ( <div className="current-hand-display hand-row"> {myPlayer.cards.map(card => <Card key={card.id} card={card}/>)} </div> )} </div>
                </div>
            </div>

            {room.status === 'finished' && room.playerHands && ( <div className="results-overlay-tabletop"> <h3>本局最终结果</h3> {room.players.map(player => ( <HandDisplay key={player.id} playerName={player.name} handData={room.playerHands[player.id]} isSelf={player.id === myPlayer.id} roomStatus={room.status} /> ))} {myPlayer.id !== room.hostId && ( <p className="info-message-overlay">等待房主开始下一局...</p> )} {myPlayer.id === room.hostId && ( <button onClick={handleRequestNextRound} className="next-round-button-tabletop overlay-button">开始下一局</button> )} </div> )}
        </div>
    );
};

export default GameRoom;
