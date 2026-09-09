const soundtrack = document.querySelector("#soundtrack");
const toggleButton = document.querySelector("#soundtrack-toggle");
const muteButton = document.querySelector("#soundtrack-mute");
const volumeControl = document.querySelector("#soundtrack-volume");

const clinkTime = 1300;
const clinkDuration = 800;
const soundtrackStartTime = 1;
const fadeDelay = clinkTime + clinkDuration;
const fadeDuration = 2500;
const bassBoost = 6;
const visualizerSensitivity = 1.35;
const visualizerBassBoost = 1.35;
const visualizerMaxHeight = 0.68;

let soundtrackContext = null;
let bassFilter = null;
let analyser = null;
let visualizerFrame = null;

const visualizer = document.querySelector("#music-visualizer");
const triangleLayer = document.querySelector("#neo-triangle-layer");
const beatThreshold = 0.58;
const beatCooldown = 170;
let lastBeat = 0;
for (let index = 0; index < 48; index += 1) {
  const bar = document.createElement("span");
  bar.className = "music-visualizer-bar";
  bar.dataset.rate = (0.75 + index * 0.06).toFixed(2);
  bar.dataset.phase = (index * 0.7).toFixed(2);
  visualizer.append(bar);
}

soundtrack.volume = Number(volumeControl.value);

function setupBassBoost() {
  if (
    soundtrackContext ||
    (!window.AudioContext && !window.webkitAudioContext)
  ) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  soundtrackContext = new AudioContextClass();
  const soundtrackSource =
    soundtrackContext.createMediaElementSource(soundtrack);
  bassFilter = soundtrackContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 180;
  bassFilter.gain.value = bassBoost;
  soundtrackSource.connect(bassFilter);
  analyser = soundtrackContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.65;
  bassFilter.connect(analyser);
  analyser.connect(soundtrackContext.destination);
}

function updateVisualizer() {
  if (!analyser) {
    return;
  }

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
  const bars = visualizer.children;
  const isPlaying = !soundtrack.paused;
  const now = performance.now();
  const midpoint = (bars.length - 1) / 2;
  const bassLevel =
    frequencyData.slice(0, 8).reduce((total, value) => total + value, 0) /
    (8 * 255);
  for (const triangle of triangleLayer.children) {
    triangle.style.setProperty(
      "--beat-pulse",
      (1 + bassLevel * 0.42).toFixed(2),
    );
    triangle.style.setProperty("--beat-warp", bassLevel.toFixed(2));
  }

  if (isPlaying && bassLevel > beatThreshold && now - lastBeat > beatCooldown) {
    lastBeat = now;
    spawnNeoTriangles(bassLevel);
  }

  for (let index = 0; index < bars.length; index += 1) {
    const distanceFromCenter = Math.abs(index - midpoint) / midpoint;
    const frequencyIndex = Math.floor(
      (index / (bars.length - 1)) * (frequencyData.length - 1),
    );
    const frequencyPosition = frequencyIndex / (frequencyData.length - 1);
    const bassFactor = 1 + (1 - frequencyPosition) * (visualizerBassBoost - 1);
    const audioLevel = (frequencyData[frequencyIndex] / 255) * bassFactor;
    const rate = Number(bars[index].dataset.rate);
    const phase = Number(bars[index].dataset.phase);
    const motion =
      0.65 + 0.35 * ((Math.sin((now / 180) * rate + phase) + 1) / 2);
    const centerBias = 0.6 + 0.7 * (1 - Math.abs(index - midpoint) / midpoint);
    const movement = 0.06 + audioLevel * visualizerSensitivity * centerBias;
    const level = isPlaying
      ? Math.min(visualizerMaxHeight, movement * motion)
      : 0;
    bars[index].style.height = `${Math.max(5, level * 100)}%`;
  }

  visualizerFrame = requestAnimationFrame(updateVisualizer);
}

function spawnNeoTriangles(bassLevel) {
  const triangleCount = bassLevel > 0.78 ? 3 : bassLevel > 0.66 ? 2 : 1;

  for (let index = 0; index < triangleCount; index += 1) {
    const triangle = document.createElement("span");
    triangle.className = `neo-triangle${Math.random() < 0.35 ? " is-solid" : ""}`;
    triangle.style.setProperty(
      "--triangle-top",
      `${-2 + Math.random() * 104}%`,
    );
    triangle.style.setProperty(
      "--triangle-size",
      `${10 + Math.random() * 15}px`,
    );
    triangle.style.setProperty(
      "--triangle-travel",
      `-${Math.round(window.innerWidth * (0.48 + Math.random() * 0.05))}px`,
    );
    triangle.style.setProperty(
      "--triangle-tilt",
      `${-35 + Math.random() * 70}deg`,
    );
    triangle.style.setProperty(
      "--triangle-delay",
      `${index * 55 + Math.random() * 90}ms`,
    );
    triangle.style.setProperty("--beat-pulse", "1");
    triangle.style.setProperty("--beat-warp", "0");
    triangleLayer.append(triangle);
    triangle.addEventListener("animationend", () => triangle.remove(), {
      once: true,
    });
  }
}

function fadeInSoundtrack() {
  const targetVolume = Number(volumeControl.value);
  soundtrack.volume = 0;

  window.setTimeout(() => {
    if (soundtrack.paused) {
      return;
    }

    const fadeStart = performance.now();
    function updateVolume(now) {
      const progress = Math.min((now - fadeStart) / fadeDuration, 1);
      soundtrack.volume = targetVolume * progress;
      if (progress < 1 && !soundtrack.paused) {
        requestAnimationFrame(updateVolume);
      }
    }

    requestAnimationFrame(updateVolume);
  }, fadeDelay);
}

function startSoundtrack() {
  setupBassBoost();
  if (!visualizerFrame) {
    updateVisualizer();
  }
  soundtrack.currentTime = soundtrackStartTime;
  soundtrack.volume = 0;
  return soundtrack
    .play()
    .then(() => {
      if (!soundtrackContext) {
        return;
      }

      return soundtrackContext.resume().catch(() => {});
    })
    .then(fadeInSoundtrack);
}

function playDing() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  gain.connect(audioContext.destination);

  [1100, 2200].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index * 4;
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.8);
  });
}

function updateToggleButton() {
  const isPlaying = !soundtrack.paused;
  toggleButton.textContent = isPlaying ? "Pause" : "Play";
  toggleButton.setAttribute(
    "aria-label",
    isPlaying ? "Pause soundtrack" : "Play soundtrack",
  );
}

function updateMuteButton() {
  muteButton.textContent = soundtrack.muted ? "Muted" : "Volume";
  muteButton.setAttribute(
    "aria-label",
    soundtrack.muted ? "Unmute soundtrack" : "Mute soundtrack",
  );
}

startSoundtrack().catch(updateToggleButton);
soundtrack.addEventListener("play", updateToggleButton);
soundtrack.addEventListener("pause", updateToggleButton);
window.setTimeout(() => {
  playDing();
}, clinkTime);

toggleButton.addEventListener("click", () => {
  if (soundtrack.paused) {
    startSoundtrack().catch(updateToggleButton);
  } else {
    soundtrack.pause();
  }
});

muteButton.addEventListener("click", () => {
  soundtrack.muted = !soundtrack.muted;
  updateMuteButton();
});

volumeControl.addEventListener("input", () => {
  soundtrack.volume = Number(volumeControl.value);
  soundtrack.muted = soundtrack.volume === 0;
  updateMuteButton();
});

updateToggleButton();
updateMuteButton();
