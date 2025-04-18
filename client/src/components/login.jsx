import React from 'react';
import { motion } from 'framer-motion';

function Login() {
  
  return (
    <div className="min-h-screen bg-[#232323] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg p-8 shadow-xl text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-6">Welcome to MonkeRival</h1>
        <p className="text-gray-400 mb-8">Sign in to start racing and competing with others!</p>
        <a href="http://localhost:3000/auth/google" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full text-lg transition duration-300 w-[30%]">
          <span>Get Started</span>
        </a>
      </motion.div>
    </div>
  );
}

export default Login;