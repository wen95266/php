import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { detectAllPatterns } from '../ai/shisanshui';

const API_BASE = "https://wenge.cloudns.ch/backend/api/";

function randomNickname() {
  return '玩家' + Math.floor(1000 + Math.random() * 9000);
}

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};

function parseCard(name) {
  const [rank, , suit] = name.split(/_of_|_/);
  return { rank, suit, name, value: CARD_ORDER[rank] };
}
function getGroups(cs) {
  const m = {};
  for (const c of cs) m[c.value] = (m[c.value]||0) + 1;
  const arr = Object.entries(m).map(([v,cnt])=>[cnt,parseInt(v)]);
  arr.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  return arr;
}
function isFlush(cs) {
  return cs.length > 0 && cs.every(c => c.suit === cs[0].suit);
}
function isStraight(cs) {
  let vs = cs.map(c=>c.value).sort((a,b)=>a-b);
  if (cs.length === 5 && vs.toString() === '2,3,4,5,14') return true;
  for(let i=1;i<vs.length;i++) if(vs[i]-vs[i-1]!==1) return false;
  return true;
}
function isStraightFlush(cs) {
  return isFlush(cs) && isStraight(cs);
}
function handType(cs) {
  if (cs.length === 5) {
    if (isStraightFlush(cs)) return 8;
    if (getGroups(cs)[0][0] === 4) return 7;
    if (getGroups(cs)[0][0] === 3 && getGroups(cs)[1][0] === 2) return 6;
    if (isFlush(cs)) return 5;
    if (isStraight(cs)) return 4;
    if (getGroups(cs)[0][0] === 3) return 3;
    if (getGroups(cs)[0][0] === 2 && getGroups(cs)[1][0] === 2) return 2;
    if (getGroups(cs)[0][0] === 2) return 1;
    return 0;
  } else if (cs.length === 3) {
    if (getGroups(cs)[0][0] === 3) return 3;
    if (getGroups(cs)[0][0] === 2) return 1;
    return 0;
  }
  return -1;
}
function handTypeName(cs) {
  if (!cs.length) return "";
  const type = handType(cs);
  const groups = getGroups(cs);
  const getRankName = v => {
    for (let k in CARD_ORDER) if (CARD_ORDER[k] === v) return k.replace('jack','J').replace('queen','Q').replace('king','K').replace('ace','A').toUpperCase();
    return v;
  };
  if (cs.length === 5) {
    switch(type) {
      case 8: return "同花顺";
      case 7: return "四条 " + getRankName(groups[0][1]);
      case 6: return "葫芦 " + getRankName(groups[0][1]) + "带" + getRankName(groups[1][1]);
      case 5: return "同花";
      case 4: return "顺子";
      case 3: return "三条 " + getRankName(groups[0][1]);
      case 2: return "两对 " + getRankName(groups[0][1]) + "和" + getRankName(groups[1][1]);
      case 1: return "一对 " + getRankName(groups[0][1]);
      case 0: return "高牌 " + getRankName(groups[0][1]);
      default: return "";
    }
  } else if (cs.length === 3) {
    switch(type) {
      case 3: return "三条 " + getRankName(groups[0][1]);
      case 1: return "一对 " + getRankName(groups[0][1]);
      case 0: return "高牌 " + getRankName(groups[0][1]);
      default: return "";
    }
  }
  return "";
}

function sortCards(cards) {
  const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...(cards || [])].sort((a, b) => {
    const [rankA, suitA] = a.split('_of_');
    const [rankB, suitB] = b.split('_of_');
    if (suitOrder[suitA] !== suitOrder[suitB]) {
      return suitOrder[suitA] - suitOrder[suitB];
    }
    return CARD_ORDER[rankA] - CARD_ORDER[rankB];
  });
}

export default function GameRoom() {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [originHand, setOriginHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  const [head, setHead] = useState([]);
  const [tail, setTail] = useState([]);
  const [main, setMain] = useState([]);
  const [hand, setHand] = useState([]);

  const [dragCard, setDragCard] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);

  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [playLoading, setPlayLoading] = useState(false);

  // 造型策略
  const [patterns, setPatterns] = useState([]);
  const [patternIdx, setPatternIdx] = useState(0);

  useEffect(() => {
    const nick = randomNickname();
    setNickname(nick);
    setLoading(true);
    fetch(API_BASE + "create_room.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nick })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.success && data.roomId) {
          setRoomId(data.roomId);
        } else {
          setMessage(data.message || "房间创建失败");
        }
      })
      .catch(() => {
        setLoading(false);
        setMessage("网络错误，房间创建失败");
      });
  }, []);

  useEffect(() => {
    if (roomId) {
      setLoading(true);
      fetch(API_BASE + "deal_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      })
      .finally(() => setLoading(false));
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !nickname) return;
    let timer;
    const fetchState = () => {
      fetch(API_BASE + "room_state.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, nickname })
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false);
          if (data.success) {
            setPlayers(data.players || []);
            if (!originHand.length && Array.isArray(data.myHand)) {
              setOriginHand(data.myHand);
              setHand(data.myHand); setHead([]); setTail([]); setMain([]);
              setPatterns([]);
              setPatternIdx(0);
            }
            const me = data.players.find(p => p.nickname === nickname);
            setPlayed(me && me.cards ? true : false);
          } else {
            setMessage(data.message || "房间状态同步失败");
          }
          timer = setTimeout(fetchState, 1800);
        })
        .catch(() => {
          setLoading(false);
          setMessage("网络异常，房间状态同步失败");
          timer = setTimeout(fetchState, 4000);
        });
    };
    fetchState();
    return () => clearTimeout(timer);
  }, [roomId, nickname, originHand.length]);

  // 拖拽
  const onDragStart = (card, from) => { setDragCard(card); setDragFrom(from); };
  const onDragEnd = () => { setDragCard(null); setDragFrom(null); };
  const allowDrop = e => e.preventDefault();

  // 允许任意牌区互拖，包括AI分牌后继续拖
  const onDropTo = (toZone) => {
    if (!dragCard) return;
    let fromArr, setFromArr;
    if (dragFrom === 'hand') { fromArr = hand; setFromArr = setHand; }
    else if (dragFrom === 'head') { fromArr = head; setFromArr = setHead; }
    else if (dragFrom === 'main') { fromArr = main; setFromArr = setMain; }
    else if (dragFrom === 'tail') { fromArr = tail; setFromArr = setTail; }
    else return;
    let toArr, setToArr, maxLen;
    if (toZone === 'head') { toArr = head; setToArr = setHead; maxLen = 3; }
    else if (toZone === 'main') { toArr = main; setToArr = setMain; maxLen = 5; }
    else if (toZone === 'tail') { toArr = tail; setToArr = setTail; maxLen = 5; }
    else if (toZone === 'hand') { toArr = hand; setToArr = setHand; maxLen = 13; }
    else return;
    if (toArr.includes(dragCard)) return onDragEnd();
    // 允许溢出拖回hand区
    if (toZone !== 'hand' && toArr.length >= maxLen) return onDragEnd();
    setFromArr(fromArr.filter(c => c !== dragCard));
    setToArr([...toArr, dragCard]);
    onDragEnd();
  };
  const onDropToHand = () => onDropTo('hand');

  // 拖拽自动补全副道
  useEffect(() => {
    // 拖拽后如果三道分配完毕，main自动补齐
    if (hand.length === 5 && head.length === 3 && tail.length === 5) {
      setMain(hand);
      setHand([]);
    }
    // 如果main有牌但其他道数目不对，main回手牌
    if (main.length && (head.length !== 3 || tail.length !== 5)) {
      setHand([...main]);
      setMain([]);
    }
    // main空且hand无牌但originHand还有，自动补hand
    if (main.length === 0 && !hand.length && originHand.length) {
      if (head.length === 3 && tail.length === 5) return;
      setHand(originHand.filter(c => !head.includes(c) && !tail.includes(c)));
    }
  }, [head, tail, hand, main, originHand]);

  // AI智能分牌：分完后允许随意拖拽（hand区为未用牌）
  const handleAISplit = () => {
    if (!originHand.length) return;
    setAiLoading(true);

    let newPatterns = patterns;
    if (!newPatterns.length) {
      newPatterns = detectAllPatterns(originHand);
      setPatterns(newPatterns);
      setPatternIdx(0);
    }

    let idx = patternIdx;
    if (newPatterns.length > 1) {
      idx = (patternIdx + 1) % newPatterns.length;
      setPatternIdx(idx);
    }
    const split = newPatterns[idx].split;

    // AI分牌后，把13张牌按三道分配，其它余牌放hand区（通常无余牌）
    setHead([...split.head]);
    setMain([...split.main]);
    setTail([...split.tail]);
    setHand(originHand.filter(c =>
      !split.head.includes(c) &&
      !split.main.includes(c) &&
      !split.tail.includes(c)
    ));
    setAiLoading(false);
  };

  // 修复：出牌后立即请求比牌，若失败自动重试，避免“比牌失败，请重试”假阳性
  const handlePlay = async () => {
    if (head.length !==3 || main.length !==5 || tail.length !==5) {
      setMessage("请完成理牌（头道3，中道5，尾道5）再出牌");
      return;
    }
    setPlayLoading(true);
    setMessage('');
    try {
      const playCards = [...head, ...main, ...tail];
      const resp = await fetch(API_BASE + "play_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, nickname, cards: playCards })
      });
      const data = await resp.json();
      if (!data.success) {
        setMessage(data.message || "出牌失败");
        setPlayLoading(false);
        return;
      }
      // AI自动出牌
      for (const p of players) {
        if (p.nickname.startsWith("AI-") && !p.cards && Array.isArray(p.hand) && p.hand.length === 13) {
          const aiPatterns = detectAllPatterns(p.hand);
          const aiSplit = aiPatterns[0].split;
          const aiCards = [...aiSplit.head, ...aiSplit.main, ...aiSplit.tail];
          fetch(API_BASE + "play_cards.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId, nickname: p.nickname, cards: aiCards })
          });
        }
      }
      // 比牌接口重试机制
      let compareTried = 0;
      let compareDataRes = null;
      while (compareTried < 5 && !compareDataRes) {
        try {
          await new Promise(res=>setTimeout(res, 800 + 400*compareTried)); // 等AI出牌
          const resp2 = await fetch(API_BASE + "compare_cards.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId })
          });
          const resData = await resp2.json();
          if (resData.success && resData.result) {
            compareDataRes = resData.result;
            setCompareData(resData.result);
            setShowCompare(true);
            setMessage('');
            break;
          }
        } catch {}
        compareTried++;
      }
      if (!compareDataRes) setMessage("比牌失败，请重试");
      setPlayLoading(false);
    } catch {
      setMessage("网络错误，出牌失败");
      setPlayLoading(false);
    }
  };

  // ...省略 UI 渲染函数，和你原来的一致...

  // --- 页面结构 ---
  // ...此处插入你原有的 UI 渲染代码即可...
  // ...比如 renderPlayersBanner/renderLane/renderHand/renderMain/renderCompareModal 等...

  // 结尾 return 也与原来一致
  // 只要保证 handleAISplit/handlePlay/onDropTo 逻辑为此最新版，即可彻底修复AI分牌后可拖拽及比牌bug
}
