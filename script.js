// ---------- DOM elements ----------
const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const startResumeBtn = document.getElementById('startResumeBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const focusMinutesInput = document.getElementById('focusMinutes');
const breakMinutesInput = document.getElementById('breakMinutes');
const historyListEl = document.getElementById('historyList');
const liveRegion = document.getElementById('liveTimerAnnounce');
const timerSection = document.getElementById('timerSection');

// ---------- Timer state ----------
let currentMode = 'focus';         // 'focus' or 'break'
let remainingSeconds = 25 * 60;     // default focus 25 min
let isRunning = false;
let timerInterval = null;

// durations (seconds)
let focusDurationSec = 25 * 60;
let breakDurationSec = 5 * 60;

// ---------- Audio (Web Audio, initialized on first user start) ----------
let audioCtx = null;
let audioInitialized = false;

function initAudioContext() {
  if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

async function ensureAudioStarted() {
  if (!audioCtx) {
    initAudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  audioInitialized = true;
}

function playBeep() {
  if (!audioInitialized) {
    initAudioContext();
    audioCtx.resume().catch(e => console.warn("audio resume failed"));
    audioInitialized = true;
  }
  if (!audioCtx || audioCtx.state !== 'running') {
    audioCtx?.resume().catch(e => console.debug);
    return;
  }
  try {
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.25;
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.8);
    oscillator.stop(now + 0.6);
  } catch (e) {
    console.warn("beep error", e);
  }
}

// ---------- Helper: format mm:ss ----------
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateUI() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  if (currentMode === 'focus') {
    modeLabel.innerHTML = '🍅 FOCUS · work session';
    timerSection.classList.add('mode-focus');
    timerSection.classList.remove('mode-break');
  } else {
    modeLabel.innerHTML = '🌿 BREAK · recharge';
    timerSection.classList.add('mode-break');
    timerSection.classList.remove('mode-focus');
  }
  liveRegion.textContent = `${currentMode === 'focus' ? 'Focus' : 'Break'} remaining: ${formatTime(remainingSeconds)}`;
}

function syncRemainingToCurrentMode() {
  if (!isRunning) {
    remainingSeconds = currentMode === 'focus' ? focusDurationSec : breakDurationSec;
    updateUI();
  }
}

function handleTimerComplete() {
  playBeep();

  if (currentMode === 'focus') {
    addHistoryEntry(focusDurationSec);
    currentMode = 'break';
    remainingSeconds = breakDurationSec;
  } else {
    currentMode = 'focus';
    remainingSeconds = focusDurationSec;
  }
  updateUI();

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (isRunning) {
    startTimerLoop();
  }
}

function tick() {
  if (!isRunning) return;
  if (remainingSeconds <= 0) {
    handleTimerComplete();
  } else {
    remainingSeconds--;
    updateUI();
    if (remainingSeconds === 0) {
      handleTimerComplete();
    }
  }
}

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isRunning) tick();
  }, 1000);
}

// ---------- Controls ----------
function startResume() {
  if (remainingSeconds <= 0) {
    remainingSeconds = currentMode === 'focus' ? focusDurationSec : breakDurationSec;
    updateUI();
  }
  if (!isRunning) {
    isRunning = true;
    startTimerLoop();
  }
  initAudioContext();
  ensureAudioStarted().catch(e => console.warn);
  updateStartResumeButtonText();
  setConfigInputsEnabled(false);
}

function pauseTimer() {
  if (isRunning) {
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  updateStartResumeButtonText();
  setConfigInputsEnabled(true);
}

function resetTimer() {
  if (isRunning) {
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  remainingSeconds = currentMode === 'focus' ? focusDurationSec : breakDurationSec;
  updateUI();
  updateStartResumeButtonText();
  setConfigInputsEnabled(true);
}

function updateStartResumeButtonText() {
  if (isRunning) {
    startResumeBtn.textContent = '⏵ Running';
  } else {
    if (remainingSeconds > 0 && remainingSeconds < (currentMode === 'focus' ? focusDurationSec : breakDurationSec)) {
      startResumeBtn.textContent = '▶ Resume';
    } else {
      startResumeBtn.textContent = '▶ Start';
    }
  }
}

// ---------- History (localStorage, per day) ----------
function getTodayKey() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function loadHistory() {
  const today = getTodayKey();
  const stored = localStorage.getItem('pomodoro_daily_history');
  if (!stored) {
    return { date: today, entries: [] };
  }
  try {
    const data = JSON.parse(stored);
    if (data.date === today) {
      return data;
    } else {
      return { date: today, entries: [] };
    }
  } catch (e) {
    return { date: today, entries: [] };
  }
}

function saveHistory(data) {
  localStorage.setItem('pomodoro_daily_history', JSON.stringify(data));
}

function addHistoryEntry(durationSec) {
  const history = loadHistory();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const durationFormatted = formatTime(durationSec);
  history.entries.push({
    durationSeconds: durationSec,
    timestamp: timeStr,
    display: `${durationFormatted} focus — ${timeStr}`
  });
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  if (!history.entries || history.entries.length === 0) {
    historyListEl.innerHTML = '<li class="empty-history">✨ No focus sessions yet. Start the timer!</li>';
    return;
  }
  const fragment = document.createDocumentFragment();
  [...history.entries].reverse().forEach(entry => {
    const li = document.createElement('li');
    const durationFormatted = formatTime(entry.durationSeconds);
    li.textContent = `${durationFormatted} focus — ${entry.timestamp}`;
    fragment.appendChild(li);
  });
  historyListEl.innerHTML = '';
  historyListEl.appendChild(fragment);
}

// ---------- Config handlers ----------
function updateDurationsFromInputs() {
  let newFocusMin = parseInt(focusMinutesInput.value, 10);
  let newBreakMin = parseInt(breakMinutesInput.value, 10);
  if (isNaN(newFocusMin)) newFocusMin = 25;
  if (isNaN(newBreakMin)) newBreakMin = 5;
  newFocusMin = Math.min(99, Math.max(1, newFocusMin));
  newBreakMin = Math.min(99, Math.max(1, newBreakMin));
  focusMinutesInput.value = newFocusMin;
  breakMinutesInput.value = newBreakMin;

  focusDurationSec = newFocusMin * 60;
  breakDurationSec = newBreakMin * 60;

  if (!isRunning) {
    remainingSeconds = currentMode === 'focus' ? focusDurationSec : breakDurationSec;
    updateUI();
  }
  updateStartResumeButtonText();
}

function setConfigInputsEnabled(enabled) {
  focusMinutesInput.disabled = !enabled;
  breakMinutesInput.disabled = !enabled;
  focusMinutesInput.style.opacity = enabled ? '1' : '0.6';
  breakMinutesInput.style.opacity = enabled ? '1' : '0.6';
}

function bindConfigEvents() {
  focusMinutesInput.addEventListener('change', () => {
    if (!isRunning) updateDurationsFromInputs();
    else focusMinutesInput.value = Math.floor(focusDurationSec / 60);
  });
  breakMinutesInput.addEventListener('change', () => {
    if (!isRunning) updateDurationsFromInputs();
    else breakMinutesInput.value = Math.floor(breakDurationSec / 60);
  });
}

// ---------- Initialization & event binding ----------
function initialSync() {
  let fMin = parseInt(focusMinutesInput.value, 10);
  let bMin = parseInt(breakMinutesInput.value, 10);
  if (isNaN(fMin)) fMin = 25;
  if (isNaN(bMin)) bMin = 5;
  focusDurationSec = fMin * 60;
  breakDurationSec = bMin * 60;
  focusMinutesInput.value = fMin;
  breakMinutesInput.value = bMin;
  remainingSeconds = currentMode === 'focus' ? focusDurationSec : breakDurationSec;
  updateUI();
  setConfigInputsEnabled(true);
  renderHistory();
  updateStartResumeButtonText();
}

// Connect button handlers
startResumeBtn.onclick = startResume;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;

window.addEventListener('load', () => {
  initialSync();
  bindConfigEvents();
  renderHistory();
  updateUI();
});

window.addEventListener('beforeunload', () => {
  if (timerInterval) clearInterval(timerInterval);
});

window.addEventListener('focus', () => {
  renderHistory();
  if (!isRunning) {
    if (currentMode === 'focus' && remainingSeconds > focusDurationSec) remainingSeconds = focusDurationSec;
    if (currentMode === 'break' && remainingSeconds > breakDurationSec) remainingSeconds = breakDurationSec;
    updateUI();
  }
});