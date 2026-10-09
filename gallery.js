const lightbox = document.querySelector("#gallery-lightbox");
const lightboxImage = document.querySelector("#gallery-lightbox-image");
const lightboxCaption = document.querySelector("#gallery-lightbox-caption");
const closeButton = document.querySelector("#gallery-close");
const previousButton = document.querySelector("#gallery-previous");
const nextButton = document.querySelector("#gallery-next");
const galleryAudio = document.querySelector("#gallery-audio");
const galleryItems = [...document.querySelectorAll(".gallery-item")];
let previouslyFocusedItem = null;
let currentPhotoIndex = 0;

function startGalleryAudio() {
  const playback = galleryAudio.play();
  if (playback) {
    playback.catch((error) => {
      console.warn("The gallery soundtrack could not be played.", error);
    });
  }
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("gallery-modal-open");
  lightboxImage.removeAttribute("src");
  previouslyFocusedItem?.focus();
}

function showPhoto(index) {
  currentPhotoIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentPhotoIndex];
  lightboxImage.src = item.dataset.src;
  lightboxImage.alt = item.dataset.alt;
  lightboxCaption.textContent = item.dataset.alt;
}

function showPreviousPhoto() {
  showPhoto(currentPhotoIndex - 1);
}

function showNextPhoto() {
  showPhoto(currentPhotoIndex + 1);
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    startGalleryAudio();
    previouslyFocusedItem = item;
    showPhoto(index);
    lightbox.hidden = false;
    document.body.classList.add("gallery-modal-open");
    closeButton.focus();
  });
});

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
previousButton.addEventListener("click", showPreviousPhoto);
nextButton.addEventListener("click", showNextPhoto);

document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) {
    return;
  }

  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowLeft") {
    showPreviousPhoto();
  } else if (event.key === "ArrowRight") {
    showNextPhoto();
  }
});
