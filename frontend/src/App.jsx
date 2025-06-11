import React, { useState, useEffect } from 'react';
import socket from './services/socketService';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [error, setError] = useState('');

    // 自动生成一个本地昵称
    const [playerName] = useState(() => {
        const stored = localStorage.getItem('playerName');
        if (stored) return stored;
        const name = "玩家" + Math.floor(Math.random() * 9000 + 1000);
        localStorage.setItem('playerName', name);
        return name;
    });

    // 自动开局并补AI
    useEffect(() => {
        socket.connect();

        function onConnect() {
            setIsConnected(true);
            setError('');
            // 创建快速游戏房间（每次进入都新房间，避免房间号冲突）
            socket.emit('createRoom', { playerName }, (res) => {
                if (res.success && res.room) {
                    const room = res.room;
                    // 自动添加AI直到4人
                    function addAIIfNeeded(room) {
                        if (room.players.length < 4) {
                            socket.emit('addAIPlayer', { roomId: room.id }, (resp) => {
                                if (resp.success) {
                                    // 等待roomUpdate触发递归
                                } else {
                                    setError(resp.message || "添加AI失败");
                                }
                            });
                        }
                    }
                    setCurrentRoom(room);
                    addAIIfNeeded(room);
                } else {
                    setError(res.message || "创建房间失败");
                }
            });
        }
        function onDisconnect(reason) {
            setIsConnected(false);
            setCurrentRoom(null);
            setError(`与服务器断开连接: ${reason}. 请尝试刷新页面。`);
        }
        function onConnectError(err) {
            setIsConnected(false);
            setCurrentRoom(null);
            setError(`连接服务器失败: ${err.message}. 请检查后端服务是否运行或网络连接。`);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        socket.on('roomUpdate', (room) => {
            setCurrentRoom(room);
            // 自动补AI
            if (room.players.length < 4) {
                socket.emit('addAIPlayer', { roomId: room.id }, () => {});
            }
        });

        socket.on('server_error', (msg) => setError(msg));

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('roomUpdate');
            socket.off('server_error');
        };
    }, [playerName]);

    return (
        <div className="app-container">
            {error && <p className="error-message global-error">{error}</p>}
            <main>
                {!isConnected && !currentRoom && !error && (
                    <div className="container"><p>正在连接到游戏服务器...</p></div>
                )}
                {currentRoom && (
                    <GameRoom
                        initialRoom={currentRoom}
                        onLeaveRoom={() => window.location.reload()}
                        setGlobalError={setError}
                        hideRoomInfo={true}
                    />
                )}
            </main>
        </div>
    );
}
export default App;
