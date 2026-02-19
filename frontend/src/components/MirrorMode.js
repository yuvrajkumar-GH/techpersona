import React from 'react';
import { AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

// Maps persona ID -> display name (fixes the "friendly" speaker label bug)
const PERSONA_DISPLAY_NAMES = {
  friendly: 'Sarah Chen',
  tough: 'Michael Ross',
  neutral: 'Dr. Alex Kumar',
  silent: 'Emma Stone'
};

const MirrorMode = ({ reportData, onStartOver }) => {
  if (!reportData || !reportData.mirrorModeData) {
    return <div>No mirror mode data available</div>;
  }

  const { timeline, keyMoments } = reportData.mirrorModeData;

  // Resolve the persona display name — prefer full name from report, fallback to ID map
  const personaDisplayName =
    PERSONA_DISPLAY_NAMES[reportData.persona] ||
    reportData.persona ||
    'Interviewer';

  const formatTime = (timestamp) => {
    const seconds = Math.floor(timestamp / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mirror-mode">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>
          Mirror Mode - Self-Awareness Replay
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Review your interview with AI-powered insights on communication and behavior
        </p>
      </div>

      {/* Score Overview */}
      <div className="score-display">
        <h3 style={{ marginBottom: '15px' }}>Overall Performance</h3>
        <div className="score-circle">
          {reportData.averageScore}
        </div>
        <p style={{ fontSize: '1.1rem' }}>
          {reportData.averageScore >= 80 ? 'Excellent Performance!' :
           reportData.averageScore >= 70 ? 'Good Performance' :
           reportData.averageScore >= 60 ? 'Fair Performance' :
           'Needs Improvement'}
        </p>
        <p style={{ opacity: 0.9, marginTop: '10px' }}>
          Duration: {Math.floor(reportData.duration / 60)} minutes {reportData.duration % 60} seconds
        </p>

        {/* ── START NEW INTERVIEW button right below the score ── */}
        {onStartOver && (
          <button
            className="btn"
            onClick={onStartOver}
            style={{
              marginTop: '20px',
              background: 'white',
              color: 'var(--primary)',
              fontWeight: '700',
              fontSize: '1rem',
              padding: '12px 32px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <RotateCcw size={18} />
            Start New Interview
          </button>
        )}
      </div>

      {/* Key Moments */}
      {keyMoments && keyMoments.length > 0 && (
        <div className="key-moments">
          <h3>Key Moments</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
            Important points in your interview that stood out
          </p>
          {keyMoments.map((moment, index) => (
            <div key={index} className={`moment ${moment.type}`}>
              {moment.type === 'success' ? (
                <CheckCircle size={18} style={{ display: 'inline', color: 'var(--success)', marginRight: '8px' }} />
              ) : (
                <AlertCircle size={18} style={{ display: 'inline', color: 'var(--danger)', marginRight: '8px' }} />
              )}
              <strong>{moment.type === 'success' ? 'Strong Moment:' : 'Struggled Here:'}</strong> {moment.message}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {formatTime(moment.timestamp - reportData.mirrorModeData.timeline[0].timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interview Timeline */}
      <div className="timeline">
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>
          Interview Timeline with AI Analysis
        </h3>
        {timeline.map((item, index) => {
          // Fix speaker label: "You" for user, resolved name for AI
          const speakerLabel = item.speaker === 'You' ? 'You' : personaDisplayName;

          return (
            <div key={index} className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div className="timeline-speaker">
                    {speakerLabel}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {formatTime(item.timestamp)}
                  </div>
                </div>

                <div className="timeline-text">
                  {item.content}
                </div>

                {/* Behavioral Analysis for User Responses */}
                {item.analysis && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${item.analysis.overallScore >= 75 ? 'var(--success)' :
                                            item.analysis.overallScore >= 60 ? 'var(--warning)' :
                                            'var(--danger)'}`
                  }}>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem' }}>
                      <div>
                        <strong>Confidence:</strong> {item.analysis.confidence}
                      </div>
                      <div>
                        <strong>Clarity:</strong> {item.analysis.clarity}
                      </div>
                      <div>
                        <strong>Score:</strong> {item.analysis.overallScore}/100
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Annotations */}
                {item.annotations && item.annotations.length > 0 && (
                  <div className="annotations">
                    {item.annotations.map((annotation, aIndex) => (
                      <div key={aIndex} className={`annotation ${annotation.severity}`}>
                        {annotation.severity === 'warning' ? (
                          <TrendingDown size={16} />
                        ) : (
                          <TrendingUp size={16} />
                        )}
                        <span>{annotation.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
          Personalized Recommendations
        </h3>
        <div className="recommendations">
          {reportData.recommendations && reportData.recommendations.length > 0 ? (
            <>
              {/* Strengths Section */}
              {reportData.recommendations.filter(r => r.priority === 'strength').length > 0 && (
                <>
                  <h4 style={{ color: '#10b981', marginTop: '10px', marginBottom: '15px', fontSize: '1.1rem' }}>
                    What You Did Well
                  </h4>
                  {reportData.recommendations
                    .filter(r => r.priority === 'strength')
                    .map((rec, idx) => (
                      <div key={idx} className="recommendation-card" style={{
                        borderLeft: '4px solid #10b981',
                        background: 'rgba(16, 185, 129, 0.05)'
                      }}>
                        <h4 style={{ color: '#10b981', marginBottom: '8px' }}>{rec.area}</h4>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                          {rec.message}
                        </p>
                      </div>
                    ))}
                </>
              )}

              {/* Areas for Improvement Section */}
              {reportData.recommendations.filter(r => r.priority !== 'strength').length > 0 && (
                <>
                  <h4 style={{ color: 'var(--primary)', marginTop: '25px', marginBottom: '15px', fontSize: '1.1rem' }}>
                    Areas to Improve
                  </h4>
                  {reportData.recommendations
                    .filter(r => r.priority !== 'strength')
                    .map((rec, idx) => (
                      <div key={idx} className="recommendation-card" style={{
                        borderLeft: `4px solid ${
                          rec.priority === 'high' ? '#ef4444' :
                          rec.priority === 'medium' ? '#f59e0b' :
                          '#6366f1'
                        }`
                      }}>
                        <div className="recommendation-header">
                          <h4>{rec.area}</h4>
                          <span className={`priority-badge priority-${rec.priority}`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                          <strong>Issue:</strong> {rec.issue}
                        </p>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                          <strong>Suggestion:</strong> {rec.suggestion}
                        </p>
                      </div>
                    ))}
                </>
              )}
            </>
          ) : (
            <div className="recommendation-card" style={{
              borderLeft: '4px solid #10b981',
              background: 'rgba(16, 185, 129, 0.05)'
            }}>
              <h4 style={{ color: '#10b981' }}>Great Start!</h4>
              <p>Complete a few more answers to get personalized recommendations based on your performance.</p>
            </div>
          )}
        </div>
      </div>

      {/* Final Advice */}
      <div style={{
        marginTop: '30px',
        padding: '25px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        borderRadius: '12px',
        borderLeft: '4px solid var(--primary)'
      }}>
        <h4 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Next Steps</h4>
        <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
          Practice regularly with different personas to improve your interview skills.
          Focus on the areas marked for improvement, and track your progress over time.
          Remember: confidence comes from preparation, and every interview is a learning opportunity!
        </p>
      </div>
    </div>
  );
};

export default MirrorMode;
