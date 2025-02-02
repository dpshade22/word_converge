import { createDataItemSigner, message, dryrun, result } from "@permaweb/aoconnect";

const PROCESS_ID = import.meta.env.VITE_PROCESS_ID;
if (!PROCESS_ID) {
  console.error("VITE_PROCESS_ID not found in environment variables");
  throw new Error("Process ID not configured. Please check your .env file.");
}

console.log("Using Process ID:", PROCESS_ID);

const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

const handleMessage = async (action, tags = [], logPrefix = '') => {
  try {
    console.log(`${logPrefix} request:`, tags);
    const msgResult = await message({
      process: PROCESS_ID,
      tags: [{ name: "Action", value: action }, ...tags],
      data: "",
      signer: createDataItemSigner(window.arweaveWallet)
    });
    console.log(`${logPrefix} result:`, msgResult);
    
    const processResult = await result({
      message: msgResult,
      process: PROCESS_ID
    });
    
    if (!processResult) {
      throw new Error("No response from process");
    }

    return safeJsonParse(processResult.Messages[0].Data);
  } catch (error) {
    console.error(`Error in ${action}:`, error);
    return { status: 'error', error: error.message };
  }
};

export const aoService = {
  handleMessage,
  // Read-only operations using dryrun
  async getInfo() {
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "Info" }],
        data: ""
      });
      return safeJsonParse(result.Messages[0].Data);
    } catch (error) {
      console.error('Error getting info:', error);
      return { status: 'error', error: error.message };
    }
  },

  async listLobbies() {
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "ListLobbies" }],
        data: ""
      });
      return safeJsonParse(result.Messages[0].Data);
    } catch (error) {
      console.error('Error listing lobbies:', error);
      return { status: 'error', error: error.message };
    }
  },

  async getLobbyState(lobbyId) {
    if (!lobbyId) {
      return { status: 'error', error: 'Lobby ID is required' };
    }

    try {
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [
          { name: "Action", value: "GetLobbyState" },
          { name: "LobbyID", value: String(lobbyId) }
        ],
        data: ""
      });

      if (!result?.Messages?.[0]?.Data) {
        return { 
          status: 'error', 
          error: 'Invalid response from server',
          lobby: { players: {} } 
        };
      }

      const data = JSON.parse(result.Messages[0].Data);
      
      // Ensure lobby and players exist
      if (!data.lobby) {
        data.lobby = { players: {} };
      }
      if (!data.lobby.players) {
        data.lobby.players = {};
      }

      return {
        status: 'success',
        lobby: data.lobby
      };
    } catch (error) {
      console.error('Error in getLobbyState:', error);
      return { 
        status: 'error', 
        error: error.message,
        lobby: { players: {} } 
      };
    }
  },

  async playerReady(lobbyId, playerId) {
    if (!lobbyId || !playerId) {
      return { status: 'error', error: 'Lobby ID and Player ID are required' };
    }

    try {
      // Send ready status
      const readyResult = await handleMessage("PlayerReady", [
        { name: "LobbyID", value: String(lobbyId) },
        { name: "PlayerID", value: String(playerId) }
      ], 'Player Ready');

      if (!readyResult?.status || readyResult.status === 'error') {
        throw new Error(readyResult?.error || 'Failed to set ready status');
      }

      // Get updated lobby state
      const lobbyState = await this.getLobbyState(lobbyId);
      if (lobbyState.status === 'error') {
        throw new Error(lobbyState.error);
      }

      // Check if player is actually ready in the updated state
      const players = lobbyState.lobby?.players || {};
      const playerState = players[playerId];
      
      if (!playerState?.ready) {
        throw new Error('Ready status not confirmed by server');
      }

      return {
        status: 'success',
        lobby: lobbyState.lobby,
        isReady: true
      };
    } catch (error) {
      console.error('Error in playerReady:', error);
      return { 
        status: 'error', 
        error: error.message,
        isReady: false 
      };
    }
  },

  async createLobby() {
    const response = await handleMessage('CreateLobby', [], 'Create lobby');
    if (response.status === 'success') {
      return { 
        status: 'success', 
        lobbyId: response.lobbyId,
        joined: true 
      };
    }
    return response;
  },

  async joinLobby(lobbyId) {
    return handleMessage('JoinLobby', [
      { name: "LobbyID", value: lobbyId.toString() }
    ], 'Join lobby');
  },

  async leaveLobby(lobbyId) {
    return handleMessage('LeaveLobby', [
      { name: "LobbyID", value: lobbyId.toString() }
    ], 'Leave lobby');
  },

  async submitWord(lobbyId, playerId, word) {
    try {
      const result = await handleMessage("SubmitWord", [
        { name: "LobbyID", value: String(lobbyId) },
        { name: "PlayerID", value: String(playerId) },
        { name: "Word", value: word }
      ], 'Submit Word');

      if (!result?.status || result.status === 'error') {
        throw new Error(result?.error || 'Failed to submit word');
      }

      return result;
    } catch (error) {
      console.error('Error in submitWord:', error);
      return { status: 'error', error: error.message };
    }
  },
};
