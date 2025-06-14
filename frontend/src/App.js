import React, { useEffect, useState } from "react";
import { createRoom, joinRoom, startGame, getRoomState, submitHand } from "./api";
import GameRoom from "./components/GameRoom";
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

// 横幅样式
const bannerStyle = {
  width: "100vw",
  minHeight: "16vh",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderBottom: "1px solid #eee",
  background: "#fafbfc"
};

const dragCardKey = (card) => `${card.value}_${card.suit}`;

// 获取玩家状态字符串
function getStatusString(status, results, myName) {
  if (status === "finished" && results) {
    let arr = [];
    for (let player in results["总分"]) {
      let score = results["总分"][player];
      let hit = results["详情"][player]["打枪"] || 0;
      arr.push(
        `${player}${player === myName ? "(你)" : ""}：${score}分${hit ? `（打枪${hit}次）` : ""}`
      );
    }
    return arr.join("　");
  }
  if (status === "playing") {
    return "对局进行中...";
  }
  if (status === "waiting") {
    return "等待玩家准备...";
  }
  return "";
}

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [results, setResults] = useState(null);

  // 手牌区，头道区，尾道区（均为牌数组）
  const [hand, setHand] = useState([]);
  const [head, setHead] = useState([]);
  const [tail, setTail] = useState([]);
  const [mid, setMid] = useState([]); // 只有完成后才出现
  const [draggingCard, setDraggingCard] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 初始化，创建房间、加入AI并开局
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
      // 只初始化一次手牌
      if (state.status === "playing" && hand.length === 0 && state.myHand) {
        setHand(state.myHand);
      }
    }, 1200);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [roomId, hand.length]);

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
    // 从哪个区移除
    if (from === "hand") newHand = newHand.filter(c => dragCardKey(c) !== dragCardKey(card));
    if (from === "head") newHead = newHead.filter(c => dragCardKey(c) !== dragCardKey(card));
    if (from === "tail") newTail = newTail.filter(c => dragCardKey(c) !== dragCardKey(card));
    // 加入新区域
    if (to === "hand") newHand.push(card);
    if (to === "head" && newHead.length < 3) newHead.push(card);
    if (to === "tail" && newTail.length < 5) newTail.push(card);
    setHand(newHand);
    setHead(newHead);
    setTail(newTail);
    setDraggingCard(null);
  };
  // 获取拖拽区样式
  const getDropStyle = (zone, maxCards) => ({
    minHeight: "9vh",
    minWidth: "30vw",
    border: "2px dashed #bbb",
    borderRadius: 8,
    margin: "0 1vw",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    transition: "border 0.2s",
    boxShadow: "0 2px 6px #fafafa",
    opacity: (zone === "head" && head.length >= 3) || (zone === "tail" && tail.length >= 5) ? 0.7 : 1
  });

  // 牌拖回手牌
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

  // 当头道3、尾道5时，手牌自动变成中道，不能再手动拖
  useEffect(() => {
    if (head.length === 3 && tail.length === 5 && hand.length === 5) {
      setMid(hand);
      setHand([]);
    }
    // 若后悔牌，mid需合并回hand
    if ((head.length < 3 || tail.length < 5) && mid.length > 0) {
      setHand([...hand, ...mid]);
      setMid([]);
    }
    // eslint-disable-next-line
  }, [head.length, tail.length, hand.length]);

  // AI智能分牌
  const handleAiSplit = () => {
    // 只允许未理牌时智能分牌
    if (hand.length + head.length + tail.length !== 13) return;
    const [newHead, newMid, newTail] = advancedAiSplit([...hand, ...head, ...tail]);
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
    alert("你的牌型已提交");
  };

  if (!joined || !roomId) return <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>房间初始化中...</div>;
  if (status === "results") {
    return <GameRoom roomId={roomId} playerName={MY_NAME} />;
  }

  // 横幅高度自适应
  const bannerH = "16vh";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#eef2f8" }}>
      {/* 1. 玩家状态横幅 */}
      <div style={{ ...bannerStyle, minHeight: bannerH, background: "#3869f6", color: "#fff", fontWeight: 500, fontSize: 22 }}>
        <span>
          {getStatusString(status, results, MY_NAME)}
        </span>
      </div>
      {/* 2. 头道置牌区 */}
      <div style={{ ...bannerStyle, minHeight: bannerH }}>
        <div
          style={getDropStyle("head", 3)}
          onDragOver={e => {e.preventDefault();}}
          onDrop={() => onDrop("head")}
        >
          <div style={{fontWeight:600,marginRight:18}}>头道 ({head.length}/3):</div>
          {head.map((card, idx) => (
            <div
              key={dragCardKey(card)}
              draggable
              onDragStart={() => onDragStart(card, "head")}
              style={{ marginRight: 3, position:"relative" }}
            >
              <img src={cardImg(card)} alt="" width={50} style={{borderRadius:4,boxShadow:"1px 2px 8px #eee"}} />
              <span
                onClick={() => onReturnToHand("head", idx)}
                style={{
                  position: "absolute", top: 0, right: 0, background: "#f44", color: "#fff",
                  fontSize: 12, borderRadius: "0 4px 0 4px", cursor: "pointer",padding: "1px 4px"
                }}
                title="退回手牌">×</span>
            </div>
          ))}
        </div>
      </div>
      {/* 3. 中道/手牌置牌区 */}
      <div style={{ ...bannerStyle, minHeight: bannerH, background: "#f8fafd" }}>
        {mid.length === 5 ? (
          <div style={getDropStyle("mid", 5)}>
            <div style={{fontWeight:600,marginRight:18}}>中道 (5/5):</div>
            {mid.map((card, idx) => (
              <div key={dragCardKey(card)} style={{marginRight:2}}>
                <img src={cardImg(card)} alt="" width={50} style={{borderRadius:4,boxShadow:"1px 2px 8px #eee"}} />
              </div>
            ))}
          </div>
        ) : (
          <div style={getDropStyle("hand", 5)}
            onDragOver={e => {e.preventDefault();}}
            onDrop={() => onDrop("hand")}
          >
            <div style={{fontWeight:600,marginRight:18}}>手牌区 ({hand.length}/13):</div>
            {hand.map((card, idx) => (
              <div
                key={dragCardKey(card)}
                draggable
                onDragStart={() => onDragStart(card, "hand")}
                style={{ marginRight: 3 }}
              >
                <img src={cardImg(card)} alt="" width={50} style={{borderRadius:4,boxShadow:"1px 2px 8px #eee"}} />
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 4. 尾道置牌区 */}
      <div style={{ ...bannerStyle, minHeight: bannerH }}>
        <div
          style={getDropStyle("tail", 5)}
          onDragOver={e => {e.preventDefault();}}
          onDrop={() => onDrop("tail")}
        >
          <div style={{fontWeight:600,marginRight:18}}>尾道 ({tail.length}/5):</div>
          {tail.map((card, idx) => (
            <div
              key={dragCardKey(card)}
              draggable
              onDragStart={() => onDragStart(card, "tail")}
              style={{ marginRight: 3, position:"relative" }}
            >
              <img src={cardImg(card)} alt="" width={50} style={{borderRadius:4,boxShadow:"1px 2px 8px #eee"}} />
              <span
                onClick={() => onReturnToHand("tail", idx)}
                style={{
                  position: "absolute", top: 0, right: 0, background: "#f44", color: "#fff",
                  fontSize: 12, borderRadius: "0 4px 0 4px", cursor: "pointer",padding: "1px 4px"
                }}
                title="退回手牌">×</span>
            </div>
          ))}
        </div>
      </div>
      {/* 5. 按钮区 */}
      <div style={{
        ...bannerStyle,
        minHeight: bannerH,
        border: "none",
        background: "#f2f6fa",
        justifyContent: "center"
      }}>
        <button
          style={{ fontSize: 18, padding: "8px 32px", marginRight: 30, borderRadius: 8 }}
          onClick={handleAiSplit}
          disabled={head.length > 0 || tail.length > 0 || mid.length > 0}
        >AI智能分牌</button>
        <button
          style={{ fontSize: 18, padding: "8px 32px", borderRadius: 8 }}
          onClick={handleSubmit}
          disabled={submitted || !(head.length === 3 && mid.length === 5 && tail.length === 5)}
        >提交牌型</button>
        {submitted && <span style={{marginLeft: 24, color: "#65a30d", fontWeight: 500}}>已提交，等待其它玩家...</span>}
      </div>
    </div>
  );
}
