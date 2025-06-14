import React, { useState } from "react";
import { createRoom, joinRoom } from "./api";
import GameRoom from "./components/GameRoom";

function App() {
  const [player, setPlayer] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  async function handleCreate() {
    if (!player) return alert("输入昵称");
    let res = await createRoom(player);
    setRoomId(res.roomId);
    setJoined(true);
  }

  async function handleJoin() {
    if (!player || !roomId) return alert("输入昵称和房间号");
    let res = await joinRoom(roomId, player);
    if (res.success) setJoined(true);
    else alert("加入失败");
  }

  if (joined) return <GameRoom roomId={roomId} playerName={player} />;

  return (
    <div style={{ maxWidth: 400, margin: "60px auto" }}>
      <h1>多人十三水</h1>
      <input placeholder="昵称" value={player} onChange={e => setPlayer(e.target.value)} />
      <div>
        <button onClick={handleCreate}>创建房间</button>
        <input placeholder="房间号" value={roomId} onChange={e => setRoomId(e.target.value)} />
        <button onClick={handleJoin}>加入房间</button>
      </div>
    </div>
  );
}

export default App;
