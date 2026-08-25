const FX = (() => {
  const VW = 640, VH = 360;
  const FOV = Math.PI / 3.05;

  function project(px, py, yaw, s, bob) {
    const dx = s.x - px, dy = s.y - py;
    const ca = Math.cos(-yaw), sa = Math.sin(-yaw);
    const rx = dx * ca - dy * sa;
    const ry = dx * sa + dy * ca;
    if (ry <= 0.12) return null;
    const sx = (VW / 2) * (1 + rx / (ry * Math.tan(FOV / 2)));
    const h = VH / ry;
    return { sx, h, ry, bob };
  }

  function visible(zbuf, sx, ry) {
    const col = Math.round(sx);
    if (col < 0 || col >= VW) return false;
    return ry <= zbuf[col] + 0.18;
  }

  function glow(ctx, x, y, rad, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
    g.addColorStop(0, `rgba(255,220,120,${a})`);
    g.addColorStop(0.4, `rgba(228,180,74,${a * 0.45})`);
    g.addColorStop(1, "rgba(228,180,74,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOne(ctx, s, p) {
    const k = s.kind;
    const h = k === "boat" ? Math.max(p.h, 22) : p.h;
    const bob = p.bob || 0;
    let w = h * 0.22;
    let lift = 0.42;
    if (k === "lantern" || k === "desklamp" || k === "warm") { w = h * 0.28; lift = 0.44; }
    if (k === "bollard") lift = 0.18;
    if (k === "boat") { w = h * 0.72; lift = 0.12; }
    if (k === "net") { w = h * 0.38; lift = 0.62; }
    if (k === "cat") { w = h * 0.2; lift = 0.1; }
    if (k === "door") { w = h * 0.42; lift = 0.5; }
    if (k === "desk") { w = h * 0.5; lift = 0.22; }
    const top = VH / 2 - h * lift + bob;
    const cx = p.sx;

    if (k === "lantern") {
      if (s.lit) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, cx, top + h * 0.12, h * 0.55, 0.9);
        ctx.restore();
      }
      ctx.fillStyle = s.lit ? "#2a2214" : "#161410";
      ctx.fillRect(cx - 1.2, top + h * 0.16, 2.4, h * 0.4);
      if (!s.lit) {
        ctx.fillStyle = "#3a3428";
        ctx.fillRect(cx - 3, top + h * 0.08, 6, 5);
      }
      return;
    }
    if (k === "desklamp" || k === "warm") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, cx, top + h * 0.1, h * (k === "warm" ? 0.7 : 0.4), k === "warm" ? 0.7 : 0.85);
      ctx.restore();
      ctx.fillStyle = "#2c2416";
      ctx.fillRect(cx - 1, top + h * 0.14, 2, h * 0.18);
      return;
    }
    if (k === "barrel") {
      ctx.fillStyle = "#3a2a18";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.42, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3420";
      ctx.fillRect(cx - w * 0.38, top + h * 0.22, w * 0.76, h * 0.22);
      ctx.strokeStyle = "#2a1c10";
      ctx.strokeRect(cx - w * 0.38, top + h * 0.22, w * 0.76, h * 0.22);
      return;
    }
    if (k === "bollard") {
      ctx.fillStyle = "#1a1814";
      ctx.fillRect(cx - 1.6, top, 3.2, h * 0.3);
      ctx.fillStyle = "#2a261c";
      ctx.fillRect(cx - 2.2, top - 2, 4.4, 3);
      return;
    }
    if (k === "door") {
      ctx.fillStyle = "#3a2a18";
      ctx.fillRect(cx - w * 0.4, top, 4, h * 0.72);
      ctx.fillRect(cx + w * 0.4 - 4, top, 4, h * 0.72);
      ctx.fillRect(cx - w * 0.4, top, w * 0.8, 5);
      ctx.fillStyle = "#c9a24a";
      ctx.fillRect(cx - 6, top + 6, 12, 3);
      return;
    }
    if (k === "desk") {
      ctx.fillStyle = "#4a3218";
      ctx.fillRect(cx - w * 0.46, top + h * 0.12, w * 0.92, h * 0.16);
      ctx.fillStyle = "#2e2010";
      ctx.fillRect(cx - w * 0.42, top + h * 0.28, 4, h * 0.16);
      ctx.fillRect(cx + w * 0.32, top + h * 0.28, 4, h * 0.16);
      return;
    }
    if (k === "stool") {
      ctx.fillStyle = "#5a3c1c";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.16, w * 0.28, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a1c10";
      ctx.fillRect(cx - 1.2, top + h * 0.16, 2.4, h * 0.2);
      return;
    }
    if (k === "book" || k === "note" || k === "letter") {
      ctx.fillStyle = k === "letter" ? "#d8c9a0" : k === "note" ? "#c4b48a" : "#6a3a22";
      ctx.save();
      ctx.translate(cx, top + h * 0.2);
      ctx.rotate(-0.15);
      ctx.fillRect(-w * 0.22, 0, w * 0.44, h * 0.16);
      ctx.restore();
      if (k === "book") {
        ctx.fillStyle = "#d2c4a0";
        ctx.fillRect(cx - w * 0.16, top + h * 0.22, w * 0.3, 2);
      }
      return;
    }
    if (k === "net") {
      ctx.strokeStyle = "rgba(70,86,58,0.75)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const x = cx - w * 0.35 + i * w * 0.18;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x - 4, top + h * 0.7);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.4, top + h * 0.22);
      ctx.lineTo(cx + w * 0.35, top + h * 0.3);
      ctx.stroke();
      return;
    }
    if (k === "coin") {
      ctx.fillStyle = "#e4b44a";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.22, w * 0.22, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0d48a";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.2, w * 0.12, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (k === "glove") {
      ctx.fillStyle = "#6a3e24";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.22, w * 0.26, h * 0.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + w * 0.08, top + h * 0.12, w * 0.1, h * 0.12);
      return;
    }
    if (k === "key") {
      ctx.strokeStyle = "#e4b44a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx - w * 0.1, top + h * 0.16, w * 0.1, 0, Math.PI * 2);
      ctx.moveTo(cx, top + h * 0.16);
      ctx.lineTo(cx + w * 0.22, top + h * 0.16);
      ctx.lineTo(cx + w * 0.22, top + h * 0.22);
      ctx.stroke();
      return;
    }
    if (k === "boat") {
      ctx.fillStyle = "#2a1c12";
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.48, top + h * 0.16);
      ctx.lineTo(cx + w * 0.48, top + h * 0.16);
      ctx.lineTo(cx + w * 0.3, top + h * 0.32);
      ctx.lineTo(cx - w * 0.34, top + h * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#4a3420";
      ctx.stroke();
      ctx.fillStyle = "#1a140e";
      ctx.fillRect(cx - 1, top - h * 0.08, 2, h * 0.26);
      ctx.fillStyle = "#3a2a18";
      ctx.beginPath();
      ctx.moveTo(cx + 1, top - h * 0.06);
      ctx.lineTo(cx + w * 0.22, top + h * 0.08);
      ctx.lineTo(cx + 1, top + h * 0.08);
      ctx.fill();
      return;
    }
    if (k === "cat") {
      ctx.fillStyle = "#12100e";
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.16, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + w * 0.22, top + h * 0.1, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - w * 0.28, top + h * 0.14, 2, h * 0.08);
      return;
    }
  }

  function drawSprites(ctx, player, bob, zbuf) {
    const list = [];
    for (const s of WORLD.sprites) {
      if (s.gone) continue;
      const p = project(player.x, player.y, player.a, s, bob);
      if (!p) continue;
      list.push({ s, p });
    }
    list.sort((a, b) => b.p.ry - a.p.ry);
    for (const it of list) {
      if (!visible(zbuf, it.p.sx, it.p.ry)) continue;
      drawOne(ctx, it.s, it.p);
    }
  }

  function drawBloom(ctx, player, bob) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of WORLD.sprites) {
      if (s.gone) continue;
      const lit = (s.kind === "lantern" && s.lit) || s.kind === "desklamp" || s.kind === "warm";
      if (!lit) continue;
      const p = project(player.x, player.y, player.a, s, bob);
      if (!p || p.ry > 18) continue;
      const a = Math.max(0, 0.2 - p.ry * 0.009);
      const rad = 40 + 180 / p.ry;
      const g = ctx.createRadialGradient(p.sx, VH / 2 - 20 + bob, 0, p.sx, VH / 2 - 20 + bob, rad);
      g.addColorStop(0, `rgba(255,210,110,${a})`);
      g.addColorStop(1, "rgba(228,180,74,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.sx - rad, VH / 2 - 20 + bob - rad, rad * 2, rad * 2);
    }
    ctx.restore();
  }

  function drawRain(ctx, time) {
    ctx.save();
    ctx.strokeStyle = "rgba(190,200,214,0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const x = ((time * 110 + i * 51) % (VW + 50)) - 16;
      const y = ((time * 260 + i * 79) % (VH + 50)) - 24;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx, player, time, bob, zbuf) {
    drawSprites(ctx, player, bob, zbuf);
    drawBloom(ctx, player, bob);
    drawRain(ctx, time);
  }

  return { draw };
})();
