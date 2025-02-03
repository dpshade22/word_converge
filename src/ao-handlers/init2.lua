local json = require "json"

local GameStatus = {
    Waiting = "waiting",
    ActiveRound = "active_round",
    PostRound = "post_round",
    Completed = "completed",
    Countdown = "countdown"
}

Lobbies = {}

Handlers.add("Info",
    { Action = "Info" },
    function(msg)
        print("Info request received")
        msg.reply({ Data = json.encode({ status = "Connected", version = "1.0" }) })
    end
)

Handlers.add("GetLobbyState",
    { Action = "GetLobbyState" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        local lobby = Lobbies[tonumber(lobbyID)]
        if lobby then
            -- Include current round submissions in response
            local currentRound = nil
            if #lobby.rounds > 0 then
                currentRound = {
                    roundNumber = lobby.rounds[#lobby.rounds].roundNumber,
                    submissions = lobby.rounds[#lobby.rounds].submissions,
                    team_score = lobby.rounds[#lobby.rounds].team_score
                }
            end
            
            local response = {
                status = "success",
                lobby = {
                    players = lobby.players,
                    status = lobby.status,
                    currentRound = currentRound
                }
            }
            msg.reply({ Data = json.encode(response) })
        else
            msg.reply({ Data = json.encode({ status = "error", error = "Lobby not found" }) })
        end
    end
)

Handlers.add("GetStatus",
    { Action = "GetStatus" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        print("GetStatus request for lobby: " .. lobbyID)
        local status = GetStatus(lobbyID)
        msg.reply({ Data = json.encode({ status = "success", gameStatus = status }) })
    end
)
Handlers.add("SubmitWord",
    { Action = "SubmitWord" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        local playerID = msg.From
        local word = msg.Tags.Word
        print("SubmitWord request - Lobby: " .. lobbyID .. ", Player: " .. playerID .. ", Word: " .. word)
        local success = SubmitWord(lobbyID, playerID, word)
        if success then
            local lobby = Lobbies[tonumber(lobbyID)]
            if lobby and lobby.players[playerID] then
                lobby.players[playerID].ready = false
            end
        end
        msg.reply({ Data = json.encode({ status = success and "success" or "error" }) })
    end
)

Handlers.add("JoinLobby",
    { Action = "JoinLobby" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        local playerID = msg.From
        print("JoinLobby request - Lobby: " .. lobbyID .. ", Player: " .. playerID)
        local success = JoinLobby(lobbyID, playerID)
        msg.reply({ Data = json.encode({ status = success and "success" or "error" }) })
    end
)

Handlers.add("CreateLobby",
    { Action = "CreateLobby" },
    function(msg)
        local playerID = msg.From
        print("CreateLobby request from player: " .. playerID)
        local lobbyID = CreateLobby()
        if lobbyID then
            print("Lobby created: " .. lobbyID)
            JoinLobby(lobbyID, playerID)
            UpdateStatus(lobbyID, GameStatus.Waiting)
            msg.reply({ Data = json.encode({ status = "success", lobbyId = lobbyID }) })
        else
            msg.reply({ Data = json.encode({ status = "error", error = "Failed to create lobby" }) })
        end
    end
)

Handlers.add("GetLastRoundsSubmissions",
    { Action = "GetLastRoundsSubmissions" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        print("GetLastRoundsSubmissions request for lobby: " .. lobbyID)
        local lobby = Lobbies[tonumber(lobbyID)]
        if lobby and #lobby.rounds > 0 then
            local lastRound = lobby.rounds[#lobby.rounds]
            msg.reply({ Data = json.encode({ status = "success", submissions = lastRound.submissions, team_score = lastRound.team_score }) })
        else
            msg.reply({ Data = json.encode({ status = "error", error = "No rounds found" }) })
        end
    end
)

Handlers.add("PlayerReady",
    { Action = "PlayerReady" },
    function(msg)
        local lobbyID = msg.Tags.LobbyID
        local playerID = msg.Tags.PlayerID
        print("PlayerReady request - Lobby: " .. lobbyID .. ", Player: " .. playerID)
        local lobby = Lobbies[tonumber(lobbyID)]
        
        if not lobby or not lobby.players[playerID] then
            print("Invalid lobby or player")
            msg.reply({ Data = json.encode({ status = "error", error = "Invalid lobby or player" }) })
            return
        end

        lobby.players[playerID].ready = true

        local allReady = true
        local playerCount = 0
        local playerIds = {}
        for id, player in pairs(lobby.players) do
            playerCount = playerCount + 1
            table.insert(playerIds, id)
            if not player.ready then
                allReady = false
            end
        end

        print("All players ready: " .. tostring(allReady) .. ", Player count: " .. playerCount)
        if allReady and playerCount >= lobby.config.minPlayers then
            UpdateStatus(lobbyID, GameStatus.ActiveRound)
            -- Create a new round with the current players
            AppendRound(lobbyID, playerIds[1], playerIds[2], os.time() * 1000)
        end
        msg.reply({ Data = json.encode({ status = "success" }) })
    end
)

Handlers.add("ListLobbies",
    { Action = "ListLobbies" },
    function(msg)
        print("ListLobbies request received")
        local lobbyList = {}
        for id, lobby in pairs(Lobbies) do
            local playerCount = 0
            for _ in pairs(lobby.players) do
                playerCount = playerCount + 1
            end
            
            table.insert(lobbyList, {
                id = id,
                playerCount = playerCount,
                maxPlayers = lobby.config.maxPlayers,
                status = lobby.status,
                gameStarted = lobby.status == GameStatus.ActiveRound
            })
        end
        print("Number of lobbies: " .. #lobbyList)
        msg.reply({ Data = json.encode({ status = "success", lobbies = lobbyList }) })
    end
)

function UpdateStatus(lobbyId, newStatus)
    print("Updating status for lobby " .. lobbyId .. " to " .. newStatus)
    if not Lobbies[tonumber(lobbyId)] then
        print("Lobby not found")
        return
    end
    Lobbies[tonumber(lobbyId)].status = newStatus
end

function AppendRound(lobbyId, player1Id, player2Id, timestamp)
    print("Appending round for lobby " .. lobbyId)
    if not Lobbies[tonumber(lobbyId)] then
        print("Lobby not found")
        return
    end
    table.insert(Lobbies[tonumber(lobbyId)].rounds, {
        roundNumber = #Lobbies[tonumber(lobbyId)].rounds + 1,
        startTime = timestamp,
        endTime = timestamp + 15000,
        submissions = {
            [player1Id] = nil,
            [player2Id] = nil,
        },
        team_score = nil
    })
    print("Round appended successfully")
end

function GetCurrentRound(lobbyId)
    print("Getting current round for lobby: " .. lobbyId)
    local lobby = Lobbies[tonumber(lobbyId)]
    return #lobby.rounds
end

function GetStatus(lobbyId)
    print("Getting status for lobby: " .. lobbyId)
    local lobby = Lobbies[tonumber(lobbyId)]
    if lobby then
        print("Status: " .. lobby.status)
        return lobby.status
    else
        print("Lobby not found")
        return nil
    end
end

function SubmitWord(lobbyId, playerId, word)
    print("Submitting word for player " .. playerId .. " in lobby " .. lobbyId)
    local lobby = Lobbies[tonumber(lobbyId)]
    if lobby and lobby.status == GameStatus.ActiveRound then
        local currentRound = lobby.rounds[#lobby.rounds]
        if currentRound then
            currentRound.submissions[playerId] = word
            
            -- Check if all players have submitted
            local submissionCount = 0
            for _, _ in pairs(currentRound.submissions) do
                submissionCount = submissionCount + 1
            end
            
            -- Calculate score when all players have submitted
            if submissionCount >= 2 then
                currentRound.team_score = calculate_team_score(currentRound.submissions)
            end
            
            -- If all players submitted, move to post round
            if submissionCount >= lobby.config.minPlayers then
                UpdateStatus(lobbyId, GameStatus.PostRound)
            end
            
            return true
        end
    end
    return false
end

function CreateLobby()
    print("Creating new lobby")
    local lobbyId = #Lobbies + 1
    Lobbies[lobbyId] = {
        status = GameStatus.Waiting,
        players = {},
        rounds = {},  
        config = {
            minPlayers = 2,
            maxPlayers = 2,
            roundDuration = 15000  
        }
    }
    print("Created lobby with ID: " .. lobbyId)
    return lobbyId
end

function JoinLobby(lobbyId, playerId)
    print("Player " .. playerId .. " attempting to join lobby " .. lobbyId)
    -- Convert lobby ID to number since we're using numeric indexing
    local lobbyIdNum = tonumber(lobbyId)
    if not lobbyIdNum then
        print("Invalid lobby ID")
        return false
    end

    for id, lobby in pairs(Lobbies) do
        if lobby.players[playerId] and id ~= lobbyIdNum then
            print("Player leaving lobby " .. id)
            LeaveLobby(id, playerId)
        end
    end

    local lobby = Lobbies[lobbyIdNum]
    if lobby then
        if #lobby.players >= lobby.config.maxPlayers then
            print("Lobby is full")
            return false
        end
        
        lobby.players[playerId] = {
            name = nil,
            ready = false,
            score = 0
        }
        print("Player joined successfully")
        return true
    end
    print("Failed to join lobby")
    return false
end

function LeaveLobby(lobbyId, playerId)
    print("Player " .. playerId .. " attempting to leave lobby " .. lobbyId)
    -- Convert lobby ID to number since we're using numeric indexing
    local lobbyIdNum = tonumber(lobbyId)
    if not lobbyIdNum then
        print("Invalid lobby ID")
        return false
    end

    local lobby = Lobbies[lobbyIdNum]
    if lobby then
        lobby.players[playerId] = nil
        print("Player left successfully")
        
        local playerCount = 0
        for _ in pairs(lobby.players) do
            playerCount = playerCount + 1
        end
        
        if playerCount == 0 then
            Lobbies[lobbyIdNum] = nil
            print("Lobby deleted as it's empty")
        elseif playerCount < lobby.config.maxPlayers then
            print("Updating lobby status to Countdown")
            UpdateStatus(lobbyId, GameStatus.Countdown)
        end
        
        return true
    else
        print("Lobby not found")
        return false
    end
end

-- Calculate shared team score based on word differences
function calculate_team_score(submissions)
  local starting_score = 60
  local words = {}
  
  -- Collect all words
  for player_id, word in pairs(submissions) do
    print("Player " .. player_id .. " submitted word: " .. word)
    table.insert(words, word)
  end
  
  -- For two players, just calculate difference between their words
  if #words == 2 then
    print("\nCalculating team score:")
    print("Word 1: " .. words[1])
    print("Word 2: " .. words[2])
    
    local difference = calculate_difference(words[1], words[2])
    local final_score = math.max(0, starting_score - difference)
    
    print("Character differences: " .. difference)
    print("Starting score: " .. starting_score)
    print("Points deducted: -" .. difference)
    print("Final team score: " .. final_score)
    print("------------------------")
    
    return final_score
  end
  
  print("Not enough players submitted words yet")
  return starting_score
end

-- Calculate Levenshtein distance between two strings
function calculate_difference(str1, str2)
  local len1, len2 = #str1, #str2
  local matrix = {}
  
  for i = 0, len1 do
    matrix[i] = {}
    matrix[i][0] = i
  end
  
  for j = 0, len2 do
    matrix[0][j] = j
  end
  
  for i = 1, len1 do
    for j = 1, len2 do
      local cost = string.lower(string.sub(str1, i, i)) == string.lower(string.sub(str2, j, j)) and 0 or 1
      matrix[i][j] = math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + cost
      )
    end
  end
  
  -- Print character by character comparison
  print("\nCharacter comparison:")
  local i = 1
  while i <= math.max(len1, len2) do
    local char1 = i <= len1 and string.lower(string.sub(str1, i, i)) or "-"
    local char2 = i <= len2 and string.lower(string.sub(str2, i, i)) or "-"
    local match = char1 == char2 and "" or ""
    print(string.format("Position %d: %s vs %s %s", i, char1, char2, match))
    i = i + 1
  end
  
  return matrix[len1][len2]
end