// frontend/src/components/Lobby.jsx
import React, { useState } from 'react';
import socket from '../services/socketService';
import './Lobby.css';

const Lobby = ({ onJoinRoom, setGlobalError }) => {
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setGlobalError("请输入玩家名称才能创建房间。");
            return;
        }
        setIsLoading(true);
        setGlobalError('');
        localStorage.setItem('playerName', playerName.trim());
        socket.emit('createRoom', { playerName: playerName.trim() }, (response) => {
            setIsLoading(false);
            if (response.success && response.room) {
                onJoinRoom(response.room);
            } else {
                setGlobalError(`创建房间失败: ${response.message || '未知错误'}`);
            }
        });
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setGlobalError("请输入玩家名称才能加入房间。");
            return;
        }
        if (!roomIdToJoin.trim()) {
            setGlobalError("请输入房间号。");
            return;
        }
        setIsLoading(true);
        setGlobalError('');
        localStorage.setItem('playerName', playerName.trim());
        socket.emit('joinRoom', { roomId: roomIdToJoin.trim().toUpperCase(), playerName: playerName.trim() }, (response) => {
            setIsLoading(false);
            if (response.success && response.room) {
                onJoinRoom(response.room);
            } else {
                setGlobalError(`加入房间 ${roomIdToJoin.trim().toUpperCase()} 失败: ${response.message || '未知错误'}`);
            }
        });
    };

    return (
        <div className="lobby-container container">
            <h2>游戏大厅</h2>
            <div className="form-group">
                <label htmlFor="playerName">玩家名称:</label>
                <input
                    id="playerName"
                    type="text"
                    placeholder="输入你的名称"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div className="action-group">
                <button onClick={handleCreateRoom} disabled={isLoading || !playerName.trim()}>
                    {isLoading ? '创建中...' : '创建新房间'}
                </button>
            </div>

            <hr className="divider" />

            <div className="form-group">
                <label htmlFor="roomIdToJoin">房间号:</label>
                <input
                    id="roomIdToJoin"
                    type="text"
                    placeholder="输入房间号加入"
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                    disabled={isLoading}
                />
            </div>
            <div className="action-group">
                <button onClick={handleJoinRoom} disabled={isLoading || !playerName.trim() || !roomIdToJoin.trim()}>
                    {isLoading ? '加入中...' : '加入指定房间'}
                </button>
            </div>
        </div>
    );
};

export default Lobby;
