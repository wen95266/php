import React from 'react';

const PlayerInfo = ({ name, status }) => {
  const statusText = {
    waiting: '等待开始',
    playing: '游戏中',
    dividing: 'AI分牌中',
    completed: '已完成'
  };
  
  return (
    <div className="player-info">
      <div className="player-avatar">
        <div className="avatar-icon">👤</div>
      </div>
      <div className="player-details">
        <h3>{name}</h3>
        <p className={`status ${status}`}>{statusText[status] || '未知状态'}</p>
      </div>
    </div>
  );
};

export default PlayerInfo;
