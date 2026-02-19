import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, StopCircle } from 'lucide-react';
import axios from 'axios';
import BehaviorAnalysis from './BehaviorAnalysis';
import GestureControl from './GestureControl';
import ChatInterface from './ChatInterface';

const InterviewRoom = ({ persona, onEndInterview }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [behaviorData, setBehaviorData] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechPauses, setSpeechPauses] = useState([]);
  const [speechStartTime, setSpeechStartTime] = useState(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(null);

  // Gesture control states
  const [gestureControlEnabled, setGestureControlEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastGesture, setLastGesture] = useState(null);
  const [isAITyping, setIsAITyping] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const currentInputRef = useRef('');         // always holds latest transcript for gesture closures
  const isListeningRef = useRef(false);        // mirrors isListening state, safe to read in closures
  const accumulatedTranscriptRef = useRef(''); // builds up ALL confirmed final text across pauses/restarts
  const intentionalStopRef = useRef(false);    // true when user/gesture explicitly stops — prevents auto-restart
  const speechPausesRef = useRef([]);          // mirrors speechPauses state, always fresh in closures

  useEffect(() => {
    startInterview();
    initializeCamera();
    initializeVoiceRecognition();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // ─────────────────────────────────────────
  // GESTURE HANDLER
  // ─────────────────────────────────────────
  const handleGesture = (gesture) => {
    console.log('Gesture detected:', gesture);
    setLastGesture(gesture);
    setTimeout(() => setLastGesture(null), 2000);

    switch (gesture) {
      case 'PALM_RAISE':
        // ✋ Palm = STOP listening — use ref, not stale state
        if (isListeningRef.current) {
          stopListening();
        }
        break;

      case 'WAVE':
        // ✌️ Peace sign = START listening — use ref, not stale state
        if (!isListeningRef.current) {
          startListening();
        }
        break;

      case 'THUMBS_UP':
        handleSendAnswer(false, 'That was very helpful, thank you!');
        break;

      case 'THUMBS_DOWN':
        handleSendAnswer(false, "I didn't quite understand that. Could you rephrase?");
        break;

      case 'INDEX_POINT':
        handleSendAnswer(false, 'Can you give me a hint?');
        break;

      default:
        break;
    }
  };

  // ─────────────────────────────────────────
  // VOICE RECOGNITION
  // ─────────────────────────────────────────
  const initializeVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    let lastResultTime = null;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      isListeningRef.current = true;
      setSpeechStartTime(Date.now());
      lastResultTime = Date.now();
    };

    recognition.onresult = (event) => {
      const now = Date.now();

      // Detect hesitation pause between speech segments — threshold: 2 seconds
      if (lastResultTime) {
        const timeSinceLastResult = (now - lastResultTime) / 1000;
        if (timeSinceLastResult >= 2) {  // >= 2s as requested
          console.log('HESITATION DETECTED: ' + timeSinceLastResult.toFixed(1) + 's pause');
          const newPause = { duration: now - lastResultTime, timestamp: now, seconds: timeSinceLastResult.toFixed(1) };
          speechPausesRef.current = [...speechPausesRef.current, newPause]; // keep ref in sync FIRST
          setSpeechPauses(speechPausesRef.current);                         // then update state for UI
        }
      }
      lastResultTime = now;

      // Accumulate ONLY the new finals from this event (from resultIndex onward)
      // and append them to our running accumulated ref
      let newFinals = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinals += t + ' ';
        } else {
          currentInterim += t;
        }
      }

      // Append any new final text to the accumulated total
      if (newFinals) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + newFinals).trimStart();
      }

      // Full displayed transcript = all accumulated finals + current interim
      const fullTranscript = (accumulatedTranscriptRef.current + currentInterim).trimStart();
      setVoiceTranscript(fullTranscript);
      setCurrentInput(fullTranscript);
      currentInputRef.current = fullTranscript;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // no-speech and aborted are expected during pauses — don't treat as real errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      // Auto-restart if the user is still listening (browser stopped on silence/pause)
      // Only truly stop if the user/gesture explicitly stopped
      if (isListeningRef.current && !intentionalStopRef.current) {
        console.log('Auto-restarting recognition after pause...');
        try {
          recognition.start();
          // lastResultTime stays set so next hesitation window is measured correctly
        } catch (e) {
          console.log('Auto-restart failed:', e.message);
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        intentionalStopRef.current = false; // reset for next session
      }
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        // Full reset — new voice session starts clean
        accumulatedTranscriptRef.current = '';
        intentionalStopRef.current = false;
        speechPausesRef.current = [];          // reset pause ref for fresh session
        setVoiceTranscript('');
        setCurrentInput('');
        currentInputRef.current = '';
        setSpeechPauses([]);
        setLastSpeechTime(null);
        setSpeechStartTime(Date.now());
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        recognitionRef.current.start();
        // isListeningRef will be set true in recognition.onstart
      } catch (error) {
        console.log('Speech start error:', error.message);
        if (error.message.includes('already started')) {
          recognitionRef.current.stop();
          setTimeout(() => { try { recognitionRef.current.start(); } catch (e) {} }, 100);
        }
      }
    }
  };

  const stopListening = () => {
    // Use REF not state — state is stale inside gesture event closures
    if (recognitionRef.current && isListeningRef.current) {
      try {
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        intentionalStopRef.current = true;  // tell onend: don't auto-restart
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Speech stop error:', error.message);
      }
      setIsListening(false);
      isListeningRef.current = false;

      // Capture BOTH transcript and pauses from refs BEFORE clearing them
      const transcript = currentInputRef.current.trim();
      const pauses = [...speechPausesRef.current]; // snapshot before reset

      // Reset accumulators for next session
      accumulatedTranscriptRef.current = '';
      currentInputRef.current = '';
      speechPausesRef.current = [];

      // Clear visible input immediately — covers both mic-button AND gesture (PALM_RAISE) stops.
      // Without this, gesture-triggered stops leave the transcript sitting in the chat input box.
      setVoiceTranscript('');
      setCurrentInput('');

      if (transcript) {
        // Pass pauses directly — avoids stale state in handleSendAnswer
        setTimeout(() => { handleSendAnswer(true, transcript, pauses); }, 300);
      }
    }
  };

  // ─────────────────────────────────────────
  // CAMERA
  // ─────────────────────────────────────────
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera/microphone. Please grant permissions and refresh.');
    }
  };

  // ─────────────────────────────────────────
  // INTERVIEW SESSION
  // ─────────────────────────────────────────
  const startInterview = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/session/start', {
        persona: persona, categories: ['technical', 'behavioral']
      });
      setSessionId(response.data.sessionId);
      setMessages([{ role: 'assistant', content: response.data.greeting, timestamp: Date.now() }]);
      setQuestionStartTime(Date.now());
      setLoading(false);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please check if backend is running.');
      setLoading(false);
    }
  };

  const handleSendAnswer = async (fromVoice = false, directMessage = null, directPauses = null) => {
    const userMessage = directMessage || currentInput.trim();
    if (!userMessage || sending) return;
    if (isPaused) { alert('Interview is paused. Show peace sign ✌️ to resume.'); return; }

    const thinkingTime = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0;
    const speechDuration = speechStartTime ? (Date.now() - speechStartTime) / 1000 : 0;

    // Use directPauses if passed (from stopListening via ref), else fall back to state
    const pausesToUse = directPauses !== null ? directPauses : speechPauses;
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now(), fromVoice }]);
    setCurrentInput('');
    setVoiceTranscript('');
    setSending(true);
    setIsAITyping(true);

    try {
      const behaviorData = {
        answerLength: userMessage.length,
        thinkingTime,
        fillerWords: (userMessage.match(/\b(um|uh|like|you know|actually|basically|sort of|kind of)\b/gi) || []).length,
        lookingAway: false,
        fromVoice,
        speechDuration: fromVoice ? speechDuration : 0,
        hesitationPauses: fromVoice ? pausesToUse.length : 0,
        averagePauseDuration: fromVoice && pausesToUse.length > 0
          ? pausesToUse.reduce((sum, p) => sum + p.duration, 0) / pausesToUse.length / 1000 : 0
      };

      const response = await axios.post('http://localhost:5000/api/session/answer', {
        sessionId, answer: userMessage, behaviorData
      });
      
      setIsAITyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response, timestamp: Date.now() }]);
      // nextQuestion removed — the smart AI follow-up IS the next question
      setBehaviorData(response.data.behaviorAnalysis);
      setQuestionStartTime(Date.now());
      setSpeechPauses([]);
      speechPausesRef.current = [];  // keep ref in sync after send
      setSpeechStartTime(null);
      setLastSpeechTime(null);
    } catch (error) {
      console.error('Error sending answer:', error);
      setIsAITyping(false);
      alert('Failed to send answer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    const confirmed = window.confirm('Are you sure you want to end the interview?');
    if (!confirmed) return;
    try {
      const response = await axios.post('http://localhost:5000/api/session/end', { sessionId });
      onEndInterview(response.data);
    } catch (error) {
      console.error('Error ending interview:', error);
      alert('Failed to end interview properly.');
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMicOn(audioTrack.enabled); }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsCameraOn(videoTrack.enabled); }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Initializing interview session...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="interview-room">
        <div className="video-section">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

            {/* VIDEO + OVERLAYS */}
            <div className="video-container" style={{ position: 'relative' }}>
              <video ref={videoRef} autoPlay muted playsInline />

              <div className="video-status">
                {isRecording && <div className="recording-dot"></div>}
                {isRecording ? 'Recording' : 'Not Recording'}
              </div>

              {/* PAUSE OVERLAY */}
              {isPaused && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.65)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                }}>
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.95)', color: 'white',
                    padding: '15px 30px', borderRadius: '12px', fontSize: '22px', fontWeight: 'bold'
                  }}>
                    ⏸️ INTERVIEW PAUSED
                  </div>
                </div>
              )}

              {/* GESTURE INDICATOR */}
              {lastGesture && (
                <div style={{
                  position: 'absolute', bottom: '10px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(99, 102, 241, 0.95)', color: 'white',
                  padding: '8px 18px', borderRadius: '20px',
                  fontSize: '14px', fontWeight: 'bold', zIndex: 20, whiteSpace: 'nowrap'
                }}>
                  {lastGesture === 'PALM_RAISE' && '✋ Stopped Listening'}
                  {lastGesture === 'WAVE' && '✌️ Started Listening'}
                  {lastGesture === 'THUMBS_UP' && '👍 Positive Feedback Sent'}
                  {lastGesture === 'THUMBS_DOWN' && '👎 Negative Feedback Sent'}
                  {lastGesture === 'INDEX_POINT' && '☝️ Hint Requested'}
                </div>
              )}
            </div>
            
            {/* CONTROLS */}
            <div className="controls">
              <button className={`btn ${isCameraOn ? 'btn-primary' : 'btn-danger'}`} onClick={toggleCamera}>
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                {isCameraOn ? 'Camera On' : 'Camera Off'}
              </button>
              
              <button className={`btn ${isMicOn ? 'btn-primary' : 'btn-danger'}`} onClick={toggleMic}>
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                {isMicOn ? 'Mic On' : 'Mic Off'}
              </button>

              {/* GESTURE TOGGLE */}
              <button
                className={`btn ${gestureControlEnabled ? 'btn-success' : 'btn-primary'}`}
                onClick={() => setGestureControlEnabled(!gestureControlEnabled)}
              >
                ✋ Gestures {gestureControlEnabled ? 'ON' : 'OFF'}
              </button>
              
              <button className="btn btn-danger" onClick={handleEndInterview}>
                <StopCircle size={20} />
                End Interview
              </button>
            </div>

            {/* GESTURE LEGEND - updated labels */}
            {gestureControlEnabled && (
              <div style={{
                padding: '8px 15px', background: '#f3f4f6', fontSize: '0.78rem',
                color: '#374151', display: 'flex', gap: '14px', flexWrap: 'wrap',
                borderTop: '1px solid #e5e7eb'
              }}>
                <span>✋ Stop Listening</span>
                <span>✌️ Start Listening</span>
                <span>👍 Good</span>
                <span>👎 Bad</span>
                <span>☝️ Hint</span>
              </div>
            )}
          </div>

          {behaviorData && <BehaviorAnalysis data={behaviorData} />}
        </div>

        {/* CHAT SECTION — replaced with ChatInterface */}
        <div className="chat-section" style={{ padding: 0, margin: 0 }}>
          <ChatInterface
            messages={messages}
            onSendMessage={(text) => handleSendAnswer(false, text)}
            persona={persona}
            isListening={isListening}
            onStartListening={startListening}
            onStopListening={stopListening}
            currentTranscript={voiceTranscript}
            isAITyping={isAITyping}
            speechPauses={speechPauses}
          />
        </div>
      </div>

      {/* GESTURE CONTROL - fixed bottom-right corner */}
      <GestureControl isEnabled={gestureControlEnabled} onGesture={handleGesture} />
    </div>
  );
};

export default InterviewRoom;
