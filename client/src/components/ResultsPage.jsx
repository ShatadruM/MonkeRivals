import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wpm, accuracy, mistakes, time, graphData, isMultiplayer, opponentStats } = location.state || {};

  if (!wpm) {
    navigate('/');
    return null;
  }

  const labels = Array.from({ length: time }, (_, i) => i + 1);

  const data = {
    labels,
    datasets: [
      {
        label: 'Your WPM',
        data: graphData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      ...(isMultiplayer && opponentStats ? [
        {
          label: 'Opponent WPM',
          data: opponentStats.graphData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
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
            <p className="text-4xl font-bold text-blue-500">{wpm} WPM</p>
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
                  <h3 className="text-lg font-bold">You</h3>
                  <p className="text-2xl text-blue-500">{wpm} WPM</p>
                  <p className="text-green-500">{accuracy}% Accuracy</p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold">Opponent</h3>
                  <p className="text-2xl text-orange-500">{opponentStats.wpm} WPM</p>
                  <p className="text-green-500">{opponentStats.accuracy}% Accuracy</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold mb-2">
                  {wpm > opponentStats.wpm
                    ? 'You won! 🎉'
                    : wpm < opponentStats.wpm
                    ? 'You lost! 😢'
                    : 'It\'s a tie! 🤝'}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <Line options={options} data={data} />
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          >
            New Test
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
