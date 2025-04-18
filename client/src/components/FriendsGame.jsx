import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const FriendsGame = () => {
  const [gameMode, setGameMode] = useState('choose'); // 'choose', 'create', 'join', 'waiting', 'playing'
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const joinCodeInputRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io('http://localhost:3000');
    setSocket(socketInstance);

    return () => {
      if (socketInstance) socketInstance.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // When a game is created
    socket.on('gameCreated', (data) => {
      setGameCode(data.gameCode);
      setPlayers([{ id: socket.id, name, isHost: true }]);
      setGameMode('waiting');
    });

    // When a player joins
    socket.on('playerJoined', (data) => {
      setPlayers(data.players);
    });

    // When failed to join a game
    socket.on('joinError', (data) => {
      setError(data.message);
    });

    // When the game starts
    socket.on('gameStart', (data) => {
      setGameMode('playing');
      navigate('/typing-test', { 
        state: { 
          gameCode, 
          players,
          isPrivateGame: true,
          text: data.text
        }
      });
    });

    return () => {
      socket.off('gameCreated');
      socket.off('playerJoined');
      socket.off('joinError');
      socket.off('gameStart');
    };
  }, [socket, gameCode, players, name, navigate]);

  // Create a new game
  const createGame = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (socket) {
      socket.emit('createGame', { name });
      setError('');
    }
  };

  // Join an existing game
  const joinGame = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }
    
    if (socket) {
      socket.emit('joinGame', { gameCode, name });
      setError('');
    }
  };

  // Start the game (only host can do this)
  const startGame = () => {
    if (socket && players.length >= 2) {
      socket.emit('startGame', { gameCode });
    }
  };

  // Copy game code to clipboard
  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render different screens based on game mode
  const renderContent = () => {
    switch (gameMode) {
      case 'choose':
        return (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Play with Friends</h2>
            
            <div className="flex flex-col space-y-4">
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <motion.button
                onClick={() => setGameMode('create')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create New Game
              </motion.button>
              
              <motion.button
                onClick={() => {
                  setGameMode('join');
                  setTimeout(() => {
                    if (joinCodeInputRef.current) {
                      joinCodeInputRef.current.focus();
                    }
                  }, 100);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join Game
              </motion.button>
              
              <motion.button
                onClick={() => navigate('/')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Home
              </motion.button>
            </div>
          </motion.div>
        );
      
      case 'create':
        return (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-center mb-4">Create a Game</h2>
            <p className="text-gray-400 mb-6 text-center">
              Create a private game and share the code with your friends
            </p>
            
            <div className="flex flex-col space-y-4">
              <motion.button
                onClick={createGame}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create Game
              </motion.button>
              
              <motion.button
                onClick={() => setGameMode('choose')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        );
      
      case 'join':
        return (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-center mb-4">Join a Game</h2>
            <p className="text-gray-400 mb-6 text-center">
              Enter the game code shared by your friend
            </p>
            
            <div className="flex flex-col space-y-4">
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Game Code</label>
                <input
                  ref={joinCodeInputRef}
                  type="text"
                  placeholder="Enter game code"
                  className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                />
              </div>
              
              <motion.button
                onClick={joinGame}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join Game
              </motion.button>
              
              <motion.button
                onClick={() => setGameMode('choose')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        );
      
      case 'waiting':
        return (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-center mb-4">Waiting for Players</h2>
            
            <div className="bg-gray-700 p-4 rounded-lg text-center mb-6">
              <p className="text-gray-300 mb-2">Share this code with your friends:</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-mono bg-gray-800 px-4 py-2 rounded">{gameCode}</span>
                <motion.button
                  onClick={copyGameCode}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copied ? '✓' : '📋'}
                </motion.button>
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-bold mb-3">Players ({players.length})</h3>
              <ul className="space-y-2">
                {players.map((player) => (
                  <li key={player.id} className="flex items-center justify-between">
                    <span>{player.name} {player.isHost && '(Host)'}</span>
                    {player.isHost && player.id === socket?.id && (
                      <span className="text-xs text-gray-400">That's you</span>
                    )}
                    {!player.isHost && player.id === socket?.id && (
                      <span className="text-xs text-gray-400">That's you</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            
            {players.some(player => player.isHost && player.id === socket?.id) && (
              <motion.button
                onClick={startGame}
                disabled={players.length < 2}
                className={`w-full bg-green-500 ${
                  players.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
                } text-white px-6 py-3 rounded-lg transition-colors`}
                whileHover={players.length >= 2 ? { scale: 1.05 } : {}}
                whileTap={players.length >= 2 ? { scale: 0.95 } : {}}
              >
                {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
              </motion.button>
            )}
            
            {!players.some(player => player.isHost && player.id === socket?.id) && (
              <p className="text-center text-gray-400">Waiting for host to start the game...</p>
            )}
            
            <motion.button
              onClick={() => {
                socket.emit('leaveGame', { gameCode });
                navigate('/');
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Leave Game
            </motion.button>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg p-8 shadow-xl"
      >
        {renderContent()}
        
        {error && (
          <motion.div 
            className="mt-4 p-2 bg-red-500 text-white rounded-lg text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FriendsGame; 