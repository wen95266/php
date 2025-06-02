// frontend/src/components/Lobby.jsx
import React, { useState } from 'react';
import socket from '../services/socketService';

const Lobby = ({ onJoinRoom }) => {
    const [playerName, setPlayerName] = useState('');
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [message, setMessage] = useState('');

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setMessage("请输入玩家名称");
            return;
        }
        socket.emit('createRoom', { playerName }, (response) => {
            if (response.success) {
                onJoinRoom(response.room);
            } else {
                setMessage(`创建房间失败: ${response.message}`);
            }
        });
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setMessage("请输入玩家名称");
            return;
        }
        if (!roomIdToJoin.trim()) {
            setMessage("请输入房间号");
            return;
        }
        socket.emit('joinRoom', { roomId: roomIdToJoin.toUpperCase(), playerName }, (response) => {
            if (response.success) {
                onJoinRoom(response.room);
            } else {
                setMessage(`加入房间失败: ${response.message}`);
            }
        });
    };

    return (
        <div className="lobby-container">
            <h2>十三水游戏大厅</h2>
            {message && <p className="error-message">{message}</p>}
            <div>
                <input
                    type="text"
                    placeholder="输入你的名称"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
            </div>
            <div>
                <button onClick={handleCreateRoom} disabled={!playerName.trim()}>创建房间</button>
            </div>
            <hr />
            <div>
                <input
                    type="text"
                    placeholder="输入房间号加入"
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                />
                <button onClick={handleJoinRoom} disabled={!playerName.trim() || !roomIdToJoin.trim()}>加入房间</button>
            </div>
        </div>
    );
};

export default Lobby;
