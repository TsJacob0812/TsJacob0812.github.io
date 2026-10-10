const djIntro = document.querySelector("#dj-intro");
const soundtrack = document.querySelector("#soundtrack");
const toggleButton = document.querySelector("#soundtrack-toggle");
const muteButton = document.querySelector("#soundtrack-mute");
const volumeControl = document.querySelector("#soundtrack-volume");

const clinkTime = 1300;
const soundtrackStartTime = 1.50;
const djIntroDuration = 650;
const djDelayAfterDing = 1500;
const crossfadeDuration = 250;
const djIntroStartsAt = performance.now() + clinkTime + djDelayAfterDing;
const bassBoost = 7;
const visualizerSensitivity = 0.90;
const visualizerBassBoost = 1.35;
const visualizerMaxHeight = 0.68;

let soundtrackContext = null;
let bassFilter = null;
let analyser = null;
let soundtrackGain = null;
let djAnalyser = null;
let djGain = null;
let visualizerFrame = null;
let djBassFrame = null;
let hasStartedSoundtrack = false;
let hasPlayedDing = false;
let hasPlayedDJIntro = false;
let djIntroPromise = null;
let isDJBassHit = false;
let isSoundtrackBassHit = false;

const visualizer = document.querySelector("#music-visualizer");
const triangleLayer = document.querySelector("#neo-triangle-layer");
const clink = document.querySelector(".wine-clink");
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

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  soundtrackContext ??= new AudioContextClass();
  return soundtrackContext;
}

function setupBassBoost() {
  if (bassFilter) {
    return;
  }

  const audioContext = getAudioContext();
  if (!audioContext) {
    return;
  }

  const soundtrackSource =
    audioContext.createMediaElementSource(soundtrack);
  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 180;
  bassFilter.gain.value = bassBoost;
  soundtrackSource.connect(bassFilter);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.65;
  bassFilter.connect(analyser);
  soundtrackGain = audioContext.createGain();
  analyser.connect(soundtrackGain);
  soundtrackGain.connect(audioContext.destination);
}

function setupDJAnalyser() {
  if (djAnalyser) {
    return;
  }

  const audioContext = getAudioContext();
  if (!audioContext) {
    return;
  }

  const djSource = audioContext.createMediaElementSource(djIntro);
  djGain = audioContext.createGain();
  djAnalyser = audioContext.createAnalyser();
  djAnalyser.fftSize = 1024;
  djAnalyser.smoothingTimeConstant = 0.25;
  djSource.connect(djGain);
  djGain.connect(djAnalyser);
  djAnalyser.connect(audioContext.destination);
}

function setClinkBassHit(source, isHit) {
  if (source === "dj") {
    isDJBassHit = isHit;
  } else {
    isSoundtrackBassHit = isHit;
  }

  clink.classList.toggle(
    "is-bass-hit",
    isDJBassHit || isSoundtrackBassHit,
  );
}

function updateClinkFromDJBass() {
  if (!djAnalyser || djIntro.paused) {
    setClinkBassHit("dj", false);
    djBassFrame = null;
    return;
  }

  const frequencyData = new Uint8Array(djAnalyser.frequencyBinCount);
  djAnalyser.getByteFrequencyData(frequencyData);
  const binWidth = soundtrackContext.sampleRate / djAnalyser.fftSize;
  const bassBinCount = Math.ceil(220 / binWidth);
  const bassLevel =
    frequencyData
      .slice(1, bassBinCount + 1)
      .reduce((total, value) => total + value, 0) /
    (bassBinCount * 255);
  if (!isDJBassHit && bassLevel >= 0.2) {
    setClinkBassHit("dj", true);
  } else if (isDJBassHit && bassLevel < 0.12) {
    setClinkBassHit("dj", false);
  }

  djBassFrame = requestAnimationFrame(updateClinkFromDJBass);
}

function stopDJBassMonitor() {
  if (djBassFrame) {
    cancelAnimationFrame(djBassFrame);
    djBassFrame = null;
  }
  setClinkBassHit("dj", false);
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
  if (!isSoundtrackBassHit && isPlaying && bassLevel >= 0.2) {
    setClinkBassHit("soundtrack", true);
  } else if (
    isSoundtrackBassHit &&
    (!isPlaying || bassLevel < 0.12)
  ) {
    setClinkBassHit("soundtrack", false);
  }
  for (const triangle of triangleLayer.children) {
    triangle.style.setProperty(
      "--beat-pulse",
      (1 + bassLevel * 0.42).toFixed(2),
    );
    triangle.style.setProperty("--beat-warp", bassLevel.toFixed(2));
  }

  const glowLevel = isPlaying ? 0.12 + bassLevel * 0.72 : 0.06;
  triangleLayer.style.setProperty("--triangle-glow", glowLevel.toFixed(2));

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

function startMainSoundtrack({ crossfade = false } = {}) {
  setupBassBoost();
  if (!visualizerFrame) {
    updateVisualizer();
  }
  if (!hasStartedSoundtrack) {
    soundtrack.currentTime = soundtrackStartTime;
    hasStartedSoundtrack = true;
  }
  soundtrack.volume = Number(volumeControl.value);
  const useCrossfade = crossfade && soundtrackGain && djGain;
  if (soundtrackGain) {
    const now = soundtrackContext.currentTime;
    soundtrackGain.gain.cancelScheduledValues(now);
    soundtrackGain.gain.setValueAtTime(useCrossfade ? 0 : 1, now);
  }
  return soundtrack
    .play()
    .then(() => {
      if (!soundtrackContext) {
        return;
      }

      return soundtrackContext.resume().then(() => {
        if (!useCrossfade) {
          return;
        }

        const now = soundtrackContext.currentTime;
        soundtrackGain.gain.setValueAtTime(0, now);
        soundtrackGain.gain.linearRampToValueAtTime(
          1,
          now + crossfadeDuration / 1000,
        );
        djGain.gain.setValueAtTime(1, now);
        djGain.gain.linearRampToValueAtTime(
          0,
          now + crossfadeDuration / 1000,
        );
      });
    });
}

function playDJIntroAndCrossfade() {
  setupDJAnalyser();
  djIntro.currentTime = 0;
  djIntro.volume = 0.5;
  return Promise.resolve(
    soundtrackContext?.state === "suspended"
      ? soundtrackContext.resume()
      : undefined,
  )
    .then(() => djIntro.play())
    .then(
      () =>
        new Promise((resolve, reject) => {
          let crossfadeTimer;
          let stopTimer;
          let crossfadePromise;
          let finished = false;

          const cleanup = () => {
            window.clearTimeout(crossfadeTimer);
            window.clearTimeout(stopTimer);
            djIntro.removeEventListener("ended", finish);
            stopDJBassMonitor();
            djIntro.pause();
          };
          const finish = () => {
            if (finished) {
              return;
            }
            finished = true;
            cleanup();
            if (crossfadePromise) {
              crossfadePromise.then(resolve, reject);
            } else {
              startMainSoundtrack().then(resolve, reject);
            }
          };
          const startCrossfade = () => {
            crossfadePromise = startMainSoundtrack({ crossfade: true });
            crossfadePromise.catch((error) => {
              if (!finished) {
                finished = true;
                cleanup();
                reject(error);
              }
            });
          };

          djIntro.addEventListener("ended", finish, { once: true });
          updateClinkFromDJBass();
          crossfadeTimer = window.setTimeout(
            startCrossfade,
            djIntroDuration - crossfadeDuration,
          );
          stopTimer = window.setTimeout(finish, djIntroDuration);
        }),
    );
}

function startSoundtrack() {
  if (hasPlayedDJIntro) {
    return startMainSoundtrack();
  }
  if (djIntroPromise) {
    return djIntroPromise;
  }

  const waitForDJSchedule = Math.max(0, djIntroStartsAt - performance.now());
  djIntroPromise = new Promise((resolve) => {
    window.setTimeout(resolve, waitForDJSchedule);
  })
    .then(playDJIntroAndCrossfade)
    .then(() => {
      hasPlayedDJIntro = true;
    })
    .finally(() => {
      djIntroPromise = null;
    });
  return djIntroPromise;
}

function playDing() {
  if (hasPlayedDing) {
    return Promise.resolve();
  }

  const audioContext = getAudioContext();
  if (!audioContext) {
    return Promise.resolve();
  }

  const resumeAudio =
    audioContext.state === "suspended"
      ? audioContext.resume()
      : Promise.resolve();

  return resumeAudio.then(() => {
    if (hasPlayedDing) {
      return;
    }

    hasPlayedDing = true;
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
  });
}

function updateToggleButton() {
  const isPlaying = !soundtrack.paused || !djIntro.paused;
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

window.setTimeout(() => {
  playDing().catch(updateToggleButton);
}, clinkTime);
window.setTimeout(() => {
  startSoundtrack().catch(updateToggleButton);
}, clinkTime + djDelayAfterDing);
soundtrack.addEventListener("play", updateToggleButton);
soundtrack.addEventListener("pause", updateToggleButton);
djIntro.addEventListener("play", updateToggleButton);
djIntro.addEventListener("pause", updateToggleButton);

document.addEventListener("click", (event) => {
  if (event.target.closest(".soundtrack-widget")) {
    return;
  }

  if (soundtrack.paused) {
    startSoundtrack()
      .then(() => {
        playDing();
      })
      .catch(updateToggleButton);
  }
});

toggleButton.addEventListener("click", () => {
  if (soundtrack.paused && djIntro.paused) {
    startSoundtrack()
      .then(() => {
        playDing();
      })
      .catch(updateToggleButton);
  } else {
    soundtrack.pause();
    djIntro.pause();
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
