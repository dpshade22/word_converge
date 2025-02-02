import React, { useState, useEffect } from 'react';
import { aoService } from '../services/ao';

const ErrorFallback = ({ error }) => (
  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700">
    <h3 className="font-bold mb-2">Something went wrong</h3>
    <p className="text-sm">{error.message}</p>
  </div>
);

export const ReadyCheck = ({ players = {}, playerId, onReady, showTitle = true }) => {
  if (!players || !playerId) {
    return <ErrorFallback error={{ message: "Missing required player data" }} />;
  }

  const isReady = players[playerId]?.ready || false;

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Ready Check</h2>
          <p className="text-lg text-gray-600">
            All players must be ready to continue
          </p>
        </div>
      )}

      <div className="w-full">
        <div className="space-y-3">
          {Object.entries(players).map(([id, player]) => (
            <div 
              key={id} 
              className={`flex items-center justify-between p-4 rounded-lg border-2 
                ${id === playerId 
                  ? 'border-black bg-gray-50' 
                  : 'border-gray-200'
                }`}
            >
              <span className="font-medium">
                {id === playerId ? 'You' : (player?.name || id.slice(0, 8))}
              </span>
              <div className={`flex items-center gap-2 ${
                player?.ready ? 'text-green-600' : 'text-gray-400'
              }`}>
                {player?.ready ? (
                  <>
                    <span className="text-sm font-medium">READY</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium">NOT READY</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isReady && (
        <div className="flex justify-center">
          <button
            onClick={onReady}
            className="px-8 py-3 bg-black text-white font-bold rounded-lg
              hover:bg-gray-800 transform transition-all duration-200 active:scale-95"
          >
            Ready Up
          </button>
        </div>
      )}
    </div>
  );
};

const GameView = ({ lobbyId, playerId, round, onAllPlayersReady }) => {
  const [players, setPlayers] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lobbyId || !playerId) {
      setError(new Error("Missing required lobby or player ID"));
      setLoading(false);
      return;
    }

    const checkLobbyState = async () => {
      try {
        const response = await aoService.getLobbyState(lobbyId);
        if (response?.status === 'success' && response.lobby?.players) {
          const playerEntries = Object.entries(response.lobby.players);
          setPlayers(response.lobby.players || {});
          
          // Update local ready state based on server state
          const currentPlayer = response.lobby.players[playerId];
          if (currentPlayer) {
            setIsReady(currentPlayer.ready || false);
          }

          // Check if all players are ready and we have at least 2 players
          if (playerEntries.length >= 2 && playerEntries.every(([_, p]) => p.ready)) {
            onAllPlayersReady();
          }
        } else {
          console.warn('Unexpected lobby state:', response);
          setPlayers({});
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking lobby state:', error);
        setError(error);
        setLoading(false);
      }
    };

    const intervalId = setInterval(checkLobbyState, 2000);
    checkLobbyState(); // Initial check

    return () => clearInterval(intervalId);
  }, [lobbyId, playerId, onAllPlayersReady]);

  const handleReadyClick = async () => {
    try {
      const result = await aoService.playerReady(lobbyId, playerId);
      if (result.status === 'success') {
        setIsReady(true);
      } else {
        setError(new Error(result.error || 'Failed to ready up'));
      }
    } catch (error) {
      console.error('Error setting ready status:', error);
      setError(error);
    }
  };

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">Loading game state...</p>
      </div>
    );
  }

  return (
    <ReadyCheck
      players={players}
      playerId={playerId}
      onReady={handleReadyClick}
      showTitle={true}
    />
  );
};

export default GameView;
