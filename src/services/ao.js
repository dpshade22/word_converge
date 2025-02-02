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
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [
          { name: "Action", value: "GetLobbyState" },
          { name: "LobbyID", value: lobbyId.toString() }
        ],
        data: ""
      });
      return safeJsonParse(result.Messages[0].Data);
    } catch (error) {
      console.error('Error getting lobby state:', error);
      return { status: 'error', error: error.message };
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

  async submitWord(lobbyId, word) {
    return handleMessage('SubmitWord', [
      { name: "LobbyID", value: lobbyId.toString() },
      { name: "Word", value: word }
    ], 'Submit word');
  }
};
