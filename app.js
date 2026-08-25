(() => {
  const SPEED = 2.35;
  const TURN = 1.55;
  const RADIUS = 0.22;

  const player = {
    x: WORLD.start.x,
    y: WORLD.start.y,
    a: WORLD.start.a,
    moving: false,
    sitting: false,
    bobT: 0,
    bob: 0,
  };

  let found = 0;
  let reading = false;
  let ended = false;
  const els = {};

  INPUT.setYaw(player.a);

  function tryMove(nx, ny) {
    if (!WORLD.circleBlocked(nx, player.y, RADIUS)) player.x = nx;
    if (!WORLD.circleBlocked(player.x, ny, RADIUS)) player.y = ny;
  }

  function setPlace() {
    const name = WORLD.placeAt(player.x, player.y);
    if (els.place.textContent !== name) els.place.textContent = name;
  }

  function setFound() {
    els.found.textContent = found + " / 4";
  }

  function setPrompt(text) {
    if (!text) { els.prompt.hidden = true; els.prompt.textContent = ""; return; }
    els.prompt.hidden = false;
    els.prompt.textContent = text;
  }

  function showRead(text) {
    reading = true;
    els.readText.textContent = text;
    els.read.hidden = false;
  }

  function hideRead() {
    reading = false;
    els.read.hidden = true;
  }

  function take(s) {
    if (s.gone) return;
    if (s.text) showRead(s.text);
    s.gone = true;
    s.solid = false;
    found += 1;
    setFound();
    if (found >= 4 && !ended) {
      ended = true;
      AUDIO.bell();
      els.card.hidden = false;
    }
  }

  function light(s) {
    if (s.lit) return;
    s.lit = true;
    s.use = null;
    WORLD.addLight(s.x, s.y, 1.35);
  }

  function sit() {
    player.sitting = true;
    player.moving = false;
    AUDIO.foghorn();
  }

  function stand() {
    player.sitting = false;
    player.x = 54.5;
    player.y = 4.85;
    player.a = -1.2;
    INPUT.setYaw(player.a);
  }

  function doUse() {
    if (player.sitting) { stand(); return; }
    if (reading) { hideRead(); return; }
    const u = WORLD.nearestUse(player.x, player.y);
    if (!u) return;
    if (u.use === "take") take(u);
    else if (u.use === "read") showRead(u.text);
    else if (u.use === "light") light(u);
    else if (u.use === "sit") sit();
  }

  function updatePrompt() {
    if (player.sitting) { setPrompt("E \u00b7 stand"); return; }
    if (reading) { setPrompt("E \u00b7 close"); return; }
    const u = WORLD.nearestUse(player.x, player.y);
    setPrompt(u ? u.prompt : "");
  }

  function update(dt) {
    const s = INPUT.sample();
    if (INPUT.consumeUse()) doUse();

    if (player.sitting) {
      const bx = WORLD.boat.x, by = WORLD.boat.y - 0.12;
      const k = Math.min(1, dt * 2.4);
      player.x += (bx - player.x) * k;
      player.y += (by - player.y) * k;
      const want = -1.35;
      let da = want - player.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      player.a += da * Math.min(1, dt * 1.6);
      INPUT.setYaw(player.a);
      player.moving = false;
      player.bob *= 0.85;
    } else {
      player.a = s.yaw + s.lookX * TURN * dt;
      INPUT.setYaw(player.a);
      const ca = Math.cos(player.a), sa = Math.sin(player.a);
      let mx = ca * s.fwd + -sa * s.strafe;
      let my = sa * s.fwd + ca * s.strafe;
      const mag = Math.hypot(mx, my);
      if (mag > 1) { mx /= mag; my /= mag; }
      player.moving = mag > 0.01;
      if (player.moving) {
        tryMove(player.x + mx * SPEED * dt, player.y + my * SPEED * dt);
        player.bobT += dt * 9.2;
      } else {
        player.bobT *= 0.9;
      }
      const amp = player.moving ? 5.2 : 0;
      player.bob += ((Math.sin(player.bobT) * amp) - player.bob) * Math.min(1, dt * 12);
    }

    WORLD.updateCat(dt);
    setPlace();
    updatePrompt();
    AUDIO.foot(player.moving, dt);
    AUDIO.hum(WORLD.nearestLit(player.x, player.y));
    AUDIO.tick(dt);
  }

  function showHud() {
    els.hud.hidden = false;
    els.pad.hidden = false;
    els.look.hidden = false;
    setTimeout(() => els.hint.classList.add("fade"), 7000);
  }

  function boot() {
    els.hud = document.getElementById("hud");
    els.place = document.getElementById("place");
    els.found = document.getElementById("found");
    els.hint = document.getElementById("hint");
    els.pad = document.getElementById("pad");
    els.look = document.getElementById("look-hint");
    els.prompt = document.getElementById("prompt");
    els.read = document.getElementById("read");
    els.readText = document.getElementById("read-text");
    els.card = document.getElementById("card");
    setFound();
    setPlace();

    const canvas = document.getElementById("view");
    const gate = document.getElementById("gate");
    const enter = document.getElementById("enter");
    RENDER.init(canvas);
    INPUT.bindPad();
    INPUT.bindLook(canvas);

    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") AUDIO.toggleMute();
      if (e.code === "Escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (reading) hideRead();
      }
    });

    let last = 0, running = false;
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      RENDER.frame(player);
      requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      AUDIO.init();
      gate.classList.add("out");
      setTimeout(() => { gate.hidden = true; }, 720);
      showHud();
      last = performance.now();
      requestAnimationFrame(loop);
    }

    enter.addEventListener("click", start);
    window.addEventListener("keydown", (e) => {
      if (!running && (e.code === "Enter" || e.code === "Space")) start();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
