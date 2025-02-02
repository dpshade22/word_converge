import React, { useState, useEffect, useCallback } from 'react';
import { aoService } from '../services/ao';
import { ErrorBoundary } from 'react-error-boundary';

const POLLING_INTERVAL = 5000; // 5 seconds
const GAME_STATE_POLLING_INTERVAL = 2000; // 2 seconds

const StatusOverlay = ({ message }) => (
  <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white p-6 shadow-lg border-4 border-black">
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg font-bold">{message}</p>
        <svg
          className="animate-spin h-8 w-8 text-black"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  </div>
);

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
    <h3 className="text-lg font-bold text-red-700 mb-2">Error:</h3>
    <pre className="text-sm text-red-600 whitespace-pre-wrap">{error.message}</pre>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Try Again
    </button>
  </div>
);

const LobbyContent = ({ onSelectLobby, onGameStart, onClose, selectedLobbyId, className }) => {
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
      setError('Failed to fetch lobbies. Please try again.');
    }
  }, []);

  // Set up lobby polling
  useEffect(() => {
    fetchLobbies();
    const intervalId = setInterval(fetchLobbies, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchLobbies]);

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

        if (response.status === 'success' && response.lobby) {
          const lobby = response.lobby;
          
          // Check for ready state
          if (lobby.status === 'ready') {
            // Game is ready to start
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            onGameStart();
          }
        }
      } catch (error) {
        console.error('Error polling game state:', error);
        setError('Failed to poll game state. Please try again.');
      }
    };

    // Initial poll
    pollGameState();
    
    // Set up polling with a slightly longer interval
    intervalId = setInterval(pollGameState, GAME_STATE_POLLING_INTERVAL);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedLobbyId, onGameStart]);

  const handleCreateLobby = async () => {
    setError(null);
    setStatus('Creating new lobby...');
    try {
      const response = await aoService.createLobby();
      if (response.status !== 'success') {
        throw new Error(response.error || 'Failed to create lobby');
      }

      // Since the creator is automatically joined in the backend,
      // just update the selected lobby ID
      onSelectLobby(response.lobbyId);
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
      if (response.status === 'error') {
        throw new Error(response.error || 'Failed to join lobby');
      }
      
      // Successfully joined, update selected lobby
      onSelectLobby(lobbyId);
    } catch (error) {
      console.error('Error joining lobby:', error);
      setError(error.message || 'Failed to join lobby. Please try again.');
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

  // Filter lobbies based on ID and status
  const filteredLobbies = lobbies.filter(lobby => {
    const searchTermLower = searchTerm.toLowerCase();
    return lobby.id.toString().includes(searchTermLower) || 
           (lobby.status?.toLowerCase() || '').includes(searchTermLower);
  });

  return (
    <div className={`bg-white p-4 rounded-lg shadow-lg border-4 border-black ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Game Lobbies</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        {selectedLobbyId && (
          <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-500">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">Current Lobby</h3>
                <p className="text-sm">#{selectedLobbyId}</p>
              </div>
              <button
                onClick={handleLeaveLobby}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        )}

        <input
          type="text"
          placeholder="Search lobbies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border-2 border-black rounded"
        />

        {!selectedLobbyId && (
          <div className="flex gap-2">
            <button
              onClick={handleCreateLobby}
              className="flex-1 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
            >
              Create New Lobby
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-500 p-4 rounded-lg mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredLobbies.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No lobbies found</p>
        ) : (
          filteredLobbies.map(lobby => (
            <div
              key={lobby.id}
              className={`p-4 rounded-lg border-2 ${
                selectedLobbyId === lobby.id
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Lobby #{lobby.id}</h3>
                  <p className="text-sm text-gray-600">
                    Players: {lobby.playerCount}/{lobby.maxPlayers} · Status: {lobby.status}
                  </p>
                </div>
                {!selectedLobbyId && lobby.playerCount < lobby.maxPlayers && lobby.status === 'waiting' && (
                  <button
                    onClick={() => handleJoinLobby(lobby.id)}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {status && <StatusOverlay message={status} />}
    </div>
  );
};

const LobbyPanel = ({ onSelectLobby, onGameStart, onClose, selectedLobbyId, className }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LobbyContent
        onSelectLobby={onSelectLobby}
        onGameStart={onGameStart}
        onClose={onClose}
        selectedLobbyId={selectedLobbyId}
        className={className}
      />
    </ErrorBoundary>
  );
};

export default LobbyPanel;
