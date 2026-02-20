import React, { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';

// Hardcoded 2 personas — no API call needed, loads instantly
// and avoids any localhost dependency
const TWO_PERSONAS = [
  {
    id: 'friendly',
    name: 'Sarah Chen - Friendly Tech Lead',
    description: 'Warm, encouraging, provides hints when stuck',
    difficulty: 'easy'
  },
  {
    id: 'tough',
    name: 'Michael Ross - Senior Engineer (Tough)',
    description: 'Direct, challenges assumptions, high standards',
    difficulty: 'hard'
  }
];

const PersonaSelector = ({ onPersonaSelect }) => {
  const [selectedPersona, setSelectedPersona] = useState(null);

  const handlePersonaClick = (persona) => {
    setSelectedPersona(persona.id);
  };

  const handleStartInterview = () => {
    if (selectedPersona) {
      onPersonaSelect(selectedPersona);
    }
  };

  return (
    <div className="card">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={28} />
          Choose Your Interviewer
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Select an interviewer persona to practice with. Each has a unique style and difficulty level.
        </p>
      </div>

      <div className="persona-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '700px', margin: '0 auto' }}>
        {TWO_PERSONAS.map((persona) => (
          <div
            key={persona.id}
            className={`persona-card ${selectedPersona === persona.id ? 'selected' : ''}`}
            onClick={() => handlePersonaClick(persona)}
          >
            <h3>{persona.name}</h3>
            <p>{persona.description}</p>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginTop: '10px',
                background: persona.difficulty === 'easy' ? '#10b981' : '#ef4444',
                color: 'white'
              }}
            >
              {persona.difficulty.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleStartInterview}
          disabled={!selectedPersona}
          style={{ fontSize: '1.1rem', padding: '15px 40px' }}
        >
          Start Interview <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default PersonaSelector;
