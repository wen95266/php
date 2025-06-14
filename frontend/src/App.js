import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import PlayerStatusBanner from "./components/PlayerStatusBanner";
import CardZone from "./components/CardZone";
import ControlBar from "./components/ControlBar";
import CompareDialog from "./components/CompareDialog";
import { cycleAiSplit } from "./utils/ai";

// 自动匹配API
const API_BASE = "https://9525.ip-ddns.com/backend/api.php";
async function joinMatchApi(playerName) {
  const res = await fetch(`${API_BASE}?action=join_match&player=${encodeURIComponent(playerName)}`);
  return res.json();
}
async function cancelMatchApi(playerName) {
  const res = await fetch(`${API_BASE}?action=cancel_match&player=${encodeURIComponent(playerName)}`);
  return res.json();
}

const AI_NAMES = ["AI-1", "AI-2", "AI-3"];
const MY_NAME = localStorage.getItem("playerName") || "玩家" + Math.floor(Math.random()*10000);

export default function App() {
  const [mode, setMode] = useState("ai"); // "ai" | "match"
  const [isMatching, setIsMatching] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState(null);

  const [hand, setHand] = useState([]);
  const [head, setHead] = useState([]);
  const [tail, setTail] = useState([]);
  const [mid, setMid] = useState([]);
  const [draggingCard, setDraggingCard] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 比牌弹窗
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState(null);

  // AI初始化
  useEffect(() => {
    if (mode !== "ai") return;
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
  }, [mode]);

  // 匹配模式
  useEffect(() => {
    if (mode !== "match" || !isMatching) return;
    let timer = setInterval(async () => {
      const res = await joinMatchApi(MY_NAME);
      if (res.status === "matched" && res.roomId) {
        setRoomId(res.roomId);
        setIsMatching(false);
        setJoined(true);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [mode, isMatching]);

  // 关键：轮询只依赖roomId和showCompare，绝不依赖hand等
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
      if (state.status === "finished" && state.results && !showCompare) {
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
  }, [roomId, showCompare]);

  // 拖拽
  const onDragStart = (card, from) => setDraggingCard({ card, from });
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
  }, [head.length, tail.length, hand.length]);

  // AI分牌
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
    setSubmitted(true);
    await submitHand(roomId, MY_NAME, [head, mid, tail]);
  };

  // 切换到匹配
  const startMatchMode = () => {
    setMode("match");
    setIsMatching(true);
    setRoomId("");
    setJoined(false);
    setAllPlayers([]);
    setResults(null);
    setHand([]);
    setHead([]);
    setTail([]);
    setMid([]);
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
  };

  // 取消匹配
  const cancelMatch = async () => {
    await cancelMatchApi(MY_NAME);
    setIsMatching(false);
    setMode("ai");
    window.location.reload();
  };

  // 回到AI
  const backToAiMode = () => {
    setMode("ai");
    setIsMatching(false);
    setRoomId("");
    setJoined(false);
    setAllPlayers([]);
    setResults(null);
    setHand([]);
    setHead([]);
    setTail([]);
    setMid([]);
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
  };

  // 继续游戏（新一轮发牌）
  const handleRestartGame = async () => {
    await startGame(roomId);
    setHand([]);
    setHead([]);
    setMid([]);
    setTail([]);
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
  };

  if (mode === "match" && isMatching) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f2f6fa",
        flexDirection: "column"
      }}>
        <div style={{
          fontSize: 28,
          color: "#3869f6",
          fontWeight: 600,
          marginBottom: 40
        }}>正在匹配真实玩家，请稍候...</div>
        <button style={{
          padding: "10px 40px",
          fontSize: 20,
          borderRadius: 8,
          background: "#fff",
          border: "1.5px solid #3869f6"
        }} onClick={cancelMatch}>取消匹配</button>
      </div>
    );
  }

  if (!joined || !roomId) {
    return (
      <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f2f6fa",flexDirection:"column"}}>
        <div style={{fontSize:26,marginBottom:40}}>多人十三水</div>
        <button style={{
          padding: "12px 44px",
          fontSize: 21,
          borderRadius: 8,
          background: "#3869f6",
          color: "#fff",
          fontWeight: 500,
          border: "none",
          marginBottom: 18
        }} onClick={startMatchMode}>自动匹配真实玩家</button>
        <div style={{color:"#888",fontSize:15,marginTop:10}}>或体验AI对战（默认）</div>
      </div>
    );
  }
  const statusH = 90;
  const buttonH = 120;
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
      <div style={{
        position: "absolute", top: 16, right: 24, zIndex: 20
      }}>
        {mode === "ai" && (
          <button onClick={startMatchMode}
            style={{
              background: "#fff",
              color: "#3869f6",
              fontWeight: 500,
              border: "1.5px solid #3869f6",
              borderRadius: 8,
              padding: "5px 18px",
              fontSize: 16,
              marginRight: 12
            }}>切换到自动匹配</button>
        )}
        {mode === "match" && (
          <button onClick={backToAiMode}
            style={{
              background: "#fff",
              color: "#3869f6",
              fontWeight: 500,
              border: "1.5px solid #3869f6",
              borderRadius: 8,
              padding: "5px 18px",
              fontSize: 16,
            }}>切回AI对战</button>
        )}
      </div>
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
          onRestart={handleRestartGame}
        />
      )}
    </div>
  );
}
