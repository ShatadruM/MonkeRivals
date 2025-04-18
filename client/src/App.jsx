import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TypingTest from './components/TypingTest';
import ResultsPage from './components/ResultsPage';
import Login from './components/login';
import FriendsGame from './components/FriendsGame';

// Header component with navigation
function Header({ activeSection, setActiveSection }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Handle navigation to different sections
  const handleNavClick = (section) => {
    setActiveSection(section);
    
    // Navigate to appropriate route based on section
    if (section === 'time') {
      navigate('/time');
    } else if (section === 'race') {
      navigate('/race');
    }
  };
  
  return (
    <header className="border-b border-gray-700 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div
            onClick={() => navigate('/')}
            className="text-2xl font-bold cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'],
              transition: { 
                duration: 10, 
                repeat: Infinity,
                ease: "linear" 
              }
            }}
          >
            <span className="mr-1">⌨️</span> MonkeRival
          </motion.div>
        </div>
        {/* Navigation Bar */}
        <nav className="flex space-x-6">
          <button
            onClick={() => handleNavClick('time')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'time'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span role="img" aria-label="clock">⏱️</span>
            <span>Time</span>
          </button>
          <button
            onClick={() => handleNavClick('race')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'race'
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span role="img" aria-label="racing">🏁</span>
            <span>Race</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// Footer component
function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 py-4 border-t border-gray-700">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-gray-400 text-sm mb-2 md:mb-0">
          <p>© {currentYear} MonkeRival. All rights reserved.</p>
        </div>
        <div className="flex space-x-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
            <span className="text-sm">GitHub</span>
          </a>
          <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
            <span className="text-sm">Privacy</span>
          </a>
          <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
            <span className="text-sm">Terms</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

// Layout component with header and main content
function Layout({ children, activeSection, setActiveSection }) {
  return (
    <div className="min-h-screen bg-[#232323] text-gray-200 flex flex-col">
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Results page wrapper
function ResultsPageWrapper({ activeSection, setActiveSection }) {
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <ResultsPage />
    </Layout>
  );
}

// Time test page
function TimeTestPage({ activeSection, setActiveSection }) {
  useEffect(() => {
    // Ensure the correct section is highlighted when navigating directly to this route
    if (activeSection !== 'time') {
      setActiveSection('time');
    }
  }, [activeSection, setActiveSection]);
  
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <TypingTest timeLimit={30} mode="solo" />
    </Layout>
  );
}

// Race page
function RacePage({ activeSection, setActiveSection }) {
  useEffect(() => {
    // Ensure the correct section is highlighted when navigating directly to this route
    if (activeSection !== 'race') {
      setActiveSection('race');
    }
  }, [activeSection, setActiveSection]);
  
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <TypingTest timeLimit={30} mode="race" />
    </Layout>
  );
}

// Login page
function LoginPage() {
  return (
    <div className="min-h-screen bg-[#232323] text-gray-200 flex flex-col">
      <Login />
      <Footer />
    </div>
  );
}

// Home page with welcome content
function HomePage({ activeSection, setActiveSection }) {
  const navigate = useNavigate();
  
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="text-center py-12">
        <motion.h1 
          className="text-5xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block"
            whileHover={{ scale: 1.1, rotate: [-2, 2, -2, 0], transition: { duration: 0.5 } }}
          >
            Welcome to 
            <motion.span
              className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-green-400 to-purple-600 px-2"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            >
              MonkeRival
            </motion.span>
          </motion.span>
        </motion.h1>
        <motion.p 
          className="text-xl text-gray-400 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Test your typing speed and race against others!
        </motion.p>
        
        <motion.div 
          className="flex flex-col md:flex-row justify-center space-y-6 md:space-y-0 md:space-x-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <motion.div 
            className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm"
            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
          >
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-2xl font-bold mb-4">Time Challenge</h2>
            <p className="text-gray-400 mb-6">Test your typing speed against the clock. How many words can you type in 30 seconds?</p>
            <button 
              onClick={() => navigate('/time')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Start Solo Test
            </button>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm"
            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
          >
            <div className="text-4xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold mb-4">Race Mode</h2>
            <p className="text-gray-400 mb-6">Challenge other typists in real-time races. Can you type faster than your opponents?</p>
            <button 
              onClick={() => navigate('/race')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Race Now
            </button>
          </motion.div>

          <motion.div 
            className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm"
            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
          >
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-2xl font-bold mb-4">Play with Friends</h2>
            <p className="text-gray-400 mb-6">Create a private game and invite your friends with a code to race together!</p>
            <button 
              onClick={() => navigate('/friends')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Play with Friends
            </button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}

// Friends game page
function FriendsGamePage({ activeSection, setActiveSection }) {
  useEffect(() => {
    // Reset active section for this page
    if (activeSection !== '') {
      setActiveSection('');
    }
  }, [activeSection, setActiveSection]);
  
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <FriendsGame />
    </Layout>
  );
}

// Private typing test for friends game
function PrivateGameTypingTest({ activeSection, setActiveSection }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // If no game data is passed, redirect to friends page
  useEffect(() => {
    if (!location.state || !location.state.isPrivateGame) {
      navigate('/friends');
    }
  }, [location.state, navigate]);
  
  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      <TypingTest timeLimit={30} mode="friends" />
    </Layout>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState('time');
  const timeLimit = 30; // Fixed at 30 seconds

  return (
    <Router>
      <Routes>
      <Route path="/" element={<HomePage activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/login" element={<Login activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/time" element={<TimeTestPage activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/race" element={<RacePage activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/results" element={<ResultsPageWrapper activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/friends" element={<FriendsGamePage activeSection={activeSection} setActiveSection={setActiveSection} />} />
        <Route path="/typing-test" element={<PrivateGameTypingTest activeSection={activeSection} setActiveSection={setActiveSection} />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;