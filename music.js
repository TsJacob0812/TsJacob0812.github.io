const tapes = document.querySelectorAll(".vhs-tape");
const deck = document.querySelector("#tape-deck");
const deckWindow = document.querySelector("#deck-window");
const audio = document.querySelector("#audio-player");
const playButton = document.querySelector("#play-button");
const pauseButton = document.querySelector("#pause-button");
const ejectButton = document.querySelector("#eject-button");
const volumeControl = document.querySelector("#volume-control");
const status = document.querySelector("#music-status");
const tapeList = document.querySelector(".tape-list");
const visualizer = document.querySelector("#music-page-visualizer");

let tapeLoaded = false;
let loadedTapeTitle = "";
let loadedTape = null;
let audioContext = null;
let analyser = null;
let visualizerFrame = null;

for (let index = 0; index < 36; index += 1) {
  const bar = document.createElement("span");
  bar.className = "music-page-visualizer-bar";
  visualizer.append(bar);
}

audio.volume = Number(volumeControl.value);

function setupVisualizer() {
  if (analyser || (!window.AudioContext && !window.webkitAudioContext)) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();
  const source = audioContext.createMediaElementSource(audio);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.7;
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  updateVisualizer();
}

function updateVisualizer() {
  if (!analyser) {
    return;
  }

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
  const bars = visualizer.children;

  for (let index = 0; index < bars.length; index += 1) {
    const frequencyIndex = Math.floor(
      (index / (bars.length - 1)) * (frequencyData.length - 1),
    );
    const level = frequencyData[frequencyIndex] / 255;
    bars[index].style.height = `${Math.max(4, level * 100)}%`;
  }

  visualizerFrame = requestAnimationFrame(updateVisualizer);
}

function loadTape(tape) {
  if (tapeLoaded) {
    return;
  }

  tapeLoaded = true;
  loadedTape = tape;
  loadedTapeTitle = tape.dataset.title;
  audio.src = tape.dataset.audio;
  audio.load();
  setupVisualizer();
  playButton.disabled = false;
  pauseButton.disabled = false;
  ejectButton.disabled = false;
  deckWindow.classList.add("loaded");
  deckWindow.textContent = "Tape loaded";
  tape.setAttribute("aria-label", "VHS music tape loaded in the boombox");
  status.textContent = `${loadedTapeTitle} loaded. Press Play.`;
  tape.remove();
}

function ejectTape() {
  if (!tapeLoaded || !loadedTape) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  tapeList.append(loadedTape);
  loadedTape.setAttribute(
    "aria-label",
    `VHS ${loadedTapeTitle} music tape. Drag or click to load it.`,
  );
  tapeLoaded = false;
  loadedTape = null;
  loadedTapeTitle = "";
  playButton.disabled = true;
  pauseButton.disabled = true;
  ejectButton.disabled = true;
  deckWindow.classList.remove("loaded");
  deckWindow.textContent = "Empty deck";
  status.textContent = "Load a tape to unlock the track.";
}

function playTrack() {
  if (!tapeLoaded) {
    return;
  }

  setupVisualizer();
  audio
    .play()
    .then(() => {
      if (audioContext) {
        return audioContext.resume();
      }
    })
    .then(() => {
      status.textContent = `Now playing ${loadedTapeTitle}.`;
    })
    .catch(() => {
      status.textContent =
        "Press Play again or check that the audio file is available.";
    });
}

function pauseTrack() {
  audio.pause();
}

deck.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

deck.addEventListener("drop", (event) => {
  event.preventDefault();
  const tape = document.querySelector(
    `#${event.dataTransfer.getData("text/plain")}`,
  );
  if (tape) {
    loadTape(tape);
  }
});

for (const tape of tapes) {
  tape.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", tape.id);
    event.dataTransfer.effectAllowed = "move";
  });
  tape.addEventListener("click", () => loadTape(tape));
  tape.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      loadTape(tape);
    }
  });
}
playButton.addEventListener("click", playTrack);
pauseButton.addEventListener("click", pauseTrack);
ejectButton.addEventListener("click", ejectTape);
volumeControl.addEventListener("input", () => {
  audio.volume = Number(volumeControl.value);
});
