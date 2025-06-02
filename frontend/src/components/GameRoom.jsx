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

    // getPlayerPositions 函数保持与上次牌桌布局版本一致
    const getPlayerPositions = useCallback((players, selfId) => { /* ... (上次代码) ... */
        const selfIndex = players.findIndex(p => p.id === selfId);
        if (selfIndex === -1) return [];
        const numPlayers = players.length;
        const opponents = [];
        if (numPlayers === 2) {
            players.forEach((p) => {
                if (p.id !== selfId) opponents.push({ ...p, position: 'top' });
            });
        } else if (numPlayers === 3) {
            let opponentPos = ['top', 'left'];
            const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)];
            reorderedPlayers.slice(0, 2).forEach((p) => {
                 if (opponentPos.length > 0) {
                    opponents.push({ ...p, position: opponentPos.shift() });
                }
            });
        } else if (numPlayers === 4) {
            let opponentPos = ['left', 'top', 'right'];
            const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)];
            reorderedPlayers.forEach((p, i) => {
                if (i < opponentPos.length) {
                     opponents.push({ ...p, position: opponentPos[i]});
                }
            });
        }
        return opponents;
    }, []);


    // handleRoomUpdate 保持与上次牌桌布局版本一致或微调 gameMessage
    const handleRoomUpdate = useCallback((updatedRoom) => { /* ... (上次代码，确保 gameMessage 设置正确) ... */
        console.log("TableTop RoomUpdate:", updatedRoom);
        setRoom(updatedRoom); // 更新整个 room 对象
        const me = updatedRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);

        if (me) {
            setIsMyHandSubmitted(updatedRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(updatedRoom.players, me.id));
        } else {
            onLeaveRoom(); // 如果自己不在房间了
            return;
        }

        // 更新游戏提示信息
        if (updatedRoom.status === 'finished') {
            setGameMessage("本局结束！请查看结果。");
        } else if (updatedRoom.status === 'comparing') {
            setGameMessage("正在比牌和计分...");
        } else if (updatedRoom.status === 'playing') {
            const isReallySubmitted = updatedRoom.playerHands?.[me.id]?.submitted;
            setGameMessage(me && isReallySubmitted ? "等待其他玩家摆牌..." : "请摆牌");
        } else if (updatedRoom.status === 'dealing') {
            setGameMessage("正在发牌...");
        } else if (updatedRoom.status === 'waiting') {
            setGameMessage(me?.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏");
        }
        setGlobalError('');
    }, [setGlobalError, getPlayerPositions, onLeaveRoom]);

    // useEffect 保持与上次牌桌布局版本一致
    useEffect(() => { /* ... (上次代码) ... */
        setRoom(initialRoom);
        const me = initialRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        if (me) {
            setIsMyHandSubmitted(initialRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(initialRoom.players, me.id));
            // 初始化 gameMessage
            if (initialRoom.status === 'waiting') {
                setGameMessage(me.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏");
            } else if (initialRoom.status === 'playing') {
                setGameMessage(initialRoom.playerHands?.[me.id]?.submitted ? "等待其他玩家摆牌..." : "请摆牌");
            } else if (initialRoom.status === 'dealing') {
                setGameMessage("正在发牌...");
            } else if (initialRoom.status === 'comparing'){
                setGameMessage("正在比牌计分...");
            } else if (initialRoom.status === 'finished'){
                setGameMessage("本局结束！请查看结果。");
            } else {
                setGameMessage("游戏进行中...");
            }
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


    // handlePlayerReady, handleSubmitHand, handleRequestNextRound, handleLeaveRoomClick, handleAddAIPlayer
    // 这些方法基本保持与上次牌桌布局版本一致
    const handlePlayerReady = () => { if (!myPlayer || myPlayer.isAI) return; setGlobalError(''); socket.emit('playerReady', { roomId: room.id, isReady: !myPlayer.isReady }); };
    const handleSubmitHand = (handLayout) => { if (!myPlayer) return; setGlobalError(''); const transformHandForBackend = (cards) => cards.map(c => ({ suit: c.suit, rank: c.rank, id: c.id })); socket.emit('submitHand', { roomId: room.id, front: transformHandForBackend(handLayout.front), middle: transformHandForBackend(handLayout.middle), back: transformHandForBackend(handLayout.back), }, (response) => { if (!response.success) { setGlobalError(`提交失败: ${response.message || '未知错误'}`); } }); };
    const handleRequestNextRound = () => { if (!myPlayer || room.hostId !== myPlayer.id) return; setGlobalError(''); socket.emit('requestNextRound', { roomId: room.id }); };
    const handleLeaveRoomClick = () => { setGlobalError(''); socket.emit('leaveRoom', { roomId: room.id }, () => { onLeaveRoom(); }); };
    const handleAddAIPlayer = () => { if (room.players.length >= (room.maxPlayers || 4)) { setGlobalError("房间已满，无法添加AI玩家。"); return; } setGlobalError(''); socket.emit('addAIPlayer', { roomId: room.id }, (response) => { if (!response || !response.success) { setGlobalError(response?.message || "添加AI失败"); } }); };


    if (!room || !myPlayer) {
        return <div className="container loading-room"><p>正在加载牌桌...</p></div>;
    }

    // renderOpponentArea 函数需要传递 room.status 给 HandDisplay
    const renderOpponentArea = (opponent) => {
        const opponentHandData = room.playerHands?.[opponent.id];
        // 只有在 playing 状态且对方已提交，或 comparing/finished 状态，才展示 HandDisplay
        const showHandDisplayForOpponent = opponentHandData?.submitted && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished');

        return (
            <div key={opponent.id} className={`player-area player-area-opponent-${opponent.position || 'top'}`}>
                <div className="player-info-tabletop">
                    <p className="player-name-display">
                        {opponent.name}
                        {opponent.isAI && <span className="ai-tag">[AI]</span>}
                        {opponent.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>}
                    </p>
                    <p className="player-score-display">总分: {opponent.score || 0}</p>
                    {room.status === 'waiting' && (
                        <p className={`player-status-display ${opponent.isReady ? 'ready' : 'not-ready'}`}>
                            {opponent.isAI ? '已准备' : (opponent.isReady ? '已准备' : '未准备')}
                        </p>
                    )}
                    {room.status === 'playing' && (
                         <p className={`player-status-display ${opponentHandData?.submitted ? 'submitted' : 'pending'}`}>
                            {opponentHandData?.submitted ? '已摆牌' : (opponent.isAI ? '思考中...' : '摆牌中...')}
                         </p>
                    )}
                </div>
                <div className="opponent-cards-display">
                    {showHandDisplayForOpponent && opponentHandData?.evaluated ? (
                        <HandDisplay handData={opponentHandData} playerName="" isSelf={false} roomStatus={room.status} />
                    ) : ( (room.status === 'playing' || room.status === 'dealing') && Array.isArray(opponent.cards) ?
                        <div className="hand-row">
                            {opponent.cards.map((card, i) => <Card key={card?.id || `fd-${opponent.id}-${i}`} card={card} facedownProp={true} />)}
                        </div>
                        : room.status !== 'waiting' && <div className="hand-row"><p className="no-cards-placeholder">- 等待操作 -</p></div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="game-room-container container tabletop-background">
            <div className="room-header-tabletop">
                <h2>房间: {room.id} (状态: <span className={`status-text-${room.status}`}>{room.status}</span>)</h2>
                <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button>
            </div>

            <div className="room-info-bar">
                 <p>玩家人数: {room.players.length} / {room.maxPlayers || 4}</p>
                 {myPlayer.id === room.hostId && room.players.length < (room.maxPlayers || 4) && room.status === 'waiting' && (
                    <button onClick={handleAddAIPlayer} className="add-ai-button">添加电脑</button>
                 )}
            </div>

            <div className="tabletop-main">
                {opponentPlayers.map(op => renderOpponentArea(op))}

                <div className="game-center-area">
                    <div className="game-messages-tabletop">
                        <p>{gameMessage || " "}</p> {/* 确保有内容撑开 */}
                    </div>
                    <div className="action-buttons-tabletop">
                        {room.status === 'waiting' && !myPlayer.isAI && (
                            <button onClick={handlePlayerReady} className="ready-button-tabletop">
                                {myPlayer.isReady ? '取消准备' : '点击准备'}
                            </button>
                        )}
                        {room.status === 'finished' && myPlayer.id === room.hostId && (
                            <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button>
                        )}
                    </div>
                </div>

                <div className="player-area player-area-self">
                    <div className="player-info-tabletop">
                        <p className="player-name-display">
                            {myPlayer.name} (你)
                            {myPlayer.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>}
                        </p>
                        <p className="player-score-display">总分: {myPlayer.score || 0}</p>
                         {room.status === 'waiting' && !myPlayer.isAI && <p className={`player-status-display ${myPlayer.isReady ? 'ready' : 'not-ready'}`}>{myPlayer.isReady ? '已准备' : '未准备'}</p>}
                         {room.status === 'playing' && <p className={`player-status-display ${isMyHandSubmitted ? 'submitted' : 'pending'}`}>{isMyHandSubmitted ? '已摆牌' : '摆牌中...'}</p>}
                    </div>

                    <div className="player-self-hand-interaction">
                        {room.status === 'playing' && !isMyHandSubmitted && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
                        )}
                        {/* 自己已提交后，也用 HandDisplay 展示，统一体验 */}
                        {isMyHandSubmitted && room.playerHands?.[myPlayer.id]?.evaluated && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished') && (
                            <div className="submitted-hand-preview">
                                <p>你的牌：</p>
                                <HandDisplay handData={room.playerHands[myPlayer.id]} playerName="" isSelf={true} roomStatus={room.status} />
                            </div>
                        )}
                         {/* 发牌阶段显示自己的明牌 */}
                         {room.status === 'dealing' && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <div className="current-hand-display hand-row">
                                {myPlayer.cards.map(card => <Card key={card.id} card={card}/>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 结果覆盖层只在 finished 状态下显示，comparing 状态时结果会在各自区域通过HandDisplay更新 */}
            {room.status === 'finished' && room.playerHands && (
                <div className="results-overlay-tabletop">
                    <h3>本局最终结果</h3>
                    {room.players.map(player => (
                        <HandDisplay
                            key={player.id}
                            playerName={player.name}
                            handData={room.playerHands[player.id]}
                            isSelf={player.id === myPlayer.id}
                            roomStatus={room.status} // 传递 roomStatus
                        />
                    ))}
                     {myPlayer.id !== room.hostId && ( // 统一放在这里，避免重复
                        <p className="info-message-overlay">等待房主开始下一局...</p>
                     )}
                     {myPlayer.id === room.hostId && ( // 房主开始下一局按钮也在此处，方便用户操作
                         <button onClick={handleRequestNextRound} className="next-round-button-tabletop overlay-button">开始下一局</button>
                     )}
                </div>
            )}
        </div>
    );
};

export default GameRoom;
