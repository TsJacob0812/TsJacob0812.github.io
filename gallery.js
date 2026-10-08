const lightbox = document.querySelector("#gallery-lightbox");
const lightboxImage = document.querySelector("#gallery-lightbox-image");
const lightboxCaption = document.querySelector("#gallery-lightbox-caption");
const closeButton = document.querySelector("#gallery-close");
let previouslyFocusedItem = null;

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("gallery-modal-open");
  lightboxImage.removeAttribute("src");
  previouslyFocusedItem?.focus();
}

for (const item of document.querySelectorAll(".gallery-item")) {
  item.addEventListener("click", () => {
    previouslyFocusedItem = item;
    lightboxImage.src = item.dataset.src;
    lightboxImage.alt = item.dataset.alt;
    lightboxCaption.textContent = item.dataset.alt;
    lightbox.hidden = false;
    document.body.classList.add("gallery-modal-open");
    closeButton.focus();
  });
}

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
