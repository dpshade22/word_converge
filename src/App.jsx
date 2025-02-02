import React, { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import LobbyPanel from './components/LobbyPanel';
import GameView, { ReadyCheck } from './components/GameView';
import { aoService } from './services/ao';
import { useWallet } from './contexts/WalletContext';

function App() {
  const { walletAddress, isConnected } = useWallet();
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, WAITING_FOR_PLAYERS, READY_UP, COUNTDOWN, ACTIVE, SCORING, POST_ROUND
  const [round, setRound] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [wordHistory, setWordHistory] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [players, setPlayers] = useState({});
  const [currentRound, setCurrentRound] = useState(null);

  // Reset game state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setGameState('IDLE');
      setSelectedLobbyId(null);
      setCurrentWord('');
      setWordHistory([]);
      setRound(1);
    }
  }, [isConnected]);

  // Poll for lobby state updates
  useEffect(() => {
    if (!selectedLobbyId || gameState === 'IDLE') return;

    const checkLobbyState = async () => {
      try {
        const response = await aoService.getLobbyState(selectedLobbyId);
        if (response?.status === 'success' && response.lobby) {
          const playerCount = Object.keys(response.lobby.players || {}).length;
          setPlayers(response.lobby.players || {});
          
          // Update game state based on player count and status
          if (gameState === 'WAITING_FOR_PLAYERS' && playerCount >= 2) {
            setGameState('READY_UP');
          }
          
          // Check submissions in active round
          if (gameState === 'ACTIVE' && response.lobby.currentRound) {
            const submissions = response.lobby.currentRound.submissions || {};
            const submissionCount = Object.keys(submissions).length;
            
            if (submissionCount >= 2) {
              setGameState('POST_ROUND');
            }
          }
          
          // Store current round info
          if (response.lobby.currentRound) {
            setCurrentRound(response.lobby.currentRound);
          }

          // Check if all players ready after post round
          if (gameState === 'POST_ROUND') {
            const allReady = Object.values(response.lobby.players).every(p => p.ready);
            if (allReady && playerCount >= 2) {
              setGameState('COUNTDOWN');
              setCurrentWord('');
            }
          }
        }
      } catch (error) {
        console.error('Error checking lobby state:', error);
      }
    };

    const intervalId = setInterval(checkLobbyState, 2000);
    checkLobbyState(); // Initial check

    return () => clearInterval(intervalId);
  }, [selectedLobbyId, gameState]);

  // Handle countdown
  useEffect(() => {
    if (gameState !== 'COUNTDOWN') return;
    
    setCountdown(5);
    const intervalId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setGameState('ACTIVE');
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState]);

  const handleSubmitWord = async () => {
    if (!currentWord.trim() || !walletAddress || !selectedLobbyId) return;

    try {
      const result = await aoService.submitWord(selectedLobbyId, walletAddress, currentWord.trim());
      if (result.status === 'success') {
        setWordHistory(prev => [...prev, currentWord.trim()]);
        setCurrentWord('');
      } else {
        console.error('Failed to submit word:', result.error);
      }
    } catch (error) {
      console.error('Error submitting word:', error);
    }
  };

  const handleCreateLobby = async () => {
    try {
      const result = await aoService.createLobby();
      if (result?.status === 'success') {
        setSelectedLobbyId(result.lobbyId);
        setGameState('WAITING_FOR_PLAYERS');
      }
    } catch (error) {
      console.error('Error creating lobby:', error);
    }
  };

  const handleJoinLobby = async (lobbyId) => {
    try {
      const result = await aoService.joinLobby(lobbyId, walletAddress);
      if (result?.status === 'success') {
        setSelectedLobbyId(lobbyId);
        setGameState('READY_UP');
      }
    } catch (error) {
      console.error('Error joining lobby:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Word Converge</h1>
            <div className="flex items-center gap-4">
              {selectedLobbyId && (
                <div className="text-sm font-medium text-gray-500">
                  Lobby ID: {selectedLobbyId}
                </div>
              )}
              <div className="text-sm font-medium text-gray-500">
                {walletAddress ? `Connected: ${walletAddress.slice(0, 8)}...` : 'Not Connected'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {gameState === 'IDLE' ? (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Welcome to Word Converge!</h2>
            {isConnected ? (
              <div className="space-y-4">
                <button
                  onClick={handleCreateLobby}
                  className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800"
                >
                  Create New Game
                </button>
                <div className="text-lg">or</div>
                <div className="flex justify-center gap-4">
                  <input
                    type="text"
                    placeholder="Enter Lobby ID"
                    className="px-4 py-2 border-2 border-black rounded-lg"
                    onChange={(e) => setSelectedLobbyId(e.target.value)}
                  />
                  <button
                    onClick={() => handleJoinLobby(selectedLobbyId)}
                    className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800"
                  >
                    Join Game
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg text-gray-600">Please connect your wallet to play</p>
            )}
          </div>
        ) : gameState === 'POST_ROUND' && currentRound ? (
          <div className="max-w-lg mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Round {currentRound.roundNumber} Results</h2>
              <p className="text-lg text-gray-600">Let's see what words were chosen!</p>
            </div>

            <div className="space-y-6">
              {Object.entries(players).map(([playerId, player]) => (
                <div 
                  key={playerId}
                  className={`p-4 rounded-lg border-2 ${
                    playerId === walletAddress 
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">
                        {playerId === walletAddress ? 'You' : (player.name || playerId.slice(0, 8))}
                      </h3>
                      <p className="text-xl font-bold mt-1">
                        {currentRound.submissions[playerId]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <ReadyCheck
              lobbyId={selectedLobbyId}
              playerId={walletAddress}
              round={round}
              onAllPlayersReady={() => setGameState('COUNTDOWN')}
            />
          </div>
        ) : gameState === 'COUNTDOWN' ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center space-y-4">
              <h2 className="text-6xl font-bold">{countdown}</h2>
              <p className="text-xl">Get ready to play!</p>
            </div>
          </div>
        ) : gameState === 'ACTIVE' ? (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Round {currentRound?.roundNumber || 1}</h2>
              <p className="text-lg text-gray-600">Enter a word that you think your opponent will also choose!</p>
            </div>

            <div className="space-y-4">
              {currentRound?.submissions?.[walletAddress] ? (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-medium text-gray-600">
                    Waiting for other player to submit their word...
                  </p>
                  <p className="text-gray-500 mt-2">
                    You submitted: <span className="font-medium">{currentRound.submissions[walletAddress]}</span>
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={currentWord}
                    onChange={(e) => setCurrentWord(e.target.value)}
                    placeholder="Enter your word"
                    className="flex-1 px-4 py-2 border-2 border-black rounded-lg"
                  />
                  <button
                    onClick={handleSubmitWord}
                    disabled={!currentWord.trim()}
                    className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              )}

              <div className="text-sm text-gray-500 text-center">
                {Object.entries(currentRound?.submissions || {}).map(([playerId, word]) => (
                  playerId !== walletAddress && (
                    <p key={playerId}>
                      {players[playerId]?.name || playerId.slice(0, 8)} has submitted their word
                    </p>
                  )
                ))}
              </div>
            </div>
          </div>
        ) : gameState === 'WAITING_FOR_PLAYERS' ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold">Waiting for Players...</h2>
            <p className="text-lg text-gray-600 mt-2">Share your lobby ID with a friend!</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg inline-block">
              <code className="text-xl font-mono">{selectedLobbyId}</code>
            </div>
          </div>
        ) : gameState === 'READY_UP' ? (
          <GameView
            lobbyId={selectedLobbyId}
            playerId={walletAddress}
            round={round}
            onAllPlayersReady={() => setGameState('COUNTDOWN')}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
