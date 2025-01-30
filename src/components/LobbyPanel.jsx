import React, { useState, useEffect, useCallback } from 'react';
import { aoService } from '../services/ao';

const POLLING_INTERVAL = 5000; // 5 seconds
const GAME_STATE_POLLING_INTERVAL = 2000; // 2 seconds

const StatusOverlay = ({ message }) => (
  <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white p-6 shadow-lg border-4 border-black">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent"></div>
        <p className="text-lg font-bold">{message}</p>
      </div>
    </div>
  </div>
);

const LobbyPanel = ({ onSelectLobby, onGameStart, onClose, selectedLobbyId, className }) => {
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);

  // Fetch lobbies without affecting UI state if data hasn't changed
  const fetchLobbies = useCallback(async () => {
    try {
      const response = await aoService.listLobbies();

      if (response.status === 'success') {
        // Only update state if lobbies have changed
        setLobbies(prevLobbies => {
          const hasChanged = JSON.stringify(prevLobbies) !== JSON.stringify(response.lobbies);
          return hasChanged ? response.lobbies : prevLobbies;
        });
      }
    } catch (error) {
      console.error('Error fetching lobbies:', error);
      // Don't show transient errors to user during polling
    }
  }, []);

  // Poll for game state when in a lobby
  useEffect(() => {
    if (!selectedLobbyId) return;

    let mounted = true;
    let intervalId = null;

    const pollGameState = async () => {
      if (!mounted || !selectedLobbyId) return;

      try {
        const response = await aoService.getLobbyState(selectedLobbyId);

        if (!mounted) return;

        if (response.status === 'success') {
          const lobby = response.lobby;
          
          if (lobby.gameStarted) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return;
          }
          
          if (lobby.status === 'ready' && lobby.gameStart && !lobby.gameStarted) {
            const gameStartMilliseconds = parseInt(lobby.gameStart);
            const nowMilliseconds = Date.now();
            const remainingMilliseconds = gameStartMilliseconds - nowMilliseconds;

            if (remainingMilliseconds <= 1000 && remainingMilliseconds > -5000) {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              
              // Set gameStarted flag to prevent duplicate starts
              lobby.gameStarted = true;
              
              // Trigger game start on next frame to avoid state conflicts
              if (mounted) {
                onGameStart(gameStartMilliseconds);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    };

    // Initial poll
    pollGameState();
    
    // Set up polling with a slightly longer interval
    intervalId = setInterval(pollGameState, 2000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [selectedLobbyId, onGameStart]);

  // Set up lobby polling
  useEffect(() => {
    fetchLobbies();
    const intervalId = setInterval(fetchLobbies, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchLobbies]);

  const handleCreateLobby = async () => {
    setError(null);
    setStatus('Creating new lobby...');
    try {
      const response = await aoService.createLobby();
      if (response.status !== 'success') {
        throw new Error(response.error || 'Failed to create lobby');
      }

      // Wait for transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the latest lobbies to find the newly created one
      const lobbiesResponse = await aoService.listLobbies();
      if (lobbiesResponse.status === 'success') {
        // Find the most recently created lobby (should be the user's)
        const newLobby = lobbiesResponse.lobbies[lobbiesResponse.lobbies.length - 1];
        if (newLobby) {
          onSelectLobby(newLobby.id);
        }
      }
    } catch (error) {
      console.error('Error creating lobby:', error);
      setError('Failed to create lobby. Please try again.');
    } finally {
      setStatus(null);
    }
  };

  const handleJoinLobby = async (lobbyId) => {
    if (selectedLobbyId === lobbyId) return;

    setError(null);
    setStatus('Joining lobby...');
    try {
      const response = await aoService.joinLobby(lobbyId);
      if (response.status !== 'success') {
        throw new Error(response.error || 'Failed to join lobby');
      }
      onSelectLobby(lobbyId);
    } catch (error) {
      console.error('Error joining lobby:', error);
      setError('Failed to join lobby. Please try again.');
    } finally {
      setStatus(null);
    }
  };

  const handleLeaveLobby = async () => {
    if (!selectedLobbyId) return;

    setError(null);
    setStatus('Leaving lobby...');
    try {
      const response = await aoService.leaveLobby(selectedLobbyId);
      if (response.status !== 'success') {
        throw new Error(response.error || 'Failed to leave lobby');
      }
      onSelectLobby(null);
    } catch (error) {
      console.error('Error leaving lobby:', error);
      setError('Failed to leave lobby. Please try again.');
    } finally {
      setStatus(null);
    }
  };

  // Filter lobbies based on search term
  const filteredLobbies = lobbies.filter(lobby =>
    lobby.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {status && <StatusOverlay message={status} />}

      <div className="p-3 md:p-4 border-b-4 border-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">GAME LOBBIES</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden px-3 py-1 bg-black text-white font-bold"
            >
              CLOSE
            </button>
          )}
        </div>
        {selectedLobbyId && (
          <div className="mb-4 p-3 bg-yellow-200 border-4 border-black">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Current Lobby</h3>
                <p className="text-sm font-mono mt-1">
                  {lobbies.find(l => l.id === selectedLobbyId)?.name || 'Loading...'}
                </p>
              </div>
              <button
                onClick={handleLeaveLobby}
                disabled={!!status}
                className={`px-3 py-1 bg-black text-white font-bold text-sm hover:bg-gray-800 transition-colors ${status ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                LEAVE
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Search lobbies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 text-xs md:text-sm border-4 border-black font-mono"
          />
          <button
            onClick={handleCreateLobby}
            disabled={!!status}
            className={`px-4 py-2 bg-black text-white font-bold text-sm md:text-base hover:bg-gray-800 transition-colors ${status ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            CREATE
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="p-4 mb-4 text-red-600 border-4 border-red-600 bg-red-50">
            {error}
          </div>
        )}

        {filteredLobbies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No matching lobbies found' : 'No lobbies available'}
          </div>
        ) : (
          filteredLobbies.map((lobby) => (
            <div
              key={lobby.id}
              className={`p-3 md:p-4 border-b-4 border-black ${selectedLobbyId === lobby.id
                ? 'bg-yellow-100 cursor-default opacity-50'
                : 'cursor-pointer hover:bg-gray-100'
                } transition-colors`}
              onClick={() => !status && selectedLobbyId !== lobby.id && handleJoinLobby(lobby.id)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-bold">{lobby.name}</h3>
                <span className="text-xs md:text-sm font-bold">
                  {lobby.players.length}/{lobby.maxPlayers}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs md:text-sm font-bold uppercase">
                  Status: {lobby.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LobbyPanel;
