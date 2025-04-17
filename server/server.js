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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game rooms storage
const rooms = new Map();

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
        text: `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.`
      });
      
      socket.join(roomId);
      socket.emit("waitingForOpponent", { roomId });
      console.log(`New room created: ${roomId}, waiting for opponent`);
    } else {
      // Join existing room
      foundRoom.players.push(socket.id);
      foundRoom.isActive = true;
      socket.join(roomId);
      
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
  
  // Handle cursor position updates
  socket.on("cursorUpdate", (data) => {
    const { roomId, position, wordIndex } = data;
    if (rooms.has(roomId)) {
      // Broadcast the cursor position to the opponent
      socket.to(roomId).emit("opponentCursor", {
        position,
        wordIndex
      });
    }
  });
  
  // Handle WPM updates
  socket.on("wpmUpdate", (data) => {
    const { roomId, wpm } = data;
    if (rooms.has(roomId)) {
      // Broadcast the WPM to the opponent
      socket.to(roomId).emit("opponentWPM", {
        wpm
      });
    }
  });
  
  // Handle when a player finishes typing
  socket.on("raceFinished", (data) => {
    const { roomId, stats } = data;
    if (rooms.has(roomId)) {
      // Notify the opponent that this player has finished
      socket.to(roomId).emit("opponentFinished", {
        stats
      });
      
      // Close the room
      closeRoom(roomId);
    }
  });
  
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    
    if (roomId && rooms.has(roomId)) {
      // Notify other player about the disconnect
      socket.to(roomId).emit("opponentDisconnected");
      
      // Close the room
      closeRoom(roomId);
    }
  });
});

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

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePic: profile.photos[0].value,
          });
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173");
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Error logging out");
    res.redirect("http://localhost:5173/login");
  });
});

// Listen with the HTTP server instead of the Express app
httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
