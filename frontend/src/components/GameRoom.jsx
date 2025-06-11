import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card';
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError, hideRoomInfo }) => {
    const [room, setRoom] = useState(initialRoom || {});
    const [myPlayer, setMyPlayer] = useState(null);

    // 监听 roomUpdate
    useEffect(() => {
        setRoom(initialRoom || {});
    }, [initialRoom]);

    useEffect(() => {
        const handleRoom = (r) => setRoom(r);
        socket.on('roomUpdate', handleRoom);
        return () => {
            socket.off('roomUpdate', handleRoom);
        };
    }, []);

    // 找到自己
    useEffect(() => {
        if (!room || !room.players) return;
        const localId = socket.id;
        let mine = room.players.find(p => p.id === localId)
            || room.players[0];
        setMyPlayer(mine || null);
    }, [room]);

    // 提交摆牌
    const handleSubmitHand = useCallback(
        ({ front, middle, back }) => {
            socket.emit('submitHand', { roomId: room.id, front, middle, back }, (res) => {
                if (!res.success) setGlobalError(res.message || "提交失败");
            });
        }, [room.id, setGlobalError]
    );

    // 离开房间
    const handleLeaveRoomClick = () => {
        socket.emit('leaveRoom', { roomId: room.id }, () => {
            onLeaveRoom && onLeaveRoom();
        });
    };

    // 分数横幅（占满宽度）
    const allPlayers = room.players || [];
    const myId = myPlayer ? myPlayer.id : '';
    function renderPlayerBanner(player) {
        const isSelf = player.id === myId;
        return (
            <div
                key={player.id}
                className="player-banner-item"
                style={{
                    background: isSelf ? 'rgba(255,81,47,0.12)' : 'rgba(44,62,80,0.22)',
                    border: isSelf ? '2.5px solid #ff512f' : '2.5px solid #29ffc6',
                    boxShadow: isSelf ? '0 0 16px #ff512faa' : '0 0 12px #29ffc6aa',
                    flex: 1,
                    minWidth: 0,
                    margin: '0 8px'
                }}
            >
                <div className="player-banner-name">
                    {player.name}{player.isAI ? <span className="ai-tag">[AI]</span> : ' (你)'}
                </div>
                <div className="player-banner-score">
                    总分: <span className="score-num">{player.score ?? 0}</span>
                </div>
            </div>
        );
    }

    function renderSelfHandArea() {
        const handData = room.playerHands?.[myPlayer.id];
        return (
            <div className="main-self-handarea">
                {room.status === 'playing' && handData && !handData.submitted
                    ? <PlayerHand initialCards={myPlayer.cards} onSubmitHand={handleSubmitHand} roomStatus={room.status} aiPlayers={allPlayers.filter(p => p.isAI)} />
                    : <HandDisplay playerName={myPlayer.name} handData={handData} isSelf={true} roomStatus={room.status} />
                }
            </div>
        );
    }

    return (
        <div className="game-room-container container tabletop-background" style={{padding:'0', marginTop:'0'}}>
            {/* 只保留分数横幅 */}
            <div className="all-player-banner-row wide-row">
                {allPlayers.map(renderPlayerBanner)}
            </div>
            <div className="main-game-content-xuan">
                {myPlayer && renderSelfHandArea()}
            </div>
            {/* 底部按钮区 */}
            <div className="main-bottom-actionbar-xuan">
                <button className="exit-hand-button" onClick={handleLeaveRoomClick}>退出游戏</button>
            </div>
        </div>
    );
};

export default GameRoom;
