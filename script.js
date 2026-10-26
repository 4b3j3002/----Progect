const countdown = document.getElementById('倒數');
if (!countdown) {
  throw new Error('找不到巡演倒數元素 #倒數');
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const firstShowDate = new Date(2026, 10, 7);
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const daysUntilFirstShow = Math.ceil(
  (firstShowDate - today) / millisecondsPerDay
);

countdown.textContent =
  daysUntilFirstShow > 0
    ? `距離巡演首站還有 ${daysUntilFirstShow} 天`
    : daysUntilFirstShow === 0
      ? '巡演首站就在今天，現場見！'
      : '2026 巡演正在進行中，期待現場相見。';

const playButton = document.getElementById('play-button');
const playIcon = document.getElementById('play-icon');
const progress = document.getElementById('track-progress');
const volume = document.getElementById('track-volume');
const currentTimeLabel = document.getElementById('current-time');
const playerStatus = document.getElementById('player-status');

if (
  !playButton ||
  !playIcon ||
  !progress ||
  !volume ||
  !currentTimeLabel ||
  !playerStatus
) {
  throw new Error('新曲試聽播放器缺少必要的控制項');
}

const previewDuration = 24;
const secondsPerNote = 0.5;
const melody = [
  220, 261.63, 329.63, 392, 329.63, 261.63, 293.66, 349.23,
  440, 392, 349.23, 293.66, 261.63, 329.63, 392, 523.25,
  493.88, 440, 392, 329.63, 349.23, 392, 440, 523.25,
  587.33, 523.25, 440, 392, 349.23, 329.63, 293.66, 261.63,
  220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63,
  293.66, 349.23, 392, 440, 523.25, 440, 392, 329.63
];

let audioContext;
let masterGain;
let playbackTimer;
let isPlaying = false;
let playhead = 0;
let lastPlayedNote = -1;
let lastTick = 0;

function formatTime(seconds) {
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function updatePlaybackDisplay() {
  progress.value = String(playhead);
  currentTimeLabel.textContent = formatTime(playhead);
}

function playNote(index) {
  const startTime = audioContext.currentTime;
  const frequency = melody[index % melody.length];
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(0.14, startTime + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.4);

  if (index % 4 === 0) {
    const bass = audioContext.createOscillator();
    const bassEnvelope = audioContext.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(frequency / 2, startTime);
    bassEnvelope.gain.setValueAtTime(0.0001, startTime);
    bassEnvelope.gain.exponentialRampToValueAtTime(0.11, startTime + 0.03);
    bassEnvelope.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.42);
    bass.connect(bassEnvelope);
    bassEnvelope.connect(masterGain);
    bass.start(startTime);
    bass.stop(startTime + 0.45);
  }
}

function updatePlayerState(playing) {
  isPlaying = playing;
  playIcon.textContent = playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', playing ? '暫停試聽' : '播放試聽');
}

function tickPlayback() {
  const now = performance.now();
  playhead = Math.min(previewDuration, playhead + (now - lastTick) / 1000);
  lastTick = now;

  const noteIndex = Math.floor(playhead / secondsPerNote);
  if (noteIndex !== lastPlayedNote && noteIndex < melody.length) {
    playNote(noteIndex);
    lastPlayedNote = noteIndex;
  }
  updatePlaybackDisplay();

  if (playhead >= previewDuration) {
    clearInterval(playbackTimer);
    playbackTimer = undefined;
    updatePlayerState(false);
    playerStatus.textContent = '試聽結束，按播放重新聆聽。';
  }
}

async function startPlayback() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    playerStatus.textContent = '此瀏覽器不支援網頁音訊，無法播放試聽。';
    return;
  }

  try {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = Number(volume.value);
      masterGain.connect(audioContext.destination);
    }

    if (playhead >= previewDuration) {
      playhead = 0;
      lastPlayedNote = -1;
    }

    await audioContext.resume();
    updatePlayerState(true);
    playerStatus.textContent = '正在播放器樂 Demo。';
    lastTick = performance.now();
    tickPlayback();
    playbackTimer = window.setInterval(tickPlayback, 50);
  } catch (error) {
    updatePlayerState(false);
    playerStatus.textContent = '試聽播放失敗，請確認瀏覽器音訊設定後重試。';
    console.error('無法播放新曲試聽：', error);
  }
}

async function pausePlayback() {
  clearInterval(playbackTimer);
  playbackTimer = undefined;
  updatePlayerState(false);
  playerStatus.textContent = '試聽已暫停。';

  if (audioContext && audioContext.state === 'running') {
    try {
      await audioContext.suspend();
    } catch (error) {
      playerStatus.textContent = '暫停音訊失敗，請重新整理頁面後再試。';
      console.error('無法暫停新曲試聽：', error);
    }
  }
}

playButton.addEventListener('click', () => {
  if (isPlaying) {
    void pausePlayback();
  } else {
    void startPlayback();
  }
});

progress.addEventListener('input', () => {
  playhead = Number(progress.value);
  lastPlayedNote = Math.floor(playhead / secondsPerNote) - 1;
  updatePlaybackDisplay();
});

volume.addEventListener('input', () => {
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(
      Number(volume.value),
      audioContext.currentTime,
      0.025
    );
  }
});
