// TechPersona Backend Server
// AI-Powered Interview Coaching Platform
// ✨ Enhanced with Smart Conversation Engine

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────
// PERSONAS  (upgraded system prompts)
// ─────────────────────────────────────────
const PERSONAS = {
  friendly: {
    name: "Sarah Chen - Friendly Tech Lead",
    description: "Warm, encouraging, provides hints when stuck",
    difficulty: "medium",
    systemPrompt: `You are Sarah Chen, a friendly and supportive tech lead conducting a technical interview.

YOUR INTERVIEW STYLE:
- Ask thoughtful follow-up questions based on what the candidate just said
- Reference specific details they mentioned in previous answers
- Dig deeper when answers are vague or incomplete
- Encourage them to elaborate with phrases like "Tell me more about..." or "Can you walk me through..."
- Be warm but professional
- Ask ONE focused question at a time

CONVERSATION FLOW RULES:
1. ALWAYS analyse the candidate's last answer
2. Extract key technical terms they mentioned (e.g. "React", "Redux", "TypeScript")
3. Ask follow-up questions about those SPECIFIC topics
4. If they mention a project, ask about challenges they faced
5. If they mention a technology, ask about their implementation approach
6. Build on previous topics — reference what they said earlier

EXAMPLE GOOD FOLLOW-UPS:
- "You mentioned using Redux — how did you structure your state management?"
- "That dashboard sounds interesting! What was the most challenging feature to implement?"
- "Earlier you said you worked with APIs. How did you handle error states in that project?"

AVOID generic questions that ignore what they just said.`
  },

  tough: {
    name: "Michael Ross - Senior Engineer (Tough)",
    description: "Direct, challenges assumptions, high standards",
    difficulty: "hard",
    systemPrompt: `You are Michael Ross, a senior engineer known for thorough, challenging interviews.

YOUR INTERVIEW STYLE:
- Ask pointed follow-up questions based on their answers
- Challenge vague or superficial responses
- Dig into technical details and implementation specifics
- Push candidates to explain their reasoning
- Reference inconsistencies in their answers
- Be direct but not rude

CONVERSATION FLOW RULES:
1. Analyse their answer for depth and technical accuracy
2. If answer is vague, ask for specific examples or metrics
3. If they claim experience, ask them to prove it with details
4. Build on technical terms they use — ask implementation questions
5. Reference what they said earlier to check consistency

EXAMPLE CHALLENGING FOLLOW-UPS:
- "You said you 'optimised performance' — what specific metrics improved and by how much?"
- "Walk me through the actual code structure. How did you implement that?"
- "Earlier you mentioned React hooks, but that approach seems inefficient. Why did you choose it?"

DEMAND specifics over generalities.`
  },

  neutral: {
    name: "Dr. Alex Kumar - Neutral Interviewer",
    description: "Professional, balanced, standard corporate style",
    difficulty: "medium",
    systemPrompt: `You are Dr. Alex Kumar, a methodical and analytical interviewer focused on problem-solving abilities.

YOUR INTERVIEW STYLE:
- Ask systematic, logical follow-up questions
- Build conversation progressively from general to specific
- Focus on thought process and decision-making
- Reference their previous answers to create coherent conversation flow
- Ask for examples and evidence

CONVERSATION FLOW RULES:
1. Start with their answer, identify the main topic
2. Ask progressively deeper questions about that topic
3. Connect current question to previous answers
4. Focus on "how" and "why" they made decisions
5. Create a logical flow through the conversation

EXAMPLE METHODICAL FOLLOW-UPS:
- "Let's break that down. You mentioned X — what factors influenced that decision?"
- "Building on what you just said about Y, how did that integrate with Z you mentioned earlier?"
- "Walk me through your thought process step by step."

Each question should build on previous answers.`
  },

  silent: {
    name: "Emma Stone - Silent Observer",
    description: "Minimal reactions, tests candidate's confidence under pressure",
    difficulty: "hard",
    systemPrompt: `You are Emma Stone, a silent observer who asks minimal but highly impactful questions.

YOUR INTERVIEW STYLE:
- Ask very few questions, but make each one count
- Pick up on small details they mention and probe deeply
- Your questions should feel surprising but relevant
- Short questions (5-10 words)
- One question at a time

CONVERSATION FLOW RULES:
1. Listen carefully to EVERYTHING they say
2. Pick one specific detail from their answer
3. Ask a single, pointed question about that detail
4. Make them do most of the talking

EXAMPLE IMPACTFUL FOLLOW-UPS:
- "You said 'we' — tell me about your specific role."
- "Interesting. Why that approach specifically?"
- "The part about X — elaborate on that."

BE MINIMAL. Make every word count.`
  }
};

// ─────────────────────────────────────────
// QUESTION BANKS
// ─────────────────────────────────────────
const QUESTION_BANKS = {
  technical: [
    "Explain the difference between let, const, and var in JavaScript.",
    "What is the time complexity of binary search? Walk me through the algorithm.",
    "How would you optimise a slow database query?",
    "Explain how REST APIs work and what makes them RESTful.",
    "What's the difference between synchronous and asynchronous programming?",
    "How does a hash table work internally?",
    "Explain the concept of closures in JavaScript with an example.",
    "What are the main differences between SQL and NoSQL databases?"
  ],
  behavioral: [
    "Tell me about a time you had to deal with a difficult team member.",
    "Describe a situation where you had to meet a tight deadline.",
    "How do you handle disagreements with your manager or team?",
    "Tell me about a project that failed and what you learned from it.",
    "Describe a time when you had to learn a new technology quickly.",
    "How do you prioritise tasks when everything seems urgent?"
  ],
  problem_solving: [
    "How would you design a URL shortener like bit.ly?",
    "Estimate how many gas stations are in the United States.",
    "How would you test an elevator?",
    "Design a parking lot system for a mall.",
    "How would you detect a cycle in a linked list?"
  ]
};

// ─────────────────────────────────────────
// SMART CONVERSATION CONTEXT TRACKER
// ─────────────────────────────────────────
class ConversationContext {
  constructor() {
    this.topics = new Set();
    this.technicalTerms = new Set();
    this.projectsMentioned = [];
    this.previousAnswers = [];
  }

  analyzeAnswer(answer) {
    const techKeywords = [
      'react', 'redux', 'typescript', 'javascript', 'node', 'express',
      'mongodb', 'sql', 'api', 'rest', 'graphql', 'aws', 'docker',
      'git', 'agile', 'scrum', 'testing', 'jest', 'cypress',
      'performance', 'optimisation', 'optimization', 'security', 'authentication',
      'database', 'frontend', 'backend', 'fullstack', 'ui', 'ux',
      'python', 'django', 'flask', 'vue', 'angular', 'svelte',
      'hooks', 'context', 'state', 'component', 'async', 'promise'
    ];

    const lowerAnswer = answer.toLowerCase();
    techKeywords.forEach(term => {
      if (lowerAnswer.includes(term)) {
        this.technicalTerms.add(term);
        this.topics.add(term);
      }
    });

    if (lowerAnswer.includes('project') || lowerAnswer.includes('built') ||
        lowerAnswer.includes('developed') || lowerAnswer.includes('created')) {
      this.projectsMentioned.push({
        answer: answer.substring(0, 100),
        terms: Array.from(this.technicalTerms)
      });
    }

    this.previousAnswers.push({
      text: answer.substring(0, 200),
      topics: Array.from(this.topics).slice(-5)
    });

    // Keep only last 5 answers in memory
    if (this.previousAnswers.length > 5) {
      this.previousAnswers.shift();
    }
  }

  getContextSummary() {
    return {
      recentTopics: Array.from(this.topics).slice(-5),
      technicalTerms: Array.from(this.technicalTerms),
      projectsCount: this.projectsMentioned.length,
      conversationLength: this.previousAnswers.length
    };
  }

  getRecentContext() {
    if (this.previousAnswers.length === 0) return '';
    const recent = this.previousAnswers.slice(-2);
    return recent.map((ans, idx) =>
      `Previous answer ${idx + 1}: "${ans.text}..." (Topics: ${ans.topics.join(', ')})`
    ).join('\n');
  }
}

// One context tracker per session
const conversationContexts = new Map();

// ─────────────────────────────────────────
// AI RESPONSE  (smart context-aware)
// ─────────────────────────────────────────
async function getAIResponse(persona, conversationHistory, userMessage, sessionId) {
  // Get or create smart context for this session
  if (!conversationContexts.has(sessionId)) {
    conversationContexts.set(sessionId, new ConversationContext());
  }
  const context = conversationContexts.get(sessionId);
  context.analyzeAnswer(userMessage);

  const contextSummary = context.getContextSummary();
  const personaConfig = PERSONAS[persona];

  // Build the full conversation transcript so the AI sees exactly what happened
  const transcript = conversationHistory
    .slice(-10)  // last 10 messages is plenty
    .map(msg => {
      const speaker = msg.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  // Topics the candidate has mentioned across the session
  const topicsUsed = contextSummary.technicalTerms.join(', ') || 'none detected yet';

  const prompt = `You are ${personaConfig.name}, conducting a technical job interview.

PERSONALITY: ${personaConfig.systemPrompt}

---
FULL CONVERSATION SO FAR:
${transcript}

---
CANDIDATE JUST SAID:
"${userMessage}"

---
WHAT YOU KNOW ABOUT THIS CANDIDATE:
- Technical topics they have mentioned: ${topicsUsed}
- Number of exchanges so far: ${conversationHistory.length}

---
YOUR JOB RIGHT NOW:
Write your NEXT spoken response as the interviewer. It must:
1. Directly react to what the candidate JUST said — acknowledge it naturally
2. Ask ONE specific follow-up question about something in their answer
3. If they said they don't know something, be supportive and either simplify the question or pivot to something related they might know
4. Sound like a real human conversation, not a checklist
5. Be 2-3 sentences MAX — short, natural, conversational
6. NEVER start with "Good." or "Great." or generic filler — react specifically

EXAMPLES of good responses:
- "That's honest — APIs can be tricky. Let me ask it differently: have you ever used fetch() or axios in a project to get data from somewhere?"
- "You mentioned you don't know much about APIs yet. What backend technologies have you worked with, if any?"
- "Interesting — so REST is new to you. What part of the question tripped you up most?"

Write ONLY your response, nothing else:`;

  try {
    console.log(`\n[AI] ========== NEW REQUEST ==========`);
    console.log(`[AI] Persona: ${personaConfig.name}`);
    console.log(`[AI] User message: "${userMessage.substring(0, 100)}"`);
    console.log(`[AI] Topics tracked: ${topicsUsed}`);
    console.log(`[AI] Calling Gemini...`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 180,
        temperature: 0.85
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log(`[AI] ✅ Gemini responded: "${text}"`);
    console.log(`[AI] =====================================\n`);

    return text;

  } catch (error) {
    console.error(`[AI] ❌ GEMINI FAILED: ${error.message}`);
    console.error(`[AI] Full error:`, error);
    console.log(`[AI] Using smart fallback instead`);
    return getSmartFallback(userMessage, personaConfig, context);
  }
}

// ─────────────────────────────────────────
// SMART FALLBACK  (context-aware)
// ─────────────────────────────────────────
function getSmartFallback(userMessage, personaConfig, context) {
  const lower = userMessage.toLowerCase();
  const contextSummary = context.getContextSummary();
  const recentTopics = contextSummary.recentTopics;

  // Candidate admitted they don't know something — handle gracefully
  if (lower.includes("don't know") || lower.includes("not sure") ||
      lower.includes("no idea") || lower.includes("never used") ||
      lower.includes("not familiar") || lower.includes("haven't")) {
    const pivots = [
      "That's completely fine — let's try a different angle. Can you tell me about any project you've built, even a small one?",
      "No worries at all. What technologies have you spent the most time with so far?",
      "That's honest, I appreciate it. What would you say is your strongest technical area right now?",
      "Fair enough. Let's shift — tell me about something you have built recently, whatever comes to mind."
    ];
    return pivots[Math.floor(Math.random() * pivots.length)];
  }

  // Candidate mentioned specific tech — ask about it
  const techMap = {
    'react': "You brought up React — what kind of components have you built with it?",
    'redux': "How did you structure your Redux store? Walk me through your approach.",
    'node': "Tell me about your Node.js work — what kind of server did you build?",
    'api': "You mentioned APIs — can you describe one you've worked with closely?",
    'database': "What database have you used most, and how did you structure your data?",
    'testing': "What's your testing approach — unit tests, integration, or something else?",
    'typescript': "How has TypeScript changed how you write code day to day?",
    'python': "What have you built with Python? What libraries did you lean on?",
    'docker': "How are you using Docker — local dev, production, or both?",
    'aws': "Which AWS services have you used and what were you building?",
    'git': "Walk me through how you use Git in a team setting.",
    'sql': "Tell me about a database query you found particularly challenging."
  };

  for (const [term, response] of Object.entries(techMap)) {
    if (lower.includes(term)) return response;
  }

  // Candidate mentioned a project
  if (lower.includes('built') || lower.includes('project') ||
      lower.includes('developed') || lower.includes('created') ||
      lower.includes('worked on')) {
    return "That project sounds interesting — what was the hardest technical problem you ran into?";
  }

  // Candidate mentioned a struggle or challenge
  if (lower.includes('problem') || lower.includes('challenge') ||
      lower.includes('difficult') || lower.includes('struggle') ||
      lower.includes('hard')) {
    return "How did you work through that? Walk me through your thinking.";
  }

  // Reference a previous topic if we have one
  if (recentTopics.length > 0) {
    const prevTopic = recentTopics[recentTopics.length - 1];
    return `You mentioned ${prevTopic} earlier — how confident do you feel with that? Any gaps you're still working on?`;
  }

  // Persona-specific last resort
  const personaFallbacks = {
    'Sarah Chen - Friendly Tech Lead':
      "Tell me about the most recent thing you built or worked on — whatever's freshest in your mind.",
    'Michael Ross - Senior Engineer (Tough)':
      "Stop being vague — give me a concrete example from something you actually shipped.",
    'Dr. Alex Kumar - Neutral Interviewer':
      "Let's be specific. Walk me through a technical decision you made recently and why.",
    'Emma Stone - Silent Observer':
      "What specifically?"
  };

  return personaFallbacks[personaConfig.name] ||
    "Tell me about something technical you've worked on recently.";
}

// ─────────────────────────────────────────
// BEHAVIOR ANALYSIS
// ─────────────────────────────────────────
function analyzeBehavior(behaviorData) {
  const analysis = {
    confidence: 'medium',
    eyeContact: 'good',
    clarity: 'clear',
    pacing: 'appropriate',
    thinkingTime: 'optimal',
    silenceComfort: 'comfortable',
    hesitationScore: 100,
    fillerWordScore: 100,
    overallScore: 75,
    insights: [],
    voiceMetrics: {}
  };

  if (behaviorData.thinkingTime) {
    if (behaviorData.thinkingTime < 2) {
      analysis.insights.push("You responded very quickly — consider taking more time to think through complex questions.");
      analysis.thinkingTime = 'too_fast';
      analysis.overallScore -= 5;
    } else if (behaviorData.thinkingTime > 15) {
      analysis.insights.push("Long pause before answering — practice structuring your thoughts more quickly.");
      analysis.thinkingTime = 'too_slow';
      analysis.overallScore -= 10;
    } else if (behaviorData.thinkingTime >= 3 && behaviorData.thinkingTime <= 8) {
      analysis.insights.push("Good thinking time — shows thoughtful consideration.");
      analysis.overallScore += 5;
    }
  }

  if (behaviorData.answerLength) {
    if (behaviorData.answerLength < 50) {
      analysis.insights.push("Answer was quite brief — try to provide more detailed explanations.");
      analysis.clarity = 'too_brief';
      analysis.overallScore -= 5;
    } else if (behaviorData.answerLength > 500) {
      analysis.insights.push("Answer was very long — practice being more concise.");
      analysis.clarity = 'too_verbose';
      analysis.overallScore -= 5;
    }
  }

  if (behaviorData.fillerWords !== undefined) {
    analysis.fillerWordScore = Math.max(0, 100 - (behaviorData.fillerWords * 10));
    if (behaviorData.fillerWords === 0) {
      analysis.confidence = 'high';
      analysis.insights.push("Excellent! No filler words detected — very confident communication.");
      analysis.overallScore += 10;
    } else if (behaviorData.fillerWords >= 1 && behaviorData.fillerWords <= 2) {
      analysis.confidence = 'medium';
      analysis.insights.push(`${behaviorData.fillerWords} filler word(s) detected — try to eliminate these for stronger presence.`);
      analysis.overallScore -= 3;
    } else {
      analysis.confidence = 'low';
      analysis.insights.push(`⚠️ ${behaviorData.fillerWords} filler words detected (um, uh, like) — practice reducing these significantly.`);
      analysis.overallScore -= (behaviorData.fillerWords * 3);
    }
  }

  if (behaviorData.fromVoice) {
    analysis.voiceMetrics.isVoiceAnswer = true;

    if (behaviorData.hesitationPauses !== undefined) {
      analysis.voiceMetrics.hesitationPauses = behaviorData.hesitationPauses;
      if (behaviorData.hesitationPauses === 0) {
        analysis.insights.push("🎤 Smooth speech delivery — no hesitation pauses detected!");
        analysis.hesitationScore = 100;
        analysis.overallScore += 10;
      } else if (behaviorData.hesitationPauses >= 1 && behaviorData.hesitationPauses <= 2) {
        analysis.insights.push(`🎤 ${behaviorData.hesitationPauses} hesitation pause(s) detected — work on maintaining speech flow.`);
        analysis.hesitationScore = 75;
        analysis.overallScore -= 5;
      } else {
        analysis.insights.push(`⚠️ ${behaviorData.hesitationPauses} hesitation pauses detected — practice speaking more continuously.`);
        analysis.hesitationScore = Math.max(0, 100 - (behaviorData.hesitationPauses * 15));
        analysis.overallScore -= (behaviorData.hesitationPauses * 5);
      }
    }

    if (behaviorData.averagePauseDuration && behaviorData.averagePauseDuration > 0) {
      analysis.voiceMetrics.averagePauseDuration = behaviorData.averagePauseDuration.toFixed(1);
      if (behaviorData.averagePauseDuration > 3) {
        analysis.insights.push(`⚠️ Average pause duration: ${behaviorData.averagePauseDuration.toFixed(1)}s — very long hesitations detected.`);
        analysis.overallScore -= 10;
      } else if (behaviorData.averagePauseDuration > 2) {
        analysis.insights.push(`Pause duration: ${behaviorData.averagePauseDuration.toFixed(1)}s — try to reduce thinking pauses.`);
        analysis.overallScore -= 5;
      }
    }

    if (behaviorData.speechDuration && behaviorData.answerLength) {
      const wordsPerSecond = (behaviorData.answerLength / 5) / behaviorData.speechDuration;
      analysis.voiceMetrics.speechPacing = wordsPerSecond.toFixed(1);
      if (wordsPerSecond < 1.5) {
        analysis.pacing = 'too_slow';
        analysis.insights.push("Speech pacing is quite slow — try to speak more naturally.");
        analysis.overallScore -= 5;
      } else if (wordsPerSecond > 4) {
        analysis.pacing = 'too_fast';
        analysis.insights.push("Speaking very quickly — slow down for better clarity.");
        analysis.overallScore -= 5;
      } else {
        analysis.pacing = 'good';
        analysis.insights.push("Good speech pacing — natural and clear delivery.");
        analysis.overallScore += 5;
      }
    }
  }

  if (behaviorData.lookingAway === true) {
    analysis.eyeContact = 'poor';
    analysis.insights.push("Maintain eye contact with the camera — it shows confidence and engagement.");
    analysis.overallScore -= 10;
  }

  analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore));
  return analysis;
}

// ─────────────────────────────────────────
// ACTIVE SESSIONS STORE
// ─────────────────────────────────────────
const activeSessions = new Map();

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TechPersona backend is running' });
});

// ── DIAGNOSTIC: hit http://localhost:5000/api/test-ai in your browser ──────
// If Gemini works you'll see a real AI reply. If you see an error, fix API key.
app.get('/api/test-ai', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
    });
    const result = await model.generateContent(
      'You are a friendly interviewer. The candidate just said "I have 2 years of React experience." ' +
      'Write ONE short follow-up question (1 sentence).'
    );
    const text = result.response.text().trim();
    console.log('[TEST-AI] Gemini responded:', text);
    res.json({ success: true, geminiResponse: text, apiKeySet: !!process.env.GEMINI_API_KEY });
  } catch (err) {
    console.error('[TEST-AI] Gemini FAILED:', err.message);
    res.json({ success: false, error: err.message, apiKeySet: !!process.env.GEMINI_API_KEY });
  }
});

app.get('/api/personas', (req, res) => {
  const personaList = Object.keys(PERSONAS).map(key => ({
    id: key,
    name: PERSONAS[key].name,
    description: PERSONAS[key].description,
    difficulty: PERSONAS[key].difficulty
  }));
  res.json({ personas: personaList });
});

// Start new interview session
app.post('/api/session/start', (req, res) => {
  const { persona, categories } = req.body;

  if (!PERSONAS[persona]) {
    return res.status(400).json({ error: 'Invalid persona' });
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const category = categories && categories.length > 0 ? categories[0] : 'technical';
  const questions = QUESTION_BANKS[category] || QUESTION_BANKS.technical;
  const initialQuestion = questions[Math.floor(Math.random() * questions.length)];

  const session = {
    id: sessionId,
    persona,
    categories: categories || ['technical'],
    conversationHistory: [],
    currentQuestion: initialQuestion,
    startTime: Date.now(),
    questionCount: 0,
    behavioralData: []
  };

  activeSessions.set(sessionId, session);

  // Also create a smart context for this session
  conversationContexts.set(sessionId, new ConversationContext());

  const greeting = `Hello! I'm ${PERSONAS[persona].name}. Thanks for taking the time to interview with us today. Let's get started. ${initialQuestion}`;

  session.conversationHistory.push({
    role: 'assistant',
    content: greeting,
    timestamp: Date.now()
  });

  res.json({
    sessionId,
    greeting,
    question: initialQuestion,
    persona: PERSONAS[persona].name
  });
});

// Send answer — smart context-aware response
app.post('/api/session/answer', async (req, res) => {
  const { sessionId, answer, behaviorData } = req.body;

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    session.conversationHistory.push({
      role: 'user',
      content: answer,
      timestamp: Date.now(),
      behaviorData: behaviorData || {}
    });

    const behaviorAnalysis = analyzeBehavior(behaviorData || {});
    session.behavioralData.push(behaviorAnalysis);

    // Smart AI response — passes sessionId so context is tracked
    const aiResponse = await getAIResponse(
      session.persona,
      session.conversationHistory,
      answer,
      sessionId          // ← NEW: enables smart conversation context
    );

    session.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    });

    session.questionCount++;

    // NOTE: We do NOT inject random next questions anymore.
    // The smart AI follow-up IS the next question — that's the whole point.

    res.json({
      response: aiResponse,
      nextQuestion: null,
      behaviorAnalysis,
      questionCount: session.questionCount
    });

  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// End session and return full report
app.post('/api/session/end', (req, res) => {
  const { sessionId } = req.body;

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const duration = Date.now() - session.startTime;
  const avgBehaviorScore = session.behavioralData.reduce((sum, d) => sum + d.overallScore, 0) /
                           session.behavioralData.length || 0;

  const report = {
    sessionId,
    persona: PERSONAS[session.persona].name,
    duration: Math.floor(duration / 1000),
    questionCount: session.questionCount,
    conversationHistory: session.conversationHistory,
    behavioralData: session.behavioralData,
    averageScore: Math.round(avgBehaviorScore),
    recommendations: generateRecommendations(session.behavioralData),
    mirrorModeData: prepareMirrorMode(session)
  };

  activeSessions.delete(sessionId);
  conversationContexts.delete(sessionId); // clean up smart context too

  res.json(report);
});

// Clear context endpoint (useful for resets)
app.post('/api/clear-context', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversationContexts.delete(sessionId);
  res.json({ message: 'Context cleared' });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeSessions: activeSessions.size,
    availablePersonas: Object.keys(PERSONAS).length,
    totalQuestions: Object.values(QUESTION_BANKS).flat().length
  });
});

// ─────────────────────────────────────────
// REPORT HELPERS
// ─────────────────────────────────────────
function generateRecommendations(behavioralData) {
  if (!behavioralData || behavioralData.length === 0) {
    return [{
      area: 'General',
      issue: 'No data collected yet',
      suggestion: 'Complete at least one full answer to get personalized recommendations.',
      priority: 'info'
    }];
  }

  const recommendations = [];
  const strengths = [];

  // Calculate aggregates
  const avgScore = behavioralData.reduce((sum, d) => sum + d.overallScore, 0) / behavioralData.length;
  const totalFillerWords = behavioralData.reduce((sum, d) => 
    d.fillerWordScore ? (100 - d.fillerWordScore) / 10 : 0, 0);
  const avgFillerWords = totalFillerWords / behavioralData.length;
  
  const voiceAnswers = behavioralData.filter(d => d.voiceMetrics?.isVoiceAnswer);
  const totalHesitations = voiceAnswers.reduce((sum, d) => 
    d.voiceMetrics?.hesitationPauses || 0, 0);
  
  const lowConfidenceCount = behavioralData.filter(d => d.confidence === 'low').length;
  const briefAnswers = behavioralData.filter(d => d.clarity === 'too_brief').length;
  const verboseAnswers = behavioralData.filter(d => d.clarity === 'too_verbose').length;
  const slowThinking = behavioralData.filter(d => d.thinkingTime === 'too_slow').length;
  const fastThinking = behavioralData.filter(d => d.thinkingTime === 'too_fast').length;

  // === STRENGTHS (What they did WELL) ===
  
  if (avgScore >= 85) {
    strengths.push({
      area: '🎯 Overall Performance',
      message: `Excellent work! Your average score of ${Math.round(avgScore)}/100 shows strong interview skills.`,
      priority: 'strength'
    });
  }

  if (avgFillerWords < 1 && behavioralData.length >= 2) {
    strengths.push({
      area: '💬 Clear Communication',
      message: 'You speak clearly with minimal filler words ("um", "uh", "like"). This shows confidence!',
      priority: 'strength'
    });
  }

  if (voiceAnswers.length > 0 && totalHesitations <= voiceAnswers.length) {
    strengths.push({
      area: '🎤 Smooth Speech Flow',
      message: 'Your speech delivery is smooth with very few hesitation pauses. Keep it up!',
      priority: 'strength'
    });
  }

  const goodPacingCount = behavioralData.filter(d => 
    d.thinkingTime === 'optimal' || d.pacing === 'good'
  ).length;
  if (goodPacingCount >= behavioralData.length * 0.7) {
    strengths.push({
      area: '⏱️ Great Pacing',
      message: 'You take appropriate time to think and answer at a natural pace. Well balanced!',
      priority: 'strength'
    });
  }

  // === AREAS FOR IMPROVEMENT (Specific, actionable) ===

  // Filler words
  if (avgFillerWords >= 3) {
    recommendations.push({
      area: 'Filler Words',
      issue: `Average of ${Math.round(avgFillerWords)} filler words per answer ("um", "uh", "like")`,
      suggestion: 'Pause silently instead of filling with "um". Practice: Record yourself answering a question, count filler words, then re-record trying to cut them by 50%.',
      priority: 'high'
    });
  } else if (avgFillerWords >= 1.5) {
    recommendations.push({
      area: 'Filler Words',
      issue: `You use ${Math.round(avgFillerWords)} filler words per answer on average`,
      suggestion: 'Close! When you feel "um" coming, take a breath instead. Silence is better than filler.',
      priority: 'medium'
    });
  }

  // Hesitation pauses (voice specific)
  if (voiceAnswers.length > 0 && totalHesitations >= voiceAnswers.length * 2) {
    const avgPauses = (totalHesitations / voiceAnswers.length).toFixed(1);
    recommendations.push({
      area: 'Speech Hesitation',
      issue: `Average of ${avgPauses} hesitation pauses per voice answer (2+ second pauses mid-speech)`,
      suggestion: 'Practice thinking before speaking rather than during. Structure: Think (silent) → Speak (continuous). Try outlining your answer in your head for 3 seconds before starting.',
      priority: 'high'
    });
  }

  // Confidence issues
  if (lowConfidenceCount >= behavioralData.length * 0.6) {
    recommendations.push({
      area: 'Confidence',
      issue: `${lowConfidenceCount} out of ${behavioralData.length} answers showed low confidence markers`,
      suggestion: 'Speak assertively even when unsure. Replace "I think maybe..." with "My approach would be...". Practice power posing for 2 minutes before interviews.',
      priority: 'high'
    });
  }

  // Answer length issues
  if (briefAnswers >= behavioralData.length * 0.5) {
    recommendations.push({
      area: 'Answer Depth',
      issue: `${briefAnswers} answers were too brief (under 50 characters)`,
      suggestion: 'Use the STAR method: Situation, Task, Action, Result. Aim for 2-3 sentences minimum per answer.',
      priority: 'medium'
    });
  }

  if (verboseAnswers >= 2) {
    recommendations.push({
      area: 'Conciseness',
      issue: `${verboseAnswers} answers were too long (over 500 characters)`,
      suggestion: 'Practice the "headline first" method: State your main point in 1 sentence, then add details only if needed. Watch for tangents.',
      priority: 'medium'
    });
  }

  // Thinking time
  if (slowThinking >= behavioralData.length * 0.5) {
    recommendations.push({
      area: 'Response Time',
      issue: `You took over 15 seconds to start answering ${slowThinking} times`,
      suggestion: 'It\'s okay to think, but practice structuring thoughts faster. Try: acknowledge the question ("Good question..."), then think while outlining ("There are a few aspects..."), then dive in.',
      priority: 'medium'
    });
  }

  if (fastThinking >= behavioralData.length * 0.5) {
    recommendations.push({
      area: 'Thinking Time',
      issue: `You responded very quickly (under 2 seconds) ${fastThinking} times`,
      suggestion: 'Take time to think! Quick answers can seem impulsive. Pause 3-5 seconds before complex questions to show you\'re considering carefully.',
      priority: 'low'
    });
  }

  // Voice-specific pacing issues
  const slowSpeech = voiceAnswers.filter(d => d.pacing === 'too_slow').length;
  const fastSpeech = voiceAnswers.filter(d => d.pacing === 'too_fast').length;

  if (slowSpeech >= voiceAnswers.length * 0.5) {
    recommendations.push({
      area: 'Speech Pace',
      issue: 'Your speaking pace is quite slow',
      suggestion: 'Practice speaking slightly faster. Record yourself and play at 1.25x speed — that\'s closer to natural conversational pace.',
      priority: 'low'
    });
  }

  if (fastSpeech >= voiceAnswers.length * 0.5) {
    recommendations.push({
      area: 'Speech Pace',
      issue: 'You speak very quickly, which can affect clarity',
      suggestion: 'Slow down intentionally. Take breaths between sentences. Remember: clarity > speed.',
      priority: 'medium'
    });
  }

  // If no issues found, add encouragement
  if (recommendations.length === 0 && strengths.length === 0) {
    strengths.push({
      area: 'Solid Performance',
      message: 'You performed well! Keep practicing with tougher personas and more complex questions to challenge yourself.',
      priority: 'strength'
    });
  }

  // Return strengths first, then improvements
  return [...strengths, ...recommendations];
}

function prepareMirrorMode(session) {
  return {
    timeline: session.conversationHistory.map((msg, index) => ({
      timestamp: msg.timestamp - session.startTime,
      speaker: msg.role === 'user' ? 'You' : session.persona,
      content: msg.content,
      analysis: msg.role === 'user' ? session.behavioralData[Math.floor(index / 2)] : null,
      annotations: msg.role === 'user'
        ? generateAnnotations(msg.content, session.behavioralData[Math.floor(index / 2)])
        : null
    })),
    keyMoments: identifyKeyMoments(session)
  };
}

function generateAnnotations(answer, behaviorData) {
  if (!behaviorData) return [];
  const annotations = [];

  if (behaviorData.confidence === 'low') {
    annotations.push({ type: 'confidence', message: 'Confidence dropped here — noticed hesitation', severity: 'warning' });
  }
  if (behaviorData.clarity === 'too_verbose') {
    annotations.push({ type: 'clarity', message: 'Answer became unfocused — try to stay on point', severity: 'info' });
  }
  if (behaviorData.thinkingTime === 'too_slow') {
    annotations.push({ type: 'timing', message: 'Long pause before answering — practice thinking faster', severity: 'warning' });
  }
  return annotations;
}

function identifyKeyMoments(session) {
  const moments = [];
  session.behavioralData.forEach((data, index) => {
    if (data.overallScore >= 85) {
      moments.push({
        type: 'success',
        index,
        message: 'Strong answer with good delivery',
        timestamp: session.conversationHistory[index * 2 + 1]?.timestamp
      });
    } else if (data.overallScore < 60) {
      moments.push({
        type: 'struggle',
        index,
        message: 'Struggled here — review this section',
        timestamp: session.conversationHistory[index * 2 + 1]?.timestamp
      });
    }
  });
  return moments;
}

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ================================`);
  console.log(`🚀 TechPersona Backend v2 (SMART)`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`🚀 Gemini API key set: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`🚀 Test AI at: http://localhost:${PORT}/api/test-ai`);
  console.log(`🚀 ================================\n`);
});
