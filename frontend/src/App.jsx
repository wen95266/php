// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import socket from './services/socketService';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import './App.css'; // 可以创建一个 App.css 来放 App 组件的特定样式

function App() {
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [error, setError] = useState('');

    useEffect(() => {
        socket.connect();

        function onConnect() {
            setIsConnected(true);
            setError('');
            console.log("App: Socket connected with ID", socket.id);
        }
        function onDisconnect(reason) {
            setIsConnected(false);
            setCurrentRoom(null);
            setError(`与服务器断开连接: ${reason}. 请尝试刷新页面。`);
            console.log("App: Socket disconnected, reason:", reason);
        }
        function onConnectError(err) {
            setIsConnected(false);
            setCurrentRoom(null);
            setError(`连接服务器失败: ${err.message}. 请检查后端服务是否运行或网络连接。`);
            console.error("App: Socket connection error:", err);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // 监听后端发送的全局错误信息 (可选)
        socket.on('server_error', (errorMessage) => {
            setError(`服务器错误: ${errorMessage}`);
        });


        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('server_error');
            // socket.disconnect(); // 考虑是否在组件卸载时断开连接
        };
    }, []);

    const handleJoinRoom = (roomData) => {
        setCurrentRoom(roomData);
        setError(''); // 清除之前的错误
    };

    const handleLeaveRoom = () => {
        setCurrentRoom(null);
    };

    return (
        <div className="app-container">
            <header>
                <h1>十三水在线游戏</h1>
                <p className="socket-status">
                    Socket 状态: {isConnected ?
                        <span style={{color: 'lightgreen'}}>已连接 (ID: {socket.id?.substring(0,6)})</span> :
                        <span style={{color: 'salmon'}}>未连接</span>}
                </p>
            </header>

            {error && <p className="error-message global-error">{error}</p>}

            <main>
                {!isConnected && !currentRoom && !error && (
                     <div className="container"><p>正在连接到游戏服务器...</p></div>
                )}
                {isConnected && !currentRoom && (
                    <Lobby onJoinRoom={handleJoinRoom} setGlobalError={setError} />
                )}
                {currentRoom && (
                    <GameRoom
                        initialRoom={currentRoom}
                        onLeaveRoom={handleLeaveRoom}
                        setGlobalError={setError}
                    />
                )}
            </main>
            <footer>
                <p>© {new Date().getFullYear()} 十三水游戏. 由 React & Vite 构建.</p>
            </footer>
        </div>
    );
}

export default App;
