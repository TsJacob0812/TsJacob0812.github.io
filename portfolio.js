const FADE_DURATION = 1.2;
const HOVER_VOLUME = 0.64;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext;

function setupHoverAudio(selector, sourceUrl, clipStart, clipEnd) {
  const link = document.querySelector(selector);
  if (!link) return null;

  const audio = new Audio(new URL(sourceUrl, document.baseURI));
  audio.preload = "auto";
  const track = { link, audio, clipStart, clipEnd, volume: null, playbackId: 0, hovering: false };

  function connectAudio() {
    if (track.volume || !AudioContextClass) return;

    audioContext ??= new AudioContextClass();
    const source = audioContext.createMediaElementSource(audio);
    const dryVolume = audioContext.createGain();
    const echoDelay = audioContext.createDelay(1);
    const echoFeedback = audioContext.createGain();
    const echoVolume = audioContext.createGain();
    track.volume = audioContext.createGain();

    dryVolume.gain.value = 0.7;
    echoDelay.delayTime.value = 0.24;
    echoFeedback.gain.value = 0.28;
    echoVolume.gain.value = 0.38;
    track.volume.gain.value = 0;

    source.connect(dryVolume);
    dryVolume.connect(track.volume);
    source.connect(echoDelay);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(echoVolume);
    echoVolume.connect(track.volume);
    track.volume.connect(audioContext.destination);
  }

  function fadeOut() {
    const playbackId = ++track.playbackId;
    if (track.volume && audioContext) {
      const now = audioContext.currentTime;
      track.volume.gain.cancelScheduledValues(now);
      track.volume.gain.setTargetAtTime(0, now, FADE_DURATION / 4);
    } else {
      audio.volume = 0;
    }

    window.setTimeout(() => {
      if (playbackId !== track.playbackId) return;
      audio.pause();
      audio.currentTime = clipStart;
    }, FADE_DURATION * 1000);
  }

  async function playClip() {
    track.hovering = true;
    const playbackId = ++track.playbackId;

    try {
      connectAudio();
      if (audioContext) await audioContext.resume();

      audio.pause();
      audio.currentTime = clipStart;
      if (track.volume && audioContext) {
        const now = audioContext.currentTime;
        track.volume.gain.cancelScheduledValues(now);
        track.volume.gain.setValueAtTime(0, now);
        track.volume.gain.linearRampToValueAtTime(HOVER_VOLUME, now + FADE_DURATION);
      } else {
        audio.volume = HOVER_VOLUME;
      }

      await audio.play();
      if (!track.hovering || playbackId !== track.playbackId) fadeOut();
    } catch (error) {
      if (playbackId !== track.playbackId) return;
      track.hovering = false;
      fadeOut();
      console.error(`Could not play hover audio for ${selector}.`, error);
    }
  }

  link.addEventListener("pointerenter", playClip);
  link.addEventListener("pointerleave", () => {
    track.hovering = false;
    fadeOut();
  });
  audio.addEventListener("timeupdate", () => {
    if (!track.hovering || audio.currentTime < clipEnd - FADE_DURATION) return;
    track.hovering = false;
    fadeOut();
  });

  return { connectAudio };
}

const hoverTracks = [
  setupHoverAudio(".backrooms-link", "audio/Handprint.mp3", 4, 7.5),
  setupHoverAudio(
    ".fortnite-link",
    "audio/Fortnite Menu Theme (Full) - Fortnite Soundtrack [Original + Battle Royale] 4.mp3",
    1,
    4.59,
  ),
].filter(Boolean);

function unlockHoverAudio() {
  try {
    for (const track of hoverTracks) track.connectAudio();
    if (audioContext?.state === "suspended") {
      audioContext.resume().catch((error) => {
        console.error("Could not unlock portfolio hover audio.", error);
      });
    }
  } catch (error) {
    console.error("Could not initialize portfolio hover audio.", error);
  }
}

document.addEventListener("pointerdown", unlockHoverAudio, { once: true });
document.addEventListener("keydown", unlockHoverAudio, { once: true });
