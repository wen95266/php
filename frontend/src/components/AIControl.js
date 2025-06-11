import React from 'react';

const AIControl = ({ onAIDivide, onReset, gameStatus }) => {
  return (
    <div className="ai-control">
      <button 
        onClick={onAIDivide}
        disabled={gameStatus === 'completed' || gameStatus === 'dividing'}
        className="ai-button"
      >
        AI智能分牌
      </button>
      
      <button 
        onClick={onReset}
        className="reset-button"
      >
        重新开始
      </button>
      
      <div className="game-rules">
        <h3>游戏规则:</h3>
        <ul>
          <li>头道: 3张牌</li>
          <li>中道: 5张牌</li>
          <li>尾道: 5张牌</li>
          <li>尾道 &gt; 中道 &gt; 头道</li>
          <li>拖拽扑克牌到相应区域</li>
        </ul>
      </div>
    </div>
  );
};

export default AIControl;
