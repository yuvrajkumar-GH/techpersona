// ChatInterface.js - Add to frontend/src/components/
import React, { useRef, useEffect, useState } from 'react';
import { Send, Mic, MicOff, Loader } from 'lucide-react';

const ChatInterface = ({ 
  messages, 
  onSendMessage, 
  persona,
  isListening,
  onStartListening,
  onStopListening,
  currentTranscript,
  isAITyping,
  speechPauses = []   // ← hesitation data from InterviewRoom
}) => {
  const [inputText, setInputText] = useState('');
  const messagesListRef = useRef(null);
  const inputRef = useRef(null);
  // tracks if user manually typed/deleted while listening — stops auto-overwrite
  const userEditedRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isAITyping]);

  // Show voice transcript in input field — but DON'T overwrite if user manually edited
  useEffect(() => {
    if (currentTranscript && isListening && !userEditedRef.current) {
      setInputText(currentTranscript);
    }
  }, [currentTranscript, isListening]);

  // When listening stops, reset the manual-edit flag AND clear the input
  // so no ghost transcript text is left behind after gesture/mic stop
  useEffect(() => {
    if (!isListening) {
      userEditedRef.current = false;
      setInputText('');
    }
  }, [isListening]);

  const scrollToBottom = () => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      // Stop — InterviewRoom's stopListening handles auto-send via currentInputRef
      // But if user manually edited, we need to clear local state cleanly
      onStopListening();
      setInputText('');
      userEditedRef.current = false;
    } else {
      setInputText(''); // Clear text when starting voice
      userEditedRef.current = false;
      onStartListening();
    }
  };

  const getPersonaAvatar = (personaName) => {
    const avatars = {
      'Sarah Chen': '👩‍💼',
      'Michael Ross': '👨‍💼',
      'Dr. Alex Kumar': '👨‍🔬',
      'Emma Stone': '👩‍💻'
    };
    return avatars[personaName] || '🤖';
  };

  const getPersonaColor = (personaName) => {
    const colors = {
      'Sarah Chen': '#10b981',
      'Michael Ross': '#dc2626',
      'Dr. Alex Kumar': '#3b82f6',
      'Emma Stone': '#8b5cf6'
    };
    return colors[personaName] || '#6b7280';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const personaColor = persona ? getPersonaColor(persona.name) : '#6b7280';
  const personaAvatar = persona ? getPersonaAvatar(persona.name) : '🤖';

  return (
    <div style={styles.container}>
      {/* Chat Header */}
      <div style={{...styles.header, background: personaColor}}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarLarge}>{personaAvatar}</div>
          <div style={styles.headerInfo}>
            <div style={styles.personaName}>
              {persona?.name || 'AI Interviewer'}
            </div>
            <div style={styles.status}>
              <div style={styles.statusDot} />
              <span>Interviewing...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div style={styles.messagesContainer}>
        <div style={styles.messagesList} ref={messagesListRef} overscrollBehavior="contain">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const showAvatar = !isUser && (index === 0 || messages[index - 1]?.role === 'user');
            
            return (
              <div
                key={index}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: isUser ? 'flex-end' : 'flex-start'
                }}
              >
                {/* AI Avatar */}
                {!isUser && showAvatar && (
                  <div style={styles.avatarSmall}>{personaAvatar}</div>
                )}
                {!isUser && !showAvatar && <div style={styles.avatarSpacer} />}

                {/* Message Bubble */}
                <div style={styles.messageGroup}>
                  <div
                    style={{
                      ...styles.messageBubble,
                      background: isUser ? '#007ACC' : '#f3f4f6',
                      color: isUser ? 'white' : '#1f2937',
                      borderBottomRightRadius: isUser ? '4px' : '18px',
                      borderBottomLeftRadius: isUser ? '18px' : '4px'
                    }}
                  >
                    {message.content}
                  </div>
                  
                  {/* Timestamp */}
                  <div 
                    style={{
                      ...styles.timestamp,
                      textAlign: isUser ? 'right' : 'left',
                      marginLeft: isUser ? 'auto' : '12px',
                      marginRight: isUser ? '12px' : 'auto'
                    }}
                  >
                    {formatTime(message.timestamp || Date.now())}
                    {/* Show behavioral indicators for user messages */}
                    {isUser && message.behaviorData && (
                      <span style={styles.indicator}>
                        {message.behaviorData.fillerWords?.length > 0 && ' 🔴'}
                        {message.behaviorData.fillerWords?.length === 0 && ' ✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* User Avatar Spacer */}
                {isUser && <div style={styles.avatarSpacer} />}
              </div>
            );
          })}

          {/* AI Typing Indicator */}
          {isAITyping && (
            <div style={styles.messageWrapper}>
              <div style={styles.avatarSmall}>{personaAvatar}</div>
              <div style={styles.typingBubble}>
                <div style={styles.typingDots}>
                  <span style={styles.dot} />
                  <span style={styles.dot} />
                  <span style={styles.dot} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Input Area */}
      <div style={styles.inputContainer}>
        {/* Voice Listening Indicator */}
        {isListening && (
          <div style={styles.listeningIndicator}>
            <div style={styles.pulseRing} />
            <Mic size={16} color="#dc2626" />
            <span style={styles.listeningText}>Listening... use ⌫ to edit · show ✋ palm to stop & send</span>
          </div>
        )}

        {/* Hesitation Warning — restored */}
        {isListening && speechPauses.length > 0 && (
          <div style={styles.hesitationWarning}>
            ⚠️ {speechPauses.length} hesitation pause{speechPauses.length > 1 ? 's' : ''} detected
            {speechPauses[speechPauses.length - 1]?.seconds &&
              ` (last: ${speechPauses[speechPauses.length - 1].seconds}s)`}
          </div>
        )}

        {/* Input Field */}
        <div style={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            onKeyDown={(e) => {
              // Only flag as user-edited on actual physical key presses while listening.
              // This stops voice transcript from overwriting the user's manual edits.
              // We ignore modifier-only keys (Shift, Ctrl, Alt, Meta) and Enter (which sends).
              if (isListening && e.key !== 'Enter' && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
                userEditedRef.current = true;
              }
              // Still handle Enter to send
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Speaking... you can backspace to edit" : "Type your answer or click mic to speak..."}
            style={{
              ...styles.input,
              borderColor: isListening ? '#dc2626' : '#e5e7eb'
            }}
            rows={1}
            // NOT disabled during listening — user can backspace/edit the transcript
          />

          {/* Voice Button */}
          <button
            onClick={toggleVoice}
            style={{
              ...styles.voiceButton,
              background: isListening ? '#dc2626' : '#6b7280'
            }}
            title={isListening ? "Stop speaking & send" : "Start speaking"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isListening}
            style={{
              ...styles.sendButton,
              opacity: (!inputText.trim() || isListening) ? 0.5 : 1,
              cursor: (!inputText.trim() || isListening) ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={20} />
          </button>
        </div>

        {/* Helper Text */}
        <div style={styles.helperText}>
          {isListening ? (
            <span style={{color: '#dc2626'}}>
              🎤 Speaking... use ⌫ backspace to edit · click mic or show ✋ palm to stop & send
            </span>
          ) : (
            <span>
              Press Enter to send • Click 🎤 to speak • Shift+Enter for new line
            </span>
          )}
        </div>

        {/* Bottom spacer — keeps gesture widget (fixed bottom-right) from covering the input */}
        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  header: {
    padding: '20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  avatarLarge: {
    fontSize: '40px',
    width: '56px',
    height: '56px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid rgba(255, 255, 255, 0.3)'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  personaName: {
    fontSize: '20px',
    fontWeight: 'bold'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    opacity: 0.9
  },
  statusDot: {
    width: '8px',
    height: '8px',
    background: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  messagesContainer: {
    flex: 1,
    overflow: 'hidden',
    background: '#fafafa'
  },
  messagesList: {
    height: '100%',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  messageWrapper: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    marginBottom: '4px'
  },
  avatarSmall: {
    fontSize: '24px',
    width: '36px',
    height: '36px',
    background: '#f3f4f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  avatarSpacer: {
    width: '36px',
    flexShrink: 0
  },
  messageGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '70%'
  },
  messageBubble: {
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '15px',
    lineHeight: '1.5',
    wordWrap: 'break-word',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    animation: 'slideIn 0.3s ease-out'
  },
  timestamp: {
    fontSize: '11px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  indicator: {
    fontSize: '12px'
  },
  typingBubble: {
    background: '#f3f4f6',
    padding: '12px 16px',
    borderRadius: '18px',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  dot: {
    width: '8px',
    height: '8px',
    background: '#9ca3af',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out both'
  },
  inputContainer: {
    padding: '20px',
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  listeningIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#fee2e2',
    borderRadius: '20px',
    alignSelf: 'flex-start',
    position: 'relative'
  },
  pulseRing: {
    width: '12px',
    height: '12px',
    background: '#dc2626',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite'
  },
  listeningText: {
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: '600'
  },
  hesitationWarning: {
    fontSize: '0.8rem',
    color: '#92400e',
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    maxHeight: '120px',
    overflowY: 'auto'
  },
  voiceButton: {
    width: '48px',
    height: '48px',
    border: 'none',
    borderRadius: '50%',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  sendButton: {
    width: '48px',
    height: '48px',
    background: '#007ACC',
    border: 'none',
    borderRadius: '50%',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  helperText: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center'
  }
};

// Add these CSS animations to your App.css:
/*
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
  }
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}
*/

export default ChatInterface;
