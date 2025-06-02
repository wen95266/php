// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // 引入您的根组件 App
import './index.css';     // 引入全局 CSS (如果您有的话，确保这个文件存在于 src/ 目录下)

// 使用 ReactDOM.createRoot 来渲染您的 React 应用
// 'root' 是您在 frontend/index.html 文件中定义的 div 的 id
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
