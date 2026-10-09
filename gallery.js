const lightbox = document.querySelector("#gallery-lightbox");
const lightboxImage = document.querySelector("#gallery-lightbox-image");
const lightboxCaption = document.querySelector("#gallery-lightbox-caption");
const closeButton = document.querySelector("#gallery-close");
const galleryAudio = document.querySelector("#gallery-audio");
const galleryAudioNote = document.querySelector("#gallery-audio-note");
let previouslyFocusedItem = null;

function startGalleryAudio() {
  const playback = galleryAudio.play();
  if (playback) {
    playback.catch((error) => {
      galleryAudioNote.textContent =
        error.name === "NotAllowedError"
          ? "Press play above to start the gallery soundtrack."
          : "The gallery soundtrack could not be played. Check the audio file and try again.";
    });
  }
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("gallery-modal-open");
  lightboxImage.removeAttribute("src");
  previouslyFocusedItem?.focus();
}

for (const item of document.querySelectorAll(".gallery-item")) {
  item.addEventListener("click", () => {
    startGalleryAudio();
    previouslyFocusedItem = item;
    lightboxImage.src = item.dataset.src;
    lightboxImage.alt = item.dataset.alt;
    lightboxCaption.textContent = item.dataset.alt;
    lightbox.hidden = false;
    document.body.classList.add("gallery-modal-open");
    closeButton.focus();
  });
}

window.addEventListener("pagehide", () => {
  galleryAudio.pause();
  galleryAudio.currentTime = 0;
});

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

closeButton.addEventListener("click", closeLightbox);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lightbox.hidden) {
    closeLightbox();
  }
});
