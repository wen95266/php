// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_WS_URL;

if (!SOCKET_URL) {
    console.error("错误: VITE_BACKEND_WS_URL 环境变量未设置!");
}

console.log("尝试连接 WebSocket 到:", SOCKET_URL);

const socket = io(SOCKET_URL, {
    autoConnect: false, // 手动连接，在 App.jsx 中调用 socket.connect()
    transports: ['websocket'], // 优先使用 WebSocket
    reconnectionAttempts: 5, // 尝试重连次数
    reconnectionDelay: 3000, // 重连延迟
});

// 可以选择在这里添加一些全局的 socket 事件监听器，但通常在组件中处理更灵活
// 例如：
// socket.onAny((event, ...args) => {
//   console.log(`Socket event: ${event}`, args);
// });

export default socket;
