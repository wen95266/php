// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import socket from './services/socketService';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        socket.connect(); // Manually connect

        function onConnect() {
            setIsConnected(true);
            console.log("App: Socket connected");
        }
        function onDisconnect() {
            setIsConnected(false);
            setCurrentRoom(null); // Reset room on disconnect
            console.log("App: Socket disconnected");
        }
        
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            // socket.disconnect(); // Optional: disconnect on component unmount if app is closing
        };
    }, []);

    const handleJoinRoom = (roomData) => {
        setCurrentRoom(roomData);
    };

    const handleLeaveRoom = () => {
        setCurrentRoom(null);
    };

    if (!isConnected && !currentRoom) { // Show connecting message only if not already in a room attempt
        return <div className="app-container"><p>正在连接到服务器...</p></div>;
    }
    
    // If disconnected but was in a room, show a different message or attempt reconnect UI
    if (!isConnected && currentRoom) {
         return <div className="app-container"><p>与服务器断开连接。请尝试刷新页面或检查网络。</p></div>;
    }


    return (
        <div className="app-container">
            <header>
                <h1>React 十三水</h1>
                <p>Backend: {import.meta.env.VITE_BACKEND_WS_URL}</p>
                <p>Socket Status: {isConnected ? `Connected (${socket.id})` : 'Disconnected'}</p>
            </header>
            <main>
                {!currentRoom ? (
                    <Lobby onJoinRoom={handleJoinRoom} />
                ) : (
                    <GameRoom initialRoom={currentRoom} onLeaveRoom={handleLeaveRoom} />
                )}
            </main>
        </div>
    );
}

export default App;
