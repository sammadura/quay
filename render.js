const RENDER = (() => {
  const VW = 640, VH = 360;
  const FOV = Math.PI / 3.05;
  const TEX = 64;
  let canvas, ctx, img, pix, zbuf;
  let texWall, texBrick, texCrate, texPost, texPier, texCobble, texWater;
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
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VW;
    canvas.height = VH;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.imageSmoothingEnabled = true;
    void dpr;
  }

  function sampleTex(tex, u, v, shade) {
    let x = (u * TEX) & (TEX - 1);
    let y = (v * TEX) & (TEX - 1);
    const p = tex[y * TEX + x];
    let r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255;
    r = (r * shade) >> 8;
    g = (g * shade) >> 8;
    b = (b * shade) >> 8;
    return pack(r, g, b);
  }

  function putPx(x, y, col) {
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
    return texCobble;
  }

  function castCol(px, py, yaw, col) {
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
    let y0 = ((VH - lineH) / 2) | 0;
    let y1 = ((VH + lineH) / 2) | 0;
    if (y0 < 0) y0 = 0;
    if (y1 >= VH) y1 = VH - 1;
    let wallX = side === 0 ? py + dist * dirY : px + dist * dirX;
    wallX -= Math.floor(wallX);
    const shade = fogShade(corr, side ? 170 : 230);
    const tex = tileTex(tile);
    if (hit) {
      for (let y = y0; y <= y1; y++) {
        const v = (y - ((VH - lineH) / 2)) / lineH;
        putPx(col, y, sampleTex(tex, wallX, v, shade));
      }
    }
    return { dirX, dirY, corr, y1, ang };
  }

  function drawSky() {
    for (let y = 0; y < VH / 2; y++) {
      const k = y / (VH / 2);
      const r = (7 + k * 6) | 0;
      const g = (8 + k * 8) | 0;
      const b = (12 + k * 10) | 0;
      const col = pack(r, g, b);
      for (let x = 0; x < VW; x++) putPx(x, y, col);
    }
  }

  function drawFloor(px, py, yaw, time) {
    const horizon = (VH / 2) | 0;
    const dirX0 = Math.cos(yaw - FOV / 2), dirY0 = Math.sin(yaw - FOV / 2);
    const dirX1 = Math.cos(yaw + FOV / 2), dirY1 = Math.sin(yaw + FOV / 2);
    for (let y = horizon + 1; y < VH; y++) {
      const p = y - VH / 2;
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
        let tex = floorTex(t === WORLD.WALL || t === WORLD.CRATE || t === WORLD.POST ? WORLD.COBBLE : t);
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
        const wet = t === WORLD.COBBLE ? 0.35 + 0.25 * Math.sin(wx * 5 + wy * 3) : 0;
        const base = sampleTex(tex, fx, fy, 255);
        let r = base & 255, g = (base >> 8) & 255, b = (base >> 16) & 255;
        const glow = Math.min(1.6, lum);
        r = Math.min(255, r * (0.16 + glow * 0.85) + glow * 70 * (0.4 + wet));
        g = Math.min(255, g * (0.16 + glow * 0.7) + glow * 42 * (0.3 + wet));
        b = Math.min(255, b * (0.18 + glow * 0.4) + glow * 8);
        if (wet > 0.45) {
          r = Math.min(255, r + 18);
          g = Math.min(255, g + 10);
        }
        const sh = fogShade(row, 255);
        putPx(x, y, pack((r * sh) >> 8, (g * sh) >> 8, (b * sh) >> 8));
      }
    }
  }

  function projectSprite(px, py, yaw, s) {
    const dx = s.x - px, dy = s.y - py;
    const ca = Math.cos(-yaw), sa = Math.sin(-yaw);
    const rx = dx * ca - dy * sa;
    const ry = dx * sa + dy * ca;
    if (ry <= 0.12) return null;
    const screenX = (VW / 2) * (1 + rx / (ry * Math.tan(FOV / 2)));
    const h = VH / ry;
    return { sx: screenX, h, ry, kind: s.kind };
  }

  function drawSprites(px, py, yaw) {
    const list = WORLD.sprites.map((s) => {
      const p = projectSprite(px, py, yaw, s);
      return p ? Object.assign({ x: s.x, y: s.y }, p) : null;
    }).filter(Boolean).sort((a, b) => b.ry - a.ry);

    ctx.save();
    for (const s of list) {
      const w = s.kind === "lantern" ? s.h * 0.28 : s.h * 0.22;
      const left = s.sx - w / 2;
      const top = VH / 2 - s.h * (s.kind === "bollard" ? 0.18 : 0.42);
      const col = Math.round(s.sx);
      if (col < 0 || col >= VW) continue;
      if (s.ry > zbuf[Math.max(0, Math.min(VW - 1, col))] + 0.15) continue;
      if (s.kind === "lantern") {
        const g = ctx.createRadialGradient(s.sx, top + s.h * 0.12, 1, s.sx, top + s.h * 0.12, s.h * 0.55);
        g.addColorStop(0, "rgba(255,220,120,0.95)");
        g.addColorStop(0.35, "rgba(228,180,74,0.45)");
        g.addColorStop(1, "rgba(228,180,74,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.sx, top + s.h * 0.12, s.h * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#2a2214";
        ctx.fillRect(s.sx - 1.2, top + s.h * 0.18, 2.4, s.h * 0.38);
      } else if (s.kind === "barrel") {
        ctx.fillStyle = "#3a2a18";
        ctx.beginPath();
        ctx.ellipse(s.sx, top + s.h * 0.42, w * 0.42, s.h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3420";
        ctx.fillRect(s.sx - w * 0.38, top + s.h * 0.22, w * 0.76, s.h * 0.22);
      } else {
        ctx.fillStyle = "#1a1814";
        ctx.fillRect(s.sx - 1.4, top, 2.8, s.h * 0.28);
      }
    }
    ctx.restore();
  }

  function drawBloom(px, py, yaw) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of WORLD.sprites) {
      if (s.kind !== "lantern") continue;
      const p = projectSprite(px, py, yaw, s);
      if (!p || p.ry > 18) continue;
      const a = Math.max(0, 0.22 - p.ry * 0.01);
      const rad = 40 + 180 / p.ry;
      const g = ctx.createRadialGradient(p.sx, VH / 2 - 20, 0, p.sx, VH / 2 - 20, rad);
      g.addColorStop(0, `rgba(255,210,110,${a})`);
      g.addColorStop(1, "rgba(228,180,74,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.sx - rad, VH / 2 - 20 - rad, rad * 2, rad * 2);
    }
    ctx.restore();
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
    const bob = player.moving ? Math.sin(time * 9) * 0.012 : 0;
    const px = player.x, py = player.y, yaw = player.a;
    drawSky();
    drawFloor(px, py + bob * 0, yaw, time);
    for (let x = 0; x < VW; x++) castCol(px, py, yaw, x);
    ctx.putImageData(img, 0, 0);
    drawSprites(px, py, yaw);
    drawBloom(px, py, yaw);
    void bob;
  }

  return { init, frame, canvas: () => canvas };
})();
