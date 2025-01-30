import React, { useState, useEffect } from 'react';
import { aoService } from '../services/ao';

const WalletConnect = ({ onConnect, onDisconnect, isConnected, walletAddress }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!window.arweaveWallet) {
          console.log('ArConnect not found');
          return;
        }

        const activeAddress = await window.arweaveWallet.getActiveAddress();
        if (activeAddress) {
          await handleConnection(activeAddress);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();
  }, [onConnect]);

  const handleConnection = async (address) => {
    setIsLoading(true);
    setError(null);
    try {
      // Check game info when connecting
      const info = await aoService.getInfo();
      console.log('Game Info:', info);

      if (!info) {
        throw new Error('Failed to connect to game process');
      }

      // Verify we got a valid response
      if (info.name !== 'Synonyms Game' || info.version !== '1.0.0') {
        throw new Error('Invalid game version or name');
      }

      onConnect(address);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error connecting to game:', error);
      setError(error.message || 'Failed to connect to game. Please try again.');
      onDisconnect(); // Disconnect wallet if game connection fails
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.arweaveWallet) {
        setError('ArConnect not found. Please install it first.');
        return;
      }

      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'SIGN_TRANSACTION',
        'DISPATCH'
      ]);

      const address = await window.arweaveWallet.getActiveAddress();
      await handleConnection(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.arweaveWallet) {
        await window.arweaveWallet.disconnect();
      }
      onDisconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <>
      {/* Wallet Button */}
      <button
        onClick={() => isConnected ? disconnectWallet() : setIsModalOpen(true)}
        className="px-4 py-2 text-sm font-bold transition-colors border-4 border-black hover:bg-gray-100"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Connecting...
          </span>
        ) : isConnected ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>

      {/* Connection Modal */}
      {isModalOpen && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white border-4 border-black">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Connect Wallet</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-2xl font-bold hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="p-4 text-red-600 border-4 border-red-600 bg-red-50">
                  {error}
                </div>
              )}

              <button
                onClick={connectWallet}
                disabled={isLoading}
                className={`w-full p-4 text-center font-bold transition-colors ${isLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
                  }`}
              >
                {isLoading ? 'Connecting...' : 'ArConnect'}
              </button>

              <p className="text-sm text-center text-gray-600">
                Don't have ArConnect?{' '}
                <a
                  href="https://arconnect.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black underline hover:text-gray-800"
                >
                  Get it here
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletConnect;
