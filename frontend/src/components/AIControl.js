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
      {/* 游戏规则区块已移除 */}
    </div>
  );
};

export default AIControl;
