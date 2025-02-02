import React, { createContext, useContext, useState, useCallback } from 'react';
import { aoService } from '../services/ao';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.arweaveWallet) {
        throw new Error('ArConnect not found. Please install it first.');
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
      await disconnectWallet();
    }
  }, []);

  const handleConnection = async (address) => {
    let attempts = 0;
    const maxRetries = 3;
    const retryDelay = 1000;

    while (attempts < maxRetries) {
      try {
        const info = await aoService.getInfo();
        
        if (!info) {
          throw new Error('Failed to connect to game process');
        }

        console.log("Game info:", info);

        if (info.status === 'Connected') {
          setWalletAddress(address);
          setIsConnected(true);
          setIsLoading(false);
          return;
        }
        
        throw new Error('Invalid game connection response');
      } catch (error) {
        attempts++;
        
        if (attempts === maxRetries) {
          console.error('Error connecting to game:', error);
          setError('Connection to game failed after multiple attempts. Please try again.');
          await disconnectWallet();
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    setIsLoading(false);
  };

  const disconnectWallet = useCallback(async () => {
    try {
      if (window.arweaveWallet) {
        await window.arweaveWallet.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    } finally {
      setWalletAddress(null);
      setIsConnected(false);
      setError(null);
    }
  }, []);

  // Check for existing connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!window.arweaveWallet) {
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
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected,
        isLoading,
        error,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
