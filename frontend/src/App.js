import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import GameRoom from "./components/GameRoom";
import { SUITS, VALUES } from "./utils/cardUtils";
import { advancedAiSplit } from "./utils/ai";

const AI_NAMES = ["AI-1", "AI-2", "AI-3"];
const MY_NAME = "玩家";

// 扑克牌图片路径
function cardImg(card) {
  let v = card.value;
  if (v === "A") v = "ace";
  if (v === "K") v = "king";
  if (v === "Q") v = "queen";
  if (v === "J") v = "jack";
  return `/cards/${v}_of_${card.suit}.svg`;
}

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [aiHands, setAiHands] = useState({});
  const [myHand, setMyHand] = useState([]);
  const [mySplit, setMySplit] = useState([[], [], []]); // 头道3，中道5，尾道5
  const [draggingCard, setDraggingCard] = useState(null);
  const [stage, setStage] = useState("loading");
  const [submitted, setSubmitted] = useState(false);

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
        if (state.myHand && myHand.length === 0) {
          setMyHand(state.myHand);
        }
      }
      if (state.status === "finished") setStage("results");
    }, 1200);
    return () => clearInterval(timer);
  }, [roomId, myHand.length]);

  // AI智能分牌辅助
  const handleMyAiSplit = () => {
    if (!myHand || myHand.length !== 13) return;
    const split = advancedAiSplit(myHand);
    setMySplit(split);
  };

  // 拖拽相关
  const onDragStart = (card, from, fromIdx) => {
    setDraggingCard({ card, from, fromIdx });
  };
  const onDropTo = (toIdx) => {
    if (!draggingCard) return;
    let newSplit = mySplit.map(arr => [...arr]);
    let newHand = [...myHand];
    // 从理牌区移出
    if (draggingCard.from === "split") {
      newSplit[draggingCard.fromIdx] = newSplit[draggingCard.fromIdx].filter(
        c => !(c.value === draggingCard.card.value && c.suit === draggingCard.card.suit)
      );
      newSplit[toIdx].push(draggingCard.card);
    }
    // 从手牌栏移出
    if (draggingCard.from === "hand") {
      newHand = newHand.filter(
        c => !(c.value === draggingCard.card.value && c.suit === draggingCard.card.suit)
      );
      newSplit[toIdx].push(draggingCard.card);
    }
    // 保证头道3，中道5，尾道5
    if (
      newSplit[0].length <= 3 &&
      newSplit[1].length <= 5 &&
      newSplit[2].length <= 5 &&
      newSplit[0].length + newSplit[1].length + newSplit[2].length <= 13
    ) {
      setMyHand(newHand);
      setMySplit(newSplit);
    }
    setDraggingCard(null);
  };
  const onReturnToHand = (splitIdx, cardIdx) => {
    const card = mySplit[splitIdx][cardIdx];
    let newHand = [...myHand, card];
    let newSplit = mySplit.map(arr => [...arr]);
    newSplit[splitIdx] = newSplit[splitIdx].filter((_, idx) => idx !== cardIdx);
    setMyHand(newHand);
    setMySplit(newSplit);
  };

  // 玩家提交
  const handleSubmit = async () => {
    if (
      mySplit[0].length !== 3 ||
      mySplit[1].length !== 5 ||
      mySplit[2].length !== 5
    ) {
      alert("请将13张牌分为头道3张，中道5张，尾道5张！");
      return;
    }
    await submitHand(roomId, MY_NAME, mySplit);
    setSubmitted(true);
    alert("你的牌型已提交");
  };

  if (!joined || !roomId) return <div>房间初始化中...</div>;

  if (stage === "results") {
    return <GameRoom roomId={roomId} playerName={MY_NAME} />;
  }

  // 显示理牌区与手牌
  return (
    <div style={{ maxWidth: 750, margin: "30px auto" }}>
      <h2>十三水AI对战房间 (你 vs 3个AI)</h2>
      <p>房间号: {roomId}</p>
      {stage === "playing" && (
        <>
          <h3>你的手牌</h3>
          <div
            style={{
              minHeight: 80,
              border: "1px solid #ccc",
              borderRadius: 5,
              background: "#f7f7f7",
              padding: 6,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
              flexWrap: "wrap"
            }}
          >
            {myHand.map((card, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => onDragStart(card, "hand", null)}
                style={{
                  marginRight: 2,
                  cursor: "grab"
                }}
              >
                <img
                  src={cardImg(card)}
                  alt={`${card.value} of ${card.suit}`}
                  width={48}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    boxShadow: "2px 2px 4px #eee"
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["头道(3张)", "中道(5张)", "尾道(5张)"].map((label, idx) => (
              <div
                key={idx}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDropTo(idx)}
                style={{
                  minHeight: 90,
                  minWidth: 170,
                  border: "2px dashed #bbb",
                  borderRadius: 6,
                  padding: 8,
                  margin: 2,
                  background: "#fcfcfc"
                }}
              >
                <div style={{ marginBottom: 8, color: "#444" }}>{label}</div>
                <div style={{ display: "flex", flexDirection: "row" }}>
                  {mySplit[idx].map((card, cidx) => (
                    <div
                      key={cidx}
                      draggable
                      onDragStart={() => onDragStart(card, "split", idx)}
                      style={{ position: "relative", marginRight: 2 }}
                    >
                      <img
                        src={cardImg(card)}
                        alt={`${card.value} of ${card.suit}`}
                        width={50}
                        style={{
                          border: "1px solid #aaa",
                          borderRadius: 4,
                          background: "#fff"
                        }}
                      />
                      <span
                        onClick={() => onReturnToHand(idx, cidx)}
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          background: "#f44",
                          color: "#fff",
                          fontSize: 12,
                          borderRadius: "0 4px 0 4px",
                          cursor: "pointer",
                          padding: "1px 4px"
                        }}
                        title="还原到手牌"
                      >×</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  {mySplit[idx].length} / {idx === 0 ? 3 : 5}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={handleMyAiSplit}>AI智能分牌</button>
            <button onClick={handleSubmit} disabled={submitted}>提交牌型</button>
          </div>
          <div style={{ margin: "12px 0", color: "#888", fontSize: 14 }}>
            拖拽手牌到各道区域完成理牌，可点击牌面右上角×退回手牌。
          </div>
        </>
      )}
      {stage !== "playing" && <div>请稍候...</div>}
    </div>
  );
}
