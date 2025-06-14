import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand, getResults } from "./api";
import PlayerStatusBanner from "./components/PlayerStatusBanner";
import CardZone from "./components/CardZone";
import ControlBar from "./components/ControlBar";
import GameRoom from "./components/GameRoom";
import CompareDialog from "./components/CompareDialog";
import { cycleAiSplit } from "./utils/ai"; // 只需引入cycleAiSplit

const AI_NAMES = ["AI-1", "AI-2", "AI-3"];
const MY_NAME = "玩家";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState(null);

  // 各区牌
  const [hand, setHand] = useState([]);
  const [head, setHead] = useState([]);
  const [tail, setTail] = useState([]);
  const [mid, setMid] = useState([]);
  const [draggingCard, setDraggingCard] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 比牌弹窗
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState(null);

  // 初始化
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

  // 轮询房间状态
  useEffect(() => {
    if (!roomId) return;
    let timer = setInterval(async () => {
      const state = await getRoomState(roomId, MY_NAME);
      setAllPlayers(state.players || []);
      setStatus(state.status);
      setResults(state.results || null);
      if (state.status === "playing" && hand.length === 0 && state.myHand) {
        setHand(state.myHand);
      }
      // 自动弹出比牌界面
      if (state.status === "finished" && state.results && !showCompare) {
        // 比牌弹窗数据
        const splits = {};
        (state.players||[]).forEach(name => {
          splits[name] = state?.submits?.[name] || [];
        });
        setCompareData({
          players: state.players,
          splits: state.submits || {},
          scores: state.results["总分"] || {},
          details: state.results["详情"] || {},
        });
        setShowCompare(true);
      }
    }, 1200);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [roomId, hand.length, showCompare]);

  // 拖拽事件
  const onDragStart = (card, from) => {
    setDraggingCard({ card, from });
  };
  const onDrop = (to) => {
    if (!draggingCard) return;
    const { card, from } = draggingCard;
    let newHand = hand.slice();
    let newHead = head.slice();
    let newTail = tail.slice();
    if (from === "hand") newHand = newHand.filter(c => c.value !== card.value || c.suit !== card.suit);
    if (from === "head") newHead = newHead.filter(c => c.value !== card.value || c.suit !== card.suit);
    if (from === "tail") newTail = newTail.filter(c => c.value !== card.value || c.suit !== card.suit);
    if (to === "hand") newHand.push(card);
    if (to === "head" && newHead.length < 3) newHead.push(card);
    if (to === "tail" && newTail.length < 5) newTail.push(card);
    setHand(newHand);
    setHead(newHead);
    setTail(newTail);
    setDraggingCard(null);
  };
  const onReturnToHand = (zone, idx) => {
    let card;
    let newHead = head.slice();
    let newTail = tail.slice();
    if (zone === "head") {
      card = newHead[idx];
      newHead.splice(idx, 1);
      setHead(newHead);
      setHand([...hand, card]);
    } else if (zone === "tail") {
      card = newTail[idx];
      newTail.splice(idx, 1);
      setTail(newTail);
      setHand([...hand, card]);
    }
  };

  // 自动中道
  useEffect(() => {
    if (head.length === 3 && tail.length === 5 && hand.length === 5) {
      setMid(hand);
      setHand([]);
    }
    if ((head.length < 3 || tail.length < 5) && mid.length > 0) {
      setHand([...hand, ...mid]);
      setMid([]);
    }
    // eslint-disable-next-line
  }, [head.length, tail.length, hand.length]);

  // AI分牌：每次点击变换不同分牌，最优优先
  const handleAiSplit = () => {
    if (hand.length + head.length + tail.length !== 13) return;
    const [newHead, newMid, newTail] = cycleAiSplit([...hand, ...head, ...tail], roomId || "myAI");
    setHead(newHead);
    setMid(newMid);
    setTail(newTail);
    setHand([]);
  };

  // 提交
  const handleSubmit = async () => {
    if (head.length !== 3 || mid.length !== 5 || tail.length !== 5) {
      alert("请完成头道3张，中道5张，尾道5张！");
      return;
    }
    await submitHand(roomId, MY_NAME, [head, mid, tail]);
    setSubmitted(true);

    // 弹出比牌界面的逻辑由轮询控制
  };

  if (!joined || !roomId) return <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f2f6fa"}}>房间初始化中...</div>;
  if (status === "results") {
    return <GameRoom roomId={roomId} playerName={MY_NAME} />;
  }

  // 计算置牌区高度（全屏-顶部-底部按钮，3等分）
  const statusH = 90; // 顶部状态横幅高度
  const buttonH = 120; // 按钮区高度
  const threeZoneH = `calc((100vh - ${statusH}px - ${buttonH}px) / 3)`;

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#f2f6fa",
      position: "relative"
    }}>
      <PlayerStatusBanner
        status={status}
        results={results}
        myName={MY_NAME}
        allPlayers={allPlayers}
        style={{
          height: statusH,
          minHeight: statusH,
          maxHeight: statusH,
        }}
      />
      <CardZone
        zone="head"
        label="头道"
        maxCards={3}
        cards={head}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onReturnToHand={onReturnToHand}
        draggingCard={draggingCard}
        style={{
          height: threeZoneH,
          borderBottom: "1px solid #ededed",
        }}
        fullArea
        fixedCardHeight={threeZoneH}
      />
      {mid.length === 5 ? (
        <CardZone
          zone="mid"
          label="中道"
          maxCards={5}
          cards={mid}
          onDragStart={() => {}}
          onDrop={() => {}}
          onReturnToHand={() => {}}
          draggingCard={null}
          style={{
            height: threeZoneH,
            borderBottom: "1px solid #ededed",
          }}
          fullArea
          fixedCardHeight={threeZoneH}
        />
      ) : (
        <CardZone
          zone="hand"
          label="手牌区"
          maxCards={13}
          cards={hand}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onReturnToHand={() => {}}
          draggingCard={draggingCard}
          style={{
            height: threeZoneH,
            borderBottom: "1px solid #ededed",
          }}
          fullArea
          fixedCardHeight={threeZoneH}
        />
      )}
      <CardZone
        zone="tail"
        label="尾道"
        maxCards={5}
        cards={tail}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onReturnToHand={onReturnToHand}
        draggingCard={draggingCard}
        style={{
          height: threeZoneH,
          borderBottom: "1px solid #ededed",
        }}
        fullArea
        fixedCardHeight={threeZoneH}
      />
      <ControlBar
        handleAiSplit={handleAiSplit}
        handleSubmit={handleSubmit}
        aiDisabled={head.length > 0 || tail.length > 0 || mid.length > 0}
        submitDisabled={submitted || !(head.length === 3 && mid.length === 5 && tail.length === 5)}
        submitted={submitted}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100vw",
          minHeight: buttonH,
          background: "#f2f6fa",
          border: "none"
        }}
      />
      {showCompare && compareData && (
        <CompareDialog
          players={compareData.players}
          splits={compareData.splits}
          scores={compareData.scores}
          details={compareData.details}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
