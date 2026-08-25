(() => {
  const SPEED = 2.35;
  const TURN = 1.55;
  const RADIUS = 0.22;

  const player = {
    x: WORLD.start.x,
    y: WORLD.start.y,
    a: WORLD.start.a,
    moving: false,
  };

  INPUT.setYaw(player.a);

  function tryMove(nx, ny) {
    if (!WORLD.blocked(nx, player.y) && !WORLD.blocked(nx + RADIUS, player.y) && !WORLD.blocked(nx - RADIUS, player.y)) {
      player.x = nx;
    }
    if (!WORLD.blocked(player.x, ny) && !WORLD.blocked(player.x, ny + RADIUS) && !WORLD.blocked(player.x, ny - RADIUS)) {
      player.y = ny;
    }
  }

  function update(dt) {
    const s = INPUT.sample();
    player.a = s.yaw + s.lookX * TURN * dt;
    INPUT.setYaw(player.a);
    const ca = Math.cos(player.a), sa = Math.sin(player.a);
    let mx = ca * s.fwd + -sa * s.strafe;
    let my = sa * s.fwd + ca * s.strafe;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    player.moving = mag > 0.01;
    if (player.moving) tryMove(player.x + mx * SPEED * dt, player.y + my * SPEED * dt);
  }

  function showHud() {
    const hud = document.getElementById("hud");
    const pad = document.getElementById("pad");
    const look = document.getElementById("look-hint");
    hud.hidden = false;
    pad.hidden = false;
    look.hidden = false;
    const hint = document.getElementById("hint");
    setTimeout(() => hint.classList.add("fade"), 7000);
  }

  function boot() {
    const canvas = document.getElementById("view");
    const gate = document.getElementById("gate");
    const enter = document.getElementById("enter");
    RENDER.init(canvas);
    INPUT.bindPad();
    INPUT.bindLook(canvas);

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
      gate.classList.add("out");
      setTimeout(() => { gate.hidden = true; }, 720);
      showHud();
      last = performance.now();
      requestAnimationFrame(loop);
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    }

    enter.addEventListener("click", start);
    window.addEventListener("keydown", (e) => {
      if (!running && (e.code === "Enter" || e.code === "Space")) start();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
