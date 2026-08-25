const WORLD = (() => {
  const W = 72, H = 42;
  const COBBLE = 1, WATER = 2, PIER = 3, WALL = 4, CRATE = 5, POST = 6, WOOD = 7;
  const map = new Uint8Array(W * H);
  const at = (x, y) => map[y * W + x];
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) map[y * W + x] = v; };

  for (let i = 0; i < map.length; i++) map[i] = WATER;

  function fill(x0, y0, x1, y1, v) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, v);
  }

  function shop(x0, y0, x1, y1, doorX, doorY) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        put(x, y, edge ? WALL : WOOD);
      }
    }
    put(doorX, doorY, WOOD);
  }

  function warehouse(x0, y0, x1, y1) {
    fill(x0, y0, x1, y1, WALL);
  }

  fill(2, 18, 69, 27, COBBLE);
  fill(2, 16, 16, 26, COBBLE);
  fill(2, 14, 12, 17, COBBLE);
  fill(50, 3, 58, 19, PIER);
  fill(48, 16, 60, 19, PIER);
  fill(24, 15, 26, 18, PIER);

  shop(3, 28, 14, 40, 8, 28);
  warehouse(17, 28, 28, 40);
  shop(31, 29, 43, 40, 37, 29);
  fill(36, 27, 38, 28, COBBLE);
  shop(46, 28, 60, 40, 53, 28);
  warehouse(62, 22, 70, 34);
  warehouse(20, 8, 30, 15);

  const crateSpots = [
    [16, 20], [17, 20], [17, 21],
    [33, 24], [34, 24], [34, 25],
    [44, 20], [45, 20],
    [49, 22],
    [6, 16], [7, 16],
  ];
  for (const [x, y] of crateSpots) put(x, y, CRATE);

  const posts = [
    [50, 4], [58, 4], [50, 9], [58, 9], [50, 14], [58, 14],
    [18, 18], [40, 18],
  ];
  for (const [x, y] of posts) put(x, y, POST);

  const sprites = [];
  const spr = (o) => { sprites.push(o); return o; };

  const litLanterns = [
    [6.5, 17.5], [12.5, 19.5], [19.5, 19.4], [26.5, 19.5],
    [34.5, 19.4], [42.5, 19.5], [48.5, 19.5],
    [52.3, 17.5], [56.7, 12.5], [52.3, 7.5],
    [5.5, 22.5], [61.4, 26.4], [50.8, 32.2],
  ];
  for (const [x, y] of litLanterns) {
    spr({ x, y, kind: "lantern", lit: true, solid: true, rad: 0.12 });
  }
  spr({ x: 15.5, y: 25.5, kind: "lantern", lit: false, solid: true, rad: 0.12, use: "light", prompt: "E · light", useR: 0.75 });
  spr({ x: 47.6, y: 22.4, kind: "lantern", lit: false, solid: true, rad: 0.12, use: "light", prompt: "E · light", useR: 0.75 });

  const barrels = [
    [9.4, 20.3], [15.3, 24.6], [29.4, 21.2], [41.6, 24.4],
    [47.3, 21.5], [52.4, 16.4], [56.6, 10.2], [61.3, 24.5],
  ];
  for (const [x, y] of barrels) spr({ x, y, kind: "barrel", solid: true, rad: 0.22 });

  const bollards = [
    [21.5, 18.4], [28.5, 18.4], [36.5, 18.4], [51.3, 16.3],
    [57.4, 16.3], [51.3, 8.5], [57.4, 8.5],
  ];
  for (const [x, y] of bollards) spr({ x, y, kind: "bollard", solid: true, rad: 0.12 });

  spr({ x: 8.5, y: 28.08, kind: "door" });
  spr({ x: 37.5, y: 29.08, kind: "door" });
  spr({ x: 53.5, y: 28.08, kind: "door" });

  spr({ x: 8.6, y: 36.5, kind: "desk", solid: true, rad: 0.34 });
  spr({ x: 8.15, y: 36.15, kind: "desklamp" });
  spr({
    x: 8.95, y: 36.2, kind: "book", use: "read", prompt: "E · read", useR: 0.85,
    text: "Watch log, last leaf: fog on the inner basin. Three lamps out on the long walk. Tide due at the bell.",
  });
  spr({ x: 7.8, y: 35.7, kind: "key", find: "key", use: "take", prompt: "E · take", useR: 0.9 });

  spr({ x: 34.6, y: 34.5, kind: "stool", solid: true, rad: 0.14 });
  spr({ x: 36.2, y: 34.8, kind: "stool", solid: true, rad: 0.14 });
  spr({ x: 37.4, y: 36.7, kind: "desk", solid: true, rad: 0.32 });
  spr({ x: 37.3, y: 33.6, kind: "warm" });
  spr({
    x: 37.15, y: 36.25, kind: "note", use: "read", prompt: "E · read", useR: 0.85,
    text: "If you are reading this, the cask by the door is for the night man. Leave the coin on the sill.",
  });

  spr({ x: 50.4, y: 33.4, kind: "net" });
  spr({ x: 55.6, y: 34.1, kind: "net" });
  spr({ x: 52.6, y: 36.6, kind: "net" });
  spr({
    x: 53.4, y: 35.6, kind: "letter", find: "letter", use: "take", prompt: "E · take", useR: 0.85,
    text: "I left before the weather turned. The loft still smells of tar. Keep the key if the lock still minds you.",
  });

  spr({ x: 15.35, y: 21.35, kind: "coin", find: "coin", use: "take", prompt: "E · take", useR: 0.75 });
  spr({ x: 52.35, y: 14.4, kind: "glove", find: "glove", use: "take", prompt: "E · take", useR: 0.8 });

  const boat = spr({ x: 54.5, y: 3.28, kind: "boat", use: "sit", prompt: "E · sit", useR: 1.15 });

  const cat = spr({
    x: 10.4, y: 22.1, kind: "cat", solid: true, rad: 0.16,
    i: 0, path: [
      [10.4, 22.1], [18.6, 21.3], [28.4, 22.5], [38.2, 21.6],
      [46.2, 22.3], [38.4, 24.1], [22.6, 23.5], [12.2, 23.1],
    ],
  });

  const light = new Float32Array(W * H);

  function addLight(lx, ly, str) {
    str = str == null ? 1.35 : str;
    const ix = lx | 0, iy = ly | 0;
    for (let y = iy - 8; y <= iy + 8; y++) {
      for (let x = ix - 8; x <= ix + 8; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = x + 0.5 - lx, dy = y + 0.5 - ly;
        light[y * W + x] += str / (1 + (dx * dx + dy * dy) * 0.22);
      }
    }
  }

  for (const s of sprites) {
    if (s.kind === "lantern" && s.lit) addLight(s.x, s.y, 1.35);
  }
  addLight(8.15, 36.15, 1.05);
  addLight(37.3, 33.6, 1.45);

  const solid = (t) => t === WALL || t === CRATE || t === POST;
  const walkable = (t) => t === COBBLE || t === PIER || t === WOOD;

  function tileBlocked(x, y) {
    const tx = x | 0, ty = y | 0;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return !walkable(at(tx, ty));
  }

  function spriteBlocked(x, y, r, skip) {
    for (const s of sprites) {
      if (!s.solid || s.gone || s === skip) continue;
      const R = r + (s.rad || 0.18);
      const dx = x - s.x, dy = y - s.y;
      if (dx * dx + dy * dy < R * R) return true;
    }
    return false;
  }

  function circleBlocked(x, y, r, skip) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI * 0.25;
      if (tileBlocked(x + Math.cos(a) * r, y + Math.sin(a) * r)) return true;
    }
    return spriteBlocked(x, y, r, skip);
  }

  function inBox(tx, ty, x0, y0, x1, y1) {
    return tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1;
  }

  function placeAt(x, y) {
    const tx = x | 0, ty = y | 0;
    if (inBox(tx, ty, 3, 28, 14, 40)) return "Watch";
    if (inBox(tx, ty, 31, 29, 43, 40)) return "The Tap";
    if (inBox(tx, ty, 46, 28, 60, 40)) return "Net Loft";
    if (inBox(tx, ty, 50, 3, 58, 7)) return "End of the Pier";
    const t = (tx >= 0 && ty >= 0 && tx < W && ty < H) ? at(tx, ty) : WATER;
    if (t === PIER || inBox(tx, ty, 48, 8, 60, 19)) return "Long Pier";
    return "The Slip";
  }

  function nearestUse(px, py) {
    let best = null, bestD = 1e9;
    for (const s of sprites) {
      if (s.gone || !s.use) continue;
      if (s.use === "light" && s.lit) continue;
      const d = Math.hypot(s.x - px, s.y - py);
      const r = s.useR || 0.85;
      if (d < r && d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  function nearestLit(px, py) {
    let best = 99;
    for (const s of sprites) {
      if (s.gone) continue;
      if (!((s.kind === "lantern" && s.lit) || s.kind === "desklamp" || s.kind === "warm")) continue;
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < best) best = d;
    }
    return best;
  }

  function updateCat(dt) {
    const c = cat;
    const wp = c.path[c.i];
    const dx = wp[0] - c.x, dy = wp[1] - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.1) { c.i = (c.i + 1) % c.path.length; return; }
    const sp = 0.34 * dt;
    const nx = c.x + (dx / d) * sp, ny = c.y + (dy / d) * sp;
    if (!circleBlocked(nx, ny, c.rad, c)) { c.x = nx; c.y = ny; }
    else c.i = (c.i + 1) % c.path.length;
  }

  const start = { x: 7.6, y: 22.15, a: -0.38 };

  return {
    W, H, COBBLE, WATER, PIER, WALL, CRATE, POST, WOOD,
    map, at, solid, walkable, tileBlocked, circleBlocked,
    sprites, light, addLight, start, placeAt, nearestUse, nearestLit,
    updateCat, boat,
  };
})();
