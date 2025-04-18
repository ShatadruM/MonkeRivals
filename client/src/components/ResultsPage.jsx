import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wpm, accuracy, mistakes, time, graphData, isMultiplayer, opponentStats, playerColor } = location.state || {};
  const [winner, setWinner] = useState(null);

  // Navigate to home page if no results data
  useEffect(() => {
    if (!wpm) {
      navigate('/');
      return null;
    }
  }, [wpm, navigate]);

  // Determine winner based on WPM
  useEffect(() => {
    if (isMultiplayer && opponentStats) {
      if (wpm > opponentStats.wpm) {
        setWinner(playerColor);
      } else if (wpm < opponentStats.wpm) {
        setWinner(playerColor === 'blue' ? 'red' : 'blue');
      } else {
        setWinner('tie');
      }
    }
  }, [wpm, opponentStats, isMultiplayer, playerColor]);

  // Handle navigation to specific sections
  const handleNavigate = (destination) => {
    if (destination === 'time') {
      navigate('/time');
    } else if (destination === 'race') {
      navigate('/race');
    } else {
      navigate('/');
    }
  };

  const labels = Array.from({ length: time }, (_, i) => i + 1);

  const data = {
    labels,
    datasets: [
      {
        label: `Your WPM (${playerColor === 'blue' ? 'Blue' : 'Red'} Player)`,
        data: graphData,
        borderColor: playerColor === 'blue' ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)',
        backgroundColor: playerColor === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      },
      ...(isMultiplayer && opponentStats ? [
        {
          label: `Opponent WPM (${playerColor === 'blue' ? 'Red' : 'Blue'} Player)`,
          data: opponentStats.graphData,
          borderColor: playerColor === 'blue' ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)',
          backgroundColor: playerColor === 'blue' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)',
        }
      ] : [])
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'WPM Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Render different result messages based on winner
  const renderResultMessage = () => {
    if (winner === playerColor) {
      return (
        <div className="space-y-2">
          <motion.span 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1.1 }}
            transition={{ duration: 0.5, yoyo: Infinity }}
            className={`inline-block text-${playerColor === 'blue' ? 'blue' : 'red'}-400 text-2xl`}
          >
            You won! 🎉
          </motion.span>
          <div className="mt-3 p-3 bg-gray-800 rounded-lg">
            <p className="text-base font-normal text-gray-300">
              Congratulations! Your typing speed was impressive.
              You were {wpm - opponentStats.wpm} WPM faster than your opponent.
            </p>
            {opponentStats.isRaceEnded && (
              <p className="text-sm text-gray-400 mt-2">
                {opponentStats.finished ? 
                  `Your opponent finished with ${opponentStats.wpm} WPM.` : 
                  `Your opponent only completed ${Math.round(opponentStats.progress)}% of the text.`}
              </p>
            )}
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => handleNavigate('race')} 
                className={`mt-2 bg-${playerColor === 'blue' ? 'blue' : 'red'}-500 hover:bg-${playerColor === 'blue' ? 'blue' : 'red'}-600 text-white px-4 py-1 rounded-lg text-sm`}
              >
                Race Again
              </button>
            </div>
          </div>
        </div>
      );
    } else if (winner !== 'tie' && winner !== playerColor) {
      return (
        <div className="space-y-2">
          <span className={`text-${playerColor === 'blue' ? 'blue' : 'red'}-400`}>You lost! 😢</span>
          <div className="mt-3 p-3 bg-gray-800 rounded-lg">
            <p className="text-base font-normal text-gray-300">
              Don't worry! Keep practicing to improve your typing speed.
              You were {opponentStats.wpm - wpm} WPM behind your opponent.
            </p>
            {opponentStats.isRaceEnded && (
              <p className="text-sm text-gray-400 mt-2">
                {isMultiplayer && opponentStats.finished ? 
                  `Your opponent finished with a WPM of ${opponentStats.wpm}.` : 
                  `You completed ${Math.round(opponentStats.myStats?.progress || 0)}% of the text.`}
              </p>
            )}
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => handleNavigate('race')} 
                className={`mt-2 bg-${playerColor === 'blue' ? 'blue' : 'red'}-500 hover:bg-${playerColor === 'blue' ? 'blue' : 'red'}-600 text-white px-4 py-1 rounded-lg text-sm`}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-2">
          <span className="text-yellow-400">It's a tie! 🤝</span>
          <div className="mt-3 p-3 bg-gray-800 rounded-lg">
            <p className="text-base font-normal text-gray-300">
              Amazing! Both of you typed at exactly the same speed.
              Try again to break the tie!
            </p>
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => handleNavigate('race')} 
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded-lg text-sm"
              >
                Break the Tie
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg p-8 shadow-xl"
      >
        <h1 className="text-3xl font-bold text-center mb-8">
          {isMultiplayer ? 'Race Results' : 'Test Results'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <h2 className="text-lg text-gray-400 mb-2">Speed</h2>
            <p className={`text-4xl font-bold text-${playerColor}-500`}>{wpm} WPM</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <h2 className="text-lg text-gray-400 mb-2">Accuracy</h2>
            <p className="text-4xl font-bold text-green-500">{accuracy}%</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <h2 className="text-lg text-gray-400 mb-2">Mistakes</h2>
            <p className="text-4xl font-bold text-red-500">{mistakes}</p>
          </div>
        </div>

        {isMultiplayer && opponentStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-4">Race Summary</h2>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <div className="text-center mb-4 md:mb-0">
                  <h3 className="text-lg font-bold">You <span className={`text-${playerColor}-500`}>({playerColor === 'blue' ? 'Blue' : 'Red'} Player)</span></h3>
                  <p className={`text-2xl text-${playerColor}-500`}>{wpm} WPM</p>
                  <p className="text-green-500">{accuracy}% Accuracy</p>
                  {opponentStats.isRaceEnded && opponentStats.myStats && (
                    <p className="text-sm text-gray-400 mt-2">
                      {opponentStats.myStats.finished ? "Completed" : `${Math.round(opponentStats.myStats.progress)}% Complete`}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold">Opponent <span className={`text-${playerColor === 'blue' ? 'red' : 'blue'}-500`}>({playerColor === 'blue' ? 'Red' : 'Blue'} Player)</span></h3>
                  <p className={`text-2xl text-${playerColor === 'blue' ? 'red' : 'blue'}-500`}>{opponentStats.wpm} WPM</p>
                  <p className="text-green-500">{opponentStats.accuracy}% Accuracy</p>
                  {opponentStats.isRaceEnded && (
                    <p className="text-sm text-gray-400 mt-2">
                      {opponentStats.finished ? "Completed" : `${Math.round(opponentStats.progress)}% Complete`}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 text-center">
                {renderResultMessage()}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <Line options={options} data={data} />
        </div>

        <div className="text-center space-x-4">
          <button
            onClick={() => handleNavigate(isMultiplayer ? 'race' : 'time')}
            className={`bg-${isMultiplayer ? (playerColor === 'blue' ? 'blue' : 'red') : 'blue'}-500 hover:bg-${isMultiplayer ? (playerColor === 'blue' ? 'blue' : 'red') : 'blue'}-600 text-white px-6 py-2 rounded-lg transition-colors`}
          >
            {isMultiplayer ? 'Race Again' : 'New Test'}
          </button>
          <button
            onClick={() => handleNavigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
