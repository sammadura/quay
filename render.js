const RENDER = (() => {
  const VW = 640, VH = 360;
  const FOV = Math.PI / 3.05;
  const TEX = 64;
  let canvas, ctx, img, pix, zbuf;
  let texWall, texBrick, texCrate, texPost, texPier, texCobble, texWater, texWood;
  let t0 = 0;

  function mkTex(fn) {
    const a = new Uint32Array(TEX * TEX);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) a[y * TEX + x] = fn(x, y);
    return a;
  }
  const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;

  function hash(x, y) {
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function buildTextures() {
    texWall = mkTex((x, y) => {
      const plank = (x / 9) | 0;
      const n = hash(plank, (y / 4) | 0);
      const v = 28 + n * 18 + ((y % 8 === 0) ? -8 : 0);
      const warm = 6 + n * 8;
      return pack(v + warm, v + 2, v - 4);
    });
    texBrick = mkTex((x, y) => {
      const row = (y / 10) | 0;
      const ox = row % 2 ? 16 : 0;
      const bx = ((x + ox) / 16) | 0;
      const edge = (x + ox) % 16 === 0 || y % 10 === 0;
      if (edge) return pack(22, 20, 18);
      const n = hash(bx, row);
      const r = 42 + n * 22, g = 32 + n * 12, b = 24 + n * 8;
      const win = (row % 3 === 1 && (bx % 3 === 1) && y % 10 > 2 && y % 10 < 8 && (x + ox) % 16 > 4 && (x + ox) % 16 < 12);
      if (win) {
        const glow = 160 + hash(x, y) * 50;
        return pack(glow, glow * 0.72, glow * 0.28);
      }
      return pack(r, g, b);
    });
    texCrate = mkTex((x, y) => {
      const edge = x < 2 || y < 2 || x > 61 || y > 61 || Math.abs(x - y) < 2 || x % 16 === 0;
      const n = hash(x >> 2, y >> 2);
      const v = edge ? 38 : 62 + n * 28;
      return pack(v + 8, v - 4, v - 22);
    });
    texPost = mkTex((x, y) => {
      const n = hash(x, y >> 1);
      const v = 18 + n * 14 + (x > 20 && x < 44 ? 10 : 0);
      return pack(v + 6, v, v - 4);
    });
    texPier = mkTex((x, y) => {
      const plank = (y / 7) | 0;
      const n = hash(plank, x >> 3);
      const v = 48 + n * 22 + ((y % 7 === 0) ? -16 : 0);
      return pack(v + 10, v - 2, v - 18);
    });
    texCobble = mkTex((x, y) => {
      const cx = x / 8, cy = y / 6;
      const ix = cx | 0, iy = cy | 0;
      const fx = cx - ix, fy = cy - iy;
      const n = hash(ix, iy);
      const mortar = fx < 0.08 || fy < 0.1;
      if (mortar) return pack(18, 18, 20);
      const v = 36 + n * 20;
      return pack(v, v + 1, v + 4);
    });
    texWater = mkTex((x, y) => {
      const n = hash(x, y);
      return pack(8 + n * 6, 12 + n * 8, 18 + n * 10);
    });
    texWood = mkTex((x, y) => {
      const plank = (x / 11) | 0;
      const n = hash(plank, y >> 2);
      const v = 38 + n * 16 + ((x % 11 === 0) ? -12 : 0);
      return pack(v + 14, v - 2, v - 16);
    });
  }

  function resize() {
    canvas.width = VW;
    canvas.height = VH;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.imageSmoothingEnabled = true;
  }

  function sampleTex(tex, u, v, shade) {
    const x = (u * TEX) & (TEX - 1);
    const y = (v * TEX) & (TEX - 1);
    const p = tex[y * TEX + x];
    let r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255;
    r = (r * shade) >> 8;
    g = (g * shade) >> 8;
    b = (b * shade) >> 8;
    return pack(r, g, b);
  }

  function putPx(x, y, col) {
    if (y < 0 || y >= VH) return;
    const i = (y * VW + x) * 4;
    pix[i] = col & 255;
    pix[i + 1] = (col >> 8) & 255;
    pix[i + 2] = (col >> 16) & 255;
    pix[i + 3] = 255;
  }

  function fogShade(dist, base) {
    const f = Math.max(0, 1 - dist / 28);
    return (base * (0.12 + 0.88 * f * f)) | 0;
  }

  function tileTex(t) {
    if (t === WORLD.WALL) return texBrick;
    if (t === WORLD.CRATE) return texCrate;
    if (t === WORLD.POST) return texPost;
    return texWall;
  }

  function floorTex(t) {
    if (t === WORLD.PIER) return texPier;
    if (t === WORLD.WATER) return texWater;
    if (t === WORLD.WOOD) return texWood;
    return texCobble;
  }

  function drawSky(bob) {
    const mid = ((VH / 2) + bob) | 0;
    const end = Math.min(VH, mid + 8);
    for (let y = 0; y < end; y++) {
      const k = y / Math.max(1, mid);
      const r = (7 + k * 6) | 0;
      const g = (8 + k * 8) | 0;
      const b = (12 + k * 10) | 0;
      const col = pack(r, g, b);
      for (let x = 0; x < VW; x++) putPx(x, y, col);
    }
  }

  function castCol(px, py, yaw, col, bob) {
    const ang = yaw - FOV / 2 + FOV * (col / VW);
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    let mapX = px | 0, mapY = py | 0;
    const ddx = Math.abs(1 / (dirX || 1e-8));
    const ddy = Math.abs(1 / (dirY || 1e-8));
    let stepX, stepY, sideX, sideY;
    if (dirX < 0) { stepX = -1; sideX = (px - mapX) * ddx; }
    else { stepX = 1; sideX = (mapX + 1 - px) * ddx; }
    if (dirY < 0) { stepY = -1; sideY = (py - mapY) * ddy; }
    else { stepY = 1; sideY = (mapY + 1 - py) * ddy; }
    let hit = 0, side = 0, tile = 0;
    for (let i = 0; i < 64; i++) {
      if (sideX < sideY) { sideX += ddx; mapX += stepX; side = 0; }
      else { sideY += ddy; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= WORLD.W || mapY >= WORLD.H) { hit = 1; tile = WORLD.WALL; break; }
      tile = WORLD.at(mapX, mapY);
      if (WORLD.solid(tile)) { hit = 1; break; }
    }
    let dist;
    if (side === 0) dist = (mapX - px + (1 - stepX) / 2) / dirX;
    else dist = (mapY - py + (1 - stepY) / 2) / dirY;
    dist = Math.max(0.08, dist);
    const corr = dist * Math.cos(ang - yaw);
    zbuf[col] = corr;
    const lineH = (VH / corr) | 0;
    let y0 = ((VH - lineH) / 2 + bob) | 0;
    let y1 = ((VH + lineH) / 2 + bob) | 0;
    if (y0 < 0) y0 = 0;
    if (y1 >= VH) y1 = VH - 1;
    let wallX = side === 0 ? py + dist * dirY : px + dist * dirX;
    wallX -= Math.floor(wallX);
    const shade = fogShade(corr, side ? 170 : 230);
    const tex = tileTex(tile);
    if (hit) {
      const top = (VH - lineH) / 2 + bob;
      for (let y = y0; y <= y1; y++) {
        const v = (y - top) / lineH;
        putPx(col, y, sampleTex(tex, wallX, v, shade));
      }
    }
  }

  function drawFloor(px, py, yaw, time, bob) {
    const horizon = ((VH / 2) + bob) | 0;
    const dirX0 = Math.cos(yaw - FOV / 2), dirY0 = Math.sin(yaw - FOV / 2);
    const dirX1 = Math.cos(yaw + FOV / 2), dirY1 = Math.sin(yaw + FOV / 2);
    for (let y = horizon + 1; y < VH; y++) {
      const p = y - VH / 2 - bob;
      if (p < 0.5) continue;
      const row = VH / (2 * p);
      const stepX = row * (dirX1 - dirX0) / VW;
      const stepY = row * (dirY1 - dirY0) / VW;
      let wx = px + row * dirX0;
      let wy = py + row * dirY0;
      for (let x = 0; x < VW; x++, wx += stepX, wy += stepY) {
        const tx = wx | 0, ty = wy | 0;
        let t = WORLD.WATER;
        let lum = 0;
        if (tx >= 0 && ty >= 0 && tx < WORLD.W && ty < WORLD.H) {
          t = WORLD.at(tx, ty);
          lum = WORLD.light[ty * WORLD.W + tx];
        }
        const fx = wx - Math.floor(wx), fy = wy - Math.floor(wy);
        const floorT = (t === WORLD.WALL || t === WORLD.CRATE || t === WORLD.POST) ? WORLD.COBBLE : t;
        if (t === WORLD.WATER) {
          const w = 0.5 + 0.5 * Math.sin(wx * 2.1 + time * 1.8 + wy * 1.4);
          const gold = Math.min(1, lum);
          const r = (8 + w * 8 + gold * 90) | 0;
          const g = (12 + w * 10 + gold * 58) | 0;
          const b = (18 + w * 14 + gold * 12) | 0;
          const sh = fogShade(row, 255);
          putPx(x, y, pack((r * sh) >> 8, (g * sh) >> 8, (b * sh) >> 8));
          continue;
        }
        const tex = floorTex(floorT);
        const wet = t === WORLD.COBBLE ? 0.35 + 0.25 * Math.sin(wx * 5 + wy * 3) : 0;
        const base = sampleTex(tex, fx, fy, 255);
        let r = base & 255, g = (base >> 8) & 255, b = (base >> 16) & 255;
        const glow = Math.min(1.6, lum);
        r = Math.min(255, r * (0.16 + glow * 0.85) + glow * 70 * (0.4 + wet));
        g = Math.min(255, g * (0.16 + glow * 0.7) + glow * 42 * (0.3 + wet));
        b = Math.min(255, b * (0.18 + glow * 0.4) + glow * 8);
        if (wet > 0.45) { r = Math.min(255, r + 18); g = Math.min(255, g + 10); }
        const sh = fogShade(row, 255);
        putPx(x, y, pack((r * sh) >> 8, (g * sh) >> 8, (b * sh) >> 8));
      }
    }
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext("2d", { alpha: false });
    img = ctx.createImageData(VW, VH);
    pix = img.data;
    zbuf = new Float32Array(VW);
    buildTextures();
    resize();
    window.addEventListener("resize", resize);
    t0 = performance.now();
  }

  function frame(player) {
    const time = (performance.now() - t0) / 1000;
    const bob = player.bob || 0;
    const px = player.x, py = player.y, yaw = player.a;
    drawSky(bob);
    drawFloor(px, py, yaw, time, bob);
    for (let x = 0; x < VW; x++) castCol(px, py, yaw, x, bob);
    ctx.putImageData(img, 0, 0);
    FX.draw(ctx, player, time, bob, zbuf);
  }

  return { init, frame, VW, VH, FOV };
})();
