const INPUT = (() => {
  const keys = Object.create(null);
  const pad = { n: false, s: false, w: false, e: false };
  let yaw = 0;
  let lookX = 0;
  let locked = false;
  let useEdge = false;
  const lookSens = 0.0022;
  const touchSens = 0.0042;

  const keyMap = {
    KeyW: "f", ArrowUp: "f",
    KeyS: "b", ArrowDown: "b",
    KeyA: "l",
    KeyD: "r",
    ArrowLeft: "tl",
    ArrowRight: "tr",
  };

  function onKey(e, down) {
    if (e.code === "KeyE" && down && !e.repeat) useEdge = true;
    const a = keyMap[e.code];
    if (!a) return;
    keys[a] = down;
    e.preventDefault();
  }

  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));

  function bindPad() {
    const root = document.getElementById("pad");
    if (!root) return;
    const held = new Map();
    const btnOf = (dir) => root.querySelector(`[data-dir="${dir}"]`);
    const refresh = (dir) => {
      let on = false;
      for (const d of held.values()) if (d === dir) on = true;
      pad[dir] = on;
      const el = btnOf(dir);
      if (el) el.classList.toggle("held", on);
    };
    const release = (e) => {
      const dir = held.get(e.pointerId);
      if (!dir) return;
      held.delete(e.pointerId);
      refresh(dir);
    };
    root.addEventListener("pointerdown", (e) => {
      const t = e.target.closest("button");
      const d = t && t.dataset.dir;
      if (!d) return;
      held.set(e.pointerId, d);
      refresh(d);
      try { t.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    root.addEventListener("pointerup", release);
    root.addEventListener("pointercancel", release);
  }

  function bindLook(canvas) {
    canvas.addEventListener("click", () => {
      if (canvas.requestPointerLock && !locked) canvas.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
      locked = document.pointerLockElement === canvas;
      canvas.classList.toggle("locked", locked);
    });
    document.addEventListener("mousemove", (e) => {
      if (!locked) return;
      yaw += e.movementX * lookSens;
    });
    document.addEventListener("pointerlockerror", () => { locked = false; });

    let drag = null;
    let tap = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("#pad")) return;
      tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      if (e.pointerType === "mouse") return;
      drag = { id: e.pointerId, x: e.clientX };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (tap && e.pointerId === tap.id) {
        if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 14) tap.moved = true;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      yaw += dx * touchSens;
    });
    const end = (e) => {
      if (tap && e.pointerId === tap.id) {
        const dt = performance.now() - tap.t;
        if (!tap.moved && dt < 380) useEdge = true;
        tap = null;
      }
      if (drag && e.pointerId === drag.id) drag = null;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function sample() {
    const f = (keys.f ? 1 : 0) + (pad.n ? 1 : 0);
    const b = (keys.b ? 1 : 0) + (pad.s ? 1 : 0);
    const l = (keys.l ? 1 : 0) + (pad.w ? 1 : 0);
    const r = (keys.r ? 1 : 0) + (pad.e ? 1 : 0);
    lookX = (keys.tr ? 1 : 0) - (keys.tl ? 1 : 0);
    return {
      fwd: Math.max(-1, Math.min(1, f - b)),
      strafe: Math.max(-1, Math.min(1, r - l)),
      lookX,
      yaw,
    };
  }

  function consumeUse() {
    const v = useEdge;
    useEdge = false;
    return v;
  }

  function setYaw(a) { yaw = a; }

  return { bindPad, bindLook, sample, setYaw, consumeUse, isLocked: () => locked };
})();
