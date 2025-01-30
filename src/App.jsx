import React, { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import LobbyPanel from './components/LobbyPanel';
import { aoService } from './services/ao';
import { useWallet } from './contexts/WalletContext';

function App() {
  const { walletAddress, isConnected } = useWallet();
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, COUNTDOWN, ACTIVE, SCORING
  const [gameStart, setGameStart] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [wordHistory, setWordHistory] = useState([]);
  const [showLobbyPanel, setShowLobbyPanel] = useState(true);

  // Reset game state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setSelectedLobbyId(null);
      setGameState('IDLE');
      setShowLobbyPanel(true);
    }
  }, [isConnected]);

  // Handle game start countdown
  useEffect(() => {
    if (gameState !== 'COUNTDOWN' || !gameStart) return;

    const intervalId = setInterval(() => {
      const nowMilliseconds = Date.now();
      const remainingMilliseconds = gameStart - nowMilliseconds;

      if (remainingMilliseconds <= 0) {
        clearInterval(intervalId);
        setGameState('ACTIVE');
        setTimeLeft(20); // 20 seconds for first round
      } else {
        setTimeLeft(Math.ceil(remainingMilliseconds / 1000)); // Convert to seconds for display
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState, gameStart]);

  // Handle active game timer
  useEffect(() => {
    if (gameState !== 'ACTIVE' || !timeLeft) return;

    const intervalId = setInterval(() => {
      setTimeLeft(time => {
        if (time <= 1) {
          clearInterval(intervalId);
          setGameState('SCORING');
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState, timeLeft]);

  const handleGameStart = (startTimeMilliseconds) => {
    const nowMilliseconds = Date.now();
    const remainingMilliseconds = startTimeMilliseconds - nowMilliseconds;
    
    // Update game start time first
    setGameStart(startTimeMilliseconds);

    // Determine initial game state and time
    if (remainingMilliseconds <= 0) {
      setGameState('ACTIVE');
      setTimeLeft(20); // 20 seconds for first round
    } else {
      setGameState('COUNTDOWN');
      setTimeLeft(Math.ceil(remainingMilliseconds / 1000));
    }

    // Reset game state variables
    setRound(1);
    setScore(0);
    setWordHistory([]);
    setCurrentWord('');
  };

  const handleSubmitWord = async () => {
    if (!currentWord.trim() || gameState !== 'ACTIVE') return;

    try {
      const response = await aoService.submitWord(selectedLobbyId, currentWord.trim());
      if (response.status === 'success') {
        setWordHistory(prev => [...prev, currentWord.trim()]);
        setCurrentWord('');
        setGameState('SCORING');
      }
    } catch (error) {
      console.error('Error submitting word:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-8">SYNONYMS</h1>
          <WalletConnect
            isConnected={false}
            walletAddress={null}
          />
        </div>
      </div>
    );
  }

  if (!selectedLobbyId) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-4 border-black p-3 md:p-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-4xl font-bold">SYNONYMS</h1>
            <WalletConnect
              isConnected={isConnected}
              walletAddress={walletAddress}
            />
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4">
          <LobbyPanel
            selectedLobbyId={selectedLobbyId}
            onSelectLobby={setSelectedLobbyId}
            onGameStart={handleGameStart}
            className="border-4 border-black"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-4 border-black p-3 md:p-5">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-4xl font-bold">SYNONYMS</h1>
          <WalletConnect
            isConnected={isConnected}
            walletAddress={walletAddress}
          />
        </div>
        
        {gameState !== 'IDLE' && (
          <div className={`grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-5 border-t-4 border-black ${
            gameState === 'COUNTDOWN' ? 'animate-pulse' : ''
          }`}>
            <p className="text-lg md:text-xl font-bold m-0">
              {gameState === 'COUNTDOWN' ? 'STARTING IN' : 'STATE'}: {gameState === 'COUNTDOWN' ? `${timeLeft}s` : gameState}
            </p>
            <p className="text-lg md:text-xl font-bold m-0">ROUND: {round}/6</p>
            <p className="text-lg md:text-xl font-bold m-0">
              {gameState === 'ACTIVE' ? `TIME: ${timeLeft}s` : 'WAITING...'}
            </p>
            <p className="text-lg md:text-xl font-bold m-0">SCORE: {score}</p>
          </div>
        )}
      </header>

      <main className="flex flex-col md:flex-row h-[calc(100vh-200px)]">
        <div className={`md:w-96 border-r-4 border-black ${
          showLobbyPanel ? 'block' : 'hidden md:block'
        }`}>
          <LobbyPanel
            selectedLobbyId={selectedLobbyId}
            onSelectLobby={setSelectedLobbyId}
            onGameStart={handleGameStart}
            onClose={() => setShowLobbyPanel(false)}
            className="h-full"
          />
        </div>

        <div className="flex-1 p-3 md:p-5">
          {gameState === 'ACTIVE' ? (
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentWord}
                  onChange={(e) => setCurrentWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitWord()}
                  placeholder="Type your word..."
                  className="flex-1 p-2 text-lg border-4 border-black font-mono"
                  autoFocus
                />
                <button
                  onClick={handleSubmitWord}
                  className="px-4 py-2 bg-black text-white font-bold hover:bg-gray-800 transition-colors"
                >
                  SUBMIT
                </button>
              </div>
              
              {wordHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold mb-2">Your Words:</h3>
                  <div className="flex flex-wrap gap-2">
                    {wordHistory.map((word, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 border-2 border-black font-mono"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : gameState === 'COUNTDOWN' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-4">
                  Game Starting in {timeLeft}s
                </h2>
                <p className="text-lg md:text-xl">Get ready to play!</p>
              </div>
            </div>
          ) : gameState === 'SCORING' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-4">
                  Calculating Scores...
                </h2>
                <p className="text-lg md:text-xl">Wait for other players</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-4">
                  Waiting for Game to Start
                </h2>
                <p className="text-lg md:text-xl">
                  The game will begin automatically when ready
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
