const INPUT = (() => {
  const keys = Object.create(null);
  const pad = { n: false, s: false, w: false, e: false };
  let yaw = 0;
  let lookX = 0;
  let locked = false;
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
    const set = (el, down) => {
      const d = el && el.dataset && el.dataset.dir;
      if (!d) return;
      pad[d] = down;
      el.classList.toggle("held", down);
    };
    const fromEvt = (e, down) => {
      const t = e.target.closest("button");
      set(t, down);
    };
    root.addEventListener("pointerdown", (e) => {
      fromEvt(e, true);
      e.preventDefault();
    });
    root.addEventListener("pointerup", (e) => fromEvt(e, false));
    root.addEventListener("pointercancel", (e) => fromEvt(e, false));
    root.addEventListener("pointerleave", (e) => fromEvt(e, false));
  }

  function bindLook(canvas) {
    canvas.addEventListener("click", () => {
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
      locked = document.pointerLockElement === canvas;
      canvas.classList.toggle("locked", locked);
    });
    document.addEventListener("mousemove", (e) => {
      if (!locked) return;
      yaw += e.movementX * lookSens;
    });

    let drag = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("#pad")) return;
      if (e.pointerType === "mouse" && locked) return;
      drag = { id: e.pointerId, x: e.clientX };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      yaw += dx * touchSens;
    });
    const end = (e) => {
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

  function setYaw(a) { yaw = a; }

  return { bindPad, bindLook, sample, setYaw, isLocked: () => locked };
})();
