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

export default function GameRoom() {
  // 基础游戏状态
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [originHand, setOriginHand] = useState([]); // 原始牌
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
              setHand(data.myHand); // 初始全部在手牌
              setHead([]); setTail([]); setMain([]);
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
    // 拖回去后，如果main有牌但head或tail数量不对要恢复为手牌
    if (main.length && (head.length !== 3 || tail.length !== 5)) {
      setHand([...main]);
      setMain([]);
    }
    // 若main被拖空，需要恢复为手牌
    if (main.length === 0 && !hand.length && originHand.length) {
      if (head.length === 3 && tail.length === 5) return;
      setHand(originHand.filter(c => !head.includes(c) && !tail.includes(c)));
    }
    // eslint-disable-next-line
  }, [head, tail, hand, main, originHand]);

  // 出牌
  const handlePlay = () => {
    if (head.length !==3 || main.length !==5 || tail.length !==5) {
      setMessage("请完成理牌（头道3，中道5，尾道5）再出牌");
      return;
    }
    const playCards = [...head, ...main, ...tail];
    fetch(API_BASE + "play_cards.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, nickname, cards: playCards })
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || (data.success ? "已出牌" : "出牌失败"));
      });
  };

  // 自动比牌和显示胜者
  useEffect(() => {
    if (!roomId || !players.length) return;
    const allPlayed = players.every(p => p.cards && p.cards.length === 13);
    if (allPlayed) {
      fetch(API_BASE + "compare_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.result) {
            setResult("所有玩家已出牌，本局结束。");
          }
        });
    }
  }, [players, roomId]);

  // ------- UI 相关 ---------
  // 顶部横幅玩家状态
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

  // 牌区渲染
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

      {/* 玩家状态横幅 */}
      {renderPlayersBanner()}

      {/* 头道理牌区 */}
      {renderLane("头道", "head", head, 3, onDropTo)}

      {/* 中道（main）区，仅5张时显示 */}
      {renderMain()}

      {/* 手牌区，大于5张时显示（否则隐藏） */}
      {renderHand()}

      {/* 尾道理牌区 */}
      {renderLane("尾道", "tail", tail, 5, onDropTo)}

      {/* 操作区 */}
      <div style={{
        display:'flex',alignItems:'center',marginTop:18,gap:24
      }}>
        {!played && !loading && (
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
          >出牌</button>
        )}
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
    </div>
  );
}
