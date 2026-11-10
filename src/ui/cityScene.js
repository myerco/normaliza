import { clear, svgEl } from './dom.js';

export function renderCity(svg, data, { onSelect } = {}) {
  const city = data && data.city;
  if (!city) {
    throw new Error('Dados da cidade ausentes.');
  }

  const { width, height } = city.viewport;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  clear(svg);

  const defs = svgEl('defs');
  const ground = buildGround(city, defs);
  const roadLayer = svgEl('g', { class: 'city__roads', 'aria-hidden': 'true' });
  const buildingLayer = svgEl('g', { class: 'city__buildings' });
  const buildingsById = new Map(city.buildings.map((building) => [building.id, building]));

  for (const road of city.roads) {
    const from = buildingsById.get(road.from);
    const to = buildingsById.get(road.to);
    if (!from || !to) {
      continue;
    }

    const d = roadPath(from, to);
    roadLayer.append(
      svgEl('path', { d, class: 'road road__casing', pathLength: '1' }),
      svgEl('path', { d, class: 'road road__surface', pathLength: '1' }),
      svgEl('path', { d, class: 'road road__center' })
    );
  }

  city.buildings.forEach((building, index) => {
    buildingLayer.append(createBuildingGroup(building, index, onSelect));
  });

  svg.append(defs, ground, roadLayer, buildingLayer);
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

    const d = dependencyPath(from, to);
    linkLayer.append(
      svgEl('path', {
        d,
        class: 'city-dependency-link',
        'marker-end': 'url(#city-dependency-arrow)'
      })
    );

    const midpoint = dependencyMidpoint(from, to);
    const label = svgEl('text', {
      x: midpoint.x,
      y: midpoint.y - 8,
      class: 'city-dependency-label',
      'text-anchor': 'middle'
    });
    label.textContent = link.label || '1:N';
    linkLayer.append(label);
  }

  svg.insertBefore(linkLayer, buildingLayer);

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
    const formLabel = label === '2FN' ? 'Segunda Forma Normal' : 'Primeira Forma Normal';

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
  requestAnimationFrame(() => svg.classList.add('is-built'));
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
    style: `--build-index: ${index};`
  });
  const descriptor = `Edifício ${building.name}, ${building.recordCount} registros e ${building.attributes.length} atributos`;
  const formLabel =
    (building.badgeLabel || '1FN') === '2FN' ? 'Segunda Forma Normal' : 'Primeira Forma Normal';

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

  group.append(...buildBuilding(building));
  group.append(buildLabel(building));
  group.append(buildBadge(building));
  return group;
}

function buildGround(city, defs) {
  const { width, height } = city.viewport;
  const cx = width / 2;
  const cy = height / 2 + 80;
  const rx = Math.min(width * 0.44, 520);
  const ry = rx / 2;
  const points = `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`;
  const clipId = 'city-ground-clip';
  const gradientId = 'city-ground-gradient';

  defs.append(
    svgEl('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' }, [
      svgEl('stop', { offset: '0%', 'stop-color': '#3a7d6e' }),
      svgEl('stop', { offset: '100%', 'stop-color': '#1b4744' })
    ]),
    svgEl('clipPath', { id: clipId }, [svgEl('polygon', { points })])
  );

  const ground = svgEl('g', { class: 'ground', 'aria-hidden': 'true' });
  ground.append(
    svgEl('ellipse', {
      cx,
      cy: cy + 18,
      rx: rx * 0.92,
      ry: ry * 0.82,
      class: 'ground__glow'
    }),
    svgEl('polygon', {
      points,
      class: 'ground__surface',
      fill: `url(#${gradientId})`
    })
  );

  const grid = svgEl('g', { class: 'ground__grid', 'clip-path': `url(#${clipId})` });
  const step = 80;
  for (let offset = -rx; offset <= rx; offset += step) {
    grid.append(
      svgEl('line', {
        x1: cx + offset,
        y1: cy - ry - 40,
        x2: cx + offset + ry + 40,
        y2: cy + ry + 40,
        class: 'ground__line'
      }),
      svgEl('line', {
        x1: cx + offset,
        y1: cy - ry - 40,
        x2: cx + offset - ry - 40,
        y2: cy + ry + 40,
        class: 'ground__line'
      })
    );
  }

  ground.append(grid);
  ground.append(svgEl('polygon', { points, class: 'ground__rim' }));
  return ground;
}

function roadPath(from, to) {
  const a = { x: from.position.x, y: from.position.y + 10 };
  const b = { x: to.position.x, y: to.position.y + 10 };
  const dx = b.x - a.x;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2 - Math.min(44, Math.abs(dx) * 0.08);
  return `M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`;
}

function buildBuilding(building) {
  const { x, y } = building.position;
  const { width, depth, height } = building.size;
  const hw = width / 2;
  const hd = depth / 4;
  const topY = y - height;

  const top = [
    [x, topY - hd],
    [x + hw, topY],
    [x, topY + hd],
    [x - hw, topY]
  ];
  const left = [
    [x - hw, topY],
    [x, topY + hd],
    [x, y + hd],
    [x - hw, y]
  ];
  const right = [
    [x + hw, topY],
    [x, topY + hd],
    [x, y + hd],
    [x + hw, y]
  ];

  const color = building.color;
  const parts = [
    svgEl('ellipse', {
      cx: x,
      cy: y + hd + 7,
      rx: hw * 1.12,
      ry: hd * 0.9,
      class: 'building__shadow'
    }),
    svgEl('polygon', {
      points: toPoints(left),
      class: 'building__face building__face--left',
      fill: shadeColor(color, -0.19)
    }),
    svgEl('polygon', {
      points: toPoints(right),
      class: 'building__face building__face--right',
      fill: shadeColor(color, -0.34)
    }),
    svgEl('polygon', {
      points: toPoints(top),
      class: 'building__face building__face--top',
      fill: shadeColor(color, 0.16)
    }),
    svgEl('polygon', {
      points: toPoints(inset(top, 0.72)),
      class: 'building__roof',
      fill: shadeColor(color, 0.32)
    })
  ];

  const rightOrigin = [x + hw, y];
  const rightDepth = [x - (x + hw), y + hd - y];
  const rightUp = [0, -height];

  parts.push(
    polygonFromFace(rightOrigin, rightDepth, rightUp, 0.3, 0.52, 0, 0.2, 'building__door')
  );

  const windowRows = height >= 130 ? [0.42, 0.68] : [0.5];
  for (const row of windowRows) {
    for (const column of [0.12, 0.38, 0.64]) {
      parts.push(
        polygonFromFace(
          rightOrigin,
          rightDepth,
          rightUp,
          column,
          column + 0.11,
          row,
          row + 0.1,
          'building__window'
        )
      );
    }
  }

  return parts;
}

function buildLabel(building) {
  const { x, y } = building.position;
  const { depth, height } = building.size;
  const hd = depth / 4;
  const topY = y - height;
  const centerY = topY - hd - 24;
  const width = getLabelWidth(building);

  const name = svgEl('text', {
    x,
    y: centerY - 7,
    class: 'building__label-text',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  name.textContent = building.name;

  const subtitle = svgEl('text', {
    x,
    y: centerY + 12,
    class: 'building__label-sub',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  subtitle.textContent = `${building.recordCount} registros`;

  return svgEl('g', { class: 'building__label', 'aria-hidden': 'true' }, [
    svgEl('rect', {
      x: x - width / 2,
      y: centerY - 24,
      width,
      height: 48,
      rx: 10,
      class: 'building__label-bg'
    }),
    name,
    subtitle
  ]);
}

function buildBadge(building) {
  const { x, y } = building.position;
  const { depth, height } = building.size;
  const hd = depth / 4;
  const topY = y - height;
  const centerY = topY - hd - 24;
  const labelWidth = getLabelWidth(building);
  const badgeWidth = 52;
  const badgeHeight = 26;
  const badgeX = x + labelWidth / 2 + 9;
  const badgeY = centerY - badgeHeight / 2;

  const text = svgEl('text', {
    x: badgeX + badgeWidth / 2,
    y: centerY + 1,
    class: 'building__badge-text',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  text.textContent = building.badgeLabel || '1FN';

  return svgEl('g', { class: 'building__badge', 'aria-hidden': 'true' }, [
    svgEl('rect', {
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: badgeHeight,
      rx: 13,
      class: 'building__badge-bg'
    }),
    text
  ]);
}

function getLabelWidth(building) {
  return Math.max(142, building.name.length * 15 + 32);
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

function polygonFromFace(origin, depthVector, upVector, u0, u1, v0, v1, className) {
  const points = [
    facePoint(origin, depthVector, upVector, u0, v0),
    facePoint(origin, depthVector, upVector, u1, v0),
    facePoint(origin, depthVector, upVector, u1, v1),
    facePoint(origin, depthVector, upVector, u0, v1)
  ];

  return svgEl('polygon', {
    points: toPoints(points),
    class: className
  });
}

function facePoint(origin, depthVector, upVector, u, v) {
  return [
    origin[0] + depthVector[0] * u + upVector[0] * v,
    origin[1] + depthVector[1] * u + upVector[1] * v
  ];
}

function inset(points, scale) {
  const center = points.reduce(
    (sum, [x, y]) => ({ x: sum.x + x / points.length, y: sum.y + y / points.length }),
    { x: 0, y: 0 }
  );

  return points.map(([x, y]) => [
    center.x + (x - center.x) * scale,
    center.y + (y - center.y) * scale
  ]);
}

function toPoints(points) {
  return points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function shadeColor(hex, amount) {
  const normalized = String(hex).replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  const number = Number.parseInt(full, 16);

  if (!Number.isFinite(number)) {
    return hex;
  }

  const red = (number >> 16) & 0xff;
  const green = (number >> 8) & 0xff;
  const blue = number & 0xff;
  const adjust = (channel) => Math.max(0, Math.min(255, Math.round(channel + 255 * amount)));

  return `rgb(${adjust(red)}, ${adjust(green)}, ${adjust(blue)})`;
}
