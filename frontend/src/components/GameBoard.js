import React from 'react';
import Pile from './Pile';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const GameBoard = ({
  topPile,
  middlePile,
  bottomPile,
  onDrop,
  gameStatus
}) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="game-board">
        <Pile
          title="头道"
          cards={topPile}
          pileType="top"
          onDrop={onDrop}
          gameStatus={gameStatus}
        />
        <Pile
          title="中道"
          cards={middlePile}
          pileType="middle"
          onDrop={onDrop}
          gameStatus={gameStatus}
        />
        <Pile
          title="尾道"
          cards={bottomPile}
          pileType="bottom"
          onDrop={onDrop}
          gameStatus={gameStatus}
        />
      </div>
    </DndProvider>
  );
};

export default GameBoard;
