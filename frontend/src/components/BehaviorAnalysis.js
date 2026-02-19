import React from 'react';
import { Activity, Eye, Clock, MessageSquare, Mic, PauseCircle } from 'lucide-react';

const BehaviorAnalysis = ({ data }) => {
  if (!data) return null;

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const isVoiceAnswer = data.voiceMetrics && data.voiceMetrics.isVoiceAnswer;

  return (
    <div className="analysis-panel">
      <h3>Real-Time Behavior Analysis</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
        {isVoiceAnswer ? '🎤 Voice answer analyzed' : 'Your performance metrics for the last response'}
      </p>

      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">
            <Activity size={16} style={{ display: 'inline', marginRight: '5px' }} />
            Confidence Level
          </div>
          <div className="metric-value" style={{ color: getConfidenceColor(data.confidence) }}>
            {data.confidence.charAt(0).toUpperCase() + data.confidence.slice(1)}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">
            <Eye size={16} style={{ display: 'inline', marginRight: '5px' }} />
            Eye Contact
          </div>
          <div className="metric-value">
            {data.eyeContact.charAt(0).toUpperCase() + data.eyeContact.slice(1)}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">
            <Clock size={16} style={{ display: 'inline', marginRight: '5px' }} />
            Thinking Time
          </div>
          <div className="metric-value">
            {data.thinkingTime.charAt(0).toUpperCase() + data.thinkingTime.slice(1).replace('_', ' ')}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '5px' }} />
            Overall Score
          </div>
          <div className="metric-value" style={{ color: getScoreColor(data.overallScore) }}>
            {data.overallScore}/100
          </div>
        </div>
      </div>

      {/* Voice-Specific Metrics */}
      {isVoiceAnswer && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Mic size={16} />
            Voice Analysis
          </h4>
          <div className="metrics-grid">
            {data.voiceMetrics.hesitationPauses !== undefined && (
              <div className="metric">
                <div className="metric-label">
                  <PauseCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
                  Hesitation Pauses
                </div>
                <div className="metric-value" style={{ color: getScoreColor(data.hesitationScore || 75) }}>
                  {data.voiceMetrics.hesitationPauses}
                </div>
              </div>
            )}

            {data.voiceMetrics.averagePauseDuration && (
              <div className="metric">
                <div className="metric-label">
                  <Clock size={16} style={{ display: 'inline', marginRight: '5px' }} />
                  Avg Pause
                </div>
                <div className="metric-value">
                  {data.voiceMetrics.averagePauseDuration}s
                </div>
              </div>
            )}

            {data.voiceMetrics.speechPacing && (
              <div className="metric">
                <div className="metric-label">
                  <Activity size={16} style={{ display: 'inline', marginRight: '5px' }} />
                  Speech Pacing
                </div>
                <div className="metric-value">
                  {data.pacing === 'good' ? 'Natural' : data.pacing === 'too_fast' ? 'Too Fast' : 'Too Slow'}
                </div>
              </div>
            )}

            {data.fillerWordScore !== undefined && (
              <div className="metric">
                <div className="metric-label">
                  <Mic size={16} style={{ display: 'inline', marginRight: '5px' }} />
                  Filler Score
                </div>
                <div className="metric-value" style={{ color: getScoreColor(data.fillerWordScore) }}>
                  {data.fillerWordScore}/100
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {data.insights && data.insights.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', color: 'var(--primary)' }}>
            Quick Insights
          </h4>
          {data.insights.map((insight, index) => (
            <div key={index} className="insight-item">
              <p>{insight}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BehaviorAnalysis;
