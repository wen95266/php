import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import PlayerStatusBanner from "./components/PlayerStatusBanner";
import CardZone from "./components/CardZone";
import ControlBar from "./components/ControlBar";
import CompareDialog from "./components/CompareDialog";
import { cycleAiSplit } from "./utils/ai";

const AI_NAMES = ["AI-1", "AI-2", "AI-3"];
const MY_NAME = localStorage.getItem("playerName") || "玩家" + Math.floor(Math.random() * 10000);

export default function App() {
  const [mode, setMode] = useState("ai");
  const [isMatching, setIsMatching] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState(null);

  // 三道区
  const [zones, setZones] = useState({ head: [], mid: [], tail: [] });
  const [selectedCard, setSelectedCard] = useState(null); // {cards:[], zone:""}
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
  }, [roomId, showCompare, autoAISplit]);

  // 鼠标直接多选（无须Ctrl/Shift）：点选同一区的多张牌可多选，再点已选中取消
  const handleSelectCard = (card, fromZone) => {
    setSelectedCard(sel => {
      if (!sel || sel.zone !== fromZone) {
        return { cards: [card], zone: fromZone };
      }
      let selectedArr = Array.isArray(sel.cards) ? sel.cards : [];
      const exist = selectedArr.some(c => c.value === card.value && c.suit === card.suit);
      let nextArr;
      if (exist) {
        // 再点取消
        nextArr = selectedArr.filter(c => !(c.value === card.value && c.suit === card.suit));
      } else {
        // 增加选中
        nextArr = [...selectedArr, card];
      }
      if (nextArr.length === 0) return null;
      return { cards: nextArr, zone: fromZone };
    });
  };

  // 允许随意移动，无数量限制
  const handleZoneClick = (toZone) => {
    if (!selectedCard || !selectedCard.cards || !selectedCard.cards.length) return;
    const cardsToMove = selectedCard.cards;
    const fromZone = selectedCard.zone;
    if (fromZone === toZone) {
      setSelectedCard(null);
      return;
    }
    const cardKey = c => c.value + "-" + c.suit;
    setZones(prevZones => {
      // 先移除所有待移动卡牌
      let newZones = {
        head: prevZones.head.filter(c => !cardsToMove.some(m => cardKey(m) === cardKey(c))),
        mid: prevZones.mid.filter(c => !cardsToMove.some(m => cardKey(m) === cardKey(c))),
        tail: prevZones.tail.filter(c => !cardsToMove.some(m => cardKey(m) === cardKey(c))),
      };
      newZones[toZone].push(...cardsToMove);
      return newZones;
    });
    setSelectedCard(null);
  };

  // AI分牌（覆盖三道，依然可继续点选修改）
  const handleAiSplit = () => {
    const allCards = [...zones.head, ...zones.mid, ...zones.tail];
    if (allCards.length !== 13) return;
    const [newHead, newMid, newTail] = cycleAiSplit(allCards, roomId || "myAI");
    setZones({ head: newHead, mid: newMid, tail: newTail });
    setSelectedCard(null);
  };

  // 只有提交时才做3/5/5校验
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
    setSelectedCard(null);
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
    setSelectedCard(null);
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
          cards={zones.head}
          selectedCard={selectedCard}
          onSelectCard={handleSelectCard}
          onZoneClick={handleZoneClick}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
        />
      </div>
      {/* 3. 中道 */}
      <div className="zone-mid" style={{ height: H3 }}>
        <CardZone
          zone="mid"
          label="中道"
          cards={zones.mid}
          selectedCard={selectedCard}
          onSelectCard={handleSelectCard}
          onZoneClick={handleZoneClick}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
        />
      </div>
      {/* 4. 尾道 */}
      <div className="zone-tail" style={{ height: H4 }}>
        <CardZone
          zone="tail"
          label="尾道"
          cards={zones.tail}
          selectedCard={selectedCard}
          onSelectCard={handleSelectCard}
          onZoneClick={handleZoneClick}
          style={{
            height: "100%",
            borderBottom: "1px solid #ededed",
            background: "#fcfcff",
            alignItems: "center",
            justifyContent: "flex-start"
          }}
        />
      </div>
      {/* 5. 按钮区 */}
      <div className="zone-buttons" style={{ height: H5 }}>
        <ControlBar
          handleAiSplit={handleAiSplit}
          handleSubmit={handleSubmit}
          aiDisabled={false}
          submitDisabled={submitted}
          submitted={submitted}
          style={{
            width: "100vw",
            minHeight: "100%",
            background: "#fcfcff",
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
