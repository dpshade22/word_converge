import React, { useState, useEffect } from 'react';

const GameView = ({ gameStartTimestamp }) => {
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (!gameStartTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      const timeRemaining = gameStartTimestamp - now;
      setRemainingTime(Math.max(0, timeRemaining));
    };

    // Initial update
    updateTimer();

    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [gameStartTimestamp]);

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return "Game Starting...";
    const seconds = Math.ceil(milliseconds / 1000);
    return `Starting in ${seconds}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="text-2xl font-bold mb-4">
        {formatTime(remainingTime)}
      </div>
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-black transition-all duration-1000"
          style={{ 
            width: `${Math.max(0, Math.min(100, (remainingTime / 5000) * 100))}%`
          }}
        />
      </div>
    </div>
  );
};

export default GameView;
