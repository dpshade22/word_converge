import React, { useState, useEffect } from 'react';
import { ao } from '../services/ao';

const GameView = ({ lobbyId, playerId }) => {
  const [gameStatus, setGameStatus] = useState('waiting');
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!lobbyId) return;

    const checkGameStatus = async () => {
      const response = await ao.sendAction("GetStatus", { 
        Tags: { LobbyID: lobbyId }
      });
      const { Status } = JSON.parse(response.Data);
      setGameStatus(Status);

      const lobbyResponse = await ao.sendAction("GetLobbyState", {
        Tags: { LobbyID: lobbyId }
      });
      const lobby = JSON.parse(lobbyResponse.Data);
      setPlayers(Object.entries(lobby.players));
    };

    const intervalId = setInterval(checkGameStatus, 2000);
    checkGameStatus(); // Initial check

    return () => clearInterval(intervalId);
  }, [lobbyId]);

  const handleReadyClick = async () => {
    await ao.sendAction("PlayerReady", {
      Tags: {
        LobbyID: lobbyId,
        PlayerID: playerId
      }
    });
    setIsReady(true);
  };

  const renderContent = () => {
    switch (gameStatus) {
      case 'waiting':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl">Waiting for players...</h2>
            <button
              onClick={handleReadyClick}
              disabled={isReady}
              className={`px-4 py-2 rounded ${
                isReady 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isReady ? 'Ready!' : 'Ready Up'}
            </button>
            <div className="mt-4">
              <h3 className="font-bold mb-2">Players:</h3>
              <ul>
                {players.map(([id, player]) => (
                  <li key={id} className="flex items-center gap-2">
                    {player.name || id.slice(0, 8)}
                    {player.ready && <span className="text-green-500">✓</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 'active_round':
        return (
          <div className="text-2xl font-bold">
            Game in progress...
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {renderContent()}
    </div>
  );
};

export default GameView;
