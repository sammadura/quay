const WORLD = (() => {
  const W = 72;
  const H = 42;
  const COBBLE = 1, WATER = 2, PIER = 3, WALL = 4, CRATE = 5, POST = 6;

  const map = new Uint8Array(W * H);
  const at = (x, y) => map[y * W + x];
  const put = (x, y, v) => {
    if (x >= 0 && y >= 0 && x < W && y < H) map[y * W + x] = v;
  };

  for (let i = 0; i < map.length; i++) map[i] = WATER;

  function fill(x0, y0, x1, y1, v) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, v);
  }

  function building(x0, y0, x1, y1, doorX, doorY) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        put(x, y, edge ? WALL : COBBLE);
      }
    }
    if (doorX != null) put(doorX, doorY, COBBLE);
  }

  fill(2, 18, 69, 28, COBBLE);
  fill(2, 16, 16, 26, COBBLE);
  fill(2, 14, 12, 17, COBBLE);

  fill(50, 3, 58, 19, PIER);
  fill(48, 16, 60, 19, PIER);
  fill(24, 15, 26, 18, PIER);

  building(3, 28, 14, 40, 8, 28);
  building(17, 28, 28, 40, 22, 28);
  building(31, 29, 43, 40, 37, 29);
  building(46, 28, 60, 40, 53, 28);
  building(62, 22, 70, 34, 62, 26);

  building(20, 8, 30, 15, 25, 15);

  fill(8, 28, 8, 28, COBBLE);
  fill(22, 28, 22, 28, COBBLE);

  const crateSpots = [
    [16, 20], [17, 20], [17, 21],
    [33, 24], [34, 24], [34, 25],
    [44, 20], [45, 20],
    [49, 22],
    [6, 16], [7, 16],
    [24, 12], [25, 11],
    [10, 34], [36, 36], [54, 34],
  ];
  for (const [x, y] of crateSpots) put(x, y, CRATE);

  const posts = [
    [50, 4], [58, 4], [50, 9], [58, 9], [50, 14], [58, 14],
    [18, 18], [40, 18],
  ];
  for (const [x, y] of posts) put(x, y, POST);

  const lanterns = [
    [6.5, 17.5], [12.5, 19.5], [19.5, 19.4], [26.5, 19.5],
    [34.5, 19.4], [42.5, 19.5], [48.5, 19.5],
    [54.5, 17.5], [54.5, 12.5], [54.5, 7.5], [54.5, 4.5],
    [8.5, 32.5], [22.5, 33.5], [37.5, 34.5], [53.5, 33.5],
    [25.5, 11.5], [5.5, 22.5], [66.5, 26.5],
  ];

  const sprites = [];
  for (const [x, y] of lanterns) sprites.push({ x, y, kind: "lantern" });

  const barrels = [
    [9.4, 20.3], [15.3, 24.6], [29.4, 21.2], [41.6, 24.4],
    [47.3, 21.5], [52.4, 16.4], [56.6, 10.2], [11.3, 33.4],
    [23.6, 12.4], [63.5, 24.6],
  ];
  for (const [x, y] of barrels) sprites.push({ x, y, kind: "barrel" });

  const bollards = [
    [21.5, 18.4], [28.5, 18.4], [36.5, 18.4], [51.3, 16.3],
    [57.4, 16.3], [51.3, 8.5], [57.4, 8.5],
  ];
  for (const [x, y] of bollards) sprites.push({ x, y, kind: "bollard" });

  const solid = (t) => t === WALL || t === CRATE || t === POST;
  const walkable = (t) => t === COBBLE || t === PIER;

  function blocked(x, y) {
    const tx = x | 0, ty = y | 0;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return !walkable(at(tx, ty));
  }

  const light = new Float32Array(W * H);
  for (const L of lanterns) {
    const lx = L[0] | 0, ly = L[1] | 0;
    for (let y = ly - 8; y <= ly + 8; y++) {
      for (let x = lx - 8; x <= lx + 8; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = x + 0.5 - L[0], dy = y + 0.5 - L[1];
        const d2 = dx * dx + dy * dy;
        light[y * W + x] += 1.35 / (1 + d2 * 0.22);
      }
    }
  }

  const start = { x: 7.5, y: 22.2, a: 0.02 };

  function pathLen() {
    const a = Math.hypot(50 - 7.5, 22.2 - 22.2);
    const b = Math.hypot(54.5 - 50, 5 - 22.2);
    return a + b;
  }

  return {
    W, H, COBBLE, WATER, PIER, WALL, CRATE, POST,
    map, at, solid, walkable, blocked, sprites, light, start,
    pathLen: pathLen(),
  };
})();
