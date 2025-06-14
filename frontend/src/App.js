import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import GameRoom from "./components/GameRoom";
import { SUITS, VALUES } from "./utils/cardUtils";
import { simpleAiSplit, advancedAiSplit } from "./utils/ai";

const AI_NAMES = ["AI-1", "AI-2", "AI-3"];
const MY_NAME = "玩家";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [aiHands, setAiHands] = useState({});
  const [myHand, setMyHand] = useState([]);
  const [aiSplits, setAiSplits] = useState({});
  const [mySplit, setMySplit] = useState(null);
  const [aiSubmitted, setAiSubmitted] = useState({});
  const [stage, setStage] = useState("loading");

  // 启动即创建房间并加入AI和自己
  useEffect(() => {
    async function setup() {
      const res = await createRoom(MY_NAME);
      setRoomId(res.roomId);
      for (let name of AI_NAMES) {
        await joinRoom(res.roomId, name);
      }
      setJoined(true);
      await startGame(res.roomId);
    }
    setup();
  }, []);

  // 获取房间状态和分牌、提交
  useEffect(() => {
    if (!roomId) return;
    let timer = setInterval(async () => {
      const state = await getRoomState(roomId, MY_NAME);
      if (state.status === "playing") {
        setStage("playing");
        if (state.players && state.myHand) {
          setMyHand(state.myHand);
        }
        if (state.players) {
          let hands = {};
          for (let ai of AI_NAMES) {
            if (state.hands && state.hands[ai]) hands[ai] = state.hands[ai];
          }
          setAiHands(hands);
        }
      }
      if (state.status === "finished") setStage("results");
    }, 1200);
    return () => clearInterval(timer);
  }, [roomId]);

  // AI自动分牌并提交
  const handleAiSplit = async () => {
    if (!aiHands || Object.keys(aiHands).length === 0) return;
    let splits = {};
    let submitted = {};
    for (let ai of AI_NAMES) {
      if (aiHands[ai]) {
        splits[ai] = advancedAiSplit(aiHands[ai]);
        await submitHand(roomId, ai, splits[ai]);
        submitted[ai] = true;
      }
    }
    setAiSplits(splits);
    setAiSubmitted(submitted);
    alert("AI已自动智能分牌并提交");
  };

  // 玩家分牌辅助
  const handleMyAiSplit = () => {
    if (!myHand || myHand.length !== 13) return;
    const split = advancedAiSplit(myHand);
    setMySplit(split);
    alert("已为你智能分牌，请点提交牌型");
  };

  // 玩家提交
  const handleSubmit = async () => {
    if (!mySplit || mySplit.length !== 3) return alert("请先分好牌");
    await submitHand(roomId, MY_NAME, mySplit);
    alert("你的牌型已提交");
  };

  if (!joined || !roomId) return <div>房间初始化中...</div>;

  if (stage === "results") {
    return <GameRoom roomId={roomId} playerName={MY_NAME} />;
  }

  return (
    <div style={{ maxWidth: 700, margin: "30px auto" }}>
      <h2>十三水AI对战房间 (你 vs 3个AI)</h2>
      <p>房间号: {roomId}</p>
      {stage === "playing" && (
        <>
          <h3>你的手牌</h3>
          <div style={{ display: "flex", flexDirection: "row" }}>
            {myHand.map((card, i) =>
              <div key={i} style={{ marginRight: 2 }}>
                <img
                  src={`/cards/${card.value === "A" ? "ace" : card.value === "J" ? "jack" : card.value === "Q" ? "queen" : card.value === "K" ? "king" : card.value}_of_${card.suit}.svg`}
                  alt={`${card.value} of ${card.suit}`}
                  width={50}
                  style={{ border: "1px solid #ccc", borderRadius: 4 }}
                />
              </div>
            )}
          </div>
          <div>
            <button onClick={handleMyAiSplit}>AI智能分牌</button>
            <button onClick={handleSubmit} disabled={!mySplit}>提交牌型</button>
          </div>
          {mySplit && (
            <div>
              <h4>你的三道：</h4>
              <div>头道: {mySplit[0].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}</div>
              <div>中道: {mySplit[1].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}</div>
              <div>尾道: {mySplit[2].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}</div>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleAiSplit}>让AI立即智能分牌并提交</button>
          </div>
        </>
      )}
      {stage !== "playing" && <div>请稍候...</div>}
    </div>
  );
}
