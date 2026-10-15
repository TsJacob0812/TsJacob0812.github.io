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
const speakers = document.querySelectorAll(".speaker");

const excludedTracks = [
  "Finale 4.mp3",
  "dj-intro.mp3",
  "DJ Scratch Sound Effect HD _ No Copyright 4.mp3",
];

const trackCatalog = [
  { file: "audio/Sleepy Hallow - 2055 (Official Video) 4.mp3", title: "Sleepy Hallow - 2055" },
  { file: "audio/Animal_Company_OST_Tech_Tree_2.mp3", title: "Animal Company OST - Tech Tree 2" },
  { file: "audio/Army Of Lovers - Crucified (Lyrics) 4.mp3", title: "Army of Lovers - Crucified (Lyrics)" },
  { file: "audio/Asleep In Space 4.mp3", title: "Asleep in Space" },
  { file: "audio/Insomniac.mp3", title: "Insomniac" },
  { file: "audio/Lil Peep & Lil Tracy - castles (Official Audio) 4.mp3", title: "Lil Peep & Lil Tracy - Castles" },
  { file: "audio/Playboi_Carti_Sky.mp3", title: "Playboi Carti - Sky" },
  { file: "audio/Mathiastyner - 2AM (Official Music Video).mp3", title: "Mathiastyner - 2AM" },
  { file: "audio/Rival.mp3", title: "Rival - Nb Bankz" },
  { file: "audio/SEMATARY AND GHOST MOUNTAIN  - WORLD'S A FUCK 4.mp3", title: "World's A #### - Semmetary and GhostMountain" },
  { file: "audio/SHAKE THAT SHIT! (prodbyabnormal x hr) 4.mp3", title: "SHAKE THAT ####!" },
  { file: "audio/Spotify_Free_2026-10-09.mp3", title: "HUNNIDDOLLA" },
  { file: "audio/WIREFRAME_Animal_Company.mp3", title: "WIREFRAME - Animal Company" },
  { file: "audio/magnolia.mp3", title: "Magnolia" },
  { file: "audio/space_travel_correct.mp3", title: "Space Travel" },
  { file: "audio/weight_original_soundtrack.mp3", title: "Weight - Original Soundtrack" },
].filter(({ file }) => !excludedTracks.some((excluded) => file.toLowerCase().endsWith(excluded.toLowerCase())));

let tapeLoaded = false;
let loadedTapeTitle = "";
let loadedTape = null;
let audioContext = null;
let analyser = null;
let bassBoost = null;
let visualizerFrame = null;

for (let index = 0; index < 36; index += 1) {
  const bar = document.createElement("span");
  bar.className = "music-page-visualizer-bar";
  visualizer.append(bar);
}

audio.volume = Number(volumeControl.value);

function buildTapeShelf() {
  tapeList.innerHTML = "";

  trackCatalog.forEach((track) => {
    const tape = document.createElement("div");
    tape.className = "vhs-tape";
    tape.id = `tape-${track.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    tape.dataset.audio = track.file;
    tape.dataset.title = track.title;
    tape.draggable = true;
    tape.tabIndex = 0;
    tape.setAttribute("role", "button");
    tape.setAttribute("aria-label", "VHS music tape. Drag or click to load it.");
    tape.innerHTML = `
      <span class="reel reel-left" aria-hidden="true"></span>
      <span class="reel reel-right" aria-hidden="true"></span>
      <span class="tape-name">${track.title}</span>
    `;
    tapeList.append(tape);
  });

  const firstTape = tapeList.querySelector(".vhs-tape");
  if (firstTape) {
    audio.src = firstTape.dataset.audio;
    audio.load();
  }
}

function setupVisualizer() {
  if (analyser || (!window.AudioContext && !window.webkitAudioContext)) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();
  const source = audioContext.createMediaElementSource(audio);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;

  bassBoost = audioContext.createBiquadFilter();
  bassBoost.type = "lowshelf";
  bassBoost.frequency.value = 128;
  bassBoost.gain.value = 8;

  source.connect(bassBoost);
  bassBoost.connect(analyser);
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
  const bassLevel =
    frequencyData
      .slice(1, 12)
      .reduce((total, level) => total + level, 0) /
    (11 * 255);
  const binWidth = audioContext.sampleRate / analyser.fftSize;
  const bassStart = Math.max(1, Math.floor(45 / binWidth));
  const bassEnd = Math.ceil(180 / binWidth);
  const speakerBassLevel = Math.max(
    ...frequencyData.slice(bassStart, bassEnd),
  ) / 255;
  const expansion = audio.paused ? 0 : Math.min(3, speakerBassLevel * 5);

  for (const speaker of speakers) {
    const width = speaker.offsetWidth;
    speaker.style.transform = `scale(${(width + expansion * 2) / width})`;
  }

  document.body.style.setProperty(
    "--music-background-brightness",
    (1 + bassLevel * 0.75).toFixed(2),
  );

  for (let index = 0; index < bars.length; index += 1) {
    const frequencyIndex = Math.floor(
      (index / (bars.length - 1)) * (frequencyData.length - 1),
    );
    const level = frequencyData[frequencyIndex] / 255;
    bars[index].style.height = `${Math.max(6, level * 110)}%`;
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
  if (audioContext && bassBoost) {
    bassBoost.gain.setTargetAtTime(8, audioContext.currentTime, 0.25);
  }
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

buildTapeShelf();
const tapes = document.querySelectorAll(".vhs-tape");

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
