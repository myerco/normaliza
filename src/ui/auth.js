import { AVATARS, validatePlayerName } from '../core/players.js';
import { createAvatarPicker } from './avatar.js';
import { el } from './dom.js';

const LOGO = './assets/images/branding/cafegeek-logo.webp';

export function renderAuthPage(root, {
  mode = 'login',
  notice = '',
  error = '',
  onBack,
  onSubmit,
  onOpenLogin,
  onOpenRegister,
  onOpenRecover
}) {
  const isRegister = mode === 'register';
  const isRecover = mode === 'recover';
  const email = textInput('email', 'voce@exemplo.com', 'email');
  const password = textInput('password', 'Sua senha', 'current-password');
  const confirmation = isRegister ? textInput('password-confirm', 'Repita a senha', 'new-password') : null;
  const formError = el('p', { class: 'form-error', role: 'alert' }, error);

  const form = el('form', { class: 'auth-form' }, [
    isRegister
      ? el('div', { class: 'auth-form__heading' }, [
          el('p', { class: 'panel__phase-label' }, 'Nova conta'),
          el('h1', {}, 'Comece sua jornada'),
          el('p', { class: 'panel__note' }, 'Crie sua identidade de acesso. O perfil de jogador vem no próximo passo.')
        ])
      : isRecover
        ? el('div', { class: 'auth-form__heading' }, [
            el('p', { class: 'panel__phase-label' }, 'Recuperar acesso'),
            el('h1', {}, 'Recupere sua conta'),
            el('p', { class: 'panel__note' }, 'Enviaremos as instruções para o e-mail cadastrado.')
          ])
        : el('div', { class: 'auth-form__heading' }, [
            el('p', { class: 'panel__phase-label' }, 'Bem-vindo de volta'),
            el('h1', {}, 'Entrar no Cafegeek'),
            el('p', { class: 'panel__note' }, 'Acesse sua conta para continuar sua jornada.')
          ]),
    el('label', { class: 'field-label', for: email.id }, 'E-mail'),
    email,
    isRecover ? null : el('label', { class: 'field-label', for: password.id }, 'Senha'),
    isRecover ? null : password,
    confirmation ? el('label', { class: 'field-label', for: confirmation.id }, 'Confirmar senha') : null,
    confirmation,
    formError,
    notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
    el('button', { class: 'btn btn--cafe btn--block', type: 'submit' },
      isRegister ? 'Criar conta' : isRecover ? 'Enviar instruções' : 'Entrar'
    ),
    el('div', { class: 'auth-links' }, [
      isRegister
        ? el('button', { class: 'auth-link', type: 'button', onclick: onOpenLogin }, 'Já tenho uma conta')
        : el('button', { class: 'auth-link', type: 'button', onclick: onOpenRegister }, 'Criar uma conta'),
      !isRecover
        ? el('button', { class: 'auth-link', type: 'button', onclick: onOpenRecover }, 'Esqueci minha senha')
        : el('button', { class: 'auth-link', type: 'button', onclick: onOpenLogin }, 'Voltar para o login')
    ])
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailValue = email.value.trim();

    if (!emailValue) {
      showError(formError, 'Informe seu e-mail.');
      email.focus();
      return;
    }

    if (!isRecover && password.value.length < 8) {
      showError(formError, 'A senha precisa ter pelo menos 8 caracteres.');
      password.focus();
      return;
    }

    if (confirmation && confirmation.value !== password.value) {
      showError(formError, 'As senhas não coincidem.');
      confirmation.focus();
      return;
    }

    showError(formError, '');
    onSubmit?.({
      mode,
      email: emailValue,
      password: isRecover ? null : password.value
    });
  });

  renderAuthShell(root, {
    title: isRegister ? 'Criar conta' : isRecover ? 'Recuperar senha' : 'Entrar',
    onBack,
    form
  });
}

export function renderOnboardingPage(root, {
  user,
  error = '',
  onBack,
  onLogout,
  onSubmit
}) {
  let selectedAvatar = AVATARS[0].id;
  const name = textInput('player-name', 'Como quer ser chamado?', 'nickname');
  const bio = el('textarea', {
    class: 'text-area',
    rows: '3',
    maxlength: '280',
    placeholder: 'Uma breve apresentação (opcional)'
  });
  const picker = createAvatarPicker({
    selectedId: selectedAvatar,
    onSelect: (avatarId) => {
      selectedAvatar = avatarId;
    }
  });
  const formError = el('p', { class: 'form-error', role: 'alert' }, error);
  const form = el('form', { class: 'auth-form onboarding-form' }, [
    el('div', { class: 'auth-form__heading' }, [
      el('p', { class: 'panel__phase-label' }, 'Seu jogador'),
      el('h1', {}, 'Crie sua identidade na jornada'),
      el('p', { class: 'panel__note' }, user?.email
        ? `Conta: ${user.email}. Esta identidade é separada da sua autenticação.`
        : 'Esta identidade é separada da sua autenticação.')
    ]),
    el('label', { class: 'field-label', for: name.id }, 'Nome ou apelido'),
    name,
    el('p', { class: 'field-help' }, 'Entre 3 e 20 caracteres. Pode ser diferente do seu e-mail.'),
    el('label', { class: 'field-label' }, 'Biografia'),
    bio,
    el('p', { class: 'field-label' }, 'Avatar'),
    picker.element,
    formError,
    el('button', { class: 'btn btn--cafe btn--block', type: 'submit' }, 'Entrar na jornada'),
    el('button', { class: 'auth-link', type: 'button', onclick: onLogout }, 'Sair desta conta')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = validatePlayerName(name.value);

    if (!validation.valid) {
      showError(formError, validation.errors[0]);
      name.focus();
      return;
    }

    showError(formError, '');
    onSubmit?.({
      name: validation.name,
      bio: bio.value,
      avatarId: selectedAvatar
    });
  });

  renderAuthShell(root, {
    title: 'Criar jogador',
    onBack,
    form
  });
}

function renderAuthShell(root, { title, onBack, form }) {
  root.replaceChildren(
    el('div', { class: 'auth-shell' }, [
      el('header', { class: 'auth-header' }, [
        el('a', { class: 'public-brand', href: '#/' }, [
          el('img', { src: LOGO, alt: '' }),
          el('span', {}, [el('strong', {}, 'Cafegeek'), el('small', {}, 'Jornada do Conhecimento')])
        ]),
        el('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onBack }, 'Voltar ao início')
      ]),
      el('main', { class: 'auth-main', 'aria-labelledby': 'auth-title' }, [
        el('section', { class: 'auth-card' }, [
          el('p', { class: 'sr-only', id: 'auth-title' }, title),
          form
        ]),
        el('aside', { class: 'auth-aside', 'aria-hidden': 'true' }, [
          el('span', {}, 'Uma cidade de conhecimento espera por você.'),
          el('strong', {}, 'Explore. Aprenda. Construa.')
        ])
      ])
    ])
  );
}

function textInput(id, placeholder, autocomplete) {
  return el('input', {
    id,
    class: 'text-input',
    type: id.includes('password') ? 'password' : id === 'email' ? 'email' : 'text',
    placeholder,
    autocomplete,
    required: true,
    maxlength: id === 'player-name' ? '20' : '254'
  });
}

function showError(node, message) {
  node.textContent = message;
  node.setAttribute('role', 'alert');
}
