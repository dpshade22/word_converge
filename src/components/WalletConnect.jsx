import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

const WalletConnect = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    walletAddress,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet
  } = useWallet();

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
            {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Connect Wallet
          </span>
        )}
      </button>

      {/* Connection Modal */}
      {isModalOpen && !isConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <p className="mb-4">
              Connect your ArConnect wallet to start playing Synonyms.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect ArConnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletConnect;
