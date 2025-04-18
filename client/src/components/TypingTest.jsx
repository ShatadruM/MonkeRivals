import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const sampleText = `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.`;

const TypingTest = ({ timeLimit = 30 }) => {
  const [words, setWords] = useState(sampleText.split(' '));
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [lockedWords, setLockedWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [socket, setSocket] = useState(null);
  const [inMatchmaking, setInMatchmaking] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentWPM, setOpponentWPM] = useState(0);
  const [currentWPM, setCurrentWPM] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Function to navigate to results
  const navigateToResults = useCallback(() => {
    const totalWords = lockedWords.length;
    const correctWords = lockedWords.filter(
      (entry) => entry.word === entry.input
    ).length;
    const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
    const wpm = totalWords > 0 ? Math.round((totalWords / timeLimit) * 60) : 0;

    // Ensure opponent's WPM is a valid number for comparison
    const finalOpponentWPM = Math.round(opponentWPM);
    
    console.log('Navigating to results with opponent WPM:', finalOpponentWPM);

    navigate('/results', {
      state: {
        wpm,
        accuracy,
        mistakes,
        time: timeLimit,
        graphData: Array.from({ length: timeLimit }, (_, i) => (i + 1) * (wpm / timeLimit)),
        isMultiplayer,
        playerColor: isMultiplayer ? (socket?.playerColor || 'blue') : null,
        opponentStats: isMultiplayer ? {
          wpm: finalOpponentWPM,
          accuracy: socket?.opponentAccuracy || Math.round(Math.random() * 20) + 80, // Use real accuracy if available
          mistakes: Math.round((finalOpponentWPM / (wpm || 1)) * mistakes) || 0,
          graphData: Array.from({ length: timeLimit }, (_, i) => (i + 1) * (finalOpponentWPM / timeLimit)),
          finished: socket?.opponentFinished || false,
          isRaceEnded: true
        } : null
      },
    });
  }, [lockedWords, mistakes, timeLimit, navigate, isMultiplayer, opponentWPM, socket]);

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

    // Handle waiting for opponent
    socket.on('waitingForOpponent', (data) => {
      setWaitingForOpponent(true);
      setRoomId(data.roomId);
    });

    // Handle match start
    socket.on('matchStart', (data) => {
      setWaitingForOpponent(false);
      setIsMultiplayer(true);
      setRoomId(data.roomId);
      setWords(data.text.split(' '));
      setIsTestRunning(true);
      setTimeLeft(timeLimit);
      
      // Determine player color based on position in the room
      const isFirstPlayer = data.players[0] === socket.id;
      const playerColor = isFirstPlayer ? 'blue' : 'red';
      socket.playerColor = playerColor; // Store on socket for later use
      
      // Focus the input field
      if (inputRef.current) inputRef.current.focus();
    });

    // Handle opponent cursor updates
    socket.on('opponentCursor', (data) => {
      setOpponentProgress(data.wordIndex);
    });

    // Handle opponent WPM updates
    socket.on('opponentWPM', (data) => {
      console.log('Received opponent WPM:', data.wpm);
      setOpponentWPM(data.wpm);
      
      // Store additional opponent data if available
      if (data.accuracy) {
        socket.opponentAccuracy = data.accuracy;
      }
      if (data.finished) {
        socket.opponentFinished = true;
      }
      
      // If test is completed, update results with latest opponent WPM
      if (testCompleted) {
        navigateToResults();
      }
    });

    // Handle wpmUpdates (broadcast to all)
    socket.on('wpmUpdates', (data) => {
      // Find opponent's WPM from the playerWPM object
      if (data.playerWPM) {
        const opponentId = Object.keys(data.playerWPM).find(id => id !== socket.id);
        if (opponentId && data.playerWPM[opponentId]) {
          console.log(`Received WPM update via wpmUpdates: ${data.playerWPM[opponentId]} WPM from ${opponentId}`);
          setOpponentWPM(data.playerWPM[opponentId]);
        }
      }
    });

    // Handle opponent disconnected
    socket.on('opponentDisconnected', () => {
      setIsMultiplayer(false);
      setInMatchmaking(false);
      setWaitingForOpponent(false);
    });

    // Handle opponent finished
    socket.on('opponentFinished', (data) => {
      // Update opponent WPM with the final value
      setOpponentWPM(data.wpm);
      
      // If this player has also finished, navigate to results
      if (testCompleted) {
        navigateToResults();
      }
    });

    // Handle room closed
    socket.on('roomClosed', () => {
      setIsMultiplayer(false);
      setInMatchmaking(false);
      setWaitingForOpponent(false);
    });

    // Handle race ended event with complete results
    socket.on('raceEnded', (results) => {
      // Store complete race results
      socket.raceResults = results;
      
      // Find opponent data
      if (results.players && results.players.length > 0) {
        const opponentData = results.players.find(player => player.id !== socket.id);
        if (opponentData) {
          setOpponentWPM(opponentData.wpm);
          socket.opponentAccuracy = opponentData.accuracy || 90; // default if not provided
          socket.opponentFinished = opponentData.finished || false;
        }
      }
      
      // If test is already completed, navigate to results with updated data
      if (testCompleted) {
        navigateToResults();
      }
    });

    return () => {
      socket.off('waitingForOpponent');
      socket.off('matchStart');
      socket.off('opponentCursor');
      socket.off('opponentWPM');
      socket.off('wpmUpdates');
      socket.off('opponentDisconnected');
      socket.off('opponentFinished');
      socket.off('raceEnded');
      socket.off('roomClosed');
    };
  }, [socket, timeLimit]);

  // Handle test completion
  useEffect(() => {
    if (testCompleted) {
      // If in multiplayer mode, notify the server
      if (isMultiplayer && socket && roomId) {
        const totalWords = lockedWords.length;
        const correctWords = lockedWords.filter(
          (entry) => entry.word === entry.input
        ).length;
        const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
        const wpm = Math.round((totalWords / timeLimit) * 60);
        
        socket.emit('raceFinished', {
          roomId,
          stats: {
            wpm,
            accuracy,
            mistakes
          }
        });
      }
      
      navigateToResults();
    }
  }, [testCompleted, isMultiplayer, socket, roomId, lockedWords, mistakes, timeLimit, navigateToResults]);

  // Timer countdown - keep it simple
  useEffect(() => {
    if (isTestRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } 
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTestRunning]);

  // Check if time is up
  useEffect(() => {
    if (timeLeft === 0 && isTestRunning && !testCompleted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTestCompleted(true);
    }
  }, [timeLeft, isTestRunning, testCompleted]);

  // WPM calculation
  useEffect(() => {
    if (!isTestRunning) return;
    
    // Calculate current WPM
    const elapsedMinutes = (timeLimit - timeLeft) / 60 || 0.01; // Avoid division by zero
    const wordsTyped = lockedWords.length;
    const currentWPM = Math.round(wordsTyped / elapsedMinutes);
    setCurrentWPM(currentWPM);
    
    // Send WPM updates in multiplayer mode
    if (isMultiplayer && socket && roomId && currentWPM > 0) {
      console.log(`Sending my WPM update: ${currentWPM} WPM`);
      socket.emit('wpmUpdate', {
        roomId,
        wpm: currentWPM
      });
    }
  }, [lockedWords.length, timeLeft, isTestRunning, timeLimit, isMultiplayer, socket, roomId]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const currentWord = words[currentWordIndex];

    if (value.endsWith(' ')) {
      // Submit the current word
      setLockedWords((prev) => [
        ...prev,
        { word: currentWord, input: currentInput.trim() },
      ]);
      setCurrentWordIndex((prev) => prev + 1);
      setCurrentInput('');
      if (currentInput.trim() !== currentWord) {
        setMistakes((prev) => prev + 1);
      }
      
      // Send cursor position in multiplayer mode
      if (isMultiplayer && socket && roomId) {
        socket.emit('cursorUpdate', {
          roomId,
          wordIndex: currentWordIndex + 1,
          position: currentWordIndex + 1
        });
      }
    } else {
      setCurrentInput(value);
    }
  };

  const handleTestStart = () => {
    setIsTestRunning(true);
    setTimeLeft(timeLimit);
    setCurrentWordIndex(0);
    setLockedWords([]);
    setMistakes(0);
    setCurrentInput('');
    setTestCompleted(false);
    // Focus the input field
    if (inputRef.current) inputRef.current.focus();
  };

  const handleMatchRequest = () => {
    if (socket) {
      setInMatchmaking(true);
      socket.emit('requestMatch');
    }
  };

  const renderWordFeedback = (word, input) => {
    const feedback = [];
    const maxLength = Math.max(word.length, input.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < input.length && i < word.length) {
        feedback.push(
          <span
            key={i}
            className={input[i] === word[i] ? 'text-green-500' : 'text-red-500'}
          >
            {input[i]}
          </span>
        );
      } else if (i < input.length) {
        feedback.push(
          <span key={i} className="text-red-500">
            {input[i]}
          </span>
        );
      } else {
        feedback.push(
          <span key={i} className="text-gray-500">
            {word[i]}
          </span>
        );
      }
    }

    return feedback;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg p-8 shadow-xl"
      >
        {!isTestRunning && !inMatchmaking ? (
          <div className="text-center space-y-4">
            <button
              onClick={handleTestStart}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg mr-4"
            >
              Start Solo Test
            </button>
            <button
              onClick={handleMatchRequest}
              className="bg-green-500 text-white px-6 py-2 rounded-lg"
            >
              Match
            </button>
          </div>
        ) : waitingForOpponent ? (
          <div className="text-center">
            <p className="text-xl mb-4">Waiting for opponent...</p>
            <div className="animate-pulse flex justify-center">
              <div className="h-3 w-3 bg-blue-500 rounded-full mx-1"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full mx-1 animate-delay-200"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full mx-1 animate-delay-400"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-2xl font-bold text-blue-500">
                Time Left: {timeLeft}s
              </div>
              <div className="text-gray-400">
                Mistakes: {mistakes}
              </div>
              {isMultiplayer && (
                <div className="text-green-500">
                  WPM: {currentWPM}
                </div>
              )}
            </div>

            {isMultiplayer && (
              <div className="mb-4 bg-gray-700 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Opponent Progress:</span>
                  <span className="text-sm text-orange-400">WPM: {opponentWPM}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                  <div 
                    className="bg-orange-500 h-2.5 rounded-full" 
                    style={{ width: `${(opponentProgress / words.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="font-mono text-lg leading-relaxed mb-4 overflow-hidden">
              <div className="flex flex-wrap">
                {words.map((word, index) => (
                  <span key={index} className={`mr-2 mb-2 ${isMultiplayer && index === opponentProgress ? 'border-b-2 border-orange-500' : ''}`}>
                    {index < currentWordIndex
                      ? renderWordFeedback(word, lockedWords[index]?.input || '')
                      : index === currentWordIndex
                      ? renderWordFeedback(word, currentInput)
                      : word}
                  </span>
                ))}
              </div>
            </div>
            <input
              ref={inputRef}
              type="text"
              className="w-full mt-4 p-2 bg-gray-700 text-white rounded-lg focus:outline-none"
              value={currentInput}
              onChange={handleInputChange}
              disabled={timeLeft === 0}
              placeholder={
                timeLeft === 0 ? 'Test completed!' : 'Type here...'
              }
              autoFocus
            />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default TypingTest;