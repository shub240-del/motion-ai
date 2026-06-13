/**
 * Motion AI - Hand-Tracking Visual & Auditory Playground Engine
 * Core JavaScript Logic
 */

// --- Global Sandbox State ---
const state = {
  currentMode: 'laser', // 'laser' | 'web' | 'harp' | 'paint' | 'interview'
  volume: 0.4,
  waveform: 'triangle',
  isDelayEnabled: true,
  particleDensity: 50,
  confidenceThreshold: 0.5,
  drawingColor: '#3b82f6', // Hex code or 'eraser'
  isCameraActive: false,
  fps: 0,
  handsCount: 0,
  systemLog: 'System initialized. Ready.'
};

// --- DOM References ---
const videoElement = document.getElementById('webcam-video');
const canvasElement = document.getElementById('sandbox-canvas');
const canvasCtx = canvasElement.getContext('2d');
const visualizerCanvas = document.getElementById('audio-visualizer-canvas');
const visualizerCtx = visualizerCanvas.getContext('2d');

const btnToggleCamera = document.getElementById('btn-toggle-camera');
const cameraIcon = document.getElementById('camera-btn-icon');
const cameraText = document.getElementById('camera-btn-text');

const cameraStatusDot = document.getElementById('camera-status-dot');
const cameraStatusText = document.getElementById('camera-status-text');
const trackingStatusDot = document.getElementById('tracking-status-dot');
const trackingStatusText = document.getElementById('tracking-status-text');
const fpsCounter = document.getElementById('fps-counter');
const valSyslog = document.getElementById('val-syslog');
const mpLoader = document.getElementById('mp-loader');
const videoPlaceholder = document.getElementById('video-placeholder');

const sliderVolume = document.getElementById('slider-volume');
const valVolume = document.getElementById('val-volume');
const sliderParticleDensity = document.getElementById('slider-particle-density');
const valParticleDensity = document.getElementById('val-particle-density');
const sliderConfidence = document.getElementById('slider-confidence');
const valConfidence = document.getElementById('val-confidence');
const selectWaveform = document.getElementById('select-waveform');
const toggleDelay = document.getElementById('toggle-delay');

// Mode selectors
const modeCards = document.querySelectorAll('.mode-card');

// Air Paint Controls
const paintToolbar = document.getElementById('paint-toolbar');
const colorButtons = document.querySelectorAll('.color-btn');
const btnClearCanvas = document.getElementById('btn-clear-canvas');

// Interview Controls
const interviewDashboard = document.getElementById('interview-dashboard');
const speechOverlay = document.getElementById('speech-overlay');
const speechTranscript = document.getElementById('speech-transcript');
const scoreCircle = document.getElementById('score-circle-progress');
const scoreText = document.getElementById('score-text');
const scoreLabel = document.getElementById('score-label');
const statHandSpeed = document.getElementById('stat-hand-speed');
const statHandJitter = document.getElementById('stat-hand-jitter');
const countFillerUm = document.getElementById('count-filler-um');
const countFillerLike = document.getElementById('count-filler-like');
const countFillerSo = document.getElementById('count-filler-so');
const countFillerYouknow = document.getElementById('count-filler-youknow');
const coachingFeed = document.getElementById('coaching-feed');
const btnResetInterview = document.getElementById('btn-reset-interview');
const sessionTimeVal = document.getElementById('session-time');

// New Report Modal elements
const btnEndInterview = document.getElementById('btn-end-interview');
const reportModal = document.getElementById('report-modal');
const btnCloseReport = document.getElementById('btn-close-report');
const btnModalRestart = document.getElementById('btn-modal-restart');
const btnModalDownload = document.getElementById('btn-modal-download');
const modalScoreCircle = document.getElementById('modal-score-circle');
const modalScoreText = document.getElementById('modal-score-text');
const modalGradeText = document.getElementById('modal-grade-text');
const modalDuration = document.getElementById('modal-duration');
const modalMetricSpeed = document.getElementById('modal-metric-speed');
const modalMetricJitter = document.getElementById('modal-metric-jitter');
const modalMetricClarity = document.getElementById('modal-metric-clarity');
const modalBarSpeed = document.getElementById('modal-bar-speed');
const modalBarJitter = document.getElementById('modal-bar-jitter');
const modalBarClarity = document.getElementById('modal-bar-clarity');
const modalCountUm = document.getElementById('modal-count-um');
const modalCountLike = document.getElementById('modal-count-like');
const modalCountSo = document.getElementById('modal-count-so');
const modalCountYouknow = document.getElementById('modal-count-youknow');
const modalCoachingTakeaway = document.getElementById('modal-coaching-takeaway');

// --- Global Audio Setup ---
let audioCtx = null;
let masterGain = null;
let delayNode = null;
let delayFeedback = null;
let analyserNode = null;

function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master Gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(state.volume, audioCtx.currentTime);

    // Analyser Node
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;

    // Delay Node setup
    delayNode = audioCtx.createDelay(1.0);
    delayFeedback = audioCtx.createGain();
    
    delayNode.delayTime.setValueAtTime(0.35, audioCtx.currentTime);
    delayFeedback.gain.setValueAtTime(0.4, audioCtx.currentTime);

    // Routing
    // Osc -> NoteGain -> delayNode -> delayFeedback -> delayNode (feedback loop)
    // Osc -> NoteGain -> masterGain -> analyserNode -> destination
    // delayNode -> masterGain
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    masterGain.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    logSystem('Web Audio synth engine activated.');
    startAudioVisualizer();
  } catch (e) {
    console.error('Failed to initialize AudioContext:', e);
    logSystem('Web Audio initialization failed.');
  }
}

function playSynthNote(frequency, duration = 0.5, volumeMultiplier = 1.0) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();

  osc.type = state.waveform;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  // Attack-Decay-Sustain-Release (ADSR) Envelope
  const now = audioCtx.currentTime;
  noteGain.gain.setValueAtTime(0, now);
  noteGain.gain.linearRampToValueAtTime(state.volume * volumeMultiplier * 0.5, now + 0.05); // Attack
  noteGain.gain.exponentialRampToValueAtTime(state.volume * volumeMultiplier * 0.2, now + duration * 0.4); // Decay/Sustain
  noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Release

  osc.connect(noteGain);
  noteGain.connect(masterGain);

  if (state.isDelayEnabled && delayNode) {
    noteGain.connect(delayNode);
  }

  osc.start(now);
  osc.stop(now + duration);
}

// --- Audio Visualizer Loop ---
function startAudioVisualizer() {
  if (!analyserNode) return;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyserNode) return;

    analyserNode.getByteFrequencyData(dataArray);

    const w = visualizerCanvas.width;
    const h = visualizerCanvas.height;
    
    // Clear canvas with trace effect
    visualizerCtx.fillStyle = 'rgba(11, 12, 22, 0.3)';
    visualizerCtx.fillRect(0, 0, w, h);

    const barWidth = (w / bufferLength) * 1.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * h;

      // Color gradient based on frequency
      const hue = (i / bufferLength) * 120 + 240; // Violet to Cyan
      visualizerCtx.fillStyle = `hsla(${hue}, 85%, 55%, 0.85)`;
      
      // Rounded bar drawing
      visualizerCtx.fillRect(x, h - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }
  }
  
  // Fit size
  visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
  visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight;
  window.addEventListener('resize', () => {
    visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
    visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight;
  });

  drawVisualizer();
}

// --- Global Speech Recognition Setup (Interview Mode) ---
let speechRecognizer = null;
let interviewSessionActive = false;
let interviewStartTime = 0;
let interviewTimerInterval = null;
let interviewStats = {
  um: 0,
  like: 0,
  so: 0,
  youknow: 0,
  totalWords: 0,
  speechConfidence: 0.85,
  jitterHistory: [],
  speedHistory: []
};

function initSpeechRecognition() {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    logSystem('Web Speech Recognition API not supported in this browser.');
    return;
  }

  speechRecognizer = new SpeechRecognitionClass();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = 'en-US';

  speechRecognizer.onstart = () => {
    logSystem('Speech recognizer active. Analyzing verbal patterns...');
    speechTranscript.textContent = 'Listening... Speak naturally.';
  };

  speechRecognizer.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      logSystem('Microphone permission denied.');
      speechTranscript.textContent = 'Microphone permission denied. Speech analysis disabled.';
    }
  };

  speechRecognizer.onend = () => {
    if (state.currentMode === 'interview' && state.isCameraActive && interviewSessionActive) {
      // Restart speech service if it stops during active session
      try {
        speechRecognizer.start();
      } catch (e) {}
    }
  };

  speechRecognizer.onresults = speechRecognizer.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const activeText = finalTranscript || interimTranscript;
    if (activeText.trim()) {
      speechTranscript.textContent = activeText;
      
      // Analyze for filler words
      if (finalTranscript) {
        analyzeFillerWords(finalTranscript);
      }
    }
  };
}

function startInterviewSession() {
  if (interviewSessionActive) return;
  interviewSessionActive = true;
  interviewStartTime = Date.now();
  
  // Clear scores
  interviewStats.um = 0;
  interviewStats.like = 0;
  interviewStats.so = 0;
  interviewStats.youknow = 0;
  interviewStats.jitterHistory = [];
  interviewStats.speedHistory = [];
  
  updateInterviewUI();
  coachingFeed.innerHTML = '';
  addCoachingMessage('info', 'Session started. Keep head tall, look at camera, and utilize hand gestures naturally to emphasize key sentences.');

  // Start Speech
  if (speechRecognizer) {
    try {
      speechRecognizer.start();
    } catch (e) {
      console.log('Recognizer already running.');
    }
  }

  // Timer
  interviewTimerInterval = setInterval(() => {
    const elapsed = Date.now() - interviewStartTime;
    const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
    sessionTimeVal.textContent = `${minutes}:${seconds}`;
  }, 1000);

  logSystem('Interview evaluation session started.');
}

function stopInterviewSession() {
  if (!interviewSessionActive) return;
  interviewSessionActive = false;
  clearInterval(interviewTimerInterval);
  
  if (speechRecognizer) {
    try {
      speechRecognizer.stop();
    } catch (e) {}
  }

  logSystem('Interview evaluation session completed.');
  addCoachingMessage('success', 'Session complete! Review your Scorecard and Coaching feedback to improve packaging.');
}

function analyzeFillerWords(text) {
  const words = text.toLowerCase().split(/\s+/);
  let detected = false;
  
  words.forEach(word => {
    // Clean punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    
    if (cleanWord === 'um' || cleanWord === 'uh' || cleanWord === 'ah') {
      interviewStats.um++;
      detected = true;
      triggerSpeechBeep(320); // soft low beep
    } else if (cleanWord === 'like') {
      interviewStats.like++;
      detected = true;
      triggerSpeechBeep(360);
    } else if (cleanWord === 'so') {
      // count 'so' as filler only if followed by a pause or used frequently (simplified)
      interviewStats.so++;
      detected = true;
      triggerSpeechBeep(400);
    }
  });

  // check phrase "you know"
  const youknowMatches = (text.toLowerCase().match(/\byou know\b/g) || []).length;
  if (youknowMatches > 0) {
    interviewStats.youknow += youknowMatches;
    detected = true;
    triggerSpeechBeep(440);
  }

  if (detected) {
    updateInterviewUI();
    const lastWord = words[words.length - 2] || words[words.length - 1];
    addCoachingMessage('warning', `Filler word detected near "${lastWord}". Try speaking in structured phrases.`);
  }
}

function triggerSpeechBeep(freq) {
  // Synthesize a very quiet, fast audio warning
  if (audioCtx) {
    playSynthNote(freq, 0.1, 0.05); // extremely quiet beep
  }
}

function updateInterviewUI() {
  countFillerUm.textContent = interviewStats.um;
  countFillerLike.textContent = interviewStats.like;
  countFillerSo.textContent = interviewStats.so;
  countFillerYouknow.textContent = interviewStats.youknow;
}

function addCoachingMessage(type, message) {
  const item = document.createElement('div');
  item.className = 'flex gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed feedback-item ';
  
  let icon = '';
  if (type === 'info') {
    item.className += 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
    icon = '<i class="fa-solid fa-circle-info mt-0.5 shrink-0 text-blue-400"></i>';
  } else if (type === 'warning') {
    item.className += 'bg-rose-500/10 border border-rose-500/20 text-rose-400';
    icon = '<i class="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-rose-400"></i>';
  } else if (type === 'success') {
    item.className += 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
    icon = '<i class="fa-solid fa-circle-check mt-0.5 shrink-0 text-emerald-400"></i>';
  }

  item.innerHTML = `${icon} <p>${message}</p>`;
  coachingFeed.insertBefore(item, coachingFeed.firstChild);
}

// --- Physics Engine & Particles Setup ---
class Particle {
  constructor(x, y, color, sizeMultiplier = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - (state.currentMode === 'paint' ? 2 : 0);
    this.alpha = 1.0;
    this.decay = Math.random() * 0.03 + 0.01;
    this.color = color;
    this.radius = Math.random() * 4 + 2 * sizeMultiplier;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply visual mode gravity/drag
    if (state.currentMode === 'paint') {
      this.vy += 0.04; // gravity pulling dust down
      this.vx *= 0.98; // horizontal drag
    } else {
      this.vx *= 0.96;
      this.vy *= 0.96;
    }
    
    this.alpha -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let particles = [];

function spawnExplosion(x, y, color, count = 25, sizeMultiplier = 1.0) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, sizeMultiplier));
  }
}

// --- Mode 2: Spider Web Anchors ---
let webAnchors = [];
const maxWebAnchors = 15;
let anchorPinchCooldown = 0;

// --- Mode 3: Harp Physics Strings ---
class HarpString {
  constructor(x, pitch, noteName, color) {
    this.x = x;
    this.pitch = pitch;
    this.noteName = noteName;
    this.color = color;
    this.displacement = 0;
    this.velocity = 0;
    this.k = 0.05;  // Stiffness
    this.c = 0.08;  // Damping/Friction
  }

  update() {
    // Acceleration based on spring law F = -kx - cv
    const acc = -this.k * this.displacement - this.c * this.velocity;
    this.velocity += acc;
    this.displacement += this.velocity;
  }

  draw(ctx, width, height) {
    ctx.save();
    ctx.beginPath();
    // Increase glow of strings - subtle resting glow, bright dynamic pluck glow
    ctx.shadowBlur = Math.abs(this.displacement) > 2 ? 28 : 8;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.abs(this.displacement) > 1 ? 6.0 : 3.0; // thicker lines
    
    // Draw string as a Bezier curve wobbling in X direction
    ctx.moveTo(this.x, 0);
    ctx.quadraticCurveTo(this.x + this.displacement, height / 2, this.x, height);
    ctx.stroke();

    // Render Note Indicator Label (reads correctly since canvas coordinate is mirrored in JS)
    if (Math.abs(this.displacement) > 1.5) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Fira Code';
      ctx.fillText(this.noteName, this.x - 6, height / 2 - 20);
    }

    ctx.restore();
  }
}

let harpStrings = [];
const notesConfig = [
  { pitch: 261.63, note: 'C4', color: '#6366f1' }, // Indigo
  { pitch: 293.66, note: 'D4', color: '#3b82f6' }, // Blue
  { pitch: 329.63, note: 'E4', color: '#06b6d4' }, // Cyan
  { pitch: 392.00, note: 'G4', color: '#10b981' }, // Green
  { pitch: 440.00, note: 'A4', color: '#eab308' }, // Yellow
  { pitch: 523.25, note: 'C5', color: '#f97316' }, // Orange
  { pitch: 587.33, note: 'D5', color: '#ec4899' }, // Pink
  { pitch: 659.25, note: 'E5', color: '#a855f7' }  // Purple
];

function initHarpStrings(canvasWidth) {
  harpStrings = [];
  const padding = canvasWidth * 0.1;
  const spacing = (canvasWidth - padding * 2) / (notesConfig.length - 1);
  for (let i = 0; i < notesConfig.length; i++) {
    const x = padding + i * spacing;
    harpStrings.push(new HarpString(x, notesConfig[i].pitch, notesConfig[i].note, notesConfig[i].color));
  }
}

// --- Mode 4: Air Paint Brush Strokes ---
let paintStrokes = [];
let isPaintActive = false;

// --- Mode 5: Interview Telemetry Stats ---
let wristHistory = [];
const maxHistoryLength = 30;

function calculateHandMetrics(wristLandmark) {
  if (!wristLandmark) return { speed: 0, jitter: 0 };
  
  // Save current wrist point
  const currentPt = {
    x: wristLandmark.x,
    y: wristLandmark.y,
    time: Date.now()
  };
  
  wristHistory.push(currentPt);
  if (wristHistory.length > maxHistoryLength) {
    wristHistory.shift();
  }

  if (wristHistory.length < 2) return { speed: 0, jitter: 0 };

  let totalDist = 0;
  let jitterSum = 0;
  
  // Speed calculations
  for (let i = 1; i < wristHistory.length; i++) {
    const p1 = wristHistory[i - 1];
    const p2 = wristHistory[i];
    
    // Distance in normalized units
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    totalDist += d;
  }
  
  const elapsedSeconds = (wristHistory[wristHistory.length - 1].time - wristHistory[0].time) / 1000;
  const speed = elapsedSeconds > 0 ? (totalDist / elapsedSeconds) * 1.5 : 0; // Speed factor multiplier

  // High frequency jitter calculations
  const dxs = [];
  for (let i = 1; i < wristHistory.length; i++) {
    dxs.push(Math.hypot(wristHistory[i].x - wristHistory[i - 1].x, wristHistory[i].y - wristHistory[i - 1].y));
  }
  
  // Find jitter (standard deviation of position diffs)
  const mean = dxs.reduce((a, b) => a + b, 0) / dxs.length;
  const variance = dxs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dxs.length;
  const jitter = Math.sqrt(variance) * 100;

  return { speed, jitter };
}

let activeScore = 70; // Start at 70% confidence score
let scoreFeedbackCooldown = 0;

function runInterviewCoaching(speed, jitter, handResult) {
  if (!interviewSessionActive) return;
  scoreFeedbackCooldown++;
  
  let targetScore = 70;
  
  // 1. Check speed (ideal speech gesturing speed is moderate 0.1 to 0.7)
  if (speed > 1.2) {
    targetScore -= 15;
    if (scoreFeedbackCooldown > 90) {
      addCoachingMessage('warning', 'Excessively fast hand gestures detected. Try pacing your movements to show command.');
      scoreFeedbackCooldown = 0;
    }
  } else if (speed < 0.03) {
    targetScore -= 8;
    if (scoreFeedbackCooldown > 120) {
      addCoachingMessage('info', 'Hands are stationary. Use natural open palm gestures to express key discussion items.');
      scoreFeedbackCooldown = 0;
    }
  } else {
    targetScore += 10; // good speed range
  }

  // 2. Check jitter (physical jitter > 2.0 indicates anxiety/tremors)
  if (jitter > 2.2) {
    targetScore -= 12;
    if (scoreFeedbackCooldown > 80) {
      addCoachingMessage('warning', 'Tremors or high hand jitter detected. Place your arms comfortably or relax your fingers.');
      scoreFeedbackCooldown = 0;
    }
  } else {
    targetScore += 5;
  }

  // 3. Check open palm vs closed fist
  if (handResult.multiHandLandmarks && handResult.multiHandLandmarks.length > 0) {
    const landmarks = handResult.multiHandLandmarks[0];
    const isOpen = checkIfPalmIsOpen(landmarks);
    if (isOpen) {
      targetScore += 8;
    } else {
      targetScore -= 5;
      if (scoreFeedbackCooldown > 110) {
        addCoachingMessage('info', 'Fingers are tightly curled. Keep hands open or in neutral postures to build confidence.');
        scoreFeedbackCooldown = 0;
      }
    }
  }

  // 4. Deduct for filler words
  const fillerWordPenalties = (interviewStats.um * 8) + (interviewStats.like * 5) + (interviewStats.so * 3) + (interviewStats.youknow * 6);
  targetScore -= fillerWordPenalties;

  // Clamp target score
  targetScore = Math.max(5, Math.min(100, targetScore));
  
  // Smooth the visible score
  activeScore = activeScore * 0.98 + targetScore * 0.02;
  const scoreVal = Math.round(activeScore);
  
  // Draw score circle progress
  scoreText.textContent = `${scoreVal}%`;
  
  // Circle circumference is 2 * PI * r = 2 * 3.14159 * 46 = 289
  const offset = 289 - (scoreVal / 100) * 289;
  scoreCircle.style.strokeDashoffset = offset;

  // Score label
  if (scoreVal >= 80) {
    scoreLabel.textContent = 'Excellent';
    scoreLabel.className = 'mt-4 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/10 font-bold uppercase tracking-wider';
    scoreCircle.setAttribute('stroke', '#10b981');
  } else if (scoreVal >= 60) {
    scoreLabel.textContent = 'Confident';
    scoreLabel.className = 'mt-4 px-3 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/10 font-bold uppercase tracking-wider';
    scoreCircle.setAttribute('stroke', '#f59e0b');
  } else {
    scoreLabel.textContent = 'Stressed';
    scoreLabel.className = 'mt-4 px-3 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-full border border-rose-500/10 font-bold uppercase tracking-wider';
    scoreCircle.setAttribute('stroke', '#f43f5e');
  }
}

function checkIfPalmIsOpen(landmarks) {
  // Simple heuristic: distance between finger tips and corresponding base knuckle joint.
  // Wrist(0), Index base(5) vs Index tip(8), etc.
  const joints = [
    { base: 5, tip: 8 },  // Index
    { base: 9, tip: 12 }, // Middle
    { base: 13, tip: 16 },// Ring
    { base: 17, tip: 20 } // Pinky
  ];
  
  let extendedFingers = 0;
  
  joints.forEach(j => {
    const tipPt = landmarks[j.tip];
    const basePt = landmarks[j.base];
    const wristPt = landmarks[0];
    
    const distTip = Math.hypot(tipPt.x - wristPt.x, tipPt.y - wristPt.y);
    const distBase = Math.hypot(basePt.x - wristPt.x, basePt.y - wristPt.y);
    
    // If fingertip is further from wrist than its knuckle base, finger is extended
    if (distTip > distBase * 1.2) {
      extendedFingers++;
    }
  });

  return extendedFingers >= 3;
}


// --- Main Hand-Tracking Frame Renderer ---
let lastFrameTime = Date.now();
let frameCount = 0;
let prevFingertipX = new Array(10).fill(0); // Tracking 2 hands (5 fingers each)

function onHandResults(results) {
  // Track system FPS
  frameCount++;
  const now = Date.now();
  if (now - lastFrameTime >= 1000) {
    state.fps = frameCount;
    fpsCounter.textContent = state.fps;
    frameCount = 0;
    lastFrameTime = now;
  }

  // Handle dimensions
  if (canvasElement.width !== canvasElement.clientWidth || canvasElement.height !== canvasElement.clientHeight) {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
    
    if (state.currentMode === 'harp') {
      initHarpStrings(canvasElement.width);
    }
  }

  const w = canvasElement.width;
  const h = canvasElement.height;

  // Clear Canvas
  canvasCtx.clearRect(0, 0, w, h);

  // Draw Camera Feed onto Canvas, Mirrored for normal perspective
  canvasCtx.save();
  canvasCtx.translate(w, 0);
  canvasCtx.scale(-1, 1);
  if (results.image) {
    canvasCtx.drawImage(results.image, 0, 0, w, h);
    // Dim camera image overlay slightly so that neon overlay lines pop out clearly
    canvasCtx.fillStyle = 'rgba(8, 9, 20, 0.45)';
    canvasCtx.fillRect(0, 0, w, h);
  }
  canvasCtx.restore();

  state.handsCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
  
  // Update Header UI Status
  if (state.handsCount > 0) {
    trackingStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    trackingStatusText.textContent = `Hands: ${state.handsCount} Active`;
  } else {
    trackingStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
    trackingStatusText.textContent = 'Hands: Idle';
  }

  // Draw Mode visuals
  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach((landmarks, handIndex) => {
      // Map normalized MediaPipe coordinates into Mirrored Canvas pixels
      const px = (index) => (1 - landmarks[index].x) * w;
      const py = (index) => landmarks[index].y * h;

      // Extract fingertip pixels
      const fingertips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
      const colors = ['#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#ec4899']; // unique laser colors

      // 1. --- Draw Sleek Neon Skeleton ---
      drawGlowSkeleton(canvasCtx, landmarks, w, h);

      // 2. --- Detect Pinch Gesture (Thumb 4 + Index 8) ---
      const thumbPt = landmarks[4];
      const indexPt = landmarks[8];
      const pinchDist = Math.hypot(indexPt.x - thumbPt.x, indexPt.y - thumbPt.y);
      const isPinching = pinchDist < 0.045;
      const pinchX = (px(4) + px(8)) / 2;
      const pinchY = (py(4) + py(8)) / 2;

      // 3. --- Run Mode Mechanics ---
      
      // MODE: Laser Fingers
      if (state.currentMode === 'laser') {
        fingertips.forEach((tipIndex, idx) => {
          const fx = px(tipIndex);
          const fy = py(tipIndex);
          const laserColor = colors[idx];

          // Laser ray shooting downwards
          canvasCtx.save();
          canvasCtx.beginPath();
          canvasCtx.moveTo(fx, fy);
          canvasCtx.lineTo(fx, h);
          canvasCtx.shadowBlur = 28;
          canvasCtx.shadowColor = laserColor;
          canvasCtx.strokeStyle = laserColor;
          canvasCtx.lineWidth = 6.0; // thicker outer glowing beam
          canvasCtx.stroke();
          
          // Add white plasma core to lasers
          canvasCtx.strokeStyle = '#ffffff';
          canvasCtx.lineWidth = 2.0;
          canvasCtx.stroke();
          
          // Glowing fingertip dots
          canvasCtx.beginPath();
          canvasCtx.arc(fx, fy, 10, 0, Math.PI * 2);
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fill();
          canvasCtx.restore();
        });

        // Pinch energy orb + plasma explosion
        if (isPinching) {
          canvasCtx.save();
          canvasCtx.beginPath();
          canvasCtx.arc(pinchX, pinchY, 14 + Math.sin(Date.now() * 0.02) * 4, 0, Math.PI * 2);
          canvasCtx.shadowBlur = 30;
          canvasCtx.shadowColor = '#a855f7';
          canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          canvasCtx.fill();
          canvasCtx.restore();

          // Spawn laser plasma particles
          if (Math.random() < 0.4) {
            spawnExplosion(pinchX, pinchY, '#a855f7', 4, 0.8);
          }
          
          // Trigger synthesizer sound occasionally
          if (Math.random() < 0.04) {
            playSynthNote(440 + (h - pinchY), 0.15, 0.4);
            logSystem(`Laser Plasma orb synthesized sound frequency: ${Math.round(440 + (h - pinchY))}Hz`);
          }
        }
      }

      // MODE: Spider Web
      else if (state.currentMode === 'web') {
        // Draw elastic web connecting adjacent fingertips
        canvasCtx.save();
        canvasCtx.lineWidth = 3.0; // thicker webbing
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = '#06b6d4';
        canvasCtx.strokeStyle = 'rgba(6, 182, 212, 0.9)'; // higher opacity

        for (let i = 0; i < fingertips.length; i++) {
          for (let j = i + 1; j < fingertips.length; j++) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(px(fingertips[i]), py(fingertips[i]));
            canvasCtx.lineTo(px(fingertips[j]), py(fingertips[j]));
            canvasCtx.stroke();
          }
        }

        // Draw connections to wrist (0)
        fingertips.forEach(tip => {
          canvasCtx.beginPath();
          canvasCtx.moveTo(px(0), py(0));
          canvasCtx.lineTo(px(tip), py(tip));
          canvasCtx.stroke();
        });
        canvasCtx.restore();

        // Dropping spatial anchors with pinching
        if (isPinching) {
          if (anchorPinchCooldown === 0) {
            // Drop anchor if space is available
            if (webAnchors.length >= maxWebAnchors) {
              webAnchors.shift(); // Remove oldest anchor
            }
            webAnchors.push({ x: pinchX, y: pinchY, time: Date.now() });
            spawnExplosion(pinchX, pinchY, '#06b6d4', 15, 0.6);
            playSynthNote(659.25, 0.2, 0.5); // high crisp anchor drop synth sound
            logSystem(`Web anchor dropped at (${Math.round(pinchX)}, ${Math.round(pinchY)})`);
            anchorPinchCooldown = 30; // cooldown of 30 frames
          }
        }

        // Connect hand fingers to nearby dropped anchors via elastic visual spring webs
        canvasCtx.save();
        canvasCtx.strokeStyle = 'rgba(6, 182, 212, 0.55)'; // light cyan elastic lines
        canvasCtx.lineWidth = 2.0;
        canvasCtx.shadowBlur = 8;
        canvasCtx.shadowColor = '#06b6d4';
        
        webAnchors.forEach(anchor => {
          // Pulse anchors
          const elapsed = Date.now() - anchor.time;
          const radius = 5 + Math.sin(elapsed * 0.005) * 2;
          canvasCtx.beginPath();
          canvasCtx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
          canvasCtx.fillStyle = '#06b6d4';
          canvasCtx.shadowBlur = 15;
          canvasCtx.shadowColor = '#06b6d4';
          canvasCtx.fill();

          // Connect all fingertips to this anchor if hand is within range
          fingertips.forEach(tip => {
            const tx = px(tip);
            const ty = py(tip);
            const dist = Math.hypot(tx - anchor.x, ty - anchor.y);
            if (dist < w * 0.4) {
              // Draw spring curved web line
              canvasCtx.beginPath();
              canvasCtx.moveTo(tx, ty);
              // Midpoint sag factor based on hand speed and distance
              const midX = (tx + anchor.x) / 2;
              const midY = (ty + anchor.y) / 2 + (dist * 0.1); // sag down
              canvasCtx.quadraticCurveTo(midX, midY, anchor.x, anchor.y);
              canvasCtx.stroke();
            }
          });
        });
        canvasCtx.restore();
      }

      // MODE: Musical Harp (Checking crossings)
      else if (state.currentMode === 'harp') {
        fingertips.forEach((tipIndex, idx) => {
          const fx = px(tipIndex);
          const fy = py(tipIndex);
          const trackingId = handIndex * 5 + idx;
          const prevFx = prevFingertipX[trackingId] || fx;

          // Check if finger tip crossed any harp string coordinates
          harpStrings.forEach((string, strIdx) => {
            // Intersection check: previous X on one side, current X on other side of string's X
            if ((prevFx < string.x && fx >= string.x) || (prevFx > string.x && fx <= string.x)) {
              // Pluck!
              const speed = Math.abs(fx - prevFx);
              const volumeMult = Math.min(1.5, Math.max(0.2, speed / 5));
              
              string.velocity = (fx > prevFx ? 1 : -1) * Math.min(45, speed * 2.5);
              playSynthNote(string.pitch, 0.7, volumeMult);
              spawnExplosion(string.x, fy, string.color, 12, 0.7);
              
              logSystem(`String plucked: Note ${string.noteName} (${Math.round(string.pitch)}Hz), Speed: ${Math.round(speed)}px`);
            }
          });

          // Save current X for next frame check
          prevFingertipX[trackingId] = fx;

          // Render finger trackers
          canvasCtx.beginPath();
          canvasCtx.arc(fx, fy, 4, 0, Math.PI * 2);
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fill();
        });
      }

      // MODE: Air Paint Brush
      else if (state.currentMode === 'paint') {
        if (isPinching) {
          if (!isPaintActive) {
            isPaintActive = true;
            paintStrokes.push({
              color: state.drawingColor,
              points: []
            });
            logSystem('Drawing stroke started.');
          }

          // Add point to active stroke
          const currentStroke = paintStrokes[paintStrokes.length - 1];
          currentStroke.points.push({ x: pinchX, y: pinchY });

          // Emit drawing fluid particle trail
          if (state.drawingColor !== 'eraser') {
            spawnExplosion(pinchX, pinchY, state.drawingColor, 2, 0.5);
          } else {
            // Spawn grey eraser puff
            spawnExplosion(pinchX, pinchY, '#1e293b', 1, 0.4);
          }

          // Draw active brush cursor
          canvasCtx.save();
          canvasCtx.beginPath();
          canvasCtx.arc(pinchX, pinchY, state.drawingColor === 'eraser' ? 15 : 6, 0, Math.PI * 2);
          canvasCtx.strokeStyle = state.drawingColor === 'eraser' ? '#ffffff' : state.drawingColor;
          canvasCtx.lineWidth = 2;
          canvasCtx.stroke();
          canvasCtx.restore();

          // Play oscillator wave based on vertical pinch position
          if (Math.random() < 0.05 && state.drawingColor !== 'eraser') {
            // Mapped to pentatonic range roughly
            const drawFreq = 220 + (1 - pinchY / h) * 440;
            playSynthNote(drawFreq, 0.1, 0.15);
          }
        } else {
          isPaintActive = false;
        }

        // Handle Eraser logic on canvas strokes
        if (isPinching && state.drawingColor === 'eraser') {
          eraseStrokesNear(pinchX, pinchY, 20);
        }
      }

      // MODE: Interview & Confidence Analyzer
      else if (state.currentMode === 'interview') {
        // Collect wrist velocity/jitter metrics
        if (handIndex === 0) { // Track main hand
          const wristLandmark = landmarks[0];
          const metrics = calculateHandMetrics(wristLandmark);

          statHandSpeed.innerHTML = `${metrics.speed.toFixed(2)}<span class="text-xs text-slate-500">m/s</span>`;
          statHandJitter.innerHTML = `${metrics.jitter.toFixed(2)}<span class="text-xs text-slate-500">hz</span>`;

          if (interviewSessionActive) {
            interviewStats.speedHistory.push(metrics.speed);
            interviewStats.jitterHistory.push(metrics.jitter);
          }

          runInterviewCoaching(metrics.speed, metrics.jitter, results);
        }
      }
    });
  }

  // --- Post-Processing Visual Updates (Physics & Drawing Canvas Trails) ---
  
  // Update web anchor cooldown
  if (anchorPinchCooldown > 0) anchorPinchCooldown--;

  // Update & Draw Harp strings
  if (state.currentMode === 'harp') {
    harpStrings.forEach(string => {
      string.update();
      string.draw(canvasCtx, w, h);
    });
  }

  // Draw Air Painted Strokes
  if (paintStrokes.length > 0) {
    canvasCtx.save();
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    
    paintStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      canvasCtx.beginPath();
      canvasCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      // Draw smooth quadratic bezier curve between paint coordinates
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        canvasCtx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }

      if (stroke.color === 'eraser') {
        // Render eraser line as transparent cut-out (composite operation) or dark background mock
        // Since we draw camera video feed behind, we can draw transparent lines using destination-out
        canvasCtx.strokeStyle = '#0c0d16'; // matching backdrop
        canvasCtx.lineWidth = 30;
      } else {
        canvasCtx.strokeStyle = stroke.color;
        canvasCtx.lineWidth = 10; // thicker paintbrush stroke
        canvasCtx.shadowBlur = 18; // wider glow
        canvasCtx.shadowColor = stroke.color;
      }
      
      canvasCtx.stroke();
    });
    canvasCtx.restore();
  }

  // Update and draw explosion particles
  particles = particles.filter(p => p.alpha > 0);
  particles.forEach(p => {
    p.update();
    p.draw(canvasCtx);
  });
}

// Draw skeleton joints manually with high aesthetic glowing properties
function drawGlowSkeleton(ctx, landmarks, width, height) {
  const px = (idx) => (1 - landmarks[idx].x) * width;
  const py = (idx) => landmarks[idx].y * height;

  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
  ];

  ctx.save();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'; // Thicker and higher opacity connectors
  ctx.lineWidth = 4.0;
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#6366f1';

  // Draw connections
  HAND_CONNECTIONS.forEach(([start, end]) => {
    ctx.beginPath();
    ctx.moveTo(px(start), py(start));
    ctx.lineTo(px(end), py(end));
    ctx.stroke();
  });

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    ctx.beginPath();
    // Larger joint radiuses
    const isMajor = (i % 4 === 0 || i === 0);
    ctx.arc(px(i), py(i), isMajor ? 7.5 : 4.5, 0, Math.PI * 2);
    // Highlight tips
    if ([4, 8, 12, 16, 20].includes(i)) {
      ctx.fillStyle = '#ffffff'; // White core for neon pop
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#22d3ee';
    } else {
      ctx.fillStyle = '#ffffff'; // White core
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
    }
    ctx.fill();
  }
  ctx.restore();
}

function eraseStrokesNear(x, y, radius) {
  paintStrokes.forEach(stroke => {
    stroke.points = stroke.points.filter(pt => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      return dist > radius;
    });
  });
  // Clean up empty strokes
  paintStrokes = paintStrokes.filter(s => s.points.length > 0);
}


// --- MediaPipe Hands Engine Setup ---
let handsInstance = null;
let cameraInstance = null;

function initMediaPipe() {
  mpLoader.classList.remove('hidden');
  
  handsInstance = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  handsInstance.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: state.confidenceThreshold,
    minTrackingConfidence: 0.5
  });

  handsInstance.onResults(onHandResults);

  cameraInstance = new Camera(videoElement, {
    onFrame: async () => {
      if (state.isCameraActive) {
        await handsInstance.send({ image: videoElement });
      }
    },
    width: 640,
    height: 480
  });

  // Start Camera
  cameraInstance.start()
    .then(() => {
      state.isCameraActive = true;
      mpLoader.classList.add('hidden');
      videoPlaceholder.classList.add('hidden');
      cameraStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
      cameraStatusText.textContent = 'Webcam: Active';
      cameraIcon.className = 'fa-solid fa-power-off';
      cameraText.textContent = 'Stop Webcam';
      logSystem('Webcam stream started. HandPose solver is online.');

      // Auto start AudioContext on user action
      initAudio();

      // Start interview session if selected
      if (state.currentMode === 'interview') {
        startInterviewSession();
      }
    })
    .catch(err => {
      console.error('Camera initialization error:', err);
      mpLoader.classList.add('hidden');
      cameraStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      cameraStatusText.textContent = 'Webcam: Error';
      logSystem('Camera error. Please verify webcam connection and permissions.');
    });
}

function stopCamera() {
  if (cameraInstance) {
    cameraInstance.stop();
  }
  state.isCameraActive = false;
  cameraStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
  cameraStatusText.textContent = 'Webcam: Inactive';
  trackingStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
  trackingStatusText.textContent = 'Hands: Idle';
  cameraIcon.className = 'fa-solid fa-video';
  cameraText.textContent = 'Start Webcam';
  videoPlaceholder.classList.remove('hidden');
  logSystem('Webcam stream stopped.');

  // Clear canvas overlay
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (interviewSessionActive) {
    stopInterviewSession();
  }
}

function toggleCameraFeed() {
  if (state.isCameraActive) {
    stopCamera();
  } else {
    initAudio();
    if (!handsInstance) {
      initMediaPipe();
    } else {
      // Re-enable existing camera instance
      initMediaPipe();
    }
  }
}


// --- Event Handlers & Control Binding ---

// Mode Selection Cards
modeCards.forEach(card => {
  card.addEventListener('click', () => {
    const selectedMode = card.getAttribute('data-mode');
    
    // Toggle active classes
    modeCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Tear down previous mode specific setups
    if (state.currentMode === 'interview') {
      stopInterviewSession();
      interviewDashboard.classList.add('hidden');
      speechOverlay.classList.add('hidden');
    }
    if (state.currentMode === 'paint') {
      paintToolbar.classList.add('hidden');
    }

    // Set new mode
    state.currentMode = selectedMode;
    logSystem(`Switched to mode: ${card.querySelector('h3').textContent}`);

    // Mode-specific initializations
    if (selectedMode === 'harp') {
      initHarpStrings(canvasElement.width || canvasElement.clientWidth || 600);
    }
    else if (selectedMode === 'paint') {
      paintToolbar.classList.remove('hidden');
    }
    else if (selectedMode === 'interview') {
      interviewDashboard.classList.remove('hidden');
      speechOverlay.classList.remove('hidden');
      if (!speechRecognizer) {
        initSpeechRecognition();
      }
      if (state.isCameraActive) {
        startInterviewSession();
      }
    }
  });
  
  // Magnetic effect for mode-glow hover (using coordinate offsets)
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  });
});

// Webcam Button
btnToggleCamera.addEventListener('click', toggleCameraFeed);

// Volumes
sliderVolume.addEventListener('input', (e) => {
  const val = e.target.value;
  state.volume = val / 100;
  valVolume.textContent = `${val}%`;
  
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(state.volume, audioCtx.currentTime);
  }
});

// Particle Density
sliderParticleDensity.addEventListener('input', (e) => {
  state.particleDensity = parseInt(e.target.value);
  valParticleDensity.textContent = state.particleDensity;
});

// Confidence Threshold
sliderConfidence.addEventListener('input', (e) => {
  const val = e.target.value;
  state.confidenceThreshold = val / 100;
  valConfidence.textContent = `${val}%`;
  
  if (handsInstance) {
    handsInstance.setOptions({
      minDetectionConfidence: state.confidenceThreshold
    });
    logSystem(`Confidence threshold adjusted to ${val}%`);
  }
});

// Synth Waveform selector
selectWaveform.addEventListener('change', (e) => {
  state.waveform = e.target.value;
  logSystem(`Synthesizer waveform updated: ${state.waveform}`);
});

// Delay Toggle
toggleDelay.addEventListener('change', (e) => {
  state.isDelayEnabled = e.target.checked;
  logSystem(`Audio delay feedback loop ${state.isDelayEnabled ? 'enabled' : 'disabled'}`);
});

// Paint Color selector
colorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    colorButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.drawingColor = btn.getAttribute('data-color');
    logSystem(`Brush color changed to ${state.drawingColor}`);
  });
});

// Clear paint canvas
btnClearCanvas.addEventListener('click', () => {
  paintStrokes = [];
  particles = [];
  webAnchors = [];
  logSystem('Drawing board cleared.');
});

// Interview Reset Button
btnResetInterview.addEventListener('click', () => {
  if (interviewSessionActive) {
    stopInterviewSession();
  }
  sessionTimeVal.textContent = '00:00';
  startInterviewSession();
});

// Global Keyboard bindings (Clear canvas key)
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'c') {
    paintStrokes = [];
    particles = [];
    webAnchors = [];
    logSystem('Drawing board cleared.');
  }
});

// --- Interview Performance Report Modal Solvers ---
function showPerformanceReport() {
  // 1. Stop active session
  stopInterviewSession();
  
  // 2. Compute averages
  const avgSpeed = interviewStats.speedHistory.length > 0
    ? interviewStats.speedHistory.reduce((a, b) => a + b, 0) / interviewStats.speedHistory.length
    : 0;
    
  const avgJitter = interviewStats.jitterHistory.length > 0
    ? interviewStats.jitterHistory.reduce((a, b) => a + b, 0) / interviewStats.jitterHistory.length
    : 0;

  // 3. Score & Grade
  const scoreVal = Math.round(activeScore);
  modalScoreText.textContent = `${scoreVal}%`;
  
  const offset = 289 - (scoreVal / 100) * 289;
  modalScoreCircle.style.strokeDashoffset = offset;
  
  let grade = 'C';
  if (scoreVal >= 90) grade = 'A';
  else if (scoreVal >= 80) grade = 'B+';
  else if (scoreVal >= 70) grade = 'B';
  else if (scoreVal >= 60) grade = 'C+';
  else if (scoreVal >= 50) grade = 'C';
  else grade = 'D';
  modalGradeText.textContent = grade;
  
  modalDuration.textContent = sessionTimeVal.textContent;

  // 4. Breakdown metrics
  let speedLabel = 'Confident';
  let speedPct = 90;
  if (avgSpeed < 0.05) {
    speedLabel = 'Static (Stiff)';
    speedPct = 30;
    modalBarSpeed.className = "bg-rose-500 h-full rounded-full transition-all duration-500";
  } else if (avgSpeed < 0.15) {
    speedLabel = 'Subtle';
    speedPct = 60;
    modalBarSpeed.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
  } else if (avgSpeed > 0.8) {
    speedLabel = 'Hyperactive';
    speedPct = 65;
    modalBarSpeed.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
  } else {
    modalBarSpeed.className = "bg-indigo-500 h-full rounded-full transition-all duration-500";
  }
  modalMetricSpeed.textContent = speedLabel;
  modalBarSpeed.style.width = `${speedPct}%`;

  let jitterLabel = 'Stable';
  let jitterPct = 85;
  if (avgJitter < 1.0) {
    jitterLabel = 'Serene';
    jitterPct = 95;
    modalBarJitter.className = "bg-emerald-500 h-full rounded-full transition-all duration-500";
  } else if (avgJitter > 2.2) {
    jitterLabel = 'High Jitter';
    jitterPct = 25;
    modalBarJitter.className = "bg-rose-500 h-full rounded-full transition-all duration-500";
  } else if (avgJitter > 1.8) {
    jitterLabel = 'Minor Jitter';
    jitterPct = 55;
    modalBarJitter.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
  } else {
    modalBarJitter.className = "bg-cyan-500 h-full rounded-full transition-all duration-500";
  }
  modalMetricJitter.textContent = jitterLabel;
  modalBarJitter.style.width = `${jitterPct}%`;

  const totalFlubs = interviewStats.um + interviewStats.like + interviewStats.so + interviewStats.youknow;
  const clarityScore = Math.max(0, 100 - (totalFlubs * 8));
  let clarityLabel = 'Excellent';
  if (clarityScore < 40) {
    clarityLabel = 'Needs Focus';
    modalBarClarity.className = "bg-rose-500 h-full rounded-full transition-all duration-500";
  } else if (clarityScore < 70) {
    clarityLabel = 'Fair';
    modalBarClarity.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
  } else if (clarityScore < 85) {
    clarityLabel = 'Good';
    modalBarClarity.className = "bg-blue-500 h-full rounded-full transition-all duration-500";
  } else {
    modalBarClarity.className = "bg-emerald-500 h-full rounded-full transition-all duration-500";
  }
  modalMetricClarity.textContent = clarityLabel;
  modalBarClarity.style.width = `${clarityScore}%`;

  // 5. Recap flubs
  modalCountUm.textContent = interviewStats.um;
  modalCountLike.textContent = interviewStats.like;
  modalCountSo.textContent = interviewStats.so;
  modalCountYouknow.textContent = interviewStats.youknow;

  // 6. Actionable Takeaway
  let takeaway = '';
  if (totalFlubs > 3) {
    takeaway = "Your primary area for improvement is verbal pacing and word selections. Try to introduce brief periods of silence between your sentences instead of loading the gap with vocal pauses like 'like' or 'um'. Purposeful silence projects extreme authority.";
  } else if (avgJitter > 2.0) {
    takeaway = "You displayed notable hand tremors or jitter. This is a common physical indicator of nervous energy. To stabilize your presence, practice gesturing with your arms resting comfortably on the armrests, or keep your palms facing down on the desk between key points.";
  } else if (avgSpeed < 0.05) {
    takeaway = "Your hands were almost completely static. Natural gestures make your speech visual, which helps emphasize key concepts and keeps the listener engaged. Practice starting with your hands held loosely at chest height, and expand them outward when explaining a point.";
  } else {
    takeaway = "Superb performance! You maintained stable hand postures, controlled physical jitters, spoke with exceptional verbal clarity, and used natural hand gestures to punctuate your delivery. Maintain this exact rhythm in your next actual interview.";
  }
  modalCoachingTakeaway.textContent = takeaway;

  // 7. Show Modal
  reportModal.classList.remove('hidden');
  logSystem('Performance evaluation scorecard compiled.');
}

function downloadPerformanceReport() {
  const scoreVal = Math.round(activeScore);
  let grade = 'C';
  if (scoreVal >= 90) grade = 'A';
  else if (scoreVal >= 80) grade = 'B+';
  else if (scoreVal >= 70) grade = 'B';
  else if (scoreVal >= 60) grade = 'C+';
  else if (scoreVal >= 50) grade = 'C';
  else grade = 'D';

  const reportText = `==================================================
        MOTION AI - PERFORMANCE SCORECARD
==================================================
Date: ${new Date().toLocaleString()}
Overall Score: ${scoreVal}%
Grade: ${grade}
Session Duration: ${sessionTimeVal.textContent}

CORE ASSESSMENT:
- Gesture Expressiveness: ${modalMetricSpeed.textContent}
- Body Language Stability: ${modalMetricJitter.textContent}
- Verbal Clarity Rating: ${modalMetricClarity.textContent}

VERBAL FLUBS COUNTER:
- "Um" / "Ah": ${interviewStats.um}
- "Like": ${interviewStats.like}
- "So": ${interviewStats.so}
- "You know": ${interviewStats.youknow}

COACHING RECOMMENDATIONS:
${modalCoachingTakeaway.textContent}

==================================================
Created using Motion AI Handpose Sandbox.
Intract • Play • Create
==================================================`;

  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Motion_AI_Interview_Report_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logSystem('Evaluation scorecard report downloaded.');
}

// Bind report modal events
btnEndInterview.addEventListener('click', showPerformanceReport);
btnCloseReport.addEventListener('click', () => reportModal.classList.add('hidden'));
btnModalRestart.addEventListener('click', () => {
  reportModal.classList.add('hidden');
  btnResetInterview.click();
});
btnModalDownload.addEventListener('click', downloadPerformanceReport);

// --- System Logging Helpers ---
function logSystem(message) {
  state.systemLog = message;
  valSyslog.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  console.log(`[Motion AI System] ${message}`);
}
