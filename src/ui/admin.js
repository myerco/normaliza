import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_VALUE_MAX, ATTRIBUTE_VALUE_MIN } from '../core/attributes.js';
import { AVATARS, formatPlayerName, validatePlayerName } from '../core/players.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderAdminPage(root, {
  player,
  profiles = [],
  images = [],
  catalog,
  notice = '',
  onBack,
  onSavePlayer,
  onSaveImage,
  onSaveArchetype,
  onCreateArchetype,
  onSaveAttribute,
  onCreateAttribute,
  onSaveValues
}) {
  renderPage(root, {
    title: 'Administração',
    eyebrow: 'Cafegeek — Governança de conteúdo',
    player,
    onBack,
    children: el('div', { class: 'admin-page' }, [
      el('div', { class: 'admin-warning', role: 'note' }, [
        el('strong', {}, 'Modo administrativo local'),
        el(
          'p',
          {},
          'Esta área usa a persistência local do navegador. A autorização administrativa de produção será conectada ao backend na etapa de segurança.'
        )
      ]),
      notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
      el('section', { class: 'admin-section' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Catálogo'),
            el('h2', {}, 'Arquétipos')
          ]),
          el('span', { class: 'panel__note' }, `${catalog.archetypes.length} cadastrados`)
        ]),
        el(
          'div',
          { class: 'admin-form-grid' },
          catalog.archetypes.map((archetype) =>
            archetypeForm(archetype, onSaveArchetype)
          )
        ),
        newArchetypeForm(onCreateArchetype)
      ]),
      el('section', { class: 'admin-section' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Catálogo'),
            el('h2', {}, 'Atributos')
          ]),
          el('span', { class: 'panel__note' }, `${catalog.attributes.length} cadastrados`)
        ]),
        el(
          'div',
          { class: 'admin-form-grid' },
          catalog.attributes.map((attribute) =>
            attributeForm(attribute, onSaveAttribute)
          )
        ),
        newAttributeForm(onCreateAttribute)
      ]),
      el('section', { class: 'admin-section' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Matriz'),
            el('h2', {}, 'Valores iniciais por arquétipo')
          ]),
          el(
            'span',
            { class: 'panel__note' },
            `Cada valor deve ficar entre ${ATTRIBUTE_VALUE_MIN} e ${ATTRIBUTE_VALUE_MAX}.`
          )
        ]),
        valuesForm(catalog, onSaveValues)
      ]),
      el('section', { class: 'admin-section' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Jogadores'),
            el('h2', {}, 'Perfis')
          ]),
          el('span', { class: 'panel__note' }, `${profiles.length} neste navegador`)
        ]),
        el(
          'div',
          { class: 'admin-form-grid' },
          profiles.length > 0
            ? profiles.map((profile) =>
                playerForm(profile, profiles, images, onSavePlayer)
              )
            : [el('p', { class: 'panel__note' }, 'Nenhum perfil local cadastrado.')]
        )
      ]),
      el('section', { class: 'admin-section' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Acervo'),
            el('h2', {}, 'Imagens de personagem')
          ]),
          el('span', { class: 'panel__note' }, `${images.length} cadastradas`)
        ]),
        el(
          'div',
          { class: 'admin-form-grid' },
          images.map((image) => imageForm(image, onSaveImage))
        )
      ])
    ])
  });
}

function archetypeForm(archetype, onSave) {
  const name = textInput(archetype.name);
  const description = textArea(archetype.description);
  const image = imageSelect(archetype.imageId);
  const active = checkbox(archetype.active);
  const form = el('form', { class: 'admin-form' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, archetype.name),
      el('span', { class: 'admin-slug' }, archetype.slug)
    ]),
    label('Nome', name),
    label('Descrição', description),
    label('Imagem', image),
    activeRow('Ativo', active),
    el('button', { class: 'btn btn--ghost btn--small', type: 'submit' }, 'Salvar arquétipo')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSave?.(archetype.id, {
      name: name.value,
      description: description.value,
      imageId: image.value,
      active: active.checked
    });
  });

  return form;
}

function newArchetypeForm(onCreate) {
  const name = textInput('');
  const description = textArea('');
  const image = imageSelect('engenheiro');
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, 'Novo arquétipo'),
      el('span', { class: 'admin-slug' }, 'cadastro')
    ]),
    label('Nome', name),
    label('Descrição', description),
    label('Imagem', image),
    el('button', { class: 'btn btn--cafe btn--small', type: 'submit' }, 'Adicionar arquétipo')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onCreate?.({
      name: name.value,
      description: description.value,
      imageId: image.value,
      active: true
    });
  });

  return form;
}

function attributeForm(attribute, onSave) {
  const name = textInput(attribute.name);
  const description = textArea(attribute.description);
  const category = categorySelect(attribute.categoryId);
  const icon = textInput(attribute.icon);
  const active = checkbox(attribute.active);
  const form = el('form', { class: 'admin-form' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, attribute.name),
      el('span', { class: 'admin-slug' }, attribute.slug)
    ]),
    label('Nome', name),
    label('Descrição', description),
    label('Categoria', category),
    label('Ícone', icon),
    activeRow('Ativo', active),
    el('button', { class: 'btn btn--ghost btn--small', type: 'submit' }, 'Salvar atributo')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSave?.(attribute.id, {
      name: name.value,
      description: description.value,
      categoryId: category.value,
      icon: icon.value,
      active: active.checked
    });
  });

  return form;
}

function newAttributeForm(onCreate) {
  const name = textInput('');
  const description = textArea('');
  const category = categorySelect(ATTRIBUTE_CATEGORIES[0].id);
  const icon = textInput('');
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, 'Novo atributo'),
      el('span', { class: 'admin-slug' }, 'cadastro')
    ]),
    label('Nome', name),
    label('Descrição', description),
    label('Categoria', category),
    label('Ícone', icon),
    el('button', { class: 'btn btn--cafe btn--small', type: 'submit' }, 'Adicionar atributo')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onCreate?.({
      name: name.value,
      description: description.value,
      categoryId: category.value,
      icon: icon.value,
      active: true
    });
  });

  return form;
}

function valuesForm(catalog, onSave) {
  const inputs = new Map();
  const rows = catalog.attributes.map((attribute) =>
    el('tr', {}, [
      el('th', { scope: 'row' }, [
        el('strong', {}, attribute.name),
        el('span', { class: 'panel__note' }, attribute.categoryId)
      ]),
      ...catalog.archetypes.map((archetype) => {
        const input = el('input', {
          class: 'admin-value',
          type: 'number',
          min: String(ATTRIBUTE_VALUE_MIN),
          max: String(ATTRIBUTE_VALUE_MAX),
          step: '1',
          value: String(catalog.values?.[archetype.id]?.[attribute.id] ?? ATTRIBUTE_VALUE_MIN),
          'aria-label': `${attribute.name} para ${archetype.name}`
        });
        inputs.set(`${archetype.id}:${attribute.id}`, input);
        return el('td', {}, input);
      })
    ])
  );

  const form = el('form', { class: 'admin-values' }, [
    el('div', { class: 'table-scroll' }, [
      el('table', { class: 'data-table admin-matrix' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', {}, 'Atributo'),
            ...catalog.archetypes.map((archetype) =>
              el('th', {}, archetype.name)
            )
          ])
        ]),
        el('tbody', {}, rows)
      ])
    ]),
    el(
      'button',
      { class: 'btn btn--cafe', type: 'submit' },
      'Salvar valores iniciais'
    )
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = {};

    for (const archetype of catalog.archetypes) {
      values[archetype.id] = {};
      for (const attribute of catalog.attributes) {
        const input = inputs.get(`${archetype.id}:${attribute.id}`);
        const numeric = Number(input.value);
        if (!Number.isInteger(numeric) || numeric < ATTRIBUTE_VALUE_MIN || numeric > ATTRIBUTE_VALUE_MAX) {
          input.focus();
          return;
        }
        values[archetype.id][attribute.id] = numeric;
      }
    }

    onSave?.(values);
  });

  return form;
}

function playerForm(profile, profiles, images, onSave) {
  const name = textInput(profile.name);
  const bio = textArea(profile.bio);
  const avatar = imageSelect(profile.avatarId, images);
  const error = el('p', { class: 'form-error', role: 'alert' });
  const form = el('form', { class: 'admin-form' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, formatPlayerName(profile.name)),
      el('span', { class: 'admin-slug' }, profile.id)
    ]),
    label('Nome', name),
    label('Biografia', bio),
    label('Imagem', avatar),
    error,
    el('button', { class: 'btn btn--ghost btn--small', type: 'submit' }, 'Salvar perfil')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = validatePlayerName(name.value, {
      existingNames: profiles
        .filter((candidate) => candidate.id !== profile.id)
        .map((candidate) => candidate.name),
      currentName: profile.name
    });

    if (!validation.valid) {
      error.textContent = validation.errors[0];
      name.setAttribute('aria-invalid', 'true');
      name.focus();
      return;
    }

    error.textContent = '';
    name.removeAttribute('aria-invalid');
    onSave?.(profile.id, {
      name: validation.name,
      bio: bio.value,
      avatarId: avatar.value
    });
  });

  return form;
}

function imageForm(image, onSave) {
  const name = textInput(image.name);
  const description = textArea(image.description);
  const imageUrl = el('input', {
    class: 'text-input',
    type: 'url',
    value: image.imageUrl ?? '',
    placeholder: 'https://… (opcional)'
  });
  const active = checkbox(image.active);
  const form = el('form', { class: 'admin-form' }, [
    el('div', { class: 'admin-form__head' }, [
      el('strong', {}, image.name),
      el('span', { class: 'admin-slug' }, image.id)
    ]),
    label('Nome', name),
    label('Descrição', description),
    label('URL da imagem', imageUrl),
    activeRow('Ativa', active),
    el('button', { class: 'btn btn--ghost btn--small', type: 'submit' }, 'Salvar imagem')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSave?.(image.id, {
      name: name.value,
      description: description.value,
      imageUrl: imageUrl.value,
      active: active.checked
    });
  });

  return form;
}

function textInput(value) {
  return el('input', { class: 'text-input', type: 'text', value });
}

function textArea(value) {
  const input = el('textarea', { class: 'text-area', rows: '2' });
  input.value = value ?? '';
  return input;
}

function imageSelect(selected, images = AVATARS) {
  const options = images.length > 0 ? images : AVATARS;
  const select = el(
    'select',
    { class: 'text-input admin-select' },
    options.map((image) =>
      el('option', { value: image.id }, image.name ?? image.label ?? image.id)
    )
  );
  select.value = selected;
  return select;
}

function categorySelect(selected) {
  const select = el(
    'select',
    { class: 'text-input admin-select' },
    ATTRIBUTE_CATEGORIES.map((category) =>
      el('option', { value: category.id }, category.label)
    )
  );
  select.value = selected;
  return select;
}

function checkbox(checked) {
  const input = el('input', { type: 'checkbox' });
  input.checked = Boolean(checked);
  return input;
}

function label(text, control) {
  return el('label', { class: 'admin-field' }, [
    el('span', {}, text),
    control
  ]);
}

function activeRow(text, input) {
  return el('label', { class: 'admin-check' }, [input, el('span', {}, text)]);
}
