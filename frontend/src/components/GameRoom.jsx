import React, { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import PlayerHand from './PlayerHand';
import HandDisplay from './HandDisplay';
import Card from './Card';
import './GameRoom.css';

const GameRoom = ({ initialRoom, onLeaveRoom, setGlobalError, hideRoomInfo }) => {
    // ...原有所有逻辑保持...

    // ...所有 useState、useEffect、handleXXX 函数保持原样...

    // 只保留玩家和AI，没有房间信息区
    return (
        <div className="game-room-container container tabletop-background">
            {!hideRoomInfo && (
                <div className="room-header-tabletop">
                    <h2>房间: {room.id} (状态: <span className={`status-text-${room.status}`}>{room.status}</span>)</h2>
                    <button onClick={handleLeaveRoomClick} className="leave-button-tabletop">离开房间</button>
                </div>
            )}
            {/* 不显示房间人数/添加AI等 */}
            <div className="tabletop-main">
                {opponentPlayers.map(op => renderOpponentArea(op))}
                <div className="game-center-area">
                    <div className="game-messages-tabletop">
                        <p>{gameMessage || " "}</p>
                    </div>
                    <div className="action-buttons-tabletop">
                        {room.status === 'waiting' && !myPlayer.isAI && (
                            <button onClick={handlePlayerReady} className="ready-button-tabletop">
                                {myPlayer.isReady ? '取消准备' : '点击准备'}
                            </button>
                        )}
                        {room.status === 'finished' && myPlayer.id === room.hostId && (
                            <button onClick={handleRequestNextRound} className="next-round-button-tabletop">开始下一局</button>
                        )}
                    </div>
                </div>
                <div className="player-area player-area-self">
                    {/* ...玩家自己的牌和操作区不变... */}
                    {/* ...略... */}
                </div>
            </div>
            {room.status === 'finished' && room.playerHands && (
                <div className="results-overlay-tabletop">
                    <h3>本局最终结果</h3>
                    {room.players.map(player => (
                        <HandDisplay key={player.id} playerName={player.name} handData={room.playerHands[player.id]} isSelf={player.id === myPlayer.id} roomStatus={room.status} />
                    ))}
                    {myPlayer.id === room.hostId && (
                        <button onClick={handleRequestNextRound} className="next-round-button-tabletop overlay-button">开始下一局</button>
                    )}
                </div>
            )}
        </div>
    );
};
export default GameRoom;
