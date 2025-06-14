import React, { useRef, useLayoutEffect, useState } from "react";

// 平铺扑克牌，不堆叠
function CardRow({ cards, maxWidth, maxHeight }) {
  const len = cards.length;
  // 平铺时，每张牌宽度 = (maxWidth - (len-1)*gap) / len
  const gap = Math.max(Math.round(maxWidth * 0.018), 9);
  let cardW = (maxWidth - (len - 1) * gap) / len;
  let cardH = cardW * 1.38;
  if (cardH > maxHeight) {
    cardH = maxHeight;
    cardW = cardH / 1.38;
  }
  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      width: cardW * len + gap * (len - 1),
      height: cardH,
      minHeight: 0,
      minWidth: 0,
      overflow: "hidden"
    }}>
      {cards.map((card, i) => {
        let v = card.value;
        if (v === "A") v = "ace";
        if (v === "K") v = "king";
        if (v === "Q") v = "queen";
        if (v === "J") v = "jack";
        return (
          <img
            key={i}
            src={`/cards/${v}_of_${card.suit}.svg`}
            alt={card.value + card.suit[0].toUpperCase()}
            style={{
              width: cardW,
              height: cardH,
              borderRadius: 5,
              boxShadow: "0 1px 4px #0001",
              background: "#fff",
              marginRight: i === cards.length - 1 ? 0 : gap,
              objectFit: "contain",
              display: "block"
            }}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

// 玩家比牌卡片，完全铺满田字格
function PlayerResultCard({ player, splits, details, scores }) {
  const wrapRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (wrapRef.current) {
      const { width, height } = wrapRef.current.getBoundingClientRect();
      setArea({ w: width, h: height });
    }
  }, []);

  if (!player || !splits || !splits[player]) return null;

  // 留足padding
  const paddingV = Math.max(area.h * 0.08, 22);
  const paddingL = Math.max(area.w * 0.05, 22);
  const paddingR = Math.max(area.w * 0.10, 32);
  const gapV = Math.max(area.h * 0.04, 14);
  // 三道牌最大高度
  const maxRowHeight = (area.h - paddingV * 2 - gapV * 2) / 3;
  // 右侧信息宽度
  const infoBoxW = Math.max(90, area.w * 0.16);
  // 扑克牌区最大宽度
  const maxRowWidth = area.w - paddingL - paddingR - infoBoxW;
  // 牌型说明字体
  const fontSize = Math.max(area.h * 0.07, 18);

  return (
    <div ref={wrapRef} style={{
      width: "98%",
      height: "96%",
      minWidth: 0,
      minHeight: 0,
      background: "#f8faff",
      borderRadius: 18,
      margin: "2.5vw",
      boxSizing: "border-box",
      position: "relative",
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      overflow: "hidden"
    }}>
      {/* 扑克牌显示区 */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        height: "100%",
        padding: `${paddingV}px 0 ${paddingV}px ${paddingL}px`,
        flex: "none",
        minWidth: 0,
        minHeight: 0,
        width: maxRowWidth + 2
      }}>
        {/* 3道横排，平铺不堆叠 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: gapV,
          width: maxRowWidth,
          minHeight: 0
        }}>
          <CardRow cards={splits[player][0]} maxWidth={maxRowWidth * 0.88} maxHeight={maxRowHeight} />
          <span style={{ fontSize, color: "#666", minWidth: 48, marginLeft: 22, whiteSpace: "nowrap" }}>
            {details && details[player] ? details[player]["牌型"][0] : ""}
          </span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: gapV,
          width: maxRowWidth,
          minHeight: 0
        }}>
          <CardRow cards={splits[player][1]} maxWidth={maxRowWidth * 0.88} maxHeight={maxRowHeight} />
          <span style={{ fontSize, color: "#666", minWidth: 48, marginLeft: 22, whiteSpace: "nowrap" }}>
            {details && details[player] ? details[player]["牌型"][1] : ""}
          </span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          width: maxRowWidth,
          minHeight: 0
        }}>
          <CardRow cards={splits[player][2]} maxWidth={maxRowWidth * 0.88} maxHeight={maxRowHeight} />
          <span style={{ fontSize, color: "#666", minWidth: 48, marginLeft: 22, whiteSpace: "nowrap" }}>
            {details && details[player] ? details[player]["牌型"][2] : ""}
          </span>
        </div>
      </div>
      {/* 右上角玩家信息 */}
      <div style={{
        position: "absolute",
        right: paddingR,
        top: paddingV,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        zIndex: 2
      }}>
        <div style={{ fontWeight: 700, color: "#222", fontSize: Math.max(area.h * 0.13, 26), lineHeight: 1.22 }}>{player}</div>
        <div style={{ fontSize: Math.max(area.h * 0.11, 22), color: "#3869f6", fontWeight: 700, marginTop: 3, lineHeight: 1.13 }}>
          {scores && scores[player] !== undefined ? `${scores[player]}分` : ""}
        </div>
        <div style={{ fontSize: Math.max(area.h * 0.085, 18), color: "#e67e22", fontWeight: 500, marginTop: 2, lineHeight: 1.13 }}>
          打枪：{details && details[player] && details[player]["打枪"] ? details[player]["打枪"] : 0}
        </div>
      </div>
    </div>
  );
}

// 田字格
function Grid2x2({ children }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 0,
      alignItems: "stretch",
      justifyItems: "stretch"
    }}>
      {children}
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onRestart }) {
  let gridPlayers = [...players];
  while (gridPlayers.length < 4) gridPlayers.push("");
  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "#fff",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column"
    }}>
      {/* 田字格内容区 */}
      <div style={{
        width: "100vw",
        height: "calc(100vh - 90px)",
        flex: "1 1 auto",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch"
      }}>
        <Grid2x2>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",minWidth:0,minHeight:0}}>
            <PlayerResultCard player={gridPlayers[0]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",minWidth:0,minHeight:0}}>
            <PlayerResultCard player={gridPlayers[1]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",minWidth:0,minHeight:0}}>
            <PlayerResultCard player={gridPlayers[2]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",minWidth:0,minHeight:0}}>
            <PlayerResultCard player={gridPlayers[3]} splits={splits} details={details} scores={scores}/>
          </div>
        </Grid2x2>
      </div>
      <div style={{
        width:"100%",
        display:"flex",
        justifyContent:"flex-end",
        alignItems:"center",
        height:"90px",
        paddingRight:"5vw",
        paddingBottom: "1vw"
      }}>
        <button onClick={onRestart}
          style={{
            background: "#3869f6",
            color: "#fff",
            fontSize: 22,
            border: "none",
            borderRadius: 10,
            padding: "14px 80px",
            fontWeight: 500,
            cursor: "pointer"
          }}>
          继续游戏
        </button>
      </div>
    </div>
  );
}
