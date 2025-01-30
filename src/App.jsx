import React, { useState, useEffect } from 'react';
import LobbyPanel from './components/LobbyPanel';
import WalletConnect from './components/WalletConnect';

function App() {
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [showLobby, setShowLobby] = useState(false);
  const [gameState, setGameState] = useState('WAITING');
  const [round, setRound] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [wordHistory, setWordHistory] = useState([]);
  const [opponentWords, setOpponentWords] = useState([
    'happy', 'joyful', 'content', 'pleased', 'delighted', 'ecstatic'
  ]);
  const [walletAddress, setWalletAddress] = useState(null);

  // Reset game state when leaving lobby
  useEffect(() => {
    if (!selectedLobby) {
      setGameState('WAITING');
      setRound(1);
      setScore(0);
      setCurrentWord('');
      setWordHistory([]);
    }
  }, [selectedLobby]);

  const handleWalletConnect = (address) => {
    setWalletAddress(address);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress(null);
    setSelectedLobby(null);
  };

  const handleSubmitWord = () => {
    if (currentWord.trim()) {
      const newHistory = [...wordHistory, currentWord];
      setWordHistory(newHistory);
      
      if (round <= opponentWords.length) {
        const opponentWord = opponentWords[round - 1];
        const roundScore = calculateScore(currentWord, opponentWord);
        setScore(prev => prev + roundScore);
      }
      
      setCurrentWord('');
      setGameState('SCORING');
    }
  };

  const calculateScore = (word1, word2) => {
    if (!word1 || !word2) return 0;
    
    const maxLength = Math.max(word1.length, word2.length);
    const diffLetters = Array.from({ length: maxLength })
      .filter((_, i) => word1[i] !== word2[i])
      .length;
    
    return Math.max(0, 100 - (diffLetters * 20));
  };

  const handleNextState = () => {
    if (!selectedLobby) return; // Prevent game progression without lobby

    switch (gameState) {
      case 'WAITING':
        setGameState('COUNTDOWN');
        setTimeLeft(10);
        break;
      case 'COUNTDOWN':
        setGameState('ACTIVE');
        setTimeLeft(20);
        break;
      case 'ACTIVE':
        handleSubmitWord();
        break;
      case 'SCORING':
        if (round < 6) {
          setRound(prev => prev + 1);
          setGameState('COUNTDOWN');
          setTimeLeft(10);
        } else {
          setGameState('COMPLETE');
        }
        break;
      case 'COMPLETE':
        setGameState('WAITING');
        setRound(1);
        setScore(0);
        setCurrentWord('');
        setWordHistory([]);
        break;
      default:
        break;
    }
  };

  const GameView = () => (
    <div className="flex-1 p-3 md:p-5 overflow-auto">
      <header className="border-4 border-black p-3 md:p-5 mb-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
          <h1 className="text-3xl md:text-4xl font-bold">SYNONYM GAME</h1>
          <div className="flex items-center gap-2">
            <div className="text-lg md:text-xl font-bold">
              LOBBY: {selectedLobby?.name}
            </div>
            <button
              onClick={() => setShowLobby(!showLobby)}
              className="md:hidden px-3 py-1 bg-black text-white font-bold text-sm"
            >
              {showLobby ? 'HIDE LOBBY' : 'SHOW LOBBY'}
            </button>
            <WalletConnect
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
              isConnected={!!walletAddress}
              walletAddress={walletAddress}
            />
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-5 border-t-4 border-black ${gameState === 'COUNTDOWN' ? 'animate-countdown-pulse' : ''}`}>
          <p className="text-lg md:text-xl font-bold m-0">STATE: {gameState}</p>
          <p className="text-lg md:text-xl font-bold m-0">ROUND: {round}/6</p>
          <p className="text-lg md:text-xl font-bold m-0">TIME: {timeLeft}s</p>
          <p className="text-lg md:text-xl font-bold m-0">SCORE: {score}</p>
        </div>
      </header>

      <main className="border-4 border-black p-3 md:p-5">
        <div className={`border-4 border-black p-3 md:p-5 mb-5 ${gameState === 'WAITING' ? 'opacity-50' : ''}`}>
          <input
            type="text"
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value)}
            disabled={gameState !== 'ACTIVE' || !selectedLobby}
            placeholder={selectedLobby ? "Enter your word..." : "Join a lobby to play..."}
            className="w-full p-3 md:p-4 text-xl md:text-2xl border-4 border-black font-mono uppercase disabled:bg-gray-200"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && gameState === 'ACTIVE') {
                handleSubmitWord();
              }
            }}
          />
        </div>

        {round > 1 && (
          <div className="border-4 border-black p-3 md:p-5 my-5">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-5">WORD HISTORY</h2>
            <div className="space-y-3 md:space-y-5">
              {wordHistory.map((word, index) => (
                <div key={index} className="border-4 border-black p-3 md:p-4">
                  <p className="text-lg md:text-xl font-bold mb-2">ROUND {index + 1}</p>
                  <div className="pt-2 border-t-2 border-black">
                    <p className="text-base md:text-lg font-bold my-1">YOU: {word}</p>
                    <p className="text-base md:text-lg font-bold my-1">OPPONENT: {opponentWords[index]}</p>
                    <p className="text-base md:text-lg font-bold my-1">SCORE: +{calculateScore(word, opponentWords[index])}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleNextState}
          disabled={!selectedLobby}
          className={`w-full p-4 md:p-5 text-xl md:text-2xl font-bold font-mono transition-colors
            ${selectedLobby 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
        >
          {!selectedLobby ? 'JOIN A LOBBY TO PLAY' :
           gameState === 'WAITING' ? 'START GAME' :
           gameState === 'COUNTDOWN' ? 'START ROUND' :
           gameState === 'ACTIVE' ? 'SUBMIT WORD' :
           gameState === 'SCORING' ? 'NEXT ROUND' :
           'PLAY AGAIN'}
        </button>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {!walletAddress ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="p-3 md:p-5">
            <div className="border-4 border-black p-6 md:p-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-6">SYNONYM GAME</h1>
              <p className="text-lg md:text-xl mb-6">Connect your wallet to play</p>
              <WalletConnect
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
                isConnected={!!walletAddress}
                walletAddress={walletAddress}
              />
            </div>
          </div>
        </div>
      ) : !selectedLobby ? (
        <div className="max-w-3xl mx-auto p-3 md:p-5">
          <div className="flex justify-end mb-4">
            <WalletConnect
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
              isConnected={!!walletAddress}
              walletAddress={walletAddress}
            />
          </div>
          <LobbyPanel
            selectedLobby={selectedLobby}
            onSelectLobby={setSelectedLobby}
            className="border-4 border-black"
          />
        </div>
      ) : (
        <div className="flex flex-col md:flex-row h-screen relative">
          <div className={`${
            showLobby
              ? 'absolute md:relative left-0 top-0 w-full md:w-80 h-full z-10 bg-white'
              : 'hidden md:block w-80'
          }`}>
            <LobbyPanel
              selectedLobby={selectedLobby}
              onSelectLobby={setSelectedLobby}
              onClose={() => setShowLobby(false)}
              className="h-full border-r-4 border-black"
            />
          </div>
          <GameView />
        </div>
      )}
    </div>
  );
}

export default App;
