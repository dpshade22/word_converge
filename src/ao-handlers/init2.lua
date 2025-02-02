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
        print("GetLobbyState request for lobby: " .. lobbyID)
        local lobby = Lobbies[tonumber(lobbyID)]
        msg.reply({ Data = json.encode({ status = "success", lobby = lobby }) })
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
            msg.reply({ Data = json.encode({ status = "success", submissions = lastRound.submissions }) })
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
        for _, player in pairs(lobby.players) do
            playerCount = playerCount + 1
            if not player.ready then
                allReady = false
            end
        end

        print("All players ready: " .. tostring(allReady) .. ", Player count: " .. playerCount)
        if allReady and playerCount >= lobby.config.minPlayers then
            UpdateStatus(lobbyID, GameStatus.ActiveRound)
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
        }
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
        if not currentRound.submissions[playerId] then
            currentRound.submissions[playerId] = word
            print("Word submitted successfully")
            
            if #currentRound.submissions == 2 then
                print("All words submitted, updating status to PostRound")
                UpdateStatus(lobbyId, GameStatus.PostRound)
            end
            
            return true
        end
    end
    print("Failed to submit word")
    return false
end

function CreateLobby()
    print("Creating new lobby")
    local lobbyID = #Lobbies + 1
    Lobbies[lobbyID] = {
        id = lobbyID,
        players = {},
        rounds = {},
        status = GameStatus.Waiting,
        config = {
            maxPlayers = 2,
            minPlayers = 2,
            roundDuration = 60000
        }
    }
    print("Lobby created with ID: " .. lobbyID)
    return lobbyID
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