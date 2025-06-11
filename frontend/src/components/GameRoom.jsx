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

    // 自动准备并自动让AI准备，满足4人直接发牌
    useEffect(() => {
        if (!room || !room.players) return;
        // 如果不是playing且所有人未ready，自动全部ready
        if (room.status === 'waiting' && room.players.length === 4) {
            room.players.forEach(player => {
                if (!player.isReady) {
                    if (player.id === socket.id) {
                        socket.emit('playerReady', { roomId: room.id, isReady: true }, () => {});
                    }
                }
            });
        }
    }, [room]);

    // 游戏提示
    useEffect(() => {
        if (!room || !room.status) return setGameMessage('');
        if (room.status === 'waiting') setGameMessage('正在发牌...');
        else if (room.status === 'dealing') setGameMessage('发牌中...');
        else if (room.status === 'playing') setGameMessage('请摆牌（拖拽分道），然后点击“确认摆牌”！');
        else if (room.status === 'comparing') setGameMessage('比牌中...');
        else if (room.status === 'finished') setGameMessage('本局已结束，可开始下一局。');
        else setGameMessage('');
    }, [room]);

    // 全部玩家信息横幅
    const allPlayers = room.players || [];
    const myId = myPlayer ? myPlayer.id : '';
    const aiCount = allPlayers.filter(p => p.isAI).length;

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

    // 顶部横幅渲染所有玩家
    function renderPlayerBanner(player) {
        const isSelf = player.id === myId;
        return (
            <div
                key={player.id}
                className="player-banner-item"
                style={{
                    background: isSelf ? 'rgba(255,81,47,0.12)' : 'rgba(44,62,80,0.22)',
                    border: isSelf ? '2.5px solid #ff512f' : '2.5px solid #29ffc6',
                    boxShadow: isSelf ? '0 0 16px #ff512faa' : '0 0 12px #29ffc6aa'
                }}
            >
                <div className="player-banner-name">
                    {player.name}{player.isAI ? <span className="ai-tag">[AI]</span> : ' (你)'}
                </div>
                <div className="player-banner-score">
                    总分: <span className="score-num">{player.score ?? 0}</span>
                </div>
                {room.status === 'waiting' && (
                    <div className={`player-banner-status ${player.isReady ? 'ready' : 'not-ready'}`}>{player.isReady ? '已准备' : '未准备'}</div>
                )}
            </div>
        );
    }

    // 理牌区
    function renderSelfHandArea() {
        const handData = room.playerHands?.[myPlayer.id];
        return (
            <div className="main-self-handarea">
                {room.status === 'playing' && handData && !handData.submitted
                    ? <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} />
                    : <HandDisplay playerName={myPlayer.name} handData={handData} isSelf={true} roomStatus={room.status} />
                }
            </div>
        );
    }

    // 主要布局
    return (
        <div className="game-room-container container tabletop-background" style={{padding:'0', marginTop:'0'}}>
            {/* 顶部横幅：游戏名+全部玩家 */}
            <div className="full-banner-top">
                <div className="game-title-xuan">
                    十三水单机牌桌
                </div>
                <div className="all-player-banner-row">
                    {allPlayers.map(renderPlayerBanner)}
                </div>
            </div>
            <div className="main-game-content-xuan">
                <div className="main-game-message-xuan">{gameMessage}</div>
                {myPlayer && renderSelfHandArea()}
            </div>
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
            {/* 底部按钮区 */}
            <div className="main-bottom-actionbar-xuan">
                <button className="exit-hand-button" onClick={handleLeaveRoomClick}>退出游戏</button>
            </div>
        </div>
    );
};

export default GameRoom;
