type Point = [number, number];

function stroke(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill = false) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) ctx.fill();
  else ctx.stroke();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 8) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
}

function check(ctx: CanvasRenderingContext2D, x: number, y: number) {
  stroke(ctx, [[x - 9, y], [x - 2, y + 7], [x + 11, y - 8]]);
}

function lock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y - 8, 15, Math.PI, 0);
  ctx.stroke();
  stroke(ctx, [[x - 15, y - 8], [x - 15, y + 2]]);
  stroke(ctx, [[x + 15, y - 8], [x + 15, y + 2]]);
  box(ctx, x - 23, y + 2, 46, 34);
  circle(ctx, x, y + 18, 3, true);
  stroke(ctx, [[x, y + 18], [x, y + 25]]);
}

function packet(ctx: CanvasRenderingContext2D, route: Point[], t: number) {
  ctx.globalAlpha = .38;
  stroke(ctx, route);
  const step = t % 1 * (route.length - 1);
  const i = Math.floor(step);
  const [ax, ay] = route[i];
  const [bx, by] = route[i + 1];
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 12;
  ctx.shadowColor = String(ctx.fillStyle);
  circle(ctx, ax + (bx - ax) * (step - i), ay + (by - ay) * (step - i), 5, true);
  ctx.shadowBlur = 0;
}

const scenes = [
  // Scan a website and flag two places that need attention.
  (ctx: CanvasRenderingContext2D, t: number) => {
    box(ctx, -165, -76, 330, 152, 12);
    stroke(ctx, [[-165, -44], [165, -44]]);
    for (let i = 0; i < 3; i++) circle(ctx, -146 + i * 14, -60, 2.5, true);
    box(ctx, -140, -25, 106, 74);
    stroke(ctx, [[-9, -14], [137, -14]]);
    stroke(ctx, [[-9, 7], [109, 7]]);
    stroke(ctx, [[-9, 28], [125, 28]]);
    const x = -150 + 300 * t;
    ctx.globalAlpha = .19;
    ctx.fillRect(x - 15, -42, 15, 115);
    ctx.globalAlpha = 1;
    stroke(ctx, [[x, -42], [x, 72]]);
    for (const [px, py] of [[-84, 10], [98, 28]]) {
      if (x > px) {
        ctx.fillStyle = '#ffdcbe';
        circle(ctx, px, py, 4, true);
        circle(ctx, px, py, 12 + 3 * Math.sin(t * 18));
      }
    }
  },
  // Review a checklist and isolate the one item that still needs work.
  (ctx: CanvasRenderingContext2D, t: number) => {
    box(ctx, -122, -80, 244, 160, 12);
    const reviewY = -59 + t * 121;
    ctx.globalAlpha = .55;
    stroke(ctx, [[-137, reviewY], [-124, reviewY]]);
    circle(ctx, -139, reviewY, 3, true);
    for (let row = 0; row < 4; row++) {
      const y = -50 + row * 33;
      const reviewed = t > .13 + row * .16;
      ctx.globalAlpha = reviewed ? 1 : .45;
      box(ctx, -99, y - 10, 22, 22, 4);
      stroke(ctx, [[-60, y], [45 + row % 2 * 32, y]]);
      if (!reviewed) continue;
      if (row === 2) {
        ctx.save();
        ctx.strokeStyle = '#ffd6a9';
        ctx.strokeRect(-112, y - 15, 224, 30);
        stroke(ctx, [[-88, y - 4], [-88, y + 2]]);
        circle(ctx, -88, y + 6, 1.2, true);
        ctx.restore();
      } else check(ctx, -88, y);
    }
  },
  // A suspicious spike lights up an alert beside the monitor.
  (ctx: CanvasRenderingContext2D, t: number) => {
    box(ctx, -170, -65, 224, 114, 10);
    stroke(ctx, [[-58, 49], [-58, 68], [-94, 68], [-22, 68]]);
    const wave: Point[] = [[-151, -8], [-124, -8], [-108, -18], [-94, 5], [-74, -8], [-54, -8], [-37, -48], [-23, 21], [-5, -8], [34, -8]];
    stroke(ctx, wave);
    packet(ctx, wave, t);
    ctx.globalAlpha = t > .56 ? 1 : .28;
    stroke(ctx, [[121, -42], [168, 38], [74, 38], [121, -42]]);
    stroke(ctx, [[121, -17], [121, 10]]);
    circle(ctx, 121, 23, 3, true);
  },
  // Separate traffic headed to guest devices and protected staff systems.
  (ctx: CanvasRenderingContext2D, t: number) => {
    box(ctx, -174, -21, 60, 36);
    for (let i = 0; i < 3; i++) circle(ctx, -159 + i * 13, -3, 2.4, true);
    stroke(ctx, [[-154, -33], [-145, -42], [-136, -33]]);
    box(ctx, 96, -72, 65, 41);
    stroke(ctx, [[87, -24], [170, -24]]);
    lock(ctx, 129, 35);
    packet(ctx, [[-114, -5], [-36, -5], [-36, -52], [96, -52]], t);
    packet(ctx, [[-114, 5], [-15, 5], [-15, 54], [106, 54]], (t + .38) % 1);
  },
  // A readable record moves into a lock and emerges protected.
  (ctx: CanvasRenderingContext2D, t: number) => {
    box(ctx, -169, -49, 63, 98, 7);
    for (let i = 0; i < 4; i++) stroke(ctx, [[-156, -27 + i * 17], [-120, -27 + i * 17]]);
    circle(ctx, 0, 0, 59);
    lock(ctx, 0, -5);
    box(ctx, 107, -49, 63, 98, 7);
    ctx.globalAlpha = t > .52 ? 1 : .3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) circle(ctx, 123 + j * 15, -19 + i * 19, 2.8, true);
    }
    packet(ctx, [[-106, 0], [-59, 0]], t);
    packet(ctx, [[59, 0], [107, 0]], (t + .5) % 1);
  },
];

const accents = ['#ff9bab', '#c5bcff', '#90f1d9', '#a9d7ff', '#ffcb95'];

export function drawServiceArtwork(ctx: CanvasRenderingContext2D, service: number, time: number) {
  const { width, height } = ctx.canvas;
  const scale = Math.min(width / 410, height / 190);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = accents[service];
  ctx.fillStyle = accents[service];
  scenes[service](ctx, time ? (time % 5400) / 5400 : .7);
  ctx.restore();
}
