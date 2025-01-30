import { createDataItemSigner, dryrun, message } from "@permaweb/aoconnect";

const PROCESS_ID = "PAFaZyHxTu7T1UUgOunvzG4gXIowsJDhrHIhIfjQf98";

// Create a signer using the window.arweaveWallet
const getSigner = async () => {
  if (!window.arweaveWallet) {
    throw new Error("ArConnect wallet not found");
  }
  return createDataItemSigner(window.arweaveWallet);
};

const parseResult = (result) => {
  console.log("Parsing result:", result);

  // Handle message response format (transaction ID)
  if (typeof result === 'string') {
    console.log("Message sent successfully, transaction ID:", result);
    return { status: "success", txId: result };
  }

  // Handle dryrun response format
  if (!result?.Messages?.[0]?.Data) {
    console.error("No Data in dryrun response");
    throw new Error("Invalid dryrun response from game process");
  }

  try {
    // Parse the Data field which contains our JSON response
    const response = JSON.parse(result.Messages[0].Data);
    console.log("Parsed dryrun response:", response);
    return response;
  } catch (error) {
    console.error("Error parsing dryrun result:", error);
    throw new Error("Invalid dryrun response from game process");
  }
};

export const aoService = {
  async getInfo() {
    try {
      console.log("Sending Info request to process:", PROCESS_ID);
      const result = await dryrun({
        process: PROCESS_ID,
        data: "",
        tags: [{ name: "Action", value: "Info" }],
      });

      console.log("Raw Info result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error getting info:", error);
      throw error;
    }
  },

  async createLobby(name = "") {
    try {
      const signer = await getSigner();
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "CreateLobby" }],
        signer,
        data: name
      });

      console.log("Create lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error creating lobby:", error);
      throw error;
    }
  },

  async joinLobby(lobbyId) {
    try {
      const signer = await getSigner();
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "JoinLobby" }],
        signer,
        data: lobbyId.toString()
      });

      console.log("Join lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error joining lobby:", error);
      throw error;
    }
  },

  async leaveLobby(lobbyId) {
    try {
      const signer = await getSigner();
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "LeaveLobby" }],
        signer,
        data: lobbyId.toString()
      });

      console.log("Leave lobby result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error leaving lobby:", error);
      throw error;
    }
  },

  async submitWord(lobbyId, word) {
    try {
      const signer = await getSigner();
      const result = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "SubmitWord" }],
        signer,
        data: JSON.stringify({ lobbyId, word })
      });

      console.log("Submit word result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error submitting word:", error);
      throw error;
    }
  },

  async listLobbies() {
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        data: "",
        tags: [{ name: "Action", value: "ListLobbies" }],
      });

      console.log("List lobbies result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error listing lobbies:", error);
      throw error;
    }
  },

  async getLobbyState(lobbyId) {
    try {
      const result = await dryrun({
        process: PROCESS_ID,
        data: lobbyId.toString(),
        tags: [{ name: "Action", value: "LobbyState" }],
      });

      console.log("Get lobby state result:", result);
      return parseResult(result);
    } catch (error) {
      console.error("Error getting lobby state:", error);
      throw error;
    }
  },
};
