import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import PlayerStatusBanner from "./components/PlayerStatusBanner";
import CardZone from "./components/CardZone";
import ControlBar from "./components/ControlBar";
import CompareDialog from "./components/CompareDialog";
import { cycleAiSplit } from "./utils/ai";

// AI与匹配部分同旧版
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

  // 只保留三道，不再有手牌区
  const [zones, setZones] = useState({ head: [], mid: [], tail: [] });
  const [draggingCard, setDraggingCard] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 比牌弹窗
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState(null);

  // 控制AI只自动分一次
  const [autoAISplit, setAutoAISplit] = useState(false);

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

  // 房间轮询
  useEffect(() => {
    if (!roomId) return;
    let timer = setInterval(async () => {
      const state = await getRoomState(roomId, MY_NAME);
      setAllPlayers(state.players || []);
      setStatus(state.status);
      setResults(state.results || null);

      // 发牌就自动AI分牌（只执行一次）
      if (state.status === "playing" && state.myHand && state.myHand.length === 13 && !autoAISplit) {
        const [newHead, newMid, newTail] = cycleAiSplit(state.myHand, roomId || "myAI");
        setZones({ head: newHead, mid: newMid, tail: newTail });
        setAutoAISplit(true);
      }
      // 结果弹窗
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
  }, [roomId, showCompare, autoAISplit]);

  // 拖拽逻辑：三道之间拖拽
  const onDragStart = (card, from) => setDraggingCard({ card, from });
  const onDrop = (to) => {
    if (!draggingCard) return;
    const { card, from } = draggingCard;
    const cardKey = c => c.value + "-" + c.suit;
    let zoneKeys = ["head", "mid", "tail"];
    let newZones = { head: [], mid: [], tail: [] };
    for (let z of zoneKeys) {
      newZones[z] = zones[z].filter(c => cardKey(c) !== cardKey(card));
    }
    // 放入新区域
    if (to === "head" && newZones.head.length < 3) newZones.head.push(card);
    if (to === "mid" && newZones.mid.length < 5) newZones.mid.push(card);
    if (to === "tail" && newZones.tail.length < 5) newZones.tail.push(card);
    setZones(newZones);
    setDraggingCard(null);
  };

  // 允许双击移回头道/中道/尾道之间（如需可扩展）
  const onReturnToOther = (zone, idx) => {
    // 可选：实现为回到未满的其他区，或不实现
  };

  // AI分牌按钮
  const handleAiSplit = () => {
    const allCards = [...zones.head, ...zones.mid, ...zones.tail];
    if (allCards.length !== 13) return;
    const [newHead, newMid, newTail] = cycleAiSplit(allCards, roomId || "myAI");
    setZones({ head: newHead, mid: newMid, tail: newTail });
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
    setZones({ head: [], mid: [], tail: [] });
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
    setAutoAISplit(false);
  };

  // 取消匹配/返回AI
  const cancelMatch = async () => {
    setIsMatching(false);
    setMode("ai");
    window.location.reload();
  };

  // 继续游戏
  const handleRestartGame = async () => {
    await startGame(roomId);
    setZones({ head: [], mid: [], tail: [] });
    setSubmitted(false);
    setShowCompare(false);
    setCompareData(null);
    setAutoAISplit(false);
  };

  // 布局高度百分比
  const H1 = "10vh";
  const H2 = "25vh";
  const H3 = "25vh";
  const H4 = "25vh";
  const H5 = "15vh";

  if (mode === "match" && isMatching) {
    return (
      <div className="game-full-outer">
        <div className="matching-text">正在匹配真实玩家，请稍候...</div>
        <button className="matching-btn" onClick={cancelMatch}>取消匹配</button>
      </div>
    );
  }

  if (!joined || !roomId) {
    return (
      <div className="game-full-outer">
        <div className="welcome-title">多人十三水</div>
        <button className="matching-btn" onClick={startMatchMode}>自动匹配真实玩家</button>
        <div className="welcome-tip">或体验AI对战（默认）</div>
      </div>
    );
  }

  return (
    <div className="main-layout">
      {/* 1. 状态栏 */}
      <div className="zone-status" style={{ height: H1 }}>
        <PlayerStatusBanner
          status={status}
          results={results}
          myName={MY_NAME}
          allPlayers={allPlayers}
          style={{
            height: "100%",
            minHeight: "100%",
            maxHeight: "100%",
            fontSize: 22,
          }}
        />
        <div className="top-right-btns">
          {mode === "ai" && (
            <button onClick={startMatchMode} className="top-btn">切换到自动匹配</button>
          )}
          {mode === "match" && (
            <button onClick={cancelMatch} className="top-btn">切回AI对战</button>
          )}
        </div>
      </div>
      {/* 2. 头道 */}
      <div className="zone-head" style={{ height: H2 }}>
        <CardZone
          zone="head"
          label="头道"
          maxCards={3}
          cards={zones.head}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onReturnToHand={onReturnToOther}
          draggingCard={draggingCard}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
          fullArea
          fixedCardHeight="100%"
        />
      </div>
      {/* 3. 中道 */}
      <div className="zone-mid" style={{ height: H3 }}>
        <CardZone
          zone="mid"
          label="中道"
          maxCards={5}
          cards={zones.mid}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onReturnToHand={onReturnToOther}
          draggingCard={draggingCard}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
          fullArea
          fixedCardHeight="100%"
        />
      </div>
      {/* 4. 尾道 */}
      <div className="zone-tail" style={{ height: H4 }}>
        <CardZone
          zone="tail"
          label="尾道"
          maxCards={5}
          cards={zones.tail}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onReturnToHand={onReturnToOther}
          draggingCard={draggingCard}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
          fullArea
          fixedCardHeight="100%"
        />
      </div>
      {/* 5. 按钮区 */}
      <div className="zone-buttons" style={{ height: H5 }}>
        <ControlBar
          handleAiSplit={handleAiSplit}
          handleSubmit={handleSubmit}
          aiDisabled={false}
          submitDisabled={submitted || !(zones.head.length === 3 && zones.mid.length === 5 && zones.tail.length === 5)}
          submitted={submitted}
          style={{
            width: "100vw",
            minHeight: "100%",
            background: "#f2f6fa",
            border: "none"
          }}
        />
      </div>
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
