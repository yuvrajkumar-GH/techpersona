import React, { useState } from 'react';
import './styles/App.css';
import PersonaSelector from './components/PersonaSelector';
import InterviewRoom from './components/InterviewRoom';
import MirrorMode from './components/MirrorMode';
import { Brain, Award, RotateCcw } from 'lucide-react';

function App() {
  const [appState, setAppState] = useState('persona-selection'); // persona-selection, interview, report
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [interviewReport, setInterviewReport] = useState(null);

  const handlePersonaSelect = (persona) => {
    setSelectedPersona(persona);
    setAppState('interview');
  };

  const handleInterviewEnd = (report) => {
    setInterviewReport(report);
    setAppState('report');
  };

  const handleStartOver = () => {
    setAppState('persona-selection');
    setSelectedPersona(null);
    setInterviewReport(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>
          <Brain size={40} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '15px' }} />
          TechPersona
        </h1>
        <p>AI-Powered Interview Coaching Platform with Behavioral Intelligence</p>
      </header>

      <div className="container">
        {appState === 'persona-selection' && (
          <PersonaSelector onPersonaSelect={handlePersonaSelect} />
        )}

        {appState === 'interview' && (
          <InterviewRoom
            persona={selectedPersona}
            onEndInterview={handleInterviewEnd}
          />
        )}

        {appState === 'report' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Award size={60} style={{ color: 'white', marginBottom: '15px' }} />
              <h2 style={{ color: 'white', fontSize: '2rem', marginBottom: '10px' }}>
                Interview Complete!
              </h2>
              <p style={{ color: 'white', fontSize: '1.1rem', opacity: 0.9 }}>
                Review your performance and get personalized insights
              </p>
            </div>

            {/* onStartOver passed so MirrorMode can show the button inside the score card */}
            <MirrorMode reportData={interviewReport} onStartOver={handleStartOver} />

            {/* Also keep the button at the very bottom */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                className="btn btn-primary"
                onClick={handleStartOver}
                style={{ fontSize: '1.1rem', padding: '15px 40px' }}
              >
                <RotateCcw size={20} />
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        color: 'white',
        padding: '30px 20px',
        marginTop: '50px',
        opacity: 0.8
      }}>
        <p>Built for Hackathon 2026 | Powered by Gemini AI</p>
        <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>
          Practice. Improve. Succeed. 🚀
        </p>
      </footer>
    </div>
  );
}

export default App;
