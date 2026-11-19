import { clear, svgEl } from './dom.js';
import {
  createBuildingArt,
  createBuildingBadge,
  createBuildingLabel,
  createDefs,
  createRoads,
  createSelection,
  createSky,
  createTerrain,
  createUrbanProps
} from './cityArt.js';

const FORM_LABELS = {
  '1FN': 'Primeira Forma Normal',
  '2FN': 'Segunda Forma Normal',
  '3FN': 'Terceira Forma Normal'
};

export function renderCity(svg, data, { onSelect } = {}) {
  const city = data && data.city;
  if (!city) {
    throw new Error('Dados da cidade ausentes.');
  }

  const { width, height } = city.viewport;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'aria-label',
    `Cidade isométrica com os edifícios ${city.buildings
      .map((building) => building.name)
      .join(', ')}`
  );
  clear(svg);

  const buildingLayer = svgEl('g', { class: 'city__buildings city__objects' });

  for (const building of city.buildings) {
    buildingLayer.append(createBuildingGroup(building, city.buildings.indexOf(building), onSelect));
  }

  const props = createUrbanProps();
  for (const prop of props) {
    buildingLayer.append(prop);
  }
  sortObjectLayer(buildingLayer);

  svg.append(
    createDefs(),
    createSky(width, height),
    createTerrain(city),
    createRoads(city),
    buildingLayer
  );
}

export function addCityExtension(svg, cityData, extension, key = 'default') {
  if (!extension) {
    return;
  }

  removeCityExtension(svg, key);

  const buildingLayer = svg.querySelector('.city__buildings');
  if (!buildingLayer) {
    return;
  }

  const allBuildings = new Map(cityData.city.buildings.map((building) => [building.id, building]));
  const extensionBuildings = Array.isArray(extension.buildings) ? extension.buildings : [];

  extensionBuildings.forEach((building, index) => {
    allBuildings.set(building.id, building);

    const alreadyExists = [...svg.querySelectorAll('.building')].some(
      (group) => group.dataset.buildingId === building.id
    );

    if (alreadyExists) {
      return;
    }

    const group = createBuildingGroup(
      building,
      cityData.city.buildings.length + index,
      null,
      {
        interactive: false,
        normalized: true,
        extension: true
      }
    );
    group.classList.add('is-new-building');
    group.dataset.cityExtension = key;
    buildingLayer.append(group);
  });

  const defs = svg.querySelector('defs');
  if (defs && !defs.querySelector('#city-dependency-arrow')) {
    defs.append(
      svgEl(
        'marker',
        {
          id: 'city-dependency-arrow',
          viewBox: '0 0 10 10',
          refX: '9',
          refY: '5',
          markerWidth: '8',
          markerHeight: '8',
          orient: 'auto-start-reverse'
        },
        [svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#ffd166' })]
      )
    );
  }

  const linkLayer = svgEl('g', {
    class: 'city-dependencies city-extension',
    'aria-hidden': 'true',
    'data-city-extension': key
  });
  const links = Array.isArray(extension.links) ? extension.links : [];

  for (const link of links) {
    const from = allBuildings.get(link.from);
    const to = allBuildings.get(link.to);

    if (!from || !to) {
      continue;
    }

    const alreadyLinked = [...svg.querySelectorAll('.city-dependency-link')].some(
      (path) =>
        path.dataset.linkFrom === link.from &&
        path.dataset.linkTo === link.to
    );

    if (alreadyLinked) {
      continue;
    }

    const d = dependencyPath(from, to);
    linkLayer.append(
      svgEl('path', {
        d,
        class: 'city-dependency-link',
        'marker-end': 'url(#city-dependency-arrow)',
        'data-link-from': link.from,
        'data-link-to': link.to
      })
    );

    const midpoint = dependencyMidpoint(from, to);
    const labelText = link.label || '1:N';
    const labelWidth = Math.max(40, labelText.length * 9 + 16);
    const label = svgEl('g', { class: 'city-dependency-label-group' }, [
      svgEl('rect', {
        x: midpoint.x - labelWidth / 2,
        y: midpoint.y - 21,
        width: labelWidth,
        height: 24,
        rx: 8,
        class: 'city-dependency-label-bg'
      }),
      svgEl('text', {
        x: midpoint.x,
        y: midpoint.y - 5,
        class: 'city-dependency-label',
        'text-anchor': 'middle'
      })
    ]);
    label.lastChild.textContent = labelText;
    linkLayer.append(label);
  }

  svg.insertBefore(linkLayer, buildingLayer);
  sortObjectLayer(buildingLayer);

  for (const normalized of extension.normalizedBuildings || []) {
    setBuildingNormalized(svg, normalized.id, true, normalized.badgeLabel || '2FN');
  }
}

export function removeCityExtension(svg, key = 'default') {
  for (const group of [...svg.querySelectorAll('[data-city-extension]')]) {
    if (group.dataset.cityExtension === key) {
      group.remove();
    }
  }
}

export function setSelectedBuilding(svg, buildingId) {
  for (const group of svg.querySelectorAll('.building')) {
    const selected = group.dataset.buildingId === buildingId;
    group.classList.toggle('is-selected', selected);

    if (group.getAttribute('role') === 'button') {
      group.setAttribute('aria-pressed', String(selected));
    }
  }
}

export function setBuildingNormalized(svg, buildingId, normalized, label = '1FN') {
  for (const group of svg.querySelectorAll('.building')) {
    if (group.dataset.buildingId !== buildingId) {
      continue;
    }

    const baseLabel = group.dataset.baseLabel || group.getAttribute('aria-label') || '';
    const shortLabel = baseLabel.split(',')[0] || baseLabel;
    const badgeText = group.querySelector('.building__badge-text');
    const formLabel = normalFormLabel(label);

    group.dataset.baseLabel = baseLabel;

    if (badgeText) {
      badgeText.textContent = label;
    }

    group.classList.toggle('is-normalized', Boolean(normalized));
    group.setAttribute(
      'aria-label',
      normalized
        ? `${shortLabel}. Normalizado na ${formLabel}. Consulte o painel para ver a estrutura atual.`
        : baseLabel
    );
  }
}

export function playBuildAnimation(svg) {
  svg.classList.remove('is-built');
  void svg.getBoundingClientRect();

  const enable = () => svg.classList.add('is-built');
  requestAnimationFrame(enable);
  globalThis.setTimeout?.(enable, 160);
}

function createBuildingGroup(building, index, onSelect, options = {}) {
  const interactive = options.interactive !== false;
  const classes = ['building'];

  if (options.normalized) {
    classes.push('is-normalized');
  }
  if (options.extension) {
    classes.push('city-extension');
  }

  const group = svgEl('g', {
    class: classes.join(' '),
    'data-building-id': building.id,
    'data-depth': building.position.y + building.position.x * 0.12 + building.size.depth / 4,
    style: `--build-index: ${index};`
  });
  const descriptor = `Edifício ${building.name}, ${building.recordCount} registros e ${building.attributes.length} atributos`;
  const formLabel = normalFormLabel(building.badgeLabel || '1FN');

  if (interactive) {
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-pressed', 'false');
    group.setAttribute('aria-label', descriptor);

    const activate = () => onSelect?.(building.id);
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  } else {
    group.setAttribute('role', 'img');
    group.setAttribute(
      'aria-label',
      options.normalized
        ? `${descriptor}. Normalizado na ${formLabel}.`
        : descriptor
    );
  }

  group.append(
    createSelection(building),
    createBuildingArt(building),
    createBuildingLabel(building),
    createBuildingBadge(building)
  );
  return group;
}

function sortObjectLayer(layer) {
  const nodes = [...layer.children];
  nodes
    .filter((node) => node.dataset.depth)
    .sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth))
    .forEach((node) => layer.append(node));
}

function normalFormLabel(label) {
  return FORM_LABELS[label] || FORM_LABELS['1FN'];
}

function dependencyPath(from, to) {
  const start = { x: from.position.x, y: from.position.y + 10 };
  const end = { x: to.position.x, y: to.position.y + 10 };
  const dx = end.x - start.x;
  const controlX = (start.x + end.x) / 2;
  const controlY = (start.y + end.y) / 2 - Math.min(54, Math.abs(dx) * 0.12 + 22);

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

function dependencyMidpoint(from, to) {
  const start = { x: from.position.x, y: from.position.y + 10 };
  const end = { x: to.position.x, y: to.position.y + 10 };
  const dx = end.x - start.x;
  const controlX = (start.x + end.x) / 2;
  const controlY = (start.y + end.y) / 2 - Math.min(54, Math.abs(dx) * 0.12 + 22);

  return {
    x: 0.25 * start.x + 0.5 * controlX + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * controlY + 0.25 * end.y
  };
}
