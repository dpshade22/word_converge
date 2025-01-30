-- Initialize game state
local json = require("json")

GameState = {
  lobbies = {},
  players = {},
  games = {}
}

-- Helper function to remove a player from all lobbies
local function removePlayerFromLobbies(sender)
  local lobbies_to_remove = {}

  -- First find all lobbies the player is in
  for lobby_id, lobby in pairs(GameState.lobbies) do
    for i, player in ipairs(lobby.players) do
      if player == sender then
        table.remove(lobby.players, i)
        -- If lobby is empty, mark it for removal
        if #lobby.players == 0 then
          table.insert(lobbies_to_remove, lobby_id)
        end
        break
      end
    end
  end

  -- Remove any empty lobbies
  for _, lobby_id in ipairs(lobbies_to_remove) do
    GameState.lobbies[lobby_id] = nil
  end
end

-- Helper function to initialize game state
local function initializeGameState(lobby)
  return {
    round = 1,
    scores = {},
    words = {},
    roundStart = nil,
    status = "COUNTDOWN"
  }
end

-- Info handler
Handlers.add("info",
  { Action = "Info" },
  function(msg)
    print("Info request received")
    msg.reply({
      Data = json.encode({
        status = "success",
        version = "1.0.0",
        name = "Synonyms Game",
        activeLobbies = #GameState.lobbies
      })
    })
  end
)

-- Create lobby handler
Handlers.add("create-lobby",
  { Action = "CreateLobby" },
  function(msg)
    local sender = msg.From

    print("Create lobby request received from", sender)

    -- First remove player from any existing lobbies
    removePlayerFromLobbies(sender)

    -- Create new lobby
    local lobby = {
      id = #GameState.lobbies + 1,
      name = msg.Data or string.format("Game %d", #GameState.lobbies + 1),
      players = { sender },
      gameState = nil,
      status = "waiting",
      maxPlayers = 2,
      owner = sender,
      gameStart = nil
    }

    table.insert(GameState.lobbies, lobby)

    msg.reply({
      Data = json.encode({
        status = "success",
        lobby = lobby
      })
    })
  end
)

-- Join lobby handler
Handlers.add("join-lobby",
  { Action = "JoinLobby" },
  function(msg)
    print("Join lobby request received")

    local sender = msg.From
    local lobbyId = tonumber(msg.Data)

    if not lobbyId then
      print("Error: No lobby ID provided")
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "No lobby ID provided"
        })
      })
      return
    end
    print("Attempting to join lobby: " .. lobbyId)

    -- Remove player from any existing lobbies first
    removePlayerFromLobbies(sender)

    local lobby = GameState.lobbies[lobbyId]
    if not lobby then
      print("Error: Lobby " .. lobbyId .. " not found")
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Lobby not found"
        })
      })
      return
    end

    -- Check if player is already in this lobby
    for _, player in ipairs(lobby.players) do
      if player == sender then
        print("Player " .. sender .. " already in lobby " .. lobbyId)
        msg.reply({
          Data = json.encode({
            status = "success",
            lobby = lobby
          })
        })
        return
      end
    end

    -- Check if lobby is full
    if #lobby.players >= lobby.maxPlayers then
      print("Error: Lobby " .. lobbyId .. " is full")
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Lobby is full"
        })
      })
      return
    end

    -- Add player to lobby
    print("Adding player " .. sender .. " to lobby " .. lobbyId)
    table.insert(lobby.players, sender)

    -- If lobby is full, start the game countdown
    if #lobby.players == lobby.maxPlayers then
      print("Lobby " .. lobbyId .. " reached capacity")
      print("Current player count: " .. #lobby.players .. "/" .. lobby.maxPlayers)
      lobby.status = "ready"
      lobby.gameStart = os.time() + 10
      lobby.gameState = initializeGameState(lobby)

      -- Debug player list
      print("Players in lobby:")
      for _, player in ipairs(lobby.players) do
        print("- " .. player)
      end

      print("Game starting at: " .. lobby.gameStart)
    end

    msg.reply({
      Data = json.encode({
        status = "success",
        lobby = lobby
      })
    })
  end
)

-- Leave lobby handler
Handlers.add("leave-lobby",
  { Action = "LeaveLobby" },
  function(msg)
    local sender = msg.From
    local lobbyId = tonumber(msg.Data)

    if not GameState.lobbies[lobbyId] then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Lobby not found"
        })
      })
      return
    end

    local lobby = GameState.lobbies[lobbyId]
    local player_found = false

    -- Remove player from lobby
    for i, player in ipairs(lobby.players) do
      if player == sender then
        table.remove(lobby.players, i)
        player_found = true
        break
      end
    end

    if not player_found then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Player not in lobby"
        })
      })
      return
    end

    -- If lobby is empty, remove it
    if #lobby.players == 0 then
      GameState.lobbies[lobbyId] = nil
    else
      lobby.status = "waiting"
      -- Reset game state if game was in progress
      lobby.gameStart = nil
      lobby.gameState = nil
    end

    msg.reply({
      Data = json.encode({
        status = "success"
      })
    })
  end
)

-- Submit word handler
Handlers.add("submit-word",
  { Action = "SubmitWord" },
  function(msg)
    local data = json.decode(msg.Data)
    local lobbyId = data.lobbyId
    local word = data.word
    local lobby = GameState.lobbies[lobbyId]

    if not lobby then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Lobby not found"
        })
      })
      return
    end

    -- Check if player is in lobby
    local isInLobby = false
    for _, player in ipairs(lobby.players) do
      if player == msg.From then
        isInLobby = true
        break
      end
    end

    if not isInLobby then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Not in lobby"
        })
      })
      return
    end

    -- Store the word submission
    if not lobby.submissions then
      lobby.submissions = {}
    end

    table.insert(lobby.submissions, {
      player = msg.From,
      word = word,
      timestamp = os.time()
    })

    msg.reply({
      Data = json.encode({
        status = "success",
        submission = lobby.submissions[#lobby.submissions]
      })
    })
  end
)

-- List lobbies handler
Handlers.add("list-lobbies",
  { Action = "ListLobbies" },
  function(msg)
    msg.reply({
      Data = json.encode({
        status = "success",
        lobbies = GameState.lobbies
      })
    })
  end
)

-- Get lobby state handler
Handlers.add("lobby-state",
  { Action = "LobbyState" },
  function(msg)
    local lobbyId = tonumber(msg.Data)
    if not lobbyId then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Invalid lobby ID"
        })
      })
      return
    end

    local lobby = GameState.lobbies[lobbyId]
    if not lobby then
      msg.reply({
        Data = json.encode({
          status = "error",
          error = "Lobby not found"
        })
      })
      return
    end

    msg.reply({
      Data = json.encode({
        status = "success",
        lobby = lobby
      })
    })
  end
)
