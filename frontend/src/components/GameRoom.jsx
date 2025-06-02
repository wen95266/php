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

    const getPlayerPositions = useCallback((players, selfId) => {
        // ... (此函数保持与上次牌桌布局版本一致) ...
        const selfIndex = players.findIndex(p => p.id === selfId);
        if (selfIndex === -1) return [];
        const numPlayers = players.length;
        const opponents = [];
        if (numPlayers === 2) {
            players.forEach((p) => {
                if (p.id !== selfId) opponents.push({ ...p, position: 'top' });
            });
        } else if (numPlayers === 3) {
            let opponentPos = ['top', 'left']; // Or right, depending on layout
            const reorderedPlayers = [...players.slice(selfIndex + 1), ...players.slice(0, selfIndex)];
            reorderedPlayers.slice(0, 2).forEach((p) => { // Only 2 opponents
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

    const handleRoomUpdate = useCallback((updatedRoom) => {
        console.log("TableTop RoomUpdate:", updatedRoom);
        setRoom(updatedRoom);
        const me = updatedRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);

        if (me) {
            setIsMyHandSubmitted(updatedRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(updatedRoom.players, me.id));
        } else {
            onLeaveRoom();
            return;
        }

        if (updatedRoom.status === 'finished') {
            setGameMessage("本局结束！请查看结果。");
        } else if (updatedRoom.status === 'playing') {
            const isReallySubmitted = updatedRoom.playerHands?.[me.id]?.submitted; // 从最新数据判断
            setGameMessage(me && isReallySubmitted ? "等待其他玩家摆牌..." : "请摆牌");
        } else if (updatedRoom.status === 'dealing') {
            setGameMessage("正在发牌...");
        } else if (updatedRoom.status === 'waiting') {
            setGameMessage(me?.isReady ? "已准备，等待其他玩家..." : "请点击准备开始游戏");
        }
        setGlobalError('');
    }, [setGlobalError, getPlayerPositions, onLeaveRoom]);

    useEffect(() => {
        // ... (useEffect 逻辑基本保持与上次牌桌布局版本一致) ...
        setRoom(initialRoom);
        const me = initialRoom.players.find(p => p.id === socket.id);
        setMyPlayer(me);
        if (me) {
            setIsMyHandSubmitted(initialRoom.playerHands?.[me.id]?.submitted || false);
            setOpponentPlayers(getPlayerPositions(initialRoom.players, me.id));
            setGameMessage(initialRoom.status === 'waiting' && me.isReady ? "已准备，等待其他玩家..." : 
                           (initialRoom.status === 'waiting' && !me.isReady ? "请点击准备开始游戏" : "游戏进行中..."));

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

    const handlePlayerReady = () => { /* ... (与上次一致) ... */
        if (!myPlayer) return;
        setGlobalError('');
        socket.emit('playerReady', { roomId: room.id, isReady: !myPlayer.isReady });
    };

    const handleSubmitHand = (handLayout) => { /* ... (与上次一致) ... */
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
                // setIsMyHandSubmitted(true); // roomUpdate 会处理
            } else {
                setGlobalError(`提交失败: ${response.message || '未知错误'}`);
            }
        });
    };
    
    const handleRequestNextRound = () => { /* ... (与上次一致) ... */
        if (!myPlayer || room.hostId !== myPlayer.id) return;
        setGlobalError('');
        socket.emit('requestNextRound', { roomId: room.id });
    };

    const handleLeaveRoomClick = () => { /* ... (与上次一致) ... */
        setGlobalError('');
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom();
        });
    };

    // 新增：添加AI玩家到房间的函数 (用于测试，实际游戏中AI加入方式可能不同)
    const handleAddAIPlayer = () => {
        if (room.players.length >= (room.maxPlayers || 4)) {
            setGlobalError("房间已满，无法添加AI玩家。");
            return;
        }
        setGlobalError('');
        // AI的名字和ID需要由后端生成或协调，这里我们只发送一个请求信号
        // 或者前端生成一个临时ID，后端再替换
        // 为简单起见，我们让后端处理AI的创建和ID，前端只发一个请求
        socket.emit('addAIPlayer', { roomId: room.id }, (response) => {
            if (!response || !response.success) {
                setGlobalError(response?.message || "添加AI失败");
            }
            // roomUpdate会更新玩家列表
        });
    };


    if (!room || !myPlayer) {
        return <div className="container loading-room"><p>正在加载牌桌...</p></div>;
    }

    const renderOpponentArea = (opponent) => {
        // ... (此函数渲染逻辑与上次牌桌布局版本基本一致, 只是player-info-tabletop中isAI的显示) ...
        const opponentHandData = room.playerHands?.[opponent.id];
        const showSubmittedHand = opponentHandData?.submitted && (room.status === 'playing' || room.status === 'comparing' || room.status === 'finished');

        return (
            <div key={opponent.id} className={`player-area player-area-opponent-${opponent.position || 'top'}`}> {/* 添加默认位置 */}
                <div className="player-info-tabletop">
                    <p className="player-name-display">
                        {opponent.name}
                        {opponent.isAI && <span className="ai-tag">[AI]</span>}
                        {opponent.id === room.hostId && <span className="host-tag-tabletop">(房主)</span>}
                    </p>
                    <p className="player-score-display">总分: {opponent.score || 0}</p>
                    {room.status === 'waiting' && !opponent.isAI && <p className={`player-status-display ${opponent.isReady ? 'ready' : 'not-ready'}`}>{opponent.isReady ? '已准备' : '未准备'}</p>}
                    {room.status === 'waiting' && opponent.isAI && <p className={`player-status-display ready`}>已准备</p>}
                    {room.status === 'playing' && <p className={`player-status-display ${opponentHandData?.submitted ? 'submitted' : 'pending'}`}>{opponentHandData?.submitted ? '已摆牌' : '摆牌中...'}</p>}
                </div>
                <div className="opponent-cards-display">
                    {showSubmittedHand && opponentHandData?.evaluated ? ( // 确保有evaluated才传给HandDisplay
                        <HandDisplay handData={opponentHandData} playerName="" isSelf={false}/>
                    ) : ( (room.status === 'playing' || room.status === 'dealing') && Array.isArray(opponent.cards) ? // 确保cards是数组
                        <div className="hand-row">
                            {opponent.cards.map((card, i) => <Card key={card?.id || `fd-${opponent.id}-${i}`} card={card} facedownProp={true} />)}
                        </div>
                        : <div className="hand-row"><p className="no-cards-placeholder">- 等待操作 -</p></div>
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
                 {/* 测试用：添加AI按钮，仅房主可见且房间未满时 */}
                 {myPlayer.id === room.hostId && room.players.length < (room.maxPlayers || 4) && room.status === 'waiting' && (
                    <button onClick={handleAddAIPlayer} className="add-ai-button">添加电脑</button>
                 )}
            </div>

            <div className="tabletop-main">
                {opponentPlayers.map(op => renderOpponentArea(op))}

                <div className="game-center-area">
                    <div className="game-messages-tabletop">
                        <p>{gameMessage}</p>
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
                            {myPlayer.isAI && <span className="ai-tag">[AI]</span>} {/* 虽然自己通常不是AI，但以防万一 */}
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
                        {room.status === 'playing' && isMyHandSubmitted && room.playerHands?.[myPlayer.id]?.evaluated && (
                            <div className="submitted-hand-preview">
                                <p>你的牌已提交，等待其他玩家。 你提交的牌:</p>
                                <HandDisplay handData={room.playerHands[myPlayer.id]} playerName="" isSelf={true}/>
                            </div>
                        )}
                         {/* 发牌阶段显示自己的手牌 */}
                         {room.status === 'dealing' && myPlayer.cards && myPlayer.cards.length > 0 && (
                            <div className="current-hand-display hand-row">
                                {myPlayer.cards.map(card => <Card key={card.id} card={card}/>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
                        <p className="info-message-overlay">等待房主开始下一局...</p>
                     )}
                </div>
            )}
        </div>
    );
};

export default GameRoom;
