import { el } from './dom.js';
import { renderPage } from './page.js';

const STATUS_OPTIONS = [
  ['published', 'Publicado'],
  ['draft', 'Rascunho'],
  ['archived', 'Arquivado']
];

export function renderWorldAdminPage(root, {
  player,
  world,
  questCatalog,
  notice = '',
  onBack,
  onSaveContent
}) {
  const nextWorld = clone(world);
  const nextQuests = clone(questCatalog);
  const commit = () => onSaveContent?.({ world: nextWorld, questCatalog: nextQuests });

  renderPage(root, {
    title: 'Administração do Mundo',
    eyebrow: 'Cafegeek — Conteúdo do mapa',
    player,
    onBack,
    children: el('div', { class: 'admin-page admin-world' }, [
      el('div', { class: 'admin-warning', role: 'note' }, [
        el('strong', {}, 'Conteúdo do mapa'),
        el('p', {}, 'As alterações são salvas no PostgreSQL quando o backend está disponível e mantidas como cache local para uso offline.')
      ]),
      notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
      worldSection('Territórios', 'Posições, publicação e trilhas de cada território.', [
        ...nextWorld.territories.map((territory) =>
          territoryForm(territory, nextWorld, commit)
        ),
        newTerritoryForm(nextWorld, commit)
      ]),
      worldSection('Trilhas', 'Objetivos, relações com territórios, quests, habilidades e pré-requisitos.', [
        ...nextWorld.tracks.map((track) => trackForm(track, nextWorld, nextQuests, commit)),
        newTrackForm(nextWorld, commit)
      ]),
      worldSection('Habilidades', 'Competências disponíveis para quests, trilhas e especializações.', [
        ...nextWorld.skills.map((skill) => skillForm(skill, nextWorld, commit)),
        newSkillForm(nextWorld, commit)
      ]),
      worldSection('Especializações', 'Habilidades, pesos e níveis-alvo usados no cálculo de afinidade.', [
        ...nextWorld.professions.map((profession) =>
          professionForm(profession, nextWorld, commit)
        ),
        newProfessionForm(nextWorld, commit)
      ]),
      worldSection('Quests', 'Catálogo, publicação, trilhas, habilidades e pré-requisitos.', [
        ...(nextQuests.quests ?? []).map((quest) =>
          questForm(quest, nextWorld, nextQuests, commit)
        ),
        newQuestForm(nextWorld, nextQuests, commit)
      ])
    ])
  });
}

function worldSection(title, description, children) {
  return el('section', { class: 'admin-section' }, [
    el('div', { class: 'platform-section-head' }, [
      el('div', {}, [
        el('p', { class: 'panel__phase-label' }, 'Mundo'),
        el('h2', {}, title),
        el('p', { class: 'panel__note' }, description)
      ]),
      el('span', { class: 'panel__note' }, `${children.length} registros`)
    ]),
    el('div', { class: 'admin-form-grid' }, children.map(collapsible))
  ]);
}

function collapsible(form) {
  if (form.tagName !== 'FORM') {
    return form;
  }

  const title = form.querySelector('.admin-form__head strong')?.textContent ?? 'Registro';
  return el('details', { class: 'admin-details' }, [
    el('summary', {}, title),
    form
  ]);
}

function territoryForm(territory, world, commit) {
  const name = input(territory.name);
  const shortName = input(territory.shortName);
  const description = textarea(territory.description);
  const color = input(territory.color);
  const icon = input(territory.icon);
  const mapX = numberInput(territory.mapX);
  const mapY = numberInput(territory.mapY);
  const order = numberInput(territory.order ?? 1);
  const status = statusSelect(territory.status ?? 'published');
  const frontier = checkbox(territory.frontier);
  const trackChoices = choiceList(
    world.tracks.map((track) => [track.id, track.name]),
    world.trackTerritories
      .filter((link) => link.territoryId === territory.id)
      .map((link) => link.trackId)
  );

  const form = el('form', { class: 'admin-form' }, [
    formHead(territory.name, territory.id),
    label('Nome', name),
    label('Nome curto', shortName),
    label('Descrição', description),
    label('Cor', color),
    label('Ícone', icon),
    fieldRow('Mapa X', mapX, 'Mapa Y', mapY),
    fieldRow('Ordem', order, 'Fronteira', frontier),
    label('Status', status),
    label('Trilhas do território', trackChoices.element),
    submit('Salvar território')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(territory, {
      name: name.value.trim() || territory.name,
      shortName: shortName.value.trim() || territory.shortName,
      description: description.value.trim(),
      color: color.value.trim() || territory.color,
      icon: icon.value.trim() || territory.icon,
      mapX: Number(mapX.value) || 50,
      mapY: Number(mapY.value) || 50,
      order: Number(order.value) || 1,
      status: status.value,
      frontier: frontier.checked
    });
    replaceTerritoryTracks(world, territory.id, trackChoices.selected());
    commit();
  });

  return form;
}

function newTerritoryForm(world, commit) {
  const name = input('');
  const shortName = input('');
  const description = textarea('');
  const color = input('#4d9b9f');
  const status = statusSelect('published');
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    formHead('Novo território', 'cadastro'),
    label('Nome', name),
    label('Nome curto', shortName),
    label('Descrição', description),
    label('Cor', color),
    label('Status', status),
    submit('Adicionar território', true)
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = uniqueId(name.value, world.territories.map((item) => item.id), 'territorio');
    world.territories.push({
      id,
      slug: id,
      name: name.value.trim() || 'Novo território',
      shortName: shortName.value.trim() || 'NOVO',
      description: description.value.trim(),
      color: color.value.trim() || '#4d9b9f',
      icon: 'NT',
      mapX: 50,
      mapY: 50,
      order: world.territories.length + 1,
      status: status.value,
      frontier: false
    });
    commit();
  });

  return form;
}

function trackForm(track, world, questCatalog, commit) {
  const name = input(track.name);
  const description = textarea(track.description);
  const objective = textarea(track.objective);
  const status = statusSelect(track.status ?? 'published');
  const territoryChoices = choiceList(
    world.territories.map((territory) => [territory.id, territory.name]),
    world.trackTerritories
      .filter((link) => link.trackId === track.id)
      .map((link) => link.territoryId)
  );
  const questChoices = choiceList(
    (questCatalog?.quests ?? []).map((quest) => [quest.id, quest.name]),
    world.trackQuests.filter((link) => link.trackId === track.id).map((link) => link.questId)
  );
  const skillChoices = choiceList(
    world.skills.map((skill) => [skill.id, skill.name]),
    world.trackSkills.filter((link) => link.trackId === track.id).map((link) => link.skillId)
  );
  const prerequisiteChoices = choiceList(
    world.tracks.filter((item) => item.id !== track.id).map((item) => [item.id, item.name]),
    world.trackPrerequisites
      .filter((link) => link.trackId === track.id)
      .map((link) => link.prerequisiteTrackId)
  );

  const form = el('form', { class: 'admin-form' }, [
    formHead(track.name, track.id),
    label('Nome', name),
    label('Descrição', description),
    label('Objetivo', objective),
    label('Status', status),
    label('Territórios', territoryChoices.element),
    label('Quests', questChoices.element),
    label('Habilidades', skillChoices.element),
    label('Pré-requisitos de trilha', prerequisiteChoices.element),
    submit('Salvar trilha')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(track, {
      name: name.value.trim() || track.name,
      description: description.value.trim(),
      objective: objective.value.trim(),
      status: status.value
    });
    replaceTrackTerritories(world, track.id, territoryChoices.selected());
    replaceTrackQuests(world, track.id, questChoices.selected());
    replaceTrackSkills(world, track.id, skillChoices.selected());
    replaceTrackPrerequisites(world, track.id, prerequisiteChoices.selected());
    commit();
  });

  return form;
}

function newTrackForm(world, commit) {
  const name = input('');
  const description = textarea('');
  const objective = textarea('');
  const status = statusSelect('published');
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    formHead('Nova trilha', 'cadastro'),
    label('Nome', name),
    label('Descrição', description),
    label('Objetivo', objective),
    label('Status', status),
    submit('Adicionar trilha', true)
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = uniqueId(name.value, world.tracks.map((item) => item.id), 'trilha');
    world.tracks.push({
      id,
      slug: id,
      name: name.value.trim() || 'Nova trilha',
      description: description.value.trim(),
      objective: objective.value.trim(),
      order: world.tracks.length + 1,
      status: status.value
    });
    commit();
  });

  return form;
}

function skillForm(skill, world, commit) {
  const name = input(skill.name);
  const description = textarea(skill.description);
  const category = input(skill.categoryId ?? 'geral');
  const icon = input(skill.icon);
  const maxLevel = numberInput(skill.maxLevel ?? 10);
  const order = numberInput(skill.order ?? 1);
  const status = statusSelect(skill.status ?? 'published');
  const form = el('form', { class: 'admin-form' }, [
    formHead(skill.name, skill.id),
    label('Nome', name),
    label('Descrição', description),
    label('Categoria', category),
    label('Ícone', icon),
    fieldRow('Nível máximo', maxLevel, 'Ordem', order),
    label('Status', status),
    submit('Salvar habilidade')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(skill, {
      name: name.value.trim() || skill.name,
      description: description.value.trim(),
      categoryId: category.value.trim() || 'geral',
      icon: icon.value.trim() || skill.icon,
      maxLevel: Math.max(1, Number(maxLevel.value) || 10),
      order: Number(order.value) || 1,
      status: status.value
    });
    commit();
  });

  return form;
}

function newSkillForm(world, commit) {
  const name = input('');
  const description = textarea('');
  const category = input('geral');
  const maxLevel = numberInput(10);
  const status = statusSelect('published');
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    formHead('Nova habilidade', 'cadastro'),
    label('Nome', name),
    label('Descrição', description),
    label('Categoria', category),
    fieldRow('Nível máximo', maxLevel, 'Status', status),
    submit('Adicionar habilidade', true)
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = uniqueId(name.value, world.skills.map((item) => item.id), 'habilidade');
    world.skills.push({
      id,
      slug: id,
      name: name.value.trim() || 'Nova habilidade',
      description: description.value.trim(),
      categoryId: category.value.trim() || 'geral',
      icon: name.value.trim().slice(0, 3).toUpperCase() || 'NEW',
      maxLevel: Math.max(1, Number(maxLevel.value) || 10),
      order: world.skills.length + 1,
      status: status.value
    });
    commit();
  });

  return form;
}

function professionForm(profession, world, commit) {
  const name = input(profession.name);
  const description = textarea(profession.description);
  const threshold = numberInput(profession.suggestionThreshold ?? 60);
  const minimum = numberInput(profession.minimumSkills ?? 2);
  const status = statusSelect(profession.status ?? 'published');
  const skillEditor = professionSkillEditor(profession, world);

  const form = el('form', { class: 'admin-form' }, [
    formHead(profession.name, profession.id),
    label('Nome', name),
    label('Descrição', description),
    fieldRow('Limiar de sugestão', threshold, 'Mínimo de habilidades', minimum),
    label('Status', status),
    label('Habilidades e pesos', skillEditor.element),
    submit('Salvar especialização')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(profession, {
      name: name.value.trim() || profession.name,
      description: description.value.trim(),
      suggestionThreshold: Math.min(100, Math.max(0, Number(threshold.value) || 60)),
      minimumSkills: Math.max(1, Number(minimum.value) || 2),
      status: status.value
    });
    replaceProfessionSkills(world, profession.id, skillEditor.links());
    commit();
  });

  return form;
}

function newProfessionForm(world, commit) {
  const name = input('');
  const description = textarea('');
  const threshold = numberInput(60);
  const minimum = numberInput(2);
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    formHead('Nova especialização', 'cadastro'),
    label('Nome', name),
    label('Descrição', description),
    fieldRow('Limiar de sugestão', threshold, 'Mínimo de habilidades', minimum),
    submit('Adicionar especialização', true)
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = uniqueId(name.value, world.professions.map((item) => item.id), 'especializacao');
    world.professions.push({
      id,
      slug: id,
      name: name.value.trim() || 'Nova especialização',
      description: description.value.trim(),
      suggestionThreshold: Math.min(100, Math.max(0, Number(threshold.value) || 60)),
      minimumSkills: Math.max(1, Number(minimum.value) || 2),
      status: 'published'
    });
    commit();
  });

  return form;
}

function questForm(quest, world, questCatalog, commit) {
  const name = input(quest.name);
  const description = textarea(quest.description);
  const objective = textarea(quest.objective ?? '');
  const category = input(quest.category ?? 'Geral');
  const difficulty = numberInput(quest.difficulty ?? 1);
  const order = numberInput(quest.order ?? 1);
  const xpReward = numberInput(quest.xpReward ?? 0);
  const maxScore = numberInput(quest.maxScore ?? 100);
  const moduleKey = input(quest.moduleKey ?? '');
  const entryPath = input(quest.entryPath ?? '');
  const status = statusSelect(quest.status ?? (quest.active === false ? 'archived' : 'published'));
  const trackChoices = choiceList(
    world.tracks.map((track) => [track.id, track.name]),
    world.trackQuests.filter((link) => link.questId === quest.id).map((link) => link.trackId)
  );
  const skillChoices = choiceList(
    world.skills.map((skill) => [skill.id, skill.name]),
    world.questSkills.filter((link) => link.questId === quest.id).map((link) => link.skillId)
  );
  const prerequisiteChoices = choiceList(
    questCatalog.quests
      .filter((item) => item.id !== quest.id)
      .map((item) => [item.id, item.name]),
    questCatalog.dependencies
      .filter((link) => link.questId === quest.id)
      .map((link) => link.prerequisiteId)
  );

  const form = el('form', { class: 'admin-form' }, [
    formHead(quest.name, quest.id),
    label('Nome', name),
    label('Descrição', description),
    label('Objetivo', objective),
    label('Categoria', category),
    fieldRow('Dificuldade', difficulty, 'Ordem', order),
    fieldRow('XP', xpReward, 'Score máximo', maxScore),
    fieldRow('Módulo', moduleKey, 'Rota de entrada', entryPath),
    label('Status', status),
    label('Trilhas', trackChoices.element),
    label('Habilidades', skillChoices.element),
    label('Pré-requisitos', prerequisiteChoices.element),
    submit('Salvar quest')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(quest, {
      name: name.value.trim() || quest.name,
      description: description.value.trim(),
      objective: objective.value.trim(),
      category: category.value.trim() || 'Geral',
      difficulty: clamp(Number(difficulty.value), 1, 5, 1),
      order: Math.max(1, Number(order.value) || 1),
      xpReward: Math.max(0, Number(xpReward.value) || 0),
      maxScore: Math.max(1, Number(maxScore.value) || 100),
      moduleKey: moduleKey.value.trim() || null,
      entryPath: entryPath.value.trim() || null,
      status: status.value,
      active: status.value === 'published'
    });
    replaceQuestTracks(world, quest.id, trackChoices.selected());
    replaceQuestSkills(world, quest.id, skillChoices.selected());
    replaceQuestPrerequisites(questCatalog, quest.id, prerequisiteChoices.selected());
    commit();
  });

  return form;
}

function newQuestForm(world, questCatalog, commit) {
  const name = input('');
  const description = textarea('');
  const category = input('Geral');
  const xpReward = numberInput(100);
  const maxScore = numberInput(100);
  const form = el('form', { class: 'admin-form admin-form--new' }, [
    formHead('Nova quest', 'cadastro'),
    label('Nome', name),
    label('Descrição', description),
    label('Categoria', category),
    fieldRow('XP', xpReward, 'Score máximo', maxScore),
    submit('Adicionar quest', true)
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = uniqueId(name.value, questCatalog.quests.map((item) => item.id), 'quest');
    questCatalog.quests.push({
      id,
      slug: id,
      campaignId: questCatalog.campaigns?.[0]?.id ?? 'jornada-do-conhecimento',
      name: name.value.trim() || 'Nova quest',
      description: description.value.trim(),
      objective: '',
      category: category.value.trim() || 'Geral',
      difficulty: 1,
      order: questCatalog.quests.length + 1,
      xpReward: Math.max(0, Number(xpReward.value) || 0),
      maxScore: Math.max(1, Number(maxScore.value) || 100),
      moduleKey: null,
      entryPath: null,
      attributeRewards: {},
      isOptional: false,
      status: 'draft',
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    commit();
  });

  return form;
}

function professionSkillEditor(profession, world) {
  const rows = el('div', { class: 'admin-relation-list' });
  const addSelect = select(
    world.skills.map((skill) => [skill.id, skill.name]),
    world.skills[0]?.id ?? ''
  );
  const addButton = el('button', { class: 'btn btn--ghost btn--small', type: 'button' }, 'Adicionar habilidade');
  const element = el('div', { class: 'admin-relation-editor' }, [rows, addSelect, addButton]);

  const addRow = (link = {}) => {
    const skill = select(
      world.skills.map((item) => [item.id, item.name]),
      link.skillId ?? world.skills[0]?.id ?? ''
    );
    const weight = numberInput(link.weight ?? 1);
    const target = numberInput(link.targetLevel ?? 4);
    const row = el('div', { class: 'admin-relation-row' }, [
      skill,
      weight,
      target,
      el('button', { class: 'btn btn--ghost btn--small', type: 'button' }, 'Remover')
    ]);
    row.lastChild.addEventListener('click', () => row.remove());
    rows.append(row);
  };

  for (const link of world.professionSkills.filter(
    (item) => item.professionId === profession.id
  )) {
    addRow(link);
  }

  addButton.addEventListener('click', () => addRow());

  return {
    element,
    links() {
      return [...rows.children].map((row) => {
        const [skill, weight, target] = row.querySelectorAll('select, input');
        return {
          skillId: skill.value,
          weight: Math.max(0.1, Number(weight.value) || 1),
          targetLevel: Math.max(1, Number(target.value) || 1)
        };
      });
    }
  };
}

function replaceTerritoryTracks(world, territoryId, trackIds) {
  const existing = new Map(
    world.trackTerritories
      .filter((link) => link.territoryId === territoryId)
      .map((link) => [link.trackId, link])
  );
  world.trackTerritories = world.trackTerritories.filter(
    (link) => link.territoryId !== territoryId
  );
  trackIds.forEach((trackId, index) => {
    const previous = existing.get(trackId);
    world.trackTerritories.push({
      territoryId,
      trackId,
      order: previous?.order ?? index + 1,
      mapX: previous?.mapX ?? 50,
      mapY: previous?.mapY ?? 50
    });
  });
}

function replaceTrackTerritories(world, trackId, territoryIds) {
  const existing = new Map(
    world.trackTerritories
      .filter((link) => link.trackId === trackId)
      .map((link) => [link.territoryId, link])
  );
  world.trackTerritories = world.trackTerritories.filter((link) => link.trackId !== trackId);

  for (const territoryId of territoryIds) {
    const previous = existing.get(territoryId);
    world.trackTerritories.push({
      territoryId,
      trackId,
      order: previous?.order ?? 1,
      mapX: previous?.mapX ?? 50,
      mapY: previous?.mapY ?? 50
    });
  }
}

function replaceTrackQuests(world, trackId, questIds) {
  const existing = new Map(
    world.trackQuests.filter((link) => link.trackId === trackId).map((link) => [link.questId, link])
  );
  world.trackQuests = world.trackQuests.filter((link) => link.trackId !== trackId);
  questIds.forEach((questId, index) => {
    world.trackQuests.push({
      trackId,
      questId,
      order: existing.get(questId)?.order ?? index + 1,
      required: existing.get(questId)?.required ?? true
    });
  });
}

function replaceTrackSkills(world, trackId, skillIds) {
  world.trackSkills = world.trackSkills.filter((link) => link.trackId !== trackId);
  for (const skillId of skillIds) {
    world.trackSkills.push({ trackId, skillId, targetLevel: 4, weight: 1 });
  }
}

function replaceTrackPrerequisites(world, trackId, prerequisiteTrackIds) {
  world.trackPrerequisites = world.trackPrerequisites.filter((link) => link.trackId !== trackId);
  for (const prerequisiteTrackId of prerequisiteTrackIds) {
    world.trackPrerequisites.push({ trackId, prerequisiteTrackId });
  }
}

function replaceProfessionSkills(world, professionId, links) {
  world.professionSkills = world.professionSkills.filter(
    (link) => link.professionId !== professionId
  );
  const seen = new Set();

  for (const link of links) {
    if (!link.skillId || seen.has(link.skillId)) {
      continue;
    }
    seen.add(link.skillId);
    world.professionSkills.push({ professionId, ...link });
  }
}

function replaceQuestTracks(world, questId, trackIds) {
  world.trackQuests = world.trackQuests.filter((link) => link.questId !== questId);
  trackIds.forEach((trackId, index) => {
    world.trackQuests.push({ trackId, questId, order: index + 1, required: true });
  });
}

function replaceQuestSkills(world, questId, skillIds) {
  world.questSkills = world.questSkills.filter((link) => link.questId !== questId);
  for (const skillId of skillIds) {
    world.questSkills.push({ questId, skillId, levelDelta: 1 });
  }
}

function replaceQuestPrerequisites(questCatalog, questId, prerequisiteIds) {
  questCatalog.dependencies = (questCatalog.dependencies ?? []).filter(
    (link) => link.questId !== questId
  );
  for (const prerequisiteId of prerequisiteIds) {
    questCatalog.dependencies.push({ questId, prerequisiteId });
  }
}

function choiceList(options, selectedIds = []) {
  const inputs = new Map();
  const element = el('div', { class: 'admin-choice-list' });

  for (const [value, label] of options) {
    const inputNode = el('input', {
      type: 'checkbox',
      value,
      checked: selectedIds.includes(value)
    });
    inputs.set(value, inputNode);
    element.append(el('label', { class: 'admin-choice' }, [inputNode, label]));
  }

  return {
    element,
    selected() {
      return [...inputs.entries()]
        .filter(([, node]) => node.checked)
        .map(([value]) => value);
    }
  };
}

function formHead(title, slug) {
  return el('div', { class: 'admin-form__head' }, [
    el('strong', {}, title),
    el('span', { class: 'admin-slug' }, slug)
  ]);
}

function label(text, inputNode) {
  return el('label', { class: 'admin-field' }, [
    el('span', {}, text),
    inputNode
  ]);
}

function fieldRow(firstLabel, firstInput, secondLabel, secondInput) {
  return el('div', { class: 'admin-field-row' }, [
    label(firstLabel, firstInput),
    label(secondLabel, secondInput)
  ]);
}

function submit(text, primary = false) {
  return el(
    'button',
    { class: `btn ${primary ? 'btn--cafe' : 'btn--ghost'} btn--small`, type: 'submit' },
    text
  );
}

function input(value) {
  return el('input', { class: 'text-input', type: 'text', value: value ?? '' });
}

function textarea(value) {
  const node = el('textarea', { class: 'text-area', rows: '3' });
  node.value = value ?? '';
  return node;
}

function numberInput(value) {
  return el('input', {
    class: 'text-input',
    type: 'number',
    step: '1',
    value: String(value ?? 0)
  });
}

function checkbox(checked) {
  return el('input', { type: 'checkbox', checked: Boolean(checked) });
}

function select(options, selected) {
  const node = el('select', { class: 'text-input' });

  for (const [value, labelText] of options) {
    const option = el('option', { value }, labelText);
    option.selected = value === selected;
    node.append(option);
  }

  return node;
}

function statusSelect(value) {
  return select(STATUS_OPTIONS, value ?? 'published');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function uniqueId(name, existingIds, fallback) {
  const base = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
  let id = base;
  let counter = 2;

  while (existingIds.includes(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }

  return id;
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}
