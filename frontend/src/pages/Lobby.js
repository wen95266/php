import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://wenge.cloudns.ch/backend/api/";

export default function Lobby() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!nickname) return setError('请输入昵称');
    try {
      const res = await axios.post(`${API_BASE}create_room.php`, { nickname });
      if (res.data.success) {
        navigate(`/room/${res.data.roomId}?nickname=${encodeURIComponent(nickname)}`);
      } else {
        setError(res.data.message || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleJoin = async () => {
    if (!nickname || !roomId) return setError('请输入昵称和房间号');
    try {
      const res = await axios.post(`${API_BASE}join_room.php`, { nickname, roomId });
      if (res.data.success) {
        navigate(`/room/${roomId}?nickname=${encodeURIComponent(nickname)}`);
      } else {
        setError(res.data.message || '加入失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  return (
    <div>
      <h1>十三水多人房间</h1>
      <input placeholder="昵称" value={nickname} onChange={e => setNickname(e.target.value)} />
      <div>
        <button onClick={handleCreate}>创建房间</button>
      </div>
      <div>
        <input placeholder="房间号" value={roomId} onChange={e => setRoomId(e.target.value)} />
        <button onClick={handleJoin}>加入房间</button>
      </div>
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
}
