type Point = [number, number, number];
type Stroke = { points: Point[]; ink: number; width?: number };

const circle = Math.PI * 2;

function curve(count: number, sample: (t: number) => Point): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => sample(index / count));
}

function aperture(): Stroke[] {
  return Array.from({ length: 27 }, (_, index) => ({
    ink: index % 5 === 0 ? 2 : 0,
    points: curve(96, t => {
      const angle = t * circle + index * .105;
      const radius = (.36 + index * .031) * (1 + .16 * Math.cos(angle * 5 + index * .21));
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, (index - 13) * .034];
    }),
  }));
}

function ledger(): Stroke[] {
  return Array.from({ length: 12 }, (_, layer) => {
    const y = (layer - 5.5) * .115;
    const corners: Point[] = [[-1.1, y, -.67], [1.1, y, -.67], [1.1, y, .67], [-1.1, y, .67]];
    return [
      { ink: layer % 4 === 0 ? 2 : 0, points: [...corners, corners[0]] },
      ...Array.from({ length: 7 }, (_, row): Stroke => {
        const x = -.92 + row * .29;
        const end = .41 - .10 * ((row + layer) % 4);
        return { ink: row === layer % 7 ? 2 : 1, points: [[x, y, -.47], [x, y, end]] };
      }),
    ];
  }).flat();
}

function signal(): Stroke[] {
  return Array.from({ length: 29 }, (_, row) => ({
    ink: row % 7 === 0 ? 2 : row % 2,
    points: curve(128, t => {
      const x = (t - .5) * 3.25;
      const z = (row - 14) * .068;
      const envelope = .12 + .7 * Math.exp(-4.3 * (x - z * .37) ** 2);
      return [x, Math.sin(x * 10 + z * 6.3) * envelope, z];
    }),
  }));
}

function infrastructure(): Stroke[] {
  const pieces: Stroke[] = [];
  for (let tower = 0; tower < 9; tower++) {
    const x = (tower % 3 - 1) * .69;
    const z = (Math.floor(tower / 3) - 1) * .69;
    const height = .27 + ((tower * 7 + 3) % 11) * .085;
    const corners: Point[] = [[x - .2, 0, z - .2], [x + .2, 0, z - .2], [x + .2, 0, z + .2], [x - .2, 0, z + .2]];
    for (let floor = 0; floor <= 5; floor++) {
      const points: Point[] = corners.map(([px, , pz]) => [px, .52 - floor * height / 5, pz]);
      pieces.push({ ink: floor === 5 ? 2 : 0, points: [...points, points[0]] });
    }
    for (const [px, , pz] of corners) pieces.push({ ink: 1, points: [[px, .52, pz], [px, .52 - height, pz]] });
    pieces.push({ ink: 2, points: [[x, .52 - height, z], [x, .38 - height, z]] });
  }
  for (let line = -4; line <= 4; line++) {
    pieces.push({ ink: 1, points: [[-1.23, .56, line * .29], [1.23, .56, line * .29]] });
    pieces.push({ ink: 1, points: [[line * .29, .56, -1.23], [line * .29, .56, 1.23]] });
  }
  return pieces;
}

function vault(): Stroke[] {
  const arcs: Stroke[] = [];
  for (let shell = 0; shell < 3; shell++) {
    const radius = 1.11 - shell * .29;
    for (let ribbon = 0; ribbon < 9; ribbon++) {
      arcs.push({
        ink: shell === 2 || ribbon % 5 === 0 ? 2 : shell,
        points: curve(90, t => {
          const angle = (t * .79 + shell * .17) * circle;
          const band = (ribbon - 4) * .028;
          return [Math.cos(angle) * (radius + band), Math.sin(angle) * (radius + band), Math.sin(angle * 2 + shell) * .27 + band * 2.6];
        }),
      });
    }
  }
  const crystal: Point[] = [[0, -.49, 0], [.39, 0, 0], [0, .49, 0], [-.39, 0, 0], [0, 0, .39], [0, 0, -.39]];
  arcs.push({ ink: 2, points: [crystal[0], crystal[1], crystal[2], crystal[3], crystal[0]] });
  for (const tip of crystal.slice(4)) {
    for (const vertex of crystal.slice(0, 4)) arcs.push({ ink: 2, points: [tip, vertex] });
  }
  return arcs;
}

const artworks = [
  { strokes: aperture(), colors: ['#f5687d', '#ff9a95', '#ffe2bf'], pitch: .31, yaw: .2 },
  { strokes: ledger(), colors: ['#a8adff', '#7276ba', '#f4e5ff'], pitch: .48, yaw: -.61 },
  { strokes: signal(), colors: ['#65dcbf', '#387e82', '#ddffda'], pitch: .54, yaw: -.12 },
  { strokes: infrastructure(), colors: ['#77b8ff', '#4067a2', '#c5efff'], pitch: .57, yaw: .66 },
  { strokes: vault(), colors: ['#e9a364', '#b46b88', '#ffedd1'], pitch: .29, yaw: -.35 },
];

type PanelEffect = (ctx: CanvasRenderingContext2D, time: number) => void;

function line(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, circle);
  ctx.fill();
}

// These layers use a normalized 100 x 100 stage so they work at any aspect ratio.
const panelEffects: PanelEffect[] = [
  (ctx, t) => {
    const scan = 18 + 64 * t;
    const glow = ctx.createLinearGradient(0, scan - 15, 0, scan);
    glow.addColorStop(0, '#ff648300');
    glow.addColorStop(1, '#ff64832e');
    ctx.fillStyle = glow;
    ctx.fillRect(17, scan - 15, 66, 15);
    line(ctx, [[17, scan], [83, scan]]);
    for (const [x, y] of [[37, 34], [64, 53], [47, 71]]) {
      const reveal = Math.max(0, Math.min(1, (scan - y) / 9));
      ctx.globalAlpha = reveal * .9;
      ctx.strokeRect(x - 2, y - 3, 4, 6);
      ctx.fillStyle = '#ffe2bf';
      dot(ctx, x, y, .55);
    }
  },
  (ctx, t) => {
    for (let row = 0; row < 5; row++) {
      const y = 29 + row * 10;
      const progress = Math.max(0, Math.min(1, (t - row * .12) * 5));
      ctx.globalAlpha = .3 + progress * .6;
      line(ctx, [[12, y], [21, y], [25, y - 4]]);
      ctx.strokeRect(78, y - 2, 3, 5);
      if (progress > .8) line(ctx, [[78.5, y], [79.3, y + 1], [80.6, y - 1]]);
    }
  },
  (ctx, t) => {
    const x = 13 + t * 74;
    ctx.globalAlpha = .68;
    line(ctx, [[x, 18], [x, 79]]);
    const bars = [3, 6, 4, 10, 6, 13, 5, 9, 4, 7, 3, 5, 9, 3];
    bars.forEach((height, index) => {
      const left = 13 + index * 5.55;
      ctx.globalAlpha = left <= x ? .82 : .19;
      ctx.fillRect(left, 81 - height, 1.2, height);
    });
    ctx.globalAlpha = 1;
    dot(ctx, x, 79, .65);
  },
  (ctx, t) => {
    const paths = [
      [[13, 38], [22, 38], [30, 51], [41, 51]],
      [[59, 51], [70, 51], [78, 38], [87, 38]],
      [[13, 65], [23, 65], [30, 56], [41, 56]],
      [[59, 56], [70, 56], [77, 65], [87, 65]],
    ];
    paths.forEach((route, index) => {
      ctx.globalAlpha = .42;
      line(ctx, route);
      const step = ((t * 3 + index * .55) % 3);
      const segment = Math.floor(step);
      const fraction = step - segment;
      const [ax, ay] = route[segment];
      const [bx, by] = route[segment + 1];
      ctx.globalAlpha = 1;
      dot(ctx, ax + (bx - ax) * fraction, ay + (by - ay) * fraction, .82);
    });
  },
  (ctx, t) => {
    for (let ring = 0; ring < 3; ring++) {
      const progress = (t + ring / 3) % 1;
      ctx.globalAlpha = .7 * (1 - progress);
      ctx.beginPath();
      ctx.ellipse(50, 51, 12 + progress * 32, 10 + progress * 26, 0, 0, circle);
      ctx.stroke();
    }
    ctx.globalAlpha = .75;
    line(ctx, [[12, 51], [27, 51]]);
    line(ctx, [[73, 51], [88, 51]]);
    dot(ctx, 27, 51, .63);
    dot(ctx, 73, 51, .63);
  },
];

function drawPanelEffect(ctx: CanvasRenderingContext2D, service: number, time: number, color: string) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.scale(width / 100, height / 100);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = .2;
  ctx.globalAlpha = .75;
  panelEffects[service](ctx, (time % 6400) / 6400);
  ctx.restore();
}


export function drawServiceArtwork(context: CanvasRenderingContext2D, service: number, time: number) {
  const art = artworks[service];
  const { width, height } = context.canvas;
  const scale = Math.min(width * .32, height * .39);
  const tick = time * .001;
  const yaw = art.yaw + Math.sin(tick * .4) * .28;
  const pitch = art.pitch + Math.sin(tick * .32) * .09;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const pitchCosine = Math.cos(pitch);
  const pitchSine = Math.sin(pitch);
  context.clearRect(0, 0, width, height);
  context.lineJoin = 'round';
  drawPanelEffect(context, service, time || 3800, art.colors[0]);

  art.strokes.forEach(({ points, ink }, line) => {
    context.beginPath();
    points.forEach(([x, y, z], index) => {
      // Give the waveform a travelling pulse and the aperture a breathing edge.
      const pulse = Math.sin(tick * 1.7 - x * 4);
      const vertical = y + (service === 2 ? pulse * .17 * Math.exp(-x * x) : 0);
      const radial = service === 0 ? 1 + .06 * Math.sin(tick * 1.2 - line * .27) : 1;
      const horizontal = (x * cosine - z * sine) * radial;
      const depth = (x * sine + z * cosine) * radial;
      const elevation = vertical * pitchCosine - depth * pitchSine;
      const cameraDepth = depth * pitchCosine + vertical * pitchSine;
      const perspective = 4 / (4 - cameraDepth);
      const px = width * .5 + horizontal * scale * perspective;
      const py = height * .5 + elevation * scale * perspective;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.strokeStyle = art.colors[ink];
    context.globalAlpha = ink === 2 ? .74 + .19 * Math.sin(tick * 1.4 + line * .14) : ink === 1 ? .52 : .73;
    context.lineWidth = Math.max(1, scale / (ink === 2 ? 104 : 150));
    context.stroke();
  });
  context.globalAlpha = 1;
}
