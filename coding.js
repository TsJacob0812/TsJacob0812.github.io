const codingAudio = document.querySelector("#coding-audio");

if (codingAudio) {
  const startWireframe = () => {
    codingAudio.currentTime = 5;
    codingAudio.play().catch(() => {});
  };

  if (codingAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    startWireframe();
  } else {
    codingAudio.addEventListener("loadedmetadata", startWireframe, {
      once: true,
    });
  }
}
