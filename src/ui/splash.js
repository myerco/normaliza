export function initSplash({ onStart, onHowToPlay } = {}) {
  const startButton = document.getElementById('btn-start');
  const howToPlayButton = document.getElementById('btn-how');

  if (startButton && onStart) {
    startButton.addEventListener('click', onStart);
  }

  if (howToPlayButton && onHowToPlay) {
    howToPlayButton.addEventListener('click', onHowToPlay);
  }

  return { startButton, howToPlayButton };
}
