import { createDataItemSigner, message, dryrun } from "@permaweb/aoconnect";

const PROCESS_ID = import.meta.env.VITE_PROCESS_ID;
if (!PROCESS_ID) {
  console.error("VITE_PROCESS_ID not found in environment variables");
  throw new Error("Process ID not configured. Please check your .env file.");
}

console.log("Using Process ID:", PROCESS_ID);

const parseResult = (result) => {

  if (!result) {
    throw new Error("No response from game process");
  }

  // Handle message response (transaction ID)
  if (typeof result === 'string') {
    return { status: 'success', transactionId: result };
  }

  // Handle dryrun/message response
  try {
    if (result.Messages?.[0]?.Data) {
      const data = JSON.parse(result.Messages[0].Data);
      return data;
    }

    if (result.Output) {
      const data = JSON.parse(result.Output);
      return data;
    }

    if (result.Data) {
      const data = JSON.parse(result.Data);
      return data;
    }

    throw new Error("No valid data in response");
  } catch (error) {
    console.error('Error parsing result:', error);
    throw new Error(`Failed to parse response: ${error.message}`);
  }
};

export const aoService = {
  // Read-only operations using dryrun
  async getInfo() {
    try {
      console.log("Sending Info request to process:", PROCESS_ID);
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "Info" }],
        data: ""
      });
      console.log("Info result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error getting info:", error);
      return { status: 'error', error: error.message };
    }
  },

  async listLobbies() {
    try {
      console.log("Requesting list-lobbies");
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "ListLobbies" }],
        data: ""
      });
      console.log("List lobbies result:", result);
      return parseResult(result);
    } catch (error) {
      console.error('Error listing lobbies:', error);
      return { status: 'error', error: error.message };
    }
  },

  async getLobbyState(lobbyId) {
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "LobbyState" }],
        data: lobbyId.toString()
      });

      return parseResult(result);
    } catch (error) {
      console.error('Error getting lobby state:', error);
      return { status: 'error', error: error.message };
    }
  },

  // Write operations using message
  async createLobby() {
    try {
      console.log("Requesting create-lobby");
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "CreateLobby" }],
        data: "",
        signer: createDataItemSigner(window.arweaveWallet)
      });
      console.log("Create lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error('Error creating lobby:', error);
      return { status: 'error', error: error.message };
    }
  },

  async joinLobby(lobbyId) {
    try {
      console.log("Requesting join-lobby for ID:", lobbyId);
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "JoinLobby" }],
        data: lobbyId.toString(),
        signer: createDataItemSigner(window.arweaveWallet)
      });
      console.log("Join lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error('Error joining lobby:', error);
      return { status: 'error', error: error.message };
    }
  },

  async leaveLobby(lobbyId) {
    try {
      console.log("Requesting leave-lobby for ID:", lobbyId);
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "LeaveLobby" }],
        data: lobbyId.toString(),
        signer: createDataItemSigner(window.arweaveWallet)
      });
      console.log("Leave lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error('Error leaving lobby:', error);
      return { status: 'error', error: error.message };
    }
  },

  async submitWord(lobbyId, word) {
    try {
      console.log("Requesting submit-word for lobby:", lobbyId, "word:", word);
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "SubmitWord" }],
        data: JSON.stringify({ lobbyId, word }),
        signer: createDataItemSigner(window.arweaveWallet)
      });
      console.log("Submit word result:", result);
      return parseResult(result);
    } catch (error) {
      console.error('Error submitting word:', error);
      return { status: 'error', error: error.message };
    }
  }
};
