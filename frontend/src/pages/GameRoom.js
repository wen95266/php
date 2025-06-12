import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';

const API_BASE = "https://wenge.cloudns.ch/backend/api/";

function randomNickname() {
  return '玩家' + Math.floor(1000 + Math.random() * 9000);
}

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};

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

// 简单AI分牌（随机头道3，中道5，尾道5）
function simpleAISplit(cards) {
  const shuffled = sortCards([...cards]).sort(()=>Math.random()-0.5);
  return {
    head: shuffled.slice(0, 3),
    main: shuffled.slice(3, 8),
    tail: shuffled.slice(8, 13)
  };
}

export default function GameRoom() {
  // 基础游戏状态
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [originHand, setOriginHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  // 理牌区状态
  const [head, setHead] = useState([]);   // 头道 3张
  const [tail, setTail] = useState([]);   // 尾道 5张
  const [main, setMain] = useState([]);   // 中道/手牌 5张
  const [hand, setHand] = useState([]);   // 临时手牌>5张时

  // 拖拽状态
  const [dragCard, setDragCard] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);

  // 比牌弹窗
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState([]);

  // 自动创建房间
  useEffect(() => {
    const nick = randomNickname();
    setNickname(nick);
    fetch(API_BASE + "create_room.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nick })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.roomId) {
          setRoomId(data.roomId);
        } else {
          setMessage(data.message || "房间创建失败");
        }
      });
  }, []);

  // 自动发牌
  useEffect(() => {
    if (roomId) {
      fetch(API_BASE + "deal_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      });
    }
  }, [roomId]);

  // 长轮询获取状态
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
            // 初始化理牌，仅一次
            if (!originHand.length && Array.isArray(data.myHand)) {
              setOriginHand(data.myHand);
              setHand(data.myHand); setHead([]); setTail([]); setMain([]);
            }
            const me = data.players.find(p => p.nickname === nickname);
            setPlayed(me && me.cards ? true : false);
          }
          timer = setTimeout(fetchState, 1500);
        });
    };
    fetchState();
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [roomId, nickname, originHand.length]);

  // 拖拽实现
  const onDragStart = (card, from) => {
    setDragCard(card);
    setDragFrom(from);
  };
  const onDragEnd = () => {
    setDragCard(null);
    setDragFrom(null);
  };
  const allowDrop = e => e.preventDefault();

  // 拖放到理牌区
  const onDropTo = (toZone) => {
    if (!dragCard) return;
    // 拖拽来源
    let fromArr, setFromArr;
    if (dragFrom === 'hand') { fromArr = hand; setFromArr = setHand; }
    else if (dragFrom === 'head') { fromArr = head; setFromArr = setHead; }
    else if (dragFrom === 'main') { fromArr = main; setFromArr = setMain; }
    else if (dragFrom === 'tail') { fromArr = tail; setFromArr = setTail; }
    else return;
    // 目标
    let toArr, setToArr, maxLen;
    if (toZone === 'head') { toArr = head; setToArr = setHead; maxLen = 3; }
    else if (toZone === 'main') { toArr = main; setToArr = setMain; maxLen = 5; }
    else if (toZone === 'tail') { toArr = tail; setToArr = setTail; maxLen = 5; }
    else if (toZone === 'hand') { toArr = hand; setToArr = setHand; maxLen = 13; }
    else return;

    if (toArr.includes(dragCard)) return onDragEnd();
    if (toArr.length >= maxLen) return onDragEnd();

    setFromArr(fromArr.filter(c => c !== dragCard));
    setToArr([...toArr, dragCard]);
    onDragEnd();
  };
  const onDropToHand = () => onDropTo('hand');

  // 自动识别“手牌=5张”转“中道”
  useEffect(() => {
    if (hand.length === 5 && head.length === 3 && tail.length === 5) {
      setMain(hand);
      setHand([]);
    }
    if (main.length && (head.length !== 3 || tail.length !== 5)) {
      setHand([...main]);
      setMain([]);
    }
    if (main.length === 0 && !hand.length && originHand.length) {
      if (head.length === 3 && tail.length === 5) return;
      setHand(originHand.filter(c => !head.includes(c) && !tail.includes(c)));
    }
    // eslint-disable-next-line
  }, [head, tail, hand, main, originHand]);

  // AI智能分牌
  const handleAISplit = () => {
    if (!originHand.length) return;
    const aiResult = simpleAISplit(originHand);
    setHead(aiResult.head);
    setMain(aiResult.main);
    setTail(aiResult.tail);
    setHand([]);
  };

  // 出牌并展示比牌界面
  const handlePlay = async () => {
    if (head.length !==3 || main.length !==5 || tail.length !==5) {
      setMessage("请完成理牌（头道3，中道5，尾道5）再出牌");
      return;
    }
    const playCards = [...head, ...main, ...tail];
    // 玩家出牌
    await fetch(API_BASE + "play_cards.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, nickname, cards: playCards })
    });
    // AI自动分牌并出牌
    for (const p of players) {
      if (p.nickname.startsWith("AI-") && !p.cards) {
        // AI手牌
        const aiResult = simpleAISplit(p.cards ? p.cards : originHand);
        const aiCards = [...aiResult.head, ...aiResult.main, ...aiResult.tail];
        await fetch(API_BASE + "play_cards.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, nickname: p.nickname, cards: aiCards })
        });
      }
    }
    // 查询比牌数据
    setTimeout(async () => {
      const resp = await fetch(API_BASE + "compare_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      });
      const resData = await resp.json();
      if (resData.success && resData.result) {
        setCompareData(resData.result);
        setShowCompare(true);
      }
    }, 500); // 等待AI写入
  };

  // ------- UI 渲染 ---------
  const renderPlayersBanner = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 36, marginBottom: 10, padding: '8px 0 0 0',
      borderBottom: '1.5px solid #eee', background: '#fff', borderRadius: 8, boxShadow:'0 1px 6px #f4f4f8'
    }}>
      {players.map(p => {
        const isSelf = p.nickname === nickname;
        const isPlayed = p.cards && p.cards.length === 13;
        return (
          <div key={p.nickname} style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minWidth:90, padding:'0 8px'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: isSelf ? '#2e91f7' : '#eee',
              display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
              fontSize:20, fontWeight:700, marginBottom:2
            }}>{isSelf ? '你' : <span style={{fontSize:17}}>AI</span>}</div>
            <div style={{
              fontWeight: isSelf ? 700 : 500, color: isSelf ? '#2e91f7' : '#222', fontSize:15,
              marginBottom:2
            }}>
              {isSelf ? `${p.nickname}（你）` : p.nickname}
            </div>
            <div style={{
              fontSize: 13,
              color: isPlayed ? '#43a047' : '#e53935', fontWeight: 600,
              letterSpacing:1
            }}>
              {isPlayed ? '已出牌' : '未出牌'}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLane = (title, zone, cards, maxLen, dropFn) => (
    <div
      style={{
        minHeight: 110, background:'#f8fbfd', border:'1.5px dashed #cde6ff',
        borderRadius:8, margin: '6px 0 12px 0', display: 'flex', alignItems:'flex-start', paddingLeft:12
      }}
      onDragOver={allowDrop}
      onDrop={e=>{e.preventDefault();dropFn(zone);}}
    >
      <span style={{
        fontWeight: 600, color: '#2e91f7', fontSize:16, marginRight: 16, minWidth:60,paddingTop:18
      }}>{title}</span>
      <div style={{display:'flex',alignItems:'center',gap:10, flex:1, minHeight:92, paddingTop:12}}>
        {cards.map(card =>
          <div
            key={card}
            draggable
            onDragStart={()=>onDragStart(card, zone)}
            onDragEnd={onDragEnd}
            style={{cursor:'grab'}}
          >
            <Card name={card} size={{width:92,height:140}} border={false} />
          </div>
        )}
        {cards.length < maxLen &&
          <span style={{color:'#bbb',fontSize:14,marginLeft:6}}>
            （拖动手牌到此处理牌，最多{maxLen}张）
          </span>
        }
      </div>
    </div>
  );

  // 手牌区（仅剩5张时不显示）
  const renderHand = () => (
    hand.length > 0 &&
    <>
      <h3 style={{margin:'6px 0 4px 0',fontSize:17}}>我的手牌</h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          background: '#fff',
          borderRadius: 10,
          padding: '18px 0',
          minHeight: 155,
          margin: '0 0 6px 0',
          boxShadow: '0 1px 4px #eee',
          justifyContent: 'flex-start'
        }}
        onDragOver={allowDrop}
        onDrop={e=>{e.preventDefault();onDropToHand();}}
      >
        {sortCards(hand).map(card =>
          <div
            key={card}
            draggable
            onDragStart={()=>onDragStart(card, 'hand')}
            onDragEnd={onDragEnd}
            style={{cursor:'grab'}}
          >
            <Card name={card} size={{width:92,height:140}} border={false} />
          </div>
        )}
        {hand.length === 0 &&
          <span style={{color:'#bbb',fontSize:14,marginLeft:6}}>
            （已全部理牌）
          </span>
        }
      </div>
    </>
  );

  // 中道区：仅剩5张或已确定时显示
  const renderMain = () => (
    main.length > 0 &&
      <div style={{
        minHeight: 110, background:'#f8fbfd', border:'1.5px dashed #cde6ff',
        borderRadius:8, margin: '6px 0 12px 0', display: 'flex', alignItems:'flex-start', paddingLeft:12
      }}>
        <span style={{
          fontWeight: 600, color: '#2e91f7', fontSize:16, marginRight: 16, minWidth:60,paddingTop:18
        }}>中道</span>
        <div style={{display:'flex',alignItems:'center',gap:10, flex:1, minHeight:92, paddingTop:12}}>
          {sortCards(main).map(card =>
            <div
              key={card}
              draggable
              onDragStart={()=>onDragStart(card, 'main')}
              onDragEnd={onDragEnd}
              style={{cursor:'grab'}}
            >
              <Card name={card} size={{width:92,height:140}} border={false} />
            </div>
          )}
        </div>
      </div>
  );

  // 比牌弹窗
  const renderCompareModal = () => (
    showCompare &&
    <div style={{
      position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.28)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 2px 22px #888", padding: 30, minWidth: 640
      }}>
        <h2 style={{textAlign:"center", margin:0, color:"#2e91f7"}}>比牌结果</h2>
        <div style={{display:"flex",gap:16,margin:"30px 0 0 0",justifyContent:"center"}}>
          {compareData.map(player => (
            <div key={player.nickname} style={{minWidth:150, maxWidth:240, background:"#f8fbfd", borderRadius:10, padding:16}}>
              <div style={{fontWeight:600, color:player.nickname===nickname?"#2e91f7":"#333",textAlign:"center"}}>
                {player.nickname}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6,justifyContent:"center"}}>
                {/* 头道 */}
                <span style={{fontSize:13,color:"#2e91f7",marginRight:4}}>头道</span>
                {(player.cards||[]).slice(0,3).map(c=>
                  <Card key={c} name={c} size={{width:60,height:90}} />
                )}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,margin:"6px 0 0 0",justifyContent:"center"}}>
                {/* 中道 */}
                <span style={{fontSize:13,color:"#2e91f7",marginRight:4}}>中道</span>
                {(player.cards||[]).slice(3,8).map(c=>
                  <Card key={c} name={c} size={{width:60,height:90}} />
                )}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,margin:"6px 0 0 0",justifyContent:"center"}}>
                {/* 尾道 */}
                <span style={{fontSize:13,color:"#2e91f7",marginRight:4}}>尾道</span>
                {(player.cards||[]).slice(8,13).map(c=>
                  <Card key={c} name={c} size={{width:60,height:90}} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:32}}>
          <button style={{
            padding: '10px 32px',
            fontSize: 18,
            borderRadius: 7,
            border: '1.5px solid #2e91f7',
            background: '#fff',
            color: '#2e91f7',
            cursor: 'pointer',
            fontWeight: 600
          }} onClick={()=>setShowCompare(false)}>关闭</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 990,
      margin: '30px auto 0 auto',
      background: '#f9f9fa',
      borderRadius: 16,
      boxShadow: '0 2px 22px #e8eaf0',
      padding: 30,
      minHeight: 520
    }}>
      {/* 顶部横幅 */}
      <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:4}}>
        <h2 style={{margin:0,fontSize:26,color:'#2e91f7',letterSpacing:1}}>十三水牌桌</h2>
        <span style={{fontSize:15,color:'#888'}}>房间号: <b>{roomId || '正在创建房间...'}</b></span>
        <span style={{fontSize:15,color:'#888'}}>我的昵称: <b style={{color:'#2e91f7'}}>{nickname}</b></span>
      </div>
      {renderPlayersBanner()}
      {renderLane("头道", "head", head, 3, onDropTo)}
      {renderMain()}
      {renderHand()}
      {renderLane("尾道", "tail", tail, 5, onDropTo)}

      <div style={{
        display:'flex',alignItems:'center',marginTop:18,gap:24
      }}>
        <button
          style={{
            padding: '12px 36px',
            fontSize: 21,
            borderRadius: 8,
            background: '#2e91f7',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            marginRight:8
          }}
          onClick={handlePlay}
          disabled={played}
        >出牌</button>
        <button
          style={{
            padding: '11px 30px',
            fontSize: 17,
            borderRadius: 7,
            border: '1.5px solid #43a047',
            background: '#fff',
            color: '#43a047',
            cursor: 'pointer',
            fontWeight: 600
          }}
          onClick={handleAISplit}
        >AI智能分牌</button>
        <button style={{
          padding: '9px 28px',
          fontSize: 18,
          borderRadius: 7,
          border: '1.5px solid #2e91f7',
          background: '#fff',
          color: '#2e91f7',
          cursor: 'pointer',
          fontWeight: 600
        }} onClick={() => window.location.reload()}>再来一局</button>
        {played && (
          <span style={{marginLeft:16, color:'#4caf50',fontSize:17,fontWeight:600}}>已出牌</span>
        )}
      </div>
      {message && <div style={{color:'#ff9800',fontWeight:500,margin:'10px 0'}}>{message}</div>}
      {result && <div style={{
        margin: '20px 0 8px 0',
        color: '#43a047',
        fontWeight: 700,
        fontSize: 20
      }}>{result}</div>}
      {renderCompareModal()}
    </div>
  );
}
