// GestureControl.js - Fixed version
import React, { useRef, useEffect, useState } from 'react';

const GestureControl = ({ onGesture, isEnabled }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const animationRef = useRef(null);
  const lastGestureTime = useRef(0);
  const lastGestureType = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // ← collapse to avoid covering chat input
  const [detectedGesture, setDetectedGesture] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!isEnabled) {
      stopEverything();
      return;
    }

    loadMediaPipe();

    return () => {
      stopEverything();
    };
  }, [isEnabled]);

  const stopEverything = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    handsRef.current = null;
    setIsLoading(false);
    setStatusMessage('');
  };

  const loadMediaPipe = async () => {
    setIsLoading(true);
    setStatusMessage('Loading gesture detection...');

    try {
      // Wait for MediaPipe to be available from CDN
      let attempts = 0;
      while (!window.Hands && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.Hands) {
        setStatusMessage('❌ MediaPipe not loaded. Check index.html scripts.');
        setIsLoading(false);
        return;
      }

      setStatusMessage('Setting up hand detection...');

      // Create MediaPipe Hands instance
      const hands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5
      });

      // Set up result callback
      hands.onResults(onResults);

      // Store in REF (not state!) so detectLoop can access it immediately
      handsRef.current = hands;

      // Start camera
      await startCamera();

      setIsLoading(false);
      setStatusMessage('✅ Gesture detection active!');

      // Clear status after 3 seconds
      setTimeout(() => setStatusMessage(''), 3000);

    } catch (error) {
      console.error('MediaPipe load error:', error);
      setStatusMessage('❌ Error loading gestures: ' + error.message);
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start detection loop AFTER camera is ready
      startDetectionLoop();

    } catch (error) {
      console.error('Camera error:', error);
      setStatusMessage('❌ Camera access denied');
    }
  };

  const startDetectionLoop = () => {
    const detect = async () => {
      // Use REF (always has current value)
      if (handsRef.current && videoRef.current && videoRef.current.readyState === 4) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          // Silently ignore frame errors
        }
      }
      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const onResults = (results) => {
    // Draw on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand skeleton
      drawHand(ctx, landmarks, canvas.width, canvas.height);

      // Detect gesture with COOLDOWN
      const gesture = recognizeGesture(landmarks);
      const now = Date.now();
      const timeSinceLastGesture = now - lastGestureTime.current;

      if (gesture) {
        // Only trigger if:
        // 1. Different gesture OR same gesture but 2 seconds passed
        const isDifferentGesture = gesture !== lastGestureType.current;
        const cooldownPassed = timeSinceLastGesture > 2000;

        if (isDifferentGesture || cooldownPassed) {
          console.log('✋ Gesture triggered:', gesture);
          lastGestureTime.current = now;
          lastGestureType.current = gesture;

          setDetectedGesture(gesture);
          onGesture(gesture);

          // Clear gesture display after 1.5 seconds
          setTimeout(() => {
            setDetectedGesture(null);
            lastGestureType.current = null;
          }, 1500);
        }
      }
    }
  };

  const drawHand = (ctx, landmarks, width, height) => {
    // Draw connections
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20]
    ];

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    });

    // Draw dots
    ctx.fillStyle = '#ff4444';
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const recognizeGesture = (landmarks) => {
    // Check if a finger is extended (tip is above pip joint)
    const isExtended = (tipIdx, pipIdx, mcpIdx) => {
      return landmarks[tipIdx].y < landmarks[pipIdx].y &&
             landmarks[pipIdx].y < landmarks[mcpIdx].y;
    };

    const indexUp  = isExtended(8, 6, 5);
    const middleUp = isExtended(12, 10, 9);
    const ringUp   = isExtended(16, 14, 13);
    const pinkyUp  = isExtended(20, 18, 17);

    const thumbTip = landmarks[4];
    const thumbIp  = landmarks[3];
    const wrist    = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip  = landmarks[16];
    const pinkyTip = landmarks[20];

    // ✋ PALM RAISE - all 4 fingers extended and hand is raised
    if (indexUp && middleUp && ringUp && pinkyUp) {
      const avgY = (indexTip.y + middleTip.y + ringTip.y + pinkyTip.y) / 4;
      if (avgY < wrist.y - 0.1) {
        return 'PALM_RAISE';
      }
    }

    // ✌️ PEACE/WAVE - index and middle up, ring and pinky down
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      return 'WAVE';
    }

    // ☝️ INDEX POINT - only index finger up
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      return 'INDEX_POINT';
    }

    // 👍 THUMBS UP - all fingers closed, thumb pointing up
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
      if (thumbTip.y < thumbIp.y - 0.04) {
        return 'THUMBS_UP';
      }
    }

    // 👎 THUMBS DOWN - all fingers closed, thumb pointing down
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
      if (thumbTip.y > thumbIp.y + 0.04) {
        return 'THUMBS_DOWN';
      }
    }

    return null;
  };

  const getGestureEmoji = (gesture) => {
    const map = {
      PALM_RAISE: '✋',
      WAVE: '✌️',
      THUMBS_UP: '👍',
      THUMBS_DOWN: '👎',
      INDEX_POINT: '☝️'
    };
    return map[gesture] || '👋';
  };

  const getGestureName = (gesture) => {
    const map = {
      PALM_RAISE: 'Stop Listening',
      WAVE: 'Start Listening',
      THUMBS_UP: 'Positive Feedback',
      THUMBS_DOWN: 'Negative Feedback',
      INDEX_POINT: 'Request Hint'
    };
    return map[gesture] || gesture;
  };

  if (!isEnabled) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      background: 'rgba(15, 15, 25, 0.92)',
      borderRadius: '14px',
      padding: '12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      width: isCollapsed ? 'auto' : '280px',
      touchAction: 'none'
    }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Header — click to collapse/expand */}
      <div
        onClick={() => setIsCollapsed(c => !c)}
        style={{
          color: 'white', fontSize: '13px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', userSelect: 'none',
          marginBottom: isCollapsed ? 0 : '8px'
        }}
      >
        <span>✋</span>
        {!isCollapsed && 'Gesture Control'}
        {isLoading && !isCollapsed && <span style={{ color: '#fbbf24', fontSize: '11px' }}>Loading...</span>}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af' }}>
          {isCollapsed ? '▲' : '▼'}
        </span>
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
          {/* Status message */}
          {statusMessage && (
            <div style={{ color: '#a3e635', fontSize: '11px', marginBottom: '8px' }}>
              {statusMessage}
            </div>
          )}
        </>
      )}

      {/* Video + Canvas — ALWAYS mounted so detection loop never loses its refs.
          Only visually hidden when collapsed. */}
      <div style={{
        position: 'relative', width: '256px', height: '192px',
        borderRadius: '8px', overflow: 'hidden', background: '#000',
        marginBottom: isCollapsed ? 0 : '10px',
        display: isCollapsed ? 'none' : 'block'   // hide visually, keep in DOM
      }}>
        <video
          ref={videoRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={256}
          height={192}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }}
        />
        {detectedGesture && (
          <div style={{
            position: 'absolute', top: '8px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(99, 102, 241, 0.95)',
            color: 'white', padding: '6px 14px',
            borderRadius: '20px', fontSize: '13px',
            fontWeight: 'bold', whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
          }}>
            {getGestureEmoji(detectedGesture)} {getGestureName(detectedGesture)}
          </div>
        )}
      </div>

      {/* Legend — only shown when expanded */}
      {!isCollapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {[
            ['✋', 'Stop Listen'],
            ['✌️', 'Start Listen'],
            ['👍', 'Good'],
            ['👎', 'Bad'],
            ['☝️', 'Hint'],
          ].map(([emoji, label]) => (
            <div key={label} style={{ color: '#d1d5db', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{emoji}</span> {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GestureControl;
