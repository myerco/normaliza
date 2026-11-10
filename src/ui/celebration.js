const COLORS = ['#ffd166', '#fb8500', '#6dd8c8', '#f15bb5', '#9b5de5', '#f4ead2'];

export function playCompletionCelebration({ label = 'Concluído', title = 'Medalha conquistada' } = {}) {
  document.querySelector('.celebration-layer')?.remove();

  const layer = document.createElement('div');
  layer.className = 'celebration-layer';
  layer.setAttribute('aria-hidden', 'true');

  const medal = document.createElement('div');
  medal.className = 'celebration-medal';

  const medalLabel = document.createElement('span');
  medalLabel.className = 'celebration-medal__label';
  medalLabel.textContent = label;

  const medalTitle = document.createElement('span');
  medalTitle.className = 'celebration-medal__title';
  medalTitle.textContent = title;

  medal.append(medalLabel, medalTitle);
  layer.append(medal);

  for (let index = 0; index < 28; index++) {
    const piece = document.createElement('span');
    piece.className = 'celebration-confetti';
    piece.style.setProperty('--confetti-x', `${Math.round(Math.random() * 100)}%`);
    piece.style.setProperty('--confetti-delay', `${(Math.random() * 0.7).toFixed(2)}s`);
    piece.style.setProperty('--confetti-duration', `${(1.4 + Math.random() * 1.1).toFixed(2)}s`);
    piece.style.setProperty('--confetti-rotate', `${Math.round(Math.random() * 360)}deg`);
    piece.style.setProperty('--confetti-color', COLORS[index % COLORS.length]);
    layer.append(piece);
  }

  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 2800);
}
