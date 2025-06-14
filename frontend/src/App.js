import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import PlayerStatusBanner from "./components/PlayerStatusBanner";
import CardZone from "./components/CardZone";
import ControlBar from "./components/ControlBar";
import CompareDialog from "./components/CompareDialog";
import { cycleAiSplit } from "./utils/ai";

// 匹配API
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
  const [mode, setMode] = useState("ai");
  const [isMatching, setIsMatching] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState(null);

  // 统一管理所有分区，保证每张牌只在一个区域
  const [zones, setZones] = useState({ hand: [], head: [], mid: [], tail: [] });
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

  useEffect(() => {
    if (!roomId) return;
    let timer = setInterval(async () => {
      const state = await getRoomState(roomId, MY_NAME);
      setAllPlayers(state.players || []);
      setStatus(state.status);
      setResults(state.results || null);
      if (state.status === "playing" && zones.hand.length === 0 && state.myHand) {
        setZones({ hand: state.myHand, head: [], mid: [], tail: [] });
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

  // 拖拽，只允许每张牌出现在一个区域
  const onDragStart = (card, from) => setDraggingCard({ card, from });
  const onDrop = (to) => {
    if (!draggingCard) return;
    const { card } = draggingCard;
    const cardKey = c => c.value + "-" + c.suit;
    // 移除所有区域该牌
    let allCards = [...zones.hand, ...zones.head, ...zones.mid, ...zones.tail]
      .filter(c => cardKey(c) !== cardKey(card));
    let zoneKeys = ["hand", "head", "mid", "tail"];
    let newZones = { hand: [], head: [], mid: [], tail: [] };
    for (let z of zoneKeys) {
      newZones[z] = zones[z].filter(c => cardKey(c) !== cardKey(card));
    }
    // 放入新区域
    if (to === "hand" && newZones.hand.length < 13) newZones.hand.push(card);
    if (to === "head" && newZones.head.length < 3) newZones.head.push(card);
    if (to === "mid" && newZones.mid.length < 5) newZones.mid.push(card);
    if (to === "tail" && newZones.tail.length < 5) newZones.tail.push(card);
    setZones(newZones);
    setDraggingCard(null);
  };
  const onReturnToHand = (zone, idx) => {
    const zlist = zones[zone].slice();
    const card = zlist[idx];
    zlist.splice(idx, 1);
    setZones(z => ({
      ...z,
      [zone]: zlist,
      hand: [...z.hand, card]
    }));
  };

  // 自动中道
  useEffect(() => {
    const { head, tail, hand, mid } = zones;
    if (head.length === 3 && tail.length === 5 && hand.length === 5) {
      setZones(z => ({ ...z, mid: hand, hand: [] }));
    }
    if ((head.length < 3 || tail.length < 5) && mid.length > 0) {
      setZones(z => ({ ...z, hand: [...hand, ...mid], mid: [] }));
    }
    // eslint-disable-next-line
  }, [zones.head.length, zones.tail.length, zones.hand.length]);

  // AI分牌
  const handleAiSplit = () => {
    const { hand, head, mid, tail } = zones;
    if (hand.length + head.length + tail.length !== 13) return;
    const [newHead, newMid, newTail] = cycleAiSplit([...hand, ...head, ...tail], roomId || "myAI");
    setZones({ hand: [], head: newHead, mid: newMid, tail: newTail });
  };

  // 提交
  const handleSubmit = async () => {
    const { head, mid, tail } = zones;
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
    setZones({ hand: [], head: [], mid: [], tail: [] });
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
    setZones({ hand: [], head: [], mid: [], tail: [] });
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
  };

  // 继续游戏
  const handleRestartGame = async () => {
    await startGame(roomId);
    setZones({ hand: [], head: [], mid: [], tail: [] });
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
  };

  if (mode === "match" && isMatching) {
    return (
      <div style={{
        width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f6fa", flexDirection: "column"
      }}>
        <div style={{ fontSize: 28, color: "#3869f6", fontWeight: 600, marginBottom: 40 }}>正在匹配真实玩家，请稍候...</div>
        <button style={{ padding: "10px 40px", fontSize: 20, borderRadius: 8, background: "#fff", border: "1.5px solid #3869f6" }} onClick={cancelMatch}>取消匹配</button>
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
        cards={zones.head}
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
      {zones.mid.length === 5 ? (
        <CardZone
          zone="mid"
          label="中道"
          maxCards={5}
          cards={zones.mid}
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
          cards={zones.hand}
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
        cards={zones.tail}
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
        aiDisabled={zones.head.length > 0 || zones.tail.length > 0 || zones.mid.length > 0}
        submitDisabled={submitted || !(zones.head.length === 3 && zones.mid.length === 5 && zones.tail.length === 5)}
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
