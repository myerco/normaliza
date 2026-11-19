import { svgEl } from './dom.js';

const BUILDING_STYLES = {
  pedido: {
    kind: 'commercial',
    floors: 3,
    trim: '#ffd8a8',
    roof: '#b7432d',
    window: '#ffe8a3',
    awning: '#f4a261',
    roofExtra: 34
  },
  funcionario: {
    kind: 'office',
    floors: 4,
    trim: '#d8c4ff',
    roof: '#5d2e94',
    window: '#b9e7ff',
    awning: '#9b5de5',
    roofExtra: 54
  },
  produto: {
    kind: 'warehouse',
    floors: 1,
    trim: '#b8f0e7',
    roof: '#1c776d',
    window: '#bfe9e3',
    awning: '#2a9d8f',
    roofExtra: 22
  },
  cliente: {
    kind: 'residential',
    floors: 2,
    trim: '#ffe6ae',
    roof: '#a86525',
    window: '#fff2c4',
    awning: '#e9c46a',
    roofExtra: 40
  },
  departamento: {
    kind: 'civic',
    floors: 2,
    trim: '#ffd0e6',
    roof: '#992d68',
    window: '#ffe1f0',
    awning: '#f15bb5',
    roofExtra: 38
  },
  item_pedido: {
    kind: 'distribution',
    floors: 1,
    trim: '#b8d4ff',
    roof: '#284d7a',
    window: '#cfe3ff',
    awning: '#457b9d',
    roofExtra: 24
  }
};

function styleFor(building) {
  return BUILDING_STYLES[building.id] || BUILDING_STYLES.cliente;
}

function reducedMotion() {
  try {
    return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function points(list) {
  return list.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}

function shadeColor(hex, amount) {
  const raw = String(hex).replace('#', '');
  const full =
    raw.length === 3
      ? raw.split('').map((character) => character + character).join('')
      : raw;
  const number = Number.parseInt(full, 16);

  if (!Number.isFinite(number)) {
    return hex;
  }

  const red = (number >> 16) & 0xff;
  const green = (number >> 8) & 0xff;
  const blue = number & 0xff;
  const adjust = (channel) =>
    Math.max(0, Math.min(255, Math.round(channel + 255 * amount)));

  return `rgb(${adjust(red)}, ${adjust(green)}, ${adjust(blue)})`;
}

function boxGeometry(building, overrides = {}) {
  const x = overrides.x ?? building.position.x;
  const y = overrides.y ?? building.position.y;
  const width = overrides.width ?? building.size.width;
  const depth = overrides.depth ?? building.size.depth;
  const height = overrides.height ?? building.size.height;
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

  return { x, y, width, depth, height, hw, hd, topY, top, left, right };
}

function addBox(target, { x, y, width, depth, height, color, topColor, leftColor, rightColor, stroke = 'rgba(4, 14, 20, 0.25)' }) {
  const geometry = boxGeometry(
    { position: { x, y }, size: { width, depth, height } },
    { x, y, width, depth, height }
  );

  target.append(
    svgEl('polygon', {
      points: points(geometry.left),
      fill: leftColor || shadeColor(color, -0.22),
      stroke,
      'stroke-width': '1.2',
      'stroke-linejoin': 'round'
    }),
    svgEl('polygon', {
      points: points(geometry.right),
      fill: rightColor || shadeColor(color, -0.38),
      stroke,
      'stroke-width': '1.2',
      'stroke-linejoin': 'round'
    }),
    svgEl('polygon', {
      points: points(geometry.top),
      fill: topColor || shadeColor(color, 0.2),
      stroke,
      'stroke-width': '1.2',
      'stroke-linejoin': 'round'
    })
  );
}

function facePoint(origin, depthVector, upVector, u, v) {
  return [
    origin[0] + depthVector[0] * u + upVector[0] * v,
    origin[1] + depthVector[1] * u + upVector[1] * v
  ];
}

function facePolygon(origin, depthVector, upVector, u0, u1, v0, v1) {
  return points([
    facePoint(origin, depthVector, upVector, u0, v0),
    facePoint(origin, depthVector, upVector, u1, v0),
    facePoint(origin, depthVector, upVector, u1, v1),
    facePoint(origin, depthVector, upVector, u0, v1)
  ]);
}

function addWindow(target, origin, depthVector, upVector, u, width, floor, floors, style, index) {
  const floorHeight = 1 / floors;
  const v0 = floor * floorHeight + floorHeight * 0.22;
  const v1 = floor * floorHeight + floorHeight * 0.76;
  const lit = (index + floor * 3) % 5 !== 0;
  const outer = facePolygon(
    origin,
    depthVector,
    upVector,
    u,
    u + width,
    v0,
    v1
  );
  const inner = facePolygon(
    origin,
    depthVector,
    upVector,
    u + width * 0.12,
    u + width * 0.88,
    v0 + floorHeight * 0.1,
    v1 - floorHeight * 0.1
  );

  target.append(
    svgEl('polygon', {
      points: outer,
      fill: shadeColor(style.window, -0.48),
      stroke: 'rgba(8, 25, 33, 0.55)',
      'stroke-width': '0.8'
    }),
    svgEl('polygon', {
      points: inner,
      fill: lit ? style.window : shadeColor(style.window, -0.32),
      opacity: lit ? '0.92' : '0.42'
    })
  );
}

function addFloorBands(target, geometry, style, floors) {
  const { x, y, hw, hd, height } = geometry;
  const rightOrigin = [x + hw, y];
  const rightDepth = [-hw, hd];
  const leftOrigin = [x - hw, y];
  const leftDepth = [hw, hd];
  const up = [0, -height];

  for (let floor = 1; floor < floors; floor += 1) {
    const v = floor / floors;
    target.append(
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0, 1, v - 0.012, v + 0.012),
        fill: style.trim,
        opacity: '0.62'
      }),
      svgEl('polygon', {
        points: facePolygon(leftOrigin, leftDepth, up, 0, 1, v - 0.012, v + 0.012),
        fill: shadeColor(style.trim, -0.18),
        opacity: '0.5'
      })
    );
  }
}

function addWindows(target, geometry, style, floors, kind) {
  const { x, y, hw, hd, height } = geometry;
  const rightOrigin = [x + hw, y];
  const rightDepth = [-hw, hd];
  const leftOrigin = [x - hw, y];
  const leftDepth = [hw, hd];
  const up = [0, -height];

  if (kind === 'warehouse' || kind === 'distribution') {
    for (let index = 0; index < 2; index += 1) {
      const u = 0.16 + index * 0.38;
      target.append(
        svgEl('polygon', {
          points: facePolygon(rightOrigin, rightDepth, up, u, u + 0.24, 0.45, 0.82),
          fill: shadeColor(style.window, -0.08),
          stroke: 'rgba(8, 25, 33, 0.5)',
          'stroke-width': '1'
        }),
        svgEl('polygon', {
          points: facePolygon(rightOrigin, rightDepth, up, u + 0.035, u + 0.205, 0.5, 0.77),
          fill: style.window,
          opacity: '0.75'
        })
      );
    }
    return;
  }

  const rightColumns = kind === 'office' ? [0.08, 0.27, 0.46, 0.65, 0.84] : [0.12, 0.34, 0.56, 0.78];
  const leftColumns = kind === 'office' ? [0.2, 0.55, 0.85] : [0.22, 0.58];

  for (let floor = 0; floor < floors; floor += 1) {
    for (let index = 0; index < rightColumns.length; index += 1) {
      addWindow(
        target,
        rightOrigin,
        rightDepth,
        up,
        rightColumns[index],
        kind === 'office' ? 0.11 : 0.13,
        floor,
        floors,
        style,
        index
      );
    }
    for (let index = 0; index < leftColumns.length; index += 1) {
      addWindow(
        target,
        leftOrigin,
        leftDepth,
        up,
        leftColumns[index],
        0.12,
        floor,
        floors,
        style,
        index + 7
      );
    }
  }

  if (kind === 'office') {
    target.append(
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0.455, 0.545, 0.02, 0.96),
        fill: '#b8e8f4',
        opacity: '0.24',
        stroke: 'rgba(255, 255, 255, 0.26)',
        'stroke-width': '1'
      })
    );
  }
}

function addDoor(target, geometry, style, kind) {
  const { x, y, hw, hd, height } = geometry;
  const rightOrigin = [x + hw, y];
  const rightDepth = [-hw, hd];
  const up = [0, -height];
  const wide = kind === 'warehouse' || kind === 'distribution';
  const u0 = wide ? 0.26 : 0.42;
  const u1 = wide ? 0.72 : 0.63;
  const v1 = wide ? 0.38 : 0.28;

  target.append(
    svgEl('polygon', {
      points: facePolygon(rightOrigin, rightDepth, up, u0, u1, 0.01, v1),
      fill: '#24333a',
      stroke: 'rgba(255, 242, 205, 0.45)',
      'stroke-width': '1.4'
    }),
    svgEl('polygon', {
      points: facePolygon(rightOrigin, rightDepth, up, u0 + 0.03, u1 - 0.03, 0.015, v1 - 0.045),
      fill: '#101d24',
      opacity: '0.68'
    })
  );

  if (wide) {
    for (let line = 1; line < 5; line += 1) {
      const v = (v1 / 5) * line;
      target.append(
        svgEl('polygon', {
          points: facePolygon(rightOrigin, rightDepth, up, u0 + 0.04, u1 - 0.04, v - 0.006, v + 0.006),
          fill: 'rgba(190, 235, 231, 0.32)'
        })
      );
    }
  }

  target.append(
    svgEl('polygon', {
      points: facePolygon(rightOrigin, rightDepth, up, u0 - 0.04, u1 + 0.04, v1, v1 + 0.035),
      fill: style.awning,
      stroke: 'rgba(4, 15, 20, 0.25)',
      'stroke-width': '1'
    })
  );

  const awningStart = facePoint(rightOrigin, rightDepth, up, u0 - 0.04, v1 + 0.035);
  const awningEnd = facePoint(rightOrigin, rightDepth, up, u1 + 0.04, v1 + 0.035);
  target.append(
    svgEl('polygon', {
      points: points([
        awningStart,
        awningEnd,
        [awningEnd[0] + 8, awningEnd[1] + 7],
        [awningStart[0] + 8, awningStart[1] + 7]
      ]),
      fill: shadeColor(style.awning, -0.28),
      opacity: '0.86'
    })
  );
}

function addRoof(target, geometry, style, kind) {
  const { x, y, hw, hd, topY, top } = geometry;
  target.append(
    svgEl('polygon', {
      points: points(top),
      fill: style.roof,
      stroke: shadeColor(style.roof, 0.28),
      'stroke-width': '2',
      'stroke-linejoin': 'round',
      class: 'building__roof'
    }),
    svgEl('polygon', {
      points: points([
        [x - hw * 0.78, topY - hd * 0.04],
        [x, topY - hd * 0.72],
        [x + hw * 0.78, topY - hd * 0.04],
        [x, topY + hd * 0.56]
      ]),
      fill: shadeColor(style.roof, 0.14),
      opacity: '0.42'
    })
  );

  if (kind === 'warehouse' || kind === 'distribution') {
    for (let index = -2; index <= 2; index += 1) {
      target.append(
        svgEl('line', {
          x1: x + index * 14,
          y1: topY - hd + Math.abs(index) * 2,
          x2: x + index * 14,
          y2: topY + hd - Math.abs(index) * 2,
          stroke: 'rgba(225, 255, 249, 0.25)',
          'stroke-width': '1.4'
        })
      );
    }
    for (const offset of [-24, 20]) {
      target.append(
        svgEl('polygon', {
          points: points([
            [x + offset, topY - hd * 0.2],
            [x + offset + 17, topY - hd * 0.12],
            [x + offset + 17, topY + hd * 0.24],
            [x + offset, topY + hd * 0.16]
          ]),
          fill: '#dffaf5',
          opacity: '0.45',
          stroke: 'rgba(255, 255, 255, 0.35)',
          'stroke-width': '0.8'
        })
      );
    }
    return;
  }

  if (kind === 'office') {
    addBox(target, {
      x,
      y: topY + 8,
      width: 28,
      depth: 24,
      height: 20,
      color: '#d6c8ee',
      topColor: '#f1eaff'
    });
    target.append(
      svgEl('line', {
        x1: x + 4,
        y1: topY - 4,
        x2: x + 4,
        y2: topY - 46,
        stroke: '#fff0b2',
        'stroke-width': '2'
      }),
      svgEl('circle', {
        cx: x + 4,
        cy: topY - 47,
        r: '4',
        fill: '#ffd166'
      })
    );
    for (const offset of [-44, 44]) {
      target.append(
        svgEl('polygon', {
          points: points([
            [x + offset - 13, topY - 2],
            [x + offset + 13, topY + 5],
            [x + offset + 14, topY + 19],
            [x + offset - 12, topY + 12]
          ]),
          fill: '#385a78',
          stroke: '#9cc8e8',
          'stroke-width': '0.8'
        })
      );
    }
    return;
  }

  if (kind === 'commercial') {
    addBox(target, {
      x,
      y: topY + 8,
      width: 42,
      depth: 22,
      height: 8,
      color: '#b9d9c8',
      topColor: '#e9f4dd'
    });
    target.append(
      svgEl('polygon', {
        points: points([
          [x - 30, topY - 4],
          [x + 22, topY + 9],
          [x + 22, topY + 22],
          [x - 30, topY + 9]
        ]),
        fill: '#f8e7c2',
        stroke: '#c28544',
        'stroke-width': '1.2'
      }),
      svgEl('line', {
        x1: x - 23,
        y1: topY - 1,
        x2: x + 15,
        y2: topY + 10,
        stroke: style.awning,
        'stroke-width': '4',
        'stroke-linecap': 'round'
      })
    );
    return;
  }

  if (kind === 'residential') {
    for (let index = -2; index <= 2; index += 1) {
      target.append(
        svgEl('line', {
          x1: x + index * 21,
          y1: topY - hd * 0.55,
          x2: x + index * 21,
          y2: topY + hd * 0.4,
          stroke: 'rgba(255, 231, 180, 0.35)',
          'stroke-width': '2'
        })
      );
    }
    addBox(target, {
      x: x + 30,
      y: topY + 4,
      width: 16,
      depth: 12,
      height: 26,
      color: '#b87948',
      topColor: '#e1aa73'
    });
    return;
  }

  if (kind === 'civic') {
    for (const offset of [-24, 0, 24]) {
      addBox(target, {
        x: x + offset,
        y: topY + 13,
        width: 10,
        depth: 10,
        height: 30,
        color: '#f8dfeb',
        topColor: '#fff2f8'
      });
    }
    target.append(
      svgEl('ellipse', {
        cx: x,
        cy: topY + 2,
        rx: '22',
        ry: '12',
        fill: style.trim,
        stroke: '#fff4fb',
        'stroke-width': '1.2'
      }),
      svgEl('circle', {
        cx: x,
        cy: topY - 2,
        r: '6',
        fill: '#fff5c9',
        stroke: '#b8862a',
        'stroke-width': '1'
      })
    );
    return;
  }

  addBox(target, {
    x,
    y: topY + 7,
    width: 34,
    depth: 18,
    height: 12,
    color: style.trim,
    topColor: shadeColor(style.trim, 0.18)
  });
}

function addTerraceDetails(target, geometry, style, kind) {
  const { x, y, hw, topY } = geometry;

  if (kind === 'commercial') {
    addBox(target, {
      x: x + 18,
      y: y - 10,
      width: 22,
      depth: 18,
      height: 4,
      color: style.awning,
      topColor: style.trim
    });
    for (let index = 0; index < 3; index += 1) {
      target.append(
        svgEl('circle', {
          cx: x - 55 + index * 16,
          cy: topY - 2 + index * 2,
          r: '5',
          fill: index % 2 ? '#f6a6a0' : '#ffd166'
        })
      );
    }
  }

  if (kind === 'warehouse' || kind === 'distribution') {
    addBox(target, {
      x: x + hw * 0.62,
      y: y + 2,
      width: 34,
      depth: 22,
      height: 10,
      color: '#8b6b4a',
      topColor: '#c9a77e'
    });
    for (let index = 0; index < 3; index += 1) {
      addBox(target, {
        x: x + hw * 0.45 + index * 18,
        y: y + 16,
        width: 14,
        depth: 12,
        height: 12,
        color: '#b98555',
        topColor: '#e7bd84'
      });
    }
  }

  if (kind === 'residential') {
    const rightOrigin = [x + hw, y];
    const rightDepth = [-hw, geometry.hd];
    const up = [0, -geometry.height];
    target.append(
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0.46, 0.74, 0.34, 0.43),
        fill: '#8c4f2d',
        stroke: 'rgba(255, 244, 214, 0.35)',
        'stroke-width': '1'
      }),
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0.47, 0.73, 0.43, 0.455),
        fill: style.trim,
        opacity: '0.7'
      })
    );
    for (let index = 0; index < 4; index += 1) {
      target.append(
        svgEl('line', {
          x1: x + 6 + index * 16,
          y1: y - 22,
          x2: x + 6 + index * 16,
          y2: y - 32,
          stroke: '#f5d9a4',
          'stroke-width': '1.5'
        })
      );
    }
  }

  if (kind === 'civic') {
    const rightOrigin = [x + hw, y];
    const rightDepth = [-hw, geometry.hd];
    const up = [0, -geometry.height];
    target.append(
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0.35, 0.66, 0.01, 0.19),
        fill: '#4c2d3b',
        stroke: '#ffd0e6',
        'stroke-width': '1.2'
      })
    );
  }
}

function createBuildingArt(building) {
  const style = styleFor(building);
  const geometry = boxGeometry(building, {
    y: building.position.y,
    height: building.size.height
  });
  const group = svgEl('g', { class: 'building__art' });
  const color = building.color;
  const kind = style.kind;

  group.append(
    svgEl('ellipse', {
      cx: geometry.x,
      cy: geometry.y + geometry.hd + 6,
      rx: geometry.hw * 1.2,
      ry: geometry.hd * 1.15,
      class: 'building__shadow'
    })
  );

  addBox(group, {
    x: geometry.x,
    y: geometry.y + 4,
    width: geometry.width + 20,
    depth: geometry.depth + 10,
    height: 8,
    color: '#9b8d73',
    topColor: '#c9b995'
  });

  const body = svgEl('g', { class: 'building__body' });
  addBox(body, {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    depth: geometry.depth,
    height: geometry.height,
    color,
    topColor: shadeColor(color, 0.18),
    leftColor: shadeColor(color, -0.22),
    rightColor: shadeColor(color, -0.4)
  });
  group.append(body);

  addFloorBands(group, geometry, style, style.floors);
  addWindows(group, geometry, style, style.floors, kind);
  addDoor(group, geometry, style, kind);
  addRoof(group, geometry, style, kind);
  addTerraceDetails(group, geometry, style, kind);

  if (kind === 'office') {
    const rightOrigin = [geometry.x + geometry.hw, geometry.y];
    const rightDepth = [-geometry.hw, geometry.hd];
    const up = [0, -geometry.height];
    group.append(
      svgEl('polygon', {
        points: facePolygon(rightOrigin, rightDepth, up, 0.4, 0.6, 0.84, 0.9),
        fill: style.trim,
        opacity: '0.9'
      })
    );
  }

  if (kind === 'warehouse' || kind === 'distribution') {
    group.append(
      svgEl('polygon', {
        points: points([
          [geometry.x - geometry.hw - 10, geometry.y - 8],
          [geometry.x + geometry.hw + 10, geometry.y - 8],
          [geometry.x + geometry.hw + 10, geometry.y + 4],
          [geometry.x - geometry.hw - 10, geometry.y + 4]
        ]),
        fill: 'rgba(25, 41, 42, 0.2)'
      })
    );
  }

  return group;
}

function getLabelWidth(building) {
  return Math.max(148, building.name.length * 14 + 54);
}

function labelY(building) {
  const style = styleFor(building);
  const hd = building.size.depth / 4;
  const topY = building.position.y - building.size.height;
  return topY - hd - 28 - Math.min(38, style.roofExtra * 0.55);
}

function createBuildingLabel(building) {
  const x = building.position.x;
  const centerY = labelY(building);
  const width = getLabelWidth(building);
  const group = svgEl('g', {
    class: 'building__label',
    'aria-hidden': 'true'
  });
  const top = centerY - 27;

  group.append(
    svgEl('line', {
      x1: x,
      y1: centerY + 26,
      x2: x,
      y2: building.position.y - building.size.height - building.size.depth / 4 + 4,
      class: 'building__label-pin'
    }),
    svgEl('rect', {
      x: x - width / 2,
      y: top,
      width,
      height: 54,
      rx: 13,
      class: 'building__label-bg'
    }),
    svgEl('circle', {
      cx: x - width / 2 + 17,
      cy: centerY - 7,
      r: 6,
      class: 'building__status'
    })
  );

  const name = svgEl('text', {
    x: x + 8,
    y: centerY - 9,
    class: 'building__label-text',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  name.textContent = building.name;

  const subtitle = svgEl('text', {
    x: x,
    y: centerY + 11,
    class: 'building__label-sub',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  subtitle.textContent = `${building.recordCount} registros`;

  group.append(name, subtitle);
  return group;
}

function createBuildingBadge(building) {
  const x = building.position.x;
  const centerY = labelY(building);
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

  return svgEl(
    'g',
    { class: 'building__badge', 'aria-hidden': 'true' },
    [
      svgEl('rect', {
        x: badgeX,
        y: badgeY,
        width: badgeWidth,
        height: badgeHeight,
        rx: 13,
        class: 'building__badge-bg'
      }),
      text
    ]
  );
}

function createSelection(building) {
  const { x, y } = building.position;
  const width = building.size.width + 32;
  const depth = building.size.depth + 30;
  return svgEl('g', { class: 'building__selection', 'aria-hidden': 'true' }, [
    svgEl('ellipse', {
      cx: x,
      cy: y + depth / 4,
      rx: width / 2,
      ry: depth / 4,
      fill: 'rgba(255, 209, 102, 0.06)',
      stroke: 'rgba(255, 209, 102, 0.55)',
      'stroke-width': '2',
      'stroke-dasharray': '8 8'
    })
  ]);
}

function createTree(x, y, scale = 1, variant = 0) {
  const group = svgEl('g', {
    class: 'city-prop city-tree',
    'data-depth': y + x * 0.12,
    'aria-hidden': 'true'
  });
  const trunkColor = variant % 2 ? '#74513b' : '#806043';
  const leaf = ['#4f9d69', '#3d8b5c', '#6bad74', '#2f7d63'][variant % 4];
  const height = 44 * scale;
  const canopy = 24 * scale;

  group.append(
    svgEl('ellipse', {
      cx: x,
      cy: y + 5,
      rx: canopy * 0.85,
      ry: canopy * 0.3,
      fill: 'rgba(12, 40, 28, 0.24)'
    }),
    svgEl('polygon', {
      points: points([
        [x - 5 * scale, y],
        [x + 5 * scale, y],
        [x + 4 * scale, y - height * 0.55],
        [x - 4 * scale, y - height * 0.55]
      ]),
      fill: trunkColor
    })
  );

  if (variant % 3 === 1) {
    for (let index = 0; index < 3; index += 1) {
      const yOffset = y - height * 0.42 - index * 10 * scale;
      group.append(
        svgEl('polygon', {
          points: points([
            [x, yOffset - 28 * scale],
            [x + 22 * scale, yOffset + 3 * scale],
            [x - 22 * scale, yOffset + 3 * scale]
          ]),
          fill: index === 0 ? shadeColor(leaf, 0.12) : shadeColor(leaf, -index * 0.08),
          stroke: 'rgba(16, 63, 43, 0.3)',
          'stroke-width': '0.8'
        })
      );
    }
  } else {
    group.append(
      svgEl('ellipse', {
        cx: x - 8 * scale,
        cy: y - height * 0.55,
        rx: canopy,
        ry: canopy * 0.8,
        fill: shadeColor(leaf, 0.1),
        class: 'city-tree__canopy'
      }),
      svgEl('ellipse', {
        cx: x + 9 * scale,
        cy: y - height * 0.68,
        rx: canopy * 0.86,
        ry: canopy * 0.72,
        fill: leaf,
        class: 'city-tree__canopy'
      }),
      svgEl('ellipse', {
        cx: x,
        cy: y - height * 0.84,
        rx: canopy * 0.7,
        ry: canopy * 0.58,
        fill: shadeColor(leaf, 0.22),
        class: 'city-tree__canopy'
      })
    );
  }

  return group;
}

function createBush(x, y, scale = 1, color = '#4e9a67') {
  return svgEl(
    'g',
    {
      class: 'city-prop city-bush',
      'data-depth': y + x * 0.12,
      'aria-hidden': 'true'
    },
    [
      svgEl('ellipse', {
        cx: x + 3,
        cy: y + 2,
        rx: 13 * scale,
        ry: 5 * scale,
        fill: 'rgba(12, 40, 28, 0.2)'
      }),
      svgEl('ellipse', {
        cx: x - 6 * scale,
        cy: y - 5 * scale,
        rx: 10 * scale,
        ry: 8 * scale,
        fill: shadeColor(color, -0.08)
      }),
      svgEl('ellipse', {
        cx: x + 6 * scale,
        cy: y - 7 * scale,
        rx: 12 * scale,
        ry: 9 * scale,
        fill: color
      }),
      svgEl('ellipse', {
        cx: x,
        cy: y - 12 * scale,
        rx: 8 * scale,
        ry: 6 * scale,
        fill: shadeColor(color, 0.16)
      })
    ]
  );
}

function createFlowers(x, y, color = '#f7a1aa') {
  const group = svgEl('g', {
    class: 'city-prop city-flowers',
    'data-depth': y + x * 0.12,
    'aria-hidden': 'true'
  });
  for (let index = 0; index < 5; index += 1) {
    group.append(
      svgEl('circle', {
        cx: x + (index - 2) * 7,
        cy: y - (index % 2) * 4,
        r: 3.2,
        fill: index % 2 ? color : '#ffd166'
      })
    );
  }
  return group;
}

function createLamp(x, y) {
  return svgEl(
    'g',
    {
      class: 'city-prop city-lamp',
      'data-depth': y + x * 0.12,
      'aria-hidden': 'true'
    },
    [
      svgEl('ellipse', {
        cx: x,
        cy: y + 3,
        rx: 9,
        ry: 3.5,
        fill: 'rgba(15, 38, 34, 0.25)'
      }),
      svgEl('line', {
        x1: x,
        y1: y,
        x2: x,
        y2: y - 42,
        stroke: '#43585c',
        'stroke-width': '3'
      }),
      svgEl('circle', {
        cx: x,
        cy: y - 46,
        r: '12',
        fill: 'rgba(255, 209, 102, 0.12)',
        class: 'city-lamp__glow'
      }),
      svgEl('circle', {
        cx: x,
        cy: y - 46,
        r: '5',
        fill: '#ffe6a1',
        stroke: '#b68731',
        'stroke-width': '1'
      })
    ]
  );
}

function createBench(x, y) {
  return svgEl(
    'g',
    {
      class: 'city-prop city-bench',
      'data-depth': y + x * 0.12,
      'aria-hidden': 'true'
    },
    [
      svgEl('ellipse', {
        cx: x,
        cy: y + 3,
        rx: 17,
        ry: 5,
        fill: 'rgba(15, 38, 34, 0.2)'
      }),
      svgEl('polygon', {
        points: points([
          [x - 15, y - 7],
          [x + 12, y - 1],
          [x + 12, y + 4],
          [x - 15, y - 2]
        ]),
        fill: '#a66a3d'
      }),
      svgEl('polygon', {
        points: points([
          [x - 15, y - 17],
          [x + 12, y - 11],
          [x + 12, y - 5],
          [x - 15, y - 11]
        ]),
        fill: '#c1814d'
      }),
      svgEl('line', {
        x1: x - 10,
        y1: y + 2,
        x2: x - 10,
        y2: y + 8,
        stroke: '#58402e',
        'stroke-width': '2'
      }),
      svgEl('line', {
        x1: x + 8,
        y1: y + 2,
        x2: x + 8,
        y2: y + 8,
        stroke: '#58402e',
        'stroke-width': '2'
      })
    ]
  );
}

function createFountain(x, y) {
  const group = svgEl('g', {
    class: 'city-prop city-fountain',
    'data-depth': y + x * 0.12,
    'aria-hidden': 'true'
  });
  group.append(
    svgEl('ellipse', {
      cx: x,
      cy: y + 6,
      rx: 46,
      ry: 18,
      fill: 'rgba(11, 45, 43, 0.26)'
    }),
    svgEl('ellipse', {
      cx: x,
      cy: y,
      rx: 40,
      ry: 17,
      fill: '#c7b48d',
      stroke: '#f5e8c8',
      'stroke-width': '2'
    }),
    svgEl('ellipse', {
      cx: x,
      cy: y - 2,
      rx: 33,
      ry: 13,
      fill: '#4ab8b5',
      stroke: '#a9ebe2',
      'stroke-width': '1.2'
    }),
    svgEl('ellipse', {
      cx: x,
      cy: y - 5,
      rx: 23,
      ry: 8,
      fill: '#8ae1d9',
      opacity: '0.65',
      class: 'city-fountain__water'
    }),
    svgEl('line', {
      x1: x,
      y1: y - 5,
      x2: x,
      y2: y - 32,
      stroke: '#d9fbf5',
      'stroke-width': '2',
      opacity: '0.7',
      class: 'city-fountain__spray'
    }),
    svgEl('circle', {
      cx: x,
      cy: y - 34,
      r: '5',
      fill: '#d9fbf5',
      opacity: '0.8'
    })
  );
  return group;
}

function createCarArt(color) {
  const group = svgEl('g', { class: 'city-car__art' });
  group.append(
    svgEl('ellipse', {
      cx: 0,
      cy: 4,
      rx: 26,
      ry: 7,
      fill: 'rgba(8, 29, 30, 0.24)'
    }),
    svgEl('polygon', {
      points: points([
        [-25, 2],
        [19, 2],
        [23, -4],
        [-21, -4]
      ]),
      fill: shadeColor(color, -0.3)
    }),
    svgEl('polygon', {
      points: points([
        [-18, -4],
        [-10, -14],
        [9, -14],
        [19, -4]
      ]),
      fill: shadeColor(color, -0.12)
    }),
    svgEl('polygon', {
      points: points([
        [-8, -13],
        [1, -13],
        [1, -5],
        [-13, -5]
      ]),
      fill: '#b9e4ea',
      opacity: '0.9'
    }),
    svgEl('polygon', {
      points: points([
        [3, -13],
        [8, -13],
        [16, -5],
        [3, -5]
      ]),
      fill: '#b9e4ea',
      opacity: '0.9'
    }),
    svgEl('circle', { cx: -15, cy: 3, r: 4, fill: '#25363c' }),
    svgEl('circle', { cx: 13, cy: 3, r: 4, fill: '#25363c' }),
    svgEl('circle', { cx: 21, cy: -2, r: 2.2, fill: '#fff0b2' }),
    svgEl('rect', {
      x: -23,
      y: -1,
      width: 6,
      height: 3,
      fill: '#f7b267',
      rx: 1
    })
  );
  return group;
}

function createParkedCar(x, y, color = '#e76f51', rotate = 0) {
  const group = svgEl('g', {
    class: 'city-prop city-car',
    'data-depth': y + x * 0.12,
    transform: `translate(${x} ${y}) rotate(${rotate})`,
    'aria-hidden': 'true'
  });
  group.append(createCarArt(color));
  return group;
}

function createMovingCar(x, y, color, path, delay = '0s') {
  const group = svgEl('g', {
    class: 'city-car city-car--moving',
    transform: `translate(${x} ${y})`,
    'aria-hidden': 'true'
  });
  group.append(createCarArt(color));

  if (!reducedMotion()) {
    group.append(
      svgEl('animateMotion', {
        dur: '24s',
        begin: delay,
        repeatCount: 'indefinite',
        path
      })
    );
  }

  return group;
}

function createPerson(x, y, shirt = '#e76f51', skin = '#e9b48a') {
  return svgEl(
    'g',
    {
      class: 'city-prop city-person',
      'data-depth': y + x * 0.12,
      'aria-hidden': 'true'
    },
    [
      svgEl('ellipse', {
        cx: x,
        cy: y + 2,
        rx: 8,
        ry: 3,
        fill: 'rgba(8, 29, 30, 0.23)'
      }),
      svgEl('line', {
        x1: x - 3,
        y1: y - 8,
        x2: x - 4,
        y2: y,
        stroke: '#5f4541',
        'stroke-width': '3'
      }),
      svgEl('line', {
        x1: x + 3,
        y1: y - 8,
        x2: x + 4,
        y2: y,
        stroke: '#5f4541',
        'stroke-width': '3'
      }),
      svgEl('rect', {
        x: x - 6,
        y: y - 23,
        width: 12,
        height: 16,
        rx: 5,
        fill: shirt
      }),
      svgEl('circle', {
        cx: x,
        cy: y - 27,
        r: 5,
        fill: skin
      })
    ]
  );
}

function createCrate(x, y, scale = 1) {
  const group = svgEl('g', {
    class: 'city-prop city-crate',
    'data-depth': y + x * 0.12,
    'aria-hidden': 'true'
  });
  addBox(group, {
    x,
    y,
    width: 18 * scale,
    depth: 14 * scale,
    height: 14 * scale,
    color: '#b9834e',
    topColor: '#e4bc80'
  });
  group.append(
    svgEl('line', {
      x1: x - 7 * scale,
      y1: y - 8 * scale,
      x2: x + 7 * scale,
      y2: y - 3 * scale,
      stroke: '#7f552f',
      'stroke-width': '1'
    })
  );
  return group;
}

function createProps() {
  const nodes = [];
  const trees = [
    [270, 235, 0.85, 0],
    [180, 300, 0.75, 1],
    [395, 250, 0.8, 2],
    [1010, 250, 0.95, 1],
    [1080, 350, 0.8, 0],
    [1100, 480, 1, 2],
    [1030, 690, 0.8, 0],
    [930, 730, 0.7, 1],
    [760, 745, 0.8, 2],
    [500, 745, 0.7, 0],
    [340, 715, 0.8, 1],
    [250, 690, 0.7, 2],
    [50, 560, 0.8, 0],
    [90, 460, 0.7, 1],
    [430, 315, 0.6, 2],
    [690, 265, 0.65, 0]
  ];

  for (const [x, y, scale, variant] of trees) {
    nodes.push(createTree(x, y, scale, variant));
  }

  for (const [x, y, scale, color] of [
    [220, 330, 0.8, '#4e9a67'],
    [1010, 455, 0.8, '#448f63'],
    [930, 655, 0.7, '#6aa86f'],
    [405, 660, 0.7, '#4c9664'],
    [530, 690, 0.8, '#3f8b63'],
    [740, 660, 0.7, '#4f9b68']
  ]) {
    nodes.push(createBush(x, y, scale, color));
  }

  for (const [x, y, color] of [
    [325, 660, '#f7a1aa'],
    [300, 672, '#ffd166'],
    [985, 610, '#f6a6c1'],
    [1015, 620, '#f2d17a'],
    [405, 640, '#d8b4fe']
  ]) {
    nodes.push(createFlowers(x, y, color));
  }

  for (const [x, y] of [
    [500, 600],
    [715, 610],
    [330, 660],
    [855, 655],
    [610, 715]
  ]) {
    nodes.push(createLamp(x, y));
  }

  for (const [x, y] of [
    [515, 665],
    [685, 675],
    [890, 700]
  ]) {
    nodes.push(createBench(x, y));
  }

  nodes.push(createFountain(600, 620));
  nodes.push(createPerson(555, 665, '#e76f51'));
  nodes.push(createPerson(650, 690, '#2a9d8f'));
  nodes.push(createPerson(700, 645, '#457b9d'));
  nodes.push(createPerson(290, 640, '#9b5de5'));

  nodes.push(createParkedCar(720, 595, '#e9c46a', 6));
  nodes.push(createParkedCar(805, 650, '#457b9d', -8));
  nodes.push(createParkedCar(955, 590, '#e76f51', 4));

  for (const [x, y, scale] of [
    [945, 620, 1],
    [972, 635, 0.8],
    [920, 640, 0.75],
    [995, 650, 0.9]
  ]) {
    nodes.push(createCrate(x, y, scale));
  }

  nodes.push(createCrate(555, 735, 0.75));

  return nodes;
}

function createSky(width, height) {
  const group = svgEl('g', { class: 'city-sky', 'aria-hidden': 'true' });
  group.append(
    svgEl('rect', {
      x: 0,
      y: 0,
      width,
      height,
      fill: 'url(#citySky)'
    }),
    svgEl('circle', {
      cx: width * 0.83,
      cy: height * 0.15,
      r: '64',
      fill: 'rgba(255, 220, 126, 0.13)'
    }),
    svgEl('circle', {
      cx: width * 0.83,
      cy: height * 0.15,
      r: '34',
      fill: '#fff0ba',
      opacity: '0.86'
    })
  );

  for (const [x, y, scale, opacity] of [
    [170, 130, 1, 0.6],
    [430, 90, 0.72, 0.45],
    [790, 125, 0.85, 0.5],
    [1030, 205, 0.55, 0.35]
  ]) {
    const cloud = svgEl('g', {
      class: 'city-cloud',
      transform: `translate(${x} ${y}) scale(${scale})`,
      opacity: String(opacity)
    });
    cloud.append(
      svgEl('ellipse', { cx: 0, cy: 0, rx: 42, ry: 13, fill: '#f5fffd' }),
      svgEl('ellipse', { cx: -22, cy: 4, rx: 24, ry: 10, fill: '#f5fffd' }),
      svgEl('ellipse', { cx: 24, cy: 5, rx: 28, ry: 11, fill: '#f5fffd' })
    );
    group.append(cloud);
  }

  group.append(
    svgEl('path', {
      d: `M 0 ${height * 0.34} Q ${width * 0.15} ${height * 0.28} ${width * 0.3} ${height * 0.34} T ${width * 0.62} ${height * 0.33} T ${width} ${height * 0.34} L ${width} ${height * 0.48} L 0 ${height * 0.48} Z`,
      fill: 'rgba(194, 234, 224, 0.18)'
    })
  );

  return group;
}

function createTerrain(city) {
  const width = city.viewport.width;
  const height = city.viewport.height;
  const cx = width / 2;
  const cy = height / 2 + 45;
  const rx = Math.min(width * 0.46, 548);
  const ry = rx / 2;
  const ground = points([
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy]
  ]);
  const lower = points([
    [cx, cy - ry + 22],
    [cx + rx, cy + 22],
    [cx, cy + ry + 22],
    [cx - rx, cy + 22]
  ]);
  const group = svgEl('g', { class: 'city-terrain', 'aria-hidden': 'true' });

  const outerCx = cx;
  const outerCy = cy - 6;
  const outerRx = rx + 112;
  const outerRy = ry + 96;

  group.append(
    svgEl('ellipse', {
      cx: outerCx,
      cy: outerCy + 28,
      rx: outerRx * 0.96,
      ry: outerRy * 0.95,
      fill: 'rgba(22, 66, 48, 0.22)'
    }),
    svgEl('ellipse', {
      cx: outerCx,
      cy: outerCy + 10,
      rx: outerRx,
      ry: outerRy,
      fill: '#a58b62'
    }),
    svgEl('ellipse', {
      cx: outerCx,
      cy: outerCy,
      rx: outerRx - 8,
      ry: outerRy - 8,
      fill: '#d8c49c'
    }),
    svgEl('ellipse', {
      cx: outerCx,
      cy: outerCy - 4,
      rx: outerRx - 24,
      ry: outerRy - 24,
      fill: '#e5d3ae',
      opacity: '0.86'
    }),
    svgEl('ellipse', {
      cx: outerCx,
      cy: outerCy - 4,
      rx: outerRx - 40,
      ry: outerRy - 40,
      fill: 'url(#cityPaving)',
      opacity: '0.14'
    }),
    svgEl('ellipse', {
      cx: 180,
      cy: 355,
      rx: 62,
      ry: 20,
      fill: '#82b378',
      opacity: '0.72'
    }),
    svgEl('ellipse', {
      cx: 120,
      cy: 560,
      rx: 64,
      ry: 20,
      fill: '#7eae76',
      opacity: '0.62'
    }),
    svgEl('ellipse', {
      cx: 1100,
      cy: 470,
      rx: 54,
      ry: 18,
      fill: '#82b378',
      opacity: '0.62'
    }),
    svgEl('ellipse', {
      cx: 1040,
      cy: 610,
      rx: 58,
      ry: 19,
      fill: '#7eae76',
      opacity: '0.68'
    }),
    svgEl('ellipse', {
      cx: 290,
      cy: 690,
      rx: 58,
      ry: 19,
      fill: '#82b378',
      opacity: '0.6'
    }),
    svgEl('ellipse', {
      cx: cx,
      cy: cy + ry * 0.8,
      rx: outerRx * 0.9,
      ry: outerRy * 0.86,
      fill: 'none',
      stroke: 'rgba(255, 248, 225, 0.36)',
      'stroke-width': '2'
    }),
    svgEl('ellipse', {
      cx: cx,
      cy: cy + ry * 0.78,
      rx: rx * 0.84,
      ry: ry * 0.24,
      fill: 'rgba(7, 39, 36, 0.28)'
    }),
    svgEl('polygon', {
      points: lower,
      fill: '#7c6548'
    }),
    svgEl('polygon', {
      points: ground,
      fill: '#8f764f'
    }),
    svgEl('polygon', {
      points: points([
        [cx, cy - ry + 7],
        [cx + rx - 9, cy + 4],
        [cx, cy + ry + 4],
        [cx - rx + 9, cy + 4]
      ]),
      fill: '#4b9a64'
    }),
    svgEl('polygon', {
      points: points([
        [cx, cy - ry + 11],
        [cx + rx - 16, cy + 4],
        [cx, cy + ry - 12],
        [cx - rx + 16, cy + 4]
      ]),
      fill: 'url(#cityGrass)'
    }),
    svgEl('polygon', {
      points: points([
        [cx, cy - ry + 11],
        [cx + rx - 16, cy + 4],
        [cx, cy + ry - 12],
        [cx - rx + 16, cy + 4]
      ]),
      fill: 'url(#cityGrassTexture)',
      opacity: '0.22'
    }),
    svgEl('polygon', {
      points: ground,
      fill: 'none',
      stroke: '#e2d3ac',
      'stroke-width': '5',
      'stroke-linejoin': 'round',
      opacity: '0.58'
    }),
    svgEl('polygon', {
      points: points([
        [cx, cy - ry + 22],
        [cx + rx - 22, cy + 5],
        [cx, cy + ry - 12],
        [cx - rx + 22, cy + 5]
      ]),
      fill: 'none',
      stroke: '#b6e3a7',
      'stroke-width': '2',
      opacity: '0.32'
    })
  );

  const plaza = svgEl('g', { class: 'city-plaza' });
  plaza.append(
    svgEl('polygon', {
      points: points([
        [cx - 135, cy - 4],
        [cx + 45, cy + 42],
        [cx + 140, cy + 15],
        [cx - 40, cy - 30]
      ]),
      fill: 'url(#cityPaving)',
      stroke: '#f6e8c9',
      'stroke-width': '2',
      opacity: '0.96'
    }),
    svgEl('polygon', {
      points: points([
        [cx + 120, cy + 14],
        [cx + 240, cy + 45],
        [cx + 284, cy + 33],
        [cx + 164, cy + 2]
      ]),
      fill: 'url(#cityPaving)',
      opacity: '0.6'
    })
  );
  group.append(plaza);

  const pond = svgEl('g', { class: 'city-pond' });
  pond.append(
    svgEl('ellipse', {
      cx: 1025,
      cy: 700,
      rx: 80,
      ry: 27,
      fill: '#3d88a5',
      stroke: '#a6e3df',
      'stroke-width': '2'
    }),
    svgEl('ellipse', {
      cx: 1025,
      cy: 695,
      rx: 67,
      ry: 19,
      fill: '#54b9c2',
      opacity: '0.7'
    }),
    svgEl('ellipse', {
      cx: 1002,
      cy: 692,
      rx: 11,
      ry: 4,
      fill: '#5f9e6b'
    }),
    svgEl('ellipse', {
      cx: 1045,
      cy: 702,
      rx: 8,
      ry: 3,
      fill: '#75b67a'
    })
  );
  group.append(pond);

  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2;
    const radius = 0.2 + ((index * 37) % 72) / 100;
    const x = cx + Math.cos(angle) * rx * radius * 0.82;
    const y = cy + Math.sin(angle) * ry * radius * 0.78;
    group.append(
      svgEl('path', {
        d: `M ${round(x)} ${round(y)} l ${index % 2 ? 3 : -3} -5 l ${index % 3 ? 2 : -2} 4`,
        stroke: index % 4 === 0 ? '#e5d58e' : '#85c782',
        'stroke-width': index % 4 === 0 ? '1.8' : '1.3',
        fill: 'none',
        opacity: '0.68'
      })
    );
  }

  return group;
}

function roadCurve(from, to) {
  const start = { x: from.position.x, y: from.position.y + 8 };
  const end = { x: to.position.x, y: to.position.y + 8 };
  const dx = end.x - start.x;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - Math.min(42, Math.abs(dx) * 0.08);
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
}

function createRoads(city) {
  const group = svgEl('g', { class: 'city-roads-layer', 'aria-hidden': 'true' });
  const byId = new Map(city.buildings.map((building) => [building.id, building]));

  for (const road of city.roads) {
    const from = byId.get(road.from);
    const to = byId.get(road.to);
    if (!from || !to) {
      continue;
    }
    const path = roadCurve(from, to);
    group.append(
      svgEl('path', {
        d: path,
        class: 'city-road__sidewalk',
        fill: 'none',
        stroke: '#e3d3ad',
        'stroke-width': '50',
        'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: path,
        class: 'road__casing',
        pathLength: '1',
        fill: 'none',
        stroke: '#3a4447',
        'stroke-width': '40',
        'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: path,
        class: 'road__surface',
        pathLength: '1',
        fill: 'none',
        stroke: '#5b6263',
        'stroke-width': '33',
        'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: path,
        class: 'road__center',
        fill: 'none',
        stroke: '#f7e8bf',
        'stroke-width': '2.6',
        'stroke-linecap': 'round',
        'stroke-dasharray': '9 14',
        opacity: '0.72'
      }),
      svgEl('path', {
        d: path,
        class: 'city-road__curb',
        fill: 'none',
        stroke: 'rgba(255, 255, 255, 0.32)',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
  }

  const main = 'M 40 650 C 220 720 450 720 610 675 S 950 600 1160 610';
  group.append(
    svgEl('path', {
      d: main,
      class: 'city-main-road__sidewalk',
      fill: 'none',
      stroke: '#dfcda7',
      'stroke-width': '48',
      'stroke-linecap': 'round'
    }),
    svgEl('path', {
      d: main,
      class: 'city-main-road__casing',
      fill: 'none',
      stroke: '#394449',
      'stroke-width': '40',
      'stroke-linecap': 'round'
    }),
    svgEl('path', {
      d: main,
      class: 'city-main-road__surface',
      fill: 'none',
      stroke: '#5e6567',
      'stroke-width': '32',
      'stroke-linecap': 'round'
    }),
    svgEl('path', {
      d: main,
      class: 'city-main-road__center',
      fill: 'none',
      stroke: '#f7e8bf',
      'stroke-width': '2.6',
      'stroke-linecap': 'round',
      'stroke-dasharray': '10 18',
      opacity: '0.72'
    })
  );

  const crosswalk = (x, y) => {
    const stripes = svgEl('g', {
      transform: `translate(${x} ${y}) rotate(-8)`,
      class: 'city-crosswalk'
    });
    for (let index = 0; index < 5; index += 1) {
      stripes.append(
        svgEl('rect', {
          x: -24 + index * 10,
          y: -14,
          width: 5,
          height: 28,
          rx: 2,
          fill: '#f9edcf',
          opacity: '0.86'
        })
      );
    }
    return stripes;
  };

  group.append(crosswalk(482, 630), crosswalk(725, 635), crosswalk(930, 675));

  const driveway = 'M 600 492 C 590 540 560 585 550 650';
  group.append(
    svgEl('path', {
      d: driveway,
      class: 'city-driveway__sidewalk',
      fill: 'none',
      stroke: '#e4d3ad',
      'stroke-width': '22',
      'stroke-linecap': 'round'
    }),
    svgEl('path', {
      d: driveway,
      class: 'city-driveway',
      fill: 'none',
      stroke: '#646966',
      'stroke-width': '16',
      'stroke-linecap': 'round'
    })
  );

  return group;
}

function createUrbanProps() {
  const nodes = createProps();
  nodes.push(
    createPerson(850, 610, '#f4a261'),
    createPerson(180, 700, '#e76f51'),
    createPerson(1050, 520, '#2a9d8f')
  );
  nodes.push(
    createParkedCar(690, 560, '#f4a261', 14),
    createParkedCar(980, 665, '#f1faee', -5)
  );

  if (!reducedMotion()) {
    nodes.push(createMovingCar(0, 0, '#e63946', 'M -20 650 C 220 720 450 720 610 675 S 950 600 1190 610', '0s'));
    nodes.push(createMovingCar(0, 0, '#ffd166', 'M 1190 610 C 950 600 610 675 610 675 S 250 720 -30 650', '5s'));
  }

  return nodes;
}

function createDefs() {
  const defs = svgEl('defs');
  defs.append(
    svgEl('linearGradient', { id: 'citySky', x1: '0', y1: '0', x2: '0', y2: '1' }, [
      svgEl('stop', { offset: '0%', 'stop-color': '#8ed7e5' }),
      svgEl('stop', { offset: '55%', 'stop-color': '#d8f2ed' }),
      svgEl('stop', { offset: '100%', 'stop-color': '#f5e7c8' })
    ]),
    svgEl('linearGradient', { id: 'cityGrass', x1: '0', y1: '0', x2: '0.8', y2: '1' }, [
      svgEl('stop', { offset: '0%', 'stop-color': '#75bf78' }),
      svgEl('stop', { offset: '100%', 'stop-color': '#3b8d5d' })
    ]),
    svgEl('pattern', {
      id: 'cityPaving',
      width: '30',
      height: '20',
      patternUnits: 'userSpaceOnUse'
    }, [
      svgEl('rect', { width: '30', height: '20', fill: '#d7c59c' }),
      svgEl('path', { d: 'M 0 20 L 30 0', stroke: '#bfa979', 'stroke-width': '1' }),
      svgEl('path', { d: 'M 0 10 L 30 -10', stroke: '#eadcb9', 'stroke-width': '0.7' })
    ]),
    svgEl('pattern', {
      id: 'cityGrassTexture',
      width: '34',
      height: '22',
      patternUnits: 'userSpaceOnUse'
    }, [
      svgEl('path', { d: 'M 4 16 l 2 -5 l 2 5 M 20 12 l 2 -5 l 2 5', stroke: '#2f7c56', 'stroke-width': '1', fill: 'none', opacity: '0.45' }),
      svgEl('circle', { cx: 13, cy: 17, r: '1.4', fill: '#e6df91', opacity: '0.55' })
    ])
  );
  return defs;
}

export {
  createBuildingArt,
  createBuildingBadge,
  createBuildingLabel,
  createDefs,
  createRoads,
  createSelection,
  createSky,
  createTerrain,
  createUrbanProps,
  getLabelWidth
};
