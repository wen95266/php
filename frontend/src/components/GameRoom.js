import React, { useState, useEffect } from "react";
import { getRoomState, startGame, submitHand, getResults } from "../api";
import PlayerHand from "./PlayerHand";

export default function GameRoom({ roomId, playerName }) {
  const [state, setState] = useState({});
  const [selected, setSelected] = useState([]);
  const [stage, setStage] = useState("waiting");

  useEffect(() => {
    const timer = setInterval(async () => {
      let s = await getRoomState(roomId, playerName);
      setState(s);
      if (s.status === "playing") setStage("playing");
      if (s.status === "finished") setStage("results");
    }, 2000);
    return () => clearInterval(timer);
  }, [roomId, playerName]);

  function splitHand() {
    if (selected.length !== 13) return alert("选完13张牌");
    return [
      selected.slice(0, 3).map(i => state.myHand[i]),
      selected.slice(3, 8).map(i => state.myHand[i]),
      selected.slice(8, 13).map(i => state.myHand[i])
    ];
  }

  async function handleSubmit() {
    const split = splitHand();
    if (!split) return;
    await submitHand(roomId, playerName, split);
    alert("已提交");
  }

  if (!state.players) return <div>加载中...</div>;

  return (
    <div>
      <h2>房间号: {roomId} 玩家: {playerName}</h2>
      <div>
        <b>玩家:</b>{state.players.map(p => <span key={p}>{p} </span>)}
      </div>
      {stage === "waiting" && (
        <button onClick={() => startGame(roomId)}>开始游戏</button>
      )}
      {stage === "playing" && (
        <div>
          <h3>你的手牌</h3>
          <PlayerHand hand={state.myHand || []} selected={selected} onSelect={i => {
            setSelected(sel => sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]);
          }} />
          <div>
            <span>请选择13张牌（点选，顺序3-5-5为前中后道）</span>
            <button onClick={handleSubmit} disabled={selected.length !== 13}>提交牌型</button>
          </div>
        </div>
      )}
      {stage === "results" && (
        <div>
          <h3>结果</h3>
          <button onClick={async () => setState(await getResults(roomId))}>刷新结果</button>
          <pre>{JSON.stringify(state.results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
