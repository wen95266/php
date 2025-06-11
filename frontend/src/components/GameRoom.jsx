import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card';
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError, hideRoomInfo }) => {
    const [room, setRoom] = useState(initialRoom || {});
    const [myPlayer, setMyPlayer] = useState(null);
    const [gameMessage, setGameMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 监听 roomUpdate
    useEffect(() => {
        setRoom(initialRoom || {});
    }, [initialRoom]);

    useEffect(() => {
        const handleRoom = (r) => setRoom(r);
        const handleTime = (payload) => setTimeLeft(t => ({ ...t, [payload.playerId]: payload.timeLeft }));
        socket.on('roomUpdate', handleRoom);
        socket.on('timeLeftUpdate', handleTime);
        return () => {
            socket.off('roomUpdate', handleRoom);
            socket.off('timeLeftUpdate', handleTime);
        };
    }, []);

    // 找到自己
    useEffect(() => {
        if (!room || !room.players) return;
        const localId = socket.id;
        let mine = room.players.find(p => p.id === localId)
            || room.players[0]; // 容错: 若socket.id未同步，取第一个（通常是自己）
        setMyPlayer(mine || null);
    }, [room]);

    // 游戏提示
    useEffect(() => {
        if (!room || !room.status) return setGameMessage('');
        if (room.status === 'waiting') setGameMessage('等待所有玩家准备...');
        else if (room.status === 'dealing') setGameMessage('发牌中...');
        else if (room.status === 'playing') setGameMessage('请摆牌，点击牌面选择分道，然后提交！');
        else if (room.status === 'comparing') setGameMessage('比牌中...');
        else if (room.status === 'finished') setGameMessage('本局已结束，可开始下一局。');
        else setGameMessage('');
    }, [room]);

    // 对手玩家
    const opponentPlayers = React.useMemo(() => {
        if (!room?.players || !myPlayer) return [];
        return room.players.filter(p => p.id !== myPlayer.id);
    }, [room, myPlayer]);

    // 处理自己准备
    const handlePlayerReady = () => {
        socket.emit('playerReady', { roomId: room.id, isReady: !myPlayer.isReady }, (res) => {
            if (!res.success) setGlobalError(res.message || "准备失败");
        });
    };

    // 提交摆牌
    const handleSubmitHand = useCallback(
        ({ front, middle, back }) => {
            setIsSubmitting(true);
            socket.emit('submitHand', { roomId: room.id, front, middle, back }, (res) => {
                setIsSubmitting(false);
                if (!res.success) setGlobalError(res.message || "提交失败");
            });
        }, [room.id, setGlobalError]
    );

    // 下一局
    const handleRequestNextRound = () => {
        socket.emit('requestNextRound', { roomId: room.id }, (res) => {
            if (!res.success) setGlobalError(res.message || "无法开始下一局");
        });
    };

    // 离开房间
    const handleLeaveRoomClick = () => {
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom && onLeaveRoom();
        });
    };

    // 渲染对手区域
    function renderOpponentArea(player, idx) {
        if (!player) return null;
        const handData = room.playerHands?.[player.id];
        return (
            <div key={player.id} className={`player-area player-area-opponent-top`}>
                <div className="player-info-tabletop">
                    <span className="player-name-display">{player.name}{player.isAI ? <span className="ai-tag">[AI]</span> : ''}</span>
                    <span className="player-score-display">总分: {player.score ?? 0}</span>
                    <span className="player-status-display">
                        {room.status === 'waiting' ? (player.isReady ? <span className="ready">已准备</span> : <span className="not-ready">未准备</span>)
                        : room.status === 'playing' ? (handData?.submitted ? <span className="submitted">已提交</span> : <span className="pending">未提交</span>)
                        : null}
                    </span>
                </div>
                <div className="opponent-cards-display">
                    {room.status === 'playing'
                        ? <div className="hand-row">{player.cards.map((c, i) => <Card key={i} card={null} facedownProp={true} />)}</div>
                        : <HandDisplay playerName={player.name} handData={handData} isSelf={false} roomStatus={room.status} />}
                </div>
            </div>
        );
    }

    // 渲染自己
    function renderSelfArea() {
        const handData = room.playerHands?.[myPlayer.id];
        return (
            <div className="player-area player-area-self">
                <div className="player-info-tabletop">
                    <span className="player-name-display">{myPlayer.name} (你)</span>
                    <span className="player-score-display">总分: {myPlayer.score ?? 0}</span>
                    <span className="player-status-display">
                        {room.status === 'waiting'
                            ? (myPlayer.isReady ? <span className="ready">已准备</span> : <span className="not-ready">未准备</span>)
                            : room.status === 'playing'
                                ? (handData?.submitted ? <span className="submitted">已提交</span> : <span className="pending">未提交</span>)
                                : null}
                    </span>
                </div>
                {room.status === 'playing' && handData && !handData.submitted
                    ? <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
                    : <HandDisplay playerName={myPlayer.name} handData={handData} isSelf={true} roomStatus={room.status} />
                }
                {room.status === 'waiting' && (
                    <button onClick={handlePlayerReady} className="ready-button-tabletop">
                        {myPlayer.isReady ? '取消准备' : '点击准备'}
                    </button>
                )}
                {room.status === 'finished' && myPlayer.id === room.hostId && (
                    <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button>
                )}
                <button onClick={handleLeaveRoomClick} className="leave-button-tabletop" style={{marginTop:10}}>退出游戏</button>
            </div>
        );
    }

    // 牌桌布局
    return (
        <div className="game-room-container container tabletop-background">
            {/* 房间信息（可选隐藏） */}
            {!hideRoomInfo && (
                <div className="room-header-tabletop">
                    <h2>房间: {room.id} (状态: <span className={`status-text-${room.status}`}>{room.status}</span>)</h2>
                    <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button>
                </div>
            )}
            <div className="tabletop-main">
                {/* 对手区（3家） */}
                {opponentPlayers.map((op, i) => renderOpponentArea(op, i))}
                {/* 桌面中间：消息、按钮 */}
                <div className="game-center-area">
                    <div className="game-messages-tabletop">
                        <p>{gameMessage || " "}</p>
                    </div>
                    {/* 提示倒计时 */}
                    {room.players && room.players.length > 0 && (
                        <div style={{color: '#0cebeb', fontWeight:'bold', fontSize:'1.15em', margin:'10px 0'}}>
                            {room.players.map(p => 
                                (timeLeft?.[p.id] > 0 && <span key={p.id} style={{marginRight:18}}>
                                    {p.name}{p.isAI ? '[AI]' : ''}：{Math.ceil(timeLeft[p.id]/1000)}秒
                                </span>)
                            )}
                        </div>
                    )}
                </div>
                {/* 自己 */}
                {myPlayer && renderSelfArea()}
            </div>
            {/* 结算弹窗 */}
            {room.status === 'finished' && room.playerHands && (
                <div className="results-overlay-tabletop">
                    <h3>本局最终结果</h3>
                    {room.players.map(player => (
                        <HandDisplay key={player.id} playerName={player.name} handData={room.playerHands[player.id]} isSelf={player.id === myPlayer.id} roomStatus={room.status} />
                    ))}
                    {myPlayer.id === room.hostId && (
                        <button onClick={handleRequestNextRound} className="next-round-button-tabletop overlay-button">开始下一局</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default GameRoom;
