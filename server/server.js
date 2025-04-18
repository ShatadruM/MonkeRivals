import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "./models/userModel.js";
import { createServer } from "http";
import { Server } from "socket.io";
import "./auth.js";
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game rooms storage
const rooms = new Map();
// Friends game rooms
const friendGames = new Map();

// Helper functions for race mode
const RACE_TEXT = [
  `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.`,
  `She sells seashells by the seashore. The shells she sells are surely seashells. So if she sells shells on the seashore, I'm sure she sells seashore shells.`,
  `How much wood would a woodchuck chuck if a woodchuck could chuck wood? He would chuck, he would, as much as he could, and chuck as much wood as a woodchuck would if a woodchuck could chuck wood.`,
  `Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where's the peck of pickled peppers Peter Piper picked?`,
  `Betty bought a bit of better butter but the butter Betty bought was bitter so Betty bought a better butter to make the bitter butter better.`
];

function getRandomRaceText() {
  return RACE_TEXT[Math.floor(Math.random() * RACE_TEXT.length)];
}

// Generate a random 6-character game code
function generateGameCode() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle match request
  socket.on("requestMatch", () => {
    // Find available room or create a new one
    let foundRoom = null;
    let roomId = null;
    
    // Look for an available room with only one player
    for (const [id, room] of rooms.entries()) {
      if (room.players.length === 1 && !room.isActive) {
        foundRoom = room;
        roomId = id;
        break;
      }
    }
    
    // If no available room, create a new one
    if (!foundRoom) {
      roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      rooms.set(roomId, {
        players: [socket.id],
        isActive: false,
        readyPlayers: [],
        raceStarted: false,
        raceEnded: false,
        raceStartTime: null,
        raceDuration: 60, // 60 seconds race
        playerProgress: {},
        playerWPM: {},
        finishedPlayers: [],
        text: getRandomRaceText()
      });
      
      socket.join(roomId);
      socket.emit("waitingForOpponent", { roomId });
      console.log(`New room created: ${roomId}, waiting for opponent`);
    } else {
      // Join existing room
      foundRoom.players.push(socket.id);
      foundRoom.isActive = true;
      foundRoom.playerProgress[socket.id] = 0;
      foundRoom.playerWPM[socket.id] = 0;
      socket.join(roomId);
      
      // Initialize progress for first player too
      foundRoom.playerProgress[foundRoom.players[0]] = 0;
      foundRoom.playerWPM[foundRoom.players[0]] = 0;
      
      // Notify both players that the match is starting
      io.to(roomId).emit("matchStart", {
        roomId,
        text: foundRoom.text,
        players: foundRoom.players
      });
      console.log(`Match started in room: ${roomId}`);
    }
    
    // Store the room id on the socket for reference
    socket.data.roomId = roomId;
  });
  
  // Handle player ready status
  socket.on("playerReady", (data) => {
    const { roomId } = data;
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Add player to ready list if not already there
      if (!room.readyPlayers.includes(socket.id)) {
        room.readyPlayers.push(socket.id);
        console.log(`Player ${socket.id} ready in room ${roomId}. Ready count: ${room.readyPlayers.length}/${room.players.length}`);
      }
      
      // If all players are ready, notify them and schedule race start
      if (room.readyPlayers.length === room.players.length) {
        console.log(`All players ready in room ${roomId}, starting countdown!`);
        io.to(roomId).emit("allPlayersReady");
        
        // After countdown (3 seconds), officially start the race
        setTimeout(() => {
          if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.raceStarted = true;
            room.raceStartTime = Date.now();
            
            // Set a timer for race end
            setTimeout(() => {
              if (rooms.has(roomId) && !room.raceEnded) {
                endRace(roomId);
              }
            }, room.raceDuration * 1000); // Convert seconds to milliseconds
            
            io.to(roomId).emit("raceStart", {
              startTime: room.raceStartTime,
              duration: room.raceDuration
            });
            console.log(`Race started in room ${roomId}`);
          }
        }, 3000); // 3 second countdown
      }
    }
  });
  
  // Handle progress updates
  socket.on("progressUpdate", (data) => {
    const { roomId, progress } = data;
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Update player's progress
      room.playerProgress[socket.id] = progress;
      
      // Broadcast the progress to all players in the room
      io.to(roomId).emit("progressUpdates", {
        playerProgress: room.playerProgress
      });
      
      // Check if player has completed the race
      if (progress >= 100 && !room.finishedPlayers.includes(socket.id)) {
        room.finishedPlayers.push(socket.id);
        
        // If this is the first player to finish
        if (room.finishedPlayers.length === 1) {
          // Broadcast player finished event
          io.to(roomId).emit("playerFinished", { 
            playerId: socket.id,
            position: 1, 
            wpm: room.playerWPM[socket.id]
          });
          
          // If all players have finished, end the race
          if (room.finishedPlayers.length === room.players.length) {
            endRace(roomId);
          }
        }
        // If this is the second player to finish
        else if (room.finishedPlayers.length > 1) {
          // Broadcast player finished event
          io.to(roomId).emit("playerFinished", { 
            playerId: socket.id,
            position: room.finishedPlayers.length,
            wpm: room.playerWPM[socket.id]
          });
          
          // All players have finished, end the race
          endRace(roomId);
        }
      }
    }
  });
  
  // Handle WPM updates
  socket.on("wpmUpdate", (data) => {
    const { roomId, wpm } = data;
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Update player's WPM
      room.playerWPM[socket.id] = wpm;
      
      // Get the opponent's ID from the room
      const opponentId = room.players.find(id => id !== socket.id);
      
      // Broadcast the WPM specifically to the opponent with clear identification
      if (opponentId) {
        io.to(opponentId).emit("opponentWPM", {
          playerId: socket.id,
          wpm,
          playerWPM: room.playerWPM
        });
      }
      
      // Also broadcast to all players (for consistency)
      io.to(roomId).emit("wpmUpdates", {
        playerWPM: room.playerWPM
      });
    }
  });
  
  // Handle when a player finishes typing
  socket.on("raceFinished", (data) => {
    const { roomId, stats } = data;
    if (rooms.has(roomId)) {
      // Add player to finished list if not already there
      const room = rooms.get(roomId);
      if (!room.finishedPlayers.includes(socket.id)) {
        room.finishedPlayers.push(socket.id);
        room.playerWPM[socket.id] = stats.wpm;
        
        // Store the accuracy on the socket for later use
        socket.data.accuracy = stats.accuracy;
        
        // Get the opponent's ID
        const opponentId = room.players.find(id => id !== socket.id);
        
        // Send the final WPM directly to the opponent
        if (opponentId) {
          io.to(opponentId).emit("opponentWPM", {
            playerId: socket.id,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            finished: true,
            playerWPM: room.playerWPM
          });
        }
        
        // Notify all players that this player has finished
        io.to(roomId).emit("playerFinished", {
          playerId: socket.id,
          position: room.finishedPlayers.length,
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          isFinal: true
        });
        
        // If all players have finished, end the race
        if (room.finishedPlayers.length === room.players.length) {
          endRace(roomId);
        }
      }
    }
  });
  
  // Handle create game request for friends mode
  socket.on("createGame", (data) => {
    const { name } = data;
    
    // Generate a unique game code
    let gameCode;
    do {
      gameCode = generateGameCode();
    } while (friendGames.has(gameCode));
    
    // Create a new game room
    friendGames.set(gameCode, {
      players: [{ id: socket.id, name, isHost: true }],
      isActive: false,
      text: `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.`
    });
    
    // Join the socket to the room
    socket.join(`friend_${gameCode}`);
    
    // Store the game code on the socket for reference
    socket.data.friendGameCode = gameCode;
    
    // Notify the client that the game was created
    socket.emit("gameCreated", { gameCode });
    console.log(`New friends game created: ${gameCode}, host: ${name}`);
  });
  
  // Handle join game request for friends mode
  socket.on("joinGame", (data) => {
    const { gameCode, name } = data;
    
    // Check if the game exists
    if (!friendGames.has(gameCode)) {
      socket.emit("joinError", { message: "Game not found" });
      return;
    }
    
    const game = friendGames.get(gameCode);
    
    // Check if the game is already active
    if (game.isActive) {
      socket.emit("joinError", { message: "Game already started" });
      return;
    }
    
    // Add the player to the game
    game.players.push({ id: socket.id, name, isHost: false });
    
    // Join the socket to the room
    socket.join(`friend_${gameCode}`);
    
    // Store the game code on the socket for reference
    socket.data.friendGameCode = gameCode;
    
    // Notify all clients in the room about the new player
    io.to(`friend_${gameCode}`).emit("playerJoined", { 
      players: game.players 
    });
    
    console.log(`Player ${name} joined friends game: ${gameCode}`);
  });
  
  // Handle start game request for friends mode
  socket.on("startGame", (data) => {
    const { gameCode } = data;
    
    // Check if the game exists
    if (!friendGames.has(gameCode)) {
      return;
    }
    
    const game = friendGames.get(gameCode);
    
    // Check if the requester is the host
    const player = game.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      return;
    }
    
    // Mark the game as active
    game.isActive = true;
    
    // Notify all clients in the room that the game is starting
    io.to(`friend_${gameCode}`).emit("gameStart", {
      text: game.text
    });
    
    console.log(`Friends game started: ${gameCode}`);
  });
  
  // Handle leave game request for friends mode
  socket.on("leaveGame", (data) => {
    const { gameCode } = data;
    
    // Check if the game exists
    if (!friendGames.has(gameCode)) {
      return;
    }
    
    const game = friendGames.get(gameCode);
    
    // Remove the player from the game
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const wasHost = game.players[playerIndex].isHost;
      game.players.splice(playerIndex, 1);
      
      // If the game is now empty, delete it
      if (game.players.length === 0) {
        friendGames.delete(gameCode);
        console.log(`Friends game ${gameCode} deleted (no players left)`);
      } 
      // If the host left, assign a new host
      else if (wasHost && game.players.length > 0) {
        game.players[0].isHost = true;
        
        // Notify the remaining players about the host change
        io.to(`friend_${gameCode}`).emit("playerJoined", { 
          players: game.players 
        });
      } 
      // Otherwise just update the player list
      else {
        io.to(`friend_${gameCode}`).emit("playerJoined", { 
          players: game.players 
        });
      }
    }
    
    // Leave the room
    socket.leave(`friend_${gameCode}`);
    delete socket.data.friendGameCode;
  });
  
  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    const friendGameCode = socket.data.friendGameCode;
    
    // Handle normal race room disconnection
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Remove player from ready list
      const readyIndex = room.readyPlayers.indexOf(socket.id);
      if (readyIndex !== -1) {
        room.readyPlayers.splice(readyIndex, 1);
      }
      
      // Remove player from room
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
      }
      
      // Notify other player about the disconnect
      socket.to(roomId).emit("opponentDisconnected");
      
      // If the room is now empty, delete it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} is now empty, removing it`);
      }
      // If the race hasn't started yet and someone left, reset the room
      else if (!room.raceStarted) {
        room.isActive = false;
        room.readyPlayers = [];
        console.log(`Race in room ${roomId} canceled due to player disconnect`);
      }
      // If the race has started and someone left, end it
      else if (room.raceStarted && !room.raceEnded) {
        endRace(roomId);
      }
    }
    
    // Handle friends game disconnection
    if (friendGameCode && friendGames.has(friendGameCode)) {
      const game = friendGames.get(friendGameCode);
      
      // Remove the player from the game
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const wasHost = game.players[playerIndex].isHost;
        game.players.splice(playerIndex, 1);
        
        // If the game is now empty, delete it
        if (game.players.length === 0) {
          friendGames.delete(friendGameCode);
          console.log(`Friends game ${friendGameCode} deleted (no players left)`);
        } 
        // If the host left, assign a new host
        else if (wasHost && game.players.length > 0) {
          game.players[0].isHost = true;
          
          // Notify the remaining players about the host change
          io.to(`friend_${friendGameCode}`).emit("playerJoined", { 
            players: game.players 
          });
        } 
        // Otherwise just update the player list
        else {
          io.to(`friend_${friendGameCode}`).emit("playerJoined", { 
            players: game.players 
          });
        }
      }
    }
  });
});

// Function to end a race and determine the winner
function endRace(roomId) {
  if (!rooms.has(roomId)) return;
  
  const room = rooms.get(roomId);
  if (room.raceEnded) return; // Prevent double-ending
  
  room.raceEnded = true;
  
  // Calculate race results
  const results = {
    players: [],
    winner: null,
    endTime: Date.now()
  };
  
  // Store player accuracies if they were provided during race finish
  const playerAccuracies = {};
  
  // For each player, calculate final results
  room.players.forEach(playerId => {
    const wpm = room.playerWPM[playerId] || 0;
    const progress = room.playerProgress[playerId] || 0;
    const finished = room.finishedPlayers.includes(playerId);
    
    // Get socket to check for additional data
    const playerSocket = io.sockets.sockets.get(playerId);
    const accuracy = playerSocket?.data.accuracy || Math.round(Math.random() * 20) + 80; // Default to a random accuracy if not provided
    
    results.players.push({
      id: playerId,
      wpm,
      progress,
      finished,
      accuracy
    });
    
    // Update the winner if this player has highest WPM
    if (!results.winner || wpm > results.players.find(p => p.id === results.winner).wpm) {
      results.winner = playerId;
    }
  });
  
  // Broadcast race ended event with results
  io.to(roomId).emit("raceEnded", results);
  console.log(`Race ended in room ${roomId}, winner: ${results.winner}`);
  
  // Schedule room cleanup
  setTimeout(() => {
    if (rooms.has(roomId)) {
      closeRoom(roomId);
    }
  }, 5000); // Clean up after 5 seconds
}

// Helper function to close a room
function closeRoom(roomId) {
  if (rooms.has(roomId)) {
    console.log(`Closing room: ${roomId}`);
    const room = rooms.get(roomId);
    
    // Notify all players in the room that it's closing
    io.to(roomId).emit("roomClosed");
    
    // Remove players from the room
    room.players.forEach(playerId => {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.leave(roomId);
        delete playerSocket.data.roomId;
      }
    });
    
    // Delete the room
    rooms.delete(roomId);
  }
}

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const sessionConfig = {
  secret: "secret",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
};

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Is Authenticated:', req.isAuthenticated());
  console.log('Current User:', req.user);
  next();
});

app.get(
    "/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      console.log("Google callback - authenticated user:", req.user);
      if(!req.user) {
        return res.redirect("/");
      }
      
      const user = await User.findById(req.user._id);
      console.log("Found user:", user);
      
    
                                
      res.redirect(
        "http://localhost:5173/TypingTest"
      );
    } catch (err) {
      console.error("Error in Google callback:", err);
      res.redirect("http://localhost:5173");
    }
  }
);


// Add this to your existing backend code
app.get("/api/user/profile", (req, res) => {
  if (req.isAuthenticated()) {
    const { _id, name, email, profilePic } = req.user;
    
    // Create a response object with essential profile information
    const profileData = {
      id: _id,
      name: name,
      email: email,
      profileImage: profilePic || null
    };
    
    res.json(profileData);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.get("/logout", (req, res) => {
    req.logout(function(err) {
      if (err) { 
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.redirect("http://localhost:5173");
    });
});

app.post("/update-score", async (req, res) => {
  const { userId, result } = req.body;

  if (!userId || !["win", "lose"].includes(result)) {
    return res.status(400).json({ message: "Invalid input." });
  }

  try {
    const scoreChange = result === "win" ? 30 : -30;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.score = (user.score || 0) + scoreChange;
    await user.save();

    res.status(200).json({ message: "Score updated.", newScore: user.score });
  } catch (err) {
    console.error("Score update error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

app.get("/api/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    const { _id, name, email, profilePic, preferences } = req.user;
    res.json({ _id, name, email, profilePic, preferences });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});


mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB connection error:", err));


httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});