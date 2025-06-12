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

  const onDragStart = (card, from) => { setDragCard(card); setDragFrom(from); };
  const onDragEnd = () => { setDragCard(null); setDragFrom(null); };
  const allowDrop = e => e.preventDefault();

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
    if (toArr.length >= maxLen) return onDragEnd();
    setFromArr(fromArr.filter(c => c !== dragCard));
    setToArr([...toArr, dragCard]);
    onDragEnd();
  };
  const onDropToHand = () => onDropTo('hand');

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
  }, [head, tail, hand, main, originHand]);

  // AI智能分牌：依次切换所有可行造型并允许手动拖拽
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

    // AI分牌后，允许继续拖拽调整
    const allAIcards = [...split.head, ...split.main, ...split.tail];
    const handRest = originHand.filter(c =>
      !allAIcards.includes(c)
    );
    setHead(split.head);
    setMain(split.main);
    setTail(split.tail);
    setHand(handRest);
    setAiLoading(false);
  };

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
      setTimeout(async () => {
        try {
          const resp2 = await fetch(API_BASE + "compare_cards.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId })
          });
          const resData = await resp2.json();
          if (resData.success && resData.result) {
            setCompareData(resData.result);
            setShowCompare(true);
          }
        } catch {
          setMessage("比牌失败，请重试");
        }
        setPlayLoading(false);
      }, 500);
    } catch {
      setMessage("网络错误，出牌失败");
      setPlayLoading(false);
    }
  };

  // --- UI 渲染函数 ---
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
      <div style={{
        minWidth: 140,
        color: '#43a047',
        fontWeight: 600,
        fontSize: 15,
        padding: '4px 0 0 24px'
      }}>
        {handTypeName(cards.map(parseCard))}
      </div>
    </div>
  );

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
        <div style={{
          minWidth: 140,
          color: '#43a047',
          fontWeight: 600,
          fontSize: 15,
          padding: '4px 0 0 24px'
        }}>
          {handTypeName(main.map(parseCard))}
        </div>
      </div>
  );

  const renderCompareModal = () => (
    showCompare &&
    <div style={{
      position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.28)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 2px 22px #888", padding: 30, minWidth: 720, minHeight: 470
      }}>
        <h2 style={{textAlign:"center", margin:0, color:"#2e91f7"}}>比牌结果</h2>
        <div style={{
          display:"flex",
          flexWrap:"wrap",
          gap:"32px 36px",
          margin:"30px 0 0 0",
          justifyContent:"center",
          alignItems:"center",
          width:"100%"
        }}>
          {[0,1,2,3].map(idx=>{
            const player = compareData[idx];
            if (!player) return null;
            return (
              <div key={player.nickname}
                style={{
                  width: 280,
                  minHeight: 220,
                  background:"#f8fbfd",
                  borderRadius:10,
                  padding:"16px 18px 18px 18px",
                  boxSizing:"border-box",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  justifyContent:"center",
                  boxShadow: "0 2px 8px #f0f4ff"
                }}>
                <div style={{
                  fontWeight:600,
                  color:player.nickname===nickname?"#2e91f7":"#333",
                  textAlign:"center",
                  marginBottom:10,
                  fontSize:18
                }}>
                  {player.nickname}
                </div>
                {/* 头道 */}
                <div style={{margin:"3px 0 0 0"}}>
                  <div style={{fontSize:13,color:"#2e91f7",marginBottom:1}}>头道</div>
                  <div style={{
                    position:"relative",
                    height: 95,
                    width: 130
                  }}>
                    {(player.cards||[]).slice(0,3).map((c,i)=>
                      <div key={c} style={{
                        position:"absolute",
                        left: `${i*32}px`,
                        top: `${Math.abs(i-1)*8}px`,
                        zIndex: i,
                        boxShadow: "0 1px 3px #bbb"
                      }}>
                        <Card name={c} size={{width:60,height:90}} />
                      </div>
                    )}
                  </div>
                </div>
                {/* 中道 */}
                <div style={{margin:"5px 0 0 0"}}>
                  <div style={{fontSize:13,color:"#2e91f7",marginBottom:1}}>中道</div>
                  <div style={{
                    position:"relative",
                    height: 95,
                    width: 210
                  }}>
                    {(player.cards||[]).slice(3,8).map((c,i)=>
                      <div key={c} style={{
                        position:"absolute",
                        left: `${i*32}px`,
                        top: `${Math.abs(i-2)*7}px`,
                        zIndex: i,
                        boxShadow: "0 1px 3px #bbb"
                      }}>
                        <Card name={c} size={{width:60,height:90}} />
                      </div>
                    )}
                  </div>
                </div>
                {/* 尾道 */}
                <div style={{margin:"5px 0 0 0"}}>
                  <div style={{fontSize:13,color:"#2e91f7",marginBottom:1}}>尾道</div>
                  <div style={{
                    position:"relative",
                    height: 95,
                    width: 210
                  }}>
                    {(player.cards||[]).slice(8,13).map((c,i)=>
                      <div key={c} style={{
                        position:"absolute",
                        left: `${i*32}px`,
                        top: `${Math.abs(i-2)*7}px`,
                        zIndex: i,
                        boxShadow: "0 1px 3px #bbb"
                      }}>
                        <Card name={c} size={{width:60,height:90}} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

  // --- 页面结构 ---
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
      <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:4}}>
        <h2 style={{margin:0,fontSize:26,color:'#2e91f7',letterSpacing:1}}>十三水牌桌</h2>
        <span style={{fontSize:15,color:'#888'}}>房间号: <b>{roomId || '正在创建房间...'}</b></span>
        <span style={{fontSize:15,color:'#888'}}>我的昵称: <b style={{color:'#2e91f7'}}>{nickname}</b></span>
      </div>
      {loading && (
        <div style={{color:'#2e91f7',margin:'12px 0',fontSize:17,fontWeight:600}}>
          <span>正在同步房间信息...</span>
        </div>
      )}
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
            background: playLoading ? '#ddd' : '#2e91f7',
            color: '#fff',
            border: 'none',
            cursor: playLoading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            marginRight:8,
            opacity: playLoading ? 0.65 : 1
          }}
          onClick={handlePlay}
          disabled={played || playLoading || loading}
        >{playLoading ? '出牌中...' : '出牌'}</button>
        <button
          style={{
            padding: '11px 30px',
            fontSize: 17,
            borderRadius: 7,
            border: '1.5px solid #43a047',
            background: aiLoading ? '#eee' : '#fff',
            color: '#43a047',
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: aiLoading ? 0.6 : 1
          }}
          onClick={handleAISplit}
          disabled={aiLoading || loading}
        >
          {aiLoading
            ? 'AI分牌中...'
            : 'AI智能分牌'}
        </button>
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
