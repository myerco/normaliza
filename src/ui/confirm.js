import { el } from './dom.js';

export function openConfirm({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm
}) {
  const root = document.getElementById('confirm-root');
  if (!root || root.childElementCount > 0) {
    return;
  }

  const previousFocus = document.activeElement;
  const dialog = el(
    'div',
    {
      class: 'modal__dialog confirm-dialog',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-title',
      'aria-describedby': 'confirm-message',
      tabindex: '-1'
    },
    [
      el('p', { class: 'panel__eyebrow' }, 'Confirmação'),
      el('h2', { class: 'modal__title', id: 'confirm-title' }, title),
      el('p', { class: 'modal__text', id: 'confirm-message' }, message),
      el('div', { class: 'modal__actions confirm-actions' }, [
        el(
          'button',
          {
            class: 'btn btn--ghost',
            type: 'button',
            onclick: close
          },
          cancelLabel
        ),
        el(
          'button',
          {
            class: 'btn btn--danger',
            type: 'button',
            onclick: confirm
          },
          confirmLabel
        )
      ])
    ]
  );
  const overlay = el('div', { class: 'modal', role: 'presentation' }, [dialog]);
  root.replaceChildren(overlay);
  document.addEventListener('keydown', onKeydown, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  requestAnimationFrame(() => {
    dialog.querySelector('.btn--ghost')?.focus({ preventScroll: true });
  });

  function confirm() {
    close();
    onConfirm?.();
  }

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    root.replaceChildren();
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = [...dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter(
      (node) => !node.disabled
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
