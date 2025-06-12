import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';
import Card from '../ui/Card';

// 使用你实际后端API地址
const API_BASE = "https://wenge.cloudns.ch/backend/api/";

export default function GameRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const nickname = searchParams.get('nickname') || '';
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer;
    const fetchState = async () => {
      try {
        const res = await axios.post(`${API_BASE}room_state.php`, { roomId, nickname });
        if (res.data.success) {
          setPlayers(res.data.players || []);
          setMyHand(res.data.myHand || []);
        }
      } catch {}
      timer = setTimeout(fetchState, 2000);
    };
    fetchState();
    return () => clearTimeout(timer);
  }, [roomId, nickname]);

  const handlePlay = async () => {
    try {
      const res = await axios.post(`${API_BASE}play_cards.php`, { roomId, nickname, cards: myHand });
      setMessage(res.data.message || (res.data.success ? "已出牌" : "出牌失败"));
    } catch {
      setMessage('网络错误');
    }
  };

  return (
    <div>
      <h2>房间号: {roomId}</h2>
      <div>我的昵称: {nickname}</div>
      <div>
        <h3>我的手牌</h3>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {myHand.map(card => <Card key={card} name={card} />)}
        </div>
        <button onClick={handlePlay}>出牌</button>
      </div>
      <h3>玩家</h3>
      {players.map(player => (
        <div key={player.nickname}>
          {player.nickname}: {player.cards ? `${player.cards.length}张` : "未出牌"}
        </div>
      ))}
      {message && <div>{message}</div>}
    </div>
  );
}
