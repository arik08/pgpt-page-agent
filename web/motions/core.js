/* 모션 테마 공통부.
   위젯(agent.js)과 모션 고르기 페이지(motions.html)가 함께 쓴다.
   테마 하나 = 색 램프 + 방울을 그리는 법 + 불티·열기·닫기 모양.
   방울의 물리(눌림·기울기·출렁임)와 상태값(T, E)은 여기서 계산하고, 테마는 그 값을 받아 그리기만 한다.
   명세: docs/motion.md */
(function () {
  "use strict";
  var W = window, D = document;
  if (W.__pageAgentMotions) return;
  var TAU = Math.PI * 2;
  var SVGNS = "http://www.w3.org/2000/svg";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgb(c, a) {
    var s = Math.round(clamp(c[0], 0, 255)) + "," + Math.round(clamp(c[1], 0, 255)) + "," + Math.round(clamp(c[2], 0, 255));
    return a == null ? "rgb(" + s + ")" : "rgba(" + s + "," + clamp(+a, 0, 1).toFixed(3) + ")";
  }
  function rampAt(ramp, t) {
    t = clamp(t, 0, 1);
    for (var i = 1; i < ramp.length; i++) {
      if (t <= ramp[i][0]) {
        var a = ramp[i - 1], b = ramp[i], k = (t - a[0]) / (b[0] - a[0]);
        return [lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k)];
      }
    }
    return ramp[ramp.length - 1][1].slice();
  }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise1(x) { var i = Math.floor(x), f = x - i; f = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), f); }
  function noise2(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var n = ix + iy * 57;
    return lerp(lerp(hash(n), hash(n + 1), fx), lerp(hash(n + 57), hash(n + 58), fx), fy);
  }
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function sv(tag, attrs, kids) {
    var el = D.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  /* 패널 바탕색 네 가지. 테마의 색과 같은 쪽으로 아주 살짝 기운 어두운 무채색. */
  var TONES = {
    warm: { bg0: "#0e0c0b", bg: "#141210", bg2: "#1b1815", bg3: "#25211d", bg4: "#312b26", line: "rgba(238,226,214,.09)", line2: "rgba(238,226,214,.17)",
      text: "#eee7e0", text2: "#b5aba2", text3: "#958b82", hi: "#fff6ee", inkDark: [28, 13, 4], inkLight: [255, 248, 239], rgb: [238, 231, 224], bgRgb: [20, 18, 16] },
    cool: { bg0: "#0b0d10", bg: "#101317", bg2: "#161a1f", bg3: "#1f242b", bg4: "#2a3039", line: "rgba(214,226,238,.09)", line2: "rgba(214,226,238,.17)",
      text: "#e3e8ee", text2: "#a7b0bb", text3: "#86909c", hi: "#f3f8ff", inkDark: [5, 14, 26], inkLight: [243, 248, 255], rgb: [227, 232, 238], bgRgb: [16, 19, 23] },
    violet: { bg0: "#0d0b10", bg: "#131116", bg2: "#1a171e", bg3: "#242029", bg4: "#2f2a36", line: "rgba(228,220,238,.09)", line2: "rgba(228,220,238,.17)",
      text: "#e9e5ee", text2: "#b0a9ba", text3: "#8f879a", hi: "#faf5ff", inkDark: [18, 6, 28], inkLight: [250, 245, 255], rgb: [233, 229, 238], bgRgb: [19, 17, 22] },
    green: { bg0: "#0b0e0c", bg: "#101411", bg2: "#161b17", bg3: "#1f2520", bg4: "#2a312b", line: "rgba(220,236,224,.09)", line2: "rgba(220,236,224,.17)",
      text: "#e4e9e4", text2: "#a8b2aa", text3: "#869188", hi: "#f4fff6", inkDark: [5, 18, 8], inkLight: [244, 255, 246], rgb: [228, 233, 228], bgRgb: [16, 20, 17] }
  };

  /* 상태마다의 목표값. T = 세기(색·밝기), E = 에너지(움직임의 빠르기·크기). 모든 테마가 같은 값을 받는다. */
  var PHASES = {
    idle: { T: 0.19, E: 0.14 },
    listening: { T: 0.28, E: 0.3 },
    reading: { T: 0.46, E: 0.5 },
    thinking: { T: 0.62, E: 0.78 },
    searching: { T: 0.72, E: 0.95 },
    answering: { T: 0.86, E: 0.6 },
    error: { T: 0.0, E: 0.3 }
  };
  var PHASE_NAMES = Object.keys(PHASES);

  var REG = {}, ORDER = [];
  function register(def) {
    if (REG[def.id]) return;
    def.rates = def.rates || { up: 2.6, down: 0.42, quench: 9 };
    REG[def.id] = def; ORDER.push(def.id);
  }
  function get(id) { return REG[id] || REG[ORDER[0]]; }
  function has(id) { return !!REG[id]; }

  function springStep(x, v, target, k, c, dt) {
    var a = -k * (x - target) - c * v;
    v += a * dt;
    return [x + v * dt, v];
  }

  /* 캔버스로 그리는 테마용 도화지. 좌표는 언제나 120×120(가운데 60,60), 실제 픽셀은 box×배율. */
  function makeCanvas(mount, box) {
    var cv = D.createElement("canvas");
    cv.setAttribute("class", "blob");
    cv.setAttribute("aria-hidden", "true");
    var dpr = Math.min(W.devicePixelRatio || 1, 2), px = Math.round(box * dpr);
    cv.width = px; cv.height = px;
    mount.insertBefore(cv, mount.firstChild);
    var g = cv.getContext("2d"), k = px / 120;
    var c = {
      cv: cv, g: g, px: px, k: k,
      begin: function () {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.shadowBlur = 0; g.shadowColor = "transparent";
        g.clearRect(0, 0, px, px);
        g.setTransform(k, 0, 0, k, 0, 0);
        g.lineCap = "round"; g.lineJoin = "round";
      },
      /* 몸통 변환: 기울기·떨림·눌림을 적용하고 원점을 방울 가운데로 옮긴다. */
      body: function (P, breath) {
        var b = breath == null ? 1 : breath;
        g.translate(60 + P.lx + P.shake * Math.sin(P.t * 55), 60 + P.ly);
        g.scale(P.sx * b, P.sy * b);
      },
      /* 바닥 그림자 (원점이 방울 가운데일 때) */
      shadow: function (alpha, y, rx) {
        g.save();
        g.translate(1, y == null ? 28 : y); g.scale(1, 0.24);
        var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx || 22);
        gr.addColorStop(0, "rgba(0,0,0," + alpha.toFixed(3) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx || 22, 0, TAU); g.fill();
        g.restore();
      },
      /* 어두운 유리알: 선·점으로 된 테마가 밝은 페이지 위에서도 보이게 받쳐 준다. */
      lens: function (r, inner, outer, alpha) {
        var gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        gr.addColorStop(0, rgb(inner, alpha)); gr.addColorStop(1, rgb(outer, alpha));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      },
      /* 유리 테두리와 반사광 */
      glass: function (r, alpha) {
        g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255," + (0.16 * alpha).toFixed(3) + ")";
        g.beginPath(); g.arc(0, 0, r - 0.5, 0, TAU); g.stroke();
        g.lineWidth = 1.6; g.strokeStyle = "rgba(255,255,255," + (0.34 * alpha).toFixed(3) + ")";
        g.beginPath(); g.arc(0, 0, r - 3.2, Math.PI * 1.12, Math.PI * 1.42); g.stroke();
        g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255," + (0.14 * alpha).toFixed(3) + ")";
        g.beginPath(); g.arc(0, 0, r - 3, Math.PI * 0.14, Math.PI * 0.36); g.stroke();
      },
      remove: function () { if (cv.parentNode) cv.parentNode.removeChild(cv); }
    };
    return c;
  }

  var seq = 0;
  function createOrb(mount, id, opts) {
    opts = opts || {};
    var P = {
      phase: "idle", T: 0.19, E: 0.14, impulse: 0, since: 0,
      sx: 1, sy: 1, vsx: 0, vsy: 0, lx: 0, ly: 0, vlx: 0, vly: 0, tlx: 0, tly: 0,
      slx: 0, sly: 0, vslx: 0, vsly: 0,
      shake: 0, hover: false, pressed: false, unread: false, t: 0, w: {}
    };
    PHASE_NAMES.forEach(function (n) { P.w[n] = n === "idle" ? 1 : 0; });
    var orb = { P: P, theme: null, view: null, reduced: !!opts.reduced, box: opts.box || 120 };
    var uid = "pam" + (++seq) + Math.random().toString(36).slice(2, 6), wasPressed = false;

    orb.heat = function (t) { return rampAt(orb.theme.ramp, t); };
    orb.setTheme = function (tid) {
      if (orb.view && orb.view.destroy) orb.view.destroy();
      orb.theme = get(tid);
      orb.view = orb.theme.build({
        mount: mount, P: P, reduced: orb.reduced, box: orb.box, uid: uid + "-" + orb.theme.id,
        heat: orb.heat, col: function (t, a) { return rgb(orb.heat(t), a); },
        canvas: function () { return makeCanvas(mount, orb.box); }
      });
    };
    orb.emit = function (name, a, b) { if (orb.view && orb.view.on) orb.view.on(name, a, b); };
    orb.setPhase = function (ph) {
      if (P.phase === ph || !PHASES[ph]) return;
      var prev = P.phase;
      P.phase = ph; P.since = 0;
      if (ph === "error") P.shake = 5;
      if (ph === "searching" && !orb.reduced) { P.vsx -= 1.6; P.vsy += 1.2; }
      orb.emit("phase", ph, prev);
    };
    orb.kick = function (amt, sq) {
      P.impulse = Math.min(0.32, P.impulse + (amt || 0));
      if (sq && !orb.reduced) { P.vsx += sq; P.vsy -= sq; }
      orb.emit("kick", amt || 0, sq || 0);
    };
    orb.step = function (dt) {
      P.t += dt; P.since += dt;
      var base = PHASES[P.phase] || PHASES.idle, rates = orb.theme.rates;
      var target = base.T, energy = base.E;
      if (P.phase === "idle" && P.unread) target = 0.3;
      if (P.phase === "idle" || P.phase === "listening") target += 0.032 * Math.sin(P.t * TAU / 6);
      else if (P.phase !== "error") target += 0.012 * Math.sin(P.t * TAU / 2.2);
      if (P.hover && P.phase !== "error") target = Math.max(target, 0.32);
      if (P.pressed) target = Math.max(target, 0.4);
      target += P.impulse;
      P.impulse *= Math.exp(-dt * 2.1);
      var rate = target > P.T ? rates.up : (P.phase === "error" ? rates.quench : rates.down);
      P.T += (target - P.T) * (1 - Math.exp(-rate * dt));
      if (orb.reduced) energy = 0.05;
      P.E += (energy - P.E) * (1 - Math.exp(-3 * dt));
      var wk = 1 - Math.exp(-5.5 * dt);
      for (var i = 0; i < PHASE_NAMES.length; i++) {
        var n = PHASE_NAMES[i];
        P.w[n] += ((P.phase === n ? 1 : 0) - P.w[n]) * wk;
      }
      // 스프링: 눌림(표면장력), 기울기(관성), 출렁임(점성)
      var sub = dt > 1 / 50 ? 2 : 1, h2 = dt / sub;
      for (var s = 0; s < sub; s++) {
        var r1 = springStep(P.sx, P.vsx, P.pressed ? 1.1 : (P.hover ? 1.045 : 1), 430, 15, h2); P.sx = r1[0]; P.vsx = r1[1];
        var r2 = springStep(P.sy, P.vsy, P.pressed ? 0.88 : (P.hover ? 1.045 : 1), 430, 15, h2); P.sy = r2[0]; P.vsy = r2[1];
        var r3 = springStep(P.lx, P.vlx, P.tlx, 120, 18, h2); P.lx = r3[0]; P.vlx = r3[1];
        var r4 = springStep(P.ly, P.vly, P.tly, 120, 18, h2); P.ly = r4[0]; P.vly = r4[1];
        var r5 = springStep(P.slx, P.vslx, 0, 70, 5.5, h2); P.slx = r5[0]; P.vslx = r5[1];
        var r6 = springStep(P.sly, P.vsly, 0, 70, 5.5, h2); P.sly = r6[0]; P.vsly = r6[1];
      }
      P.slx = clamp(P.slx, -9, 9); P.sly = clamp(P.sly, -9, 9);
      P.shake *= Math.exp(-dt * 5);
      if (P.pressed !== wasPressed) { wasPressed = P.pressed; orb.emit(P.pressed ? "press" : "release"); }
    };
    orb.draw = function (dt) { orb.view.draw(P, orb.reduced ? dt * 0.2 : dt); };
    /* 가만히 있어 다시 그릴 필요가 적은가 (대기 중 프레임을 줄이는 데 쓴다) */
    orb.calm = function () {
      return P.phase === "idle" && !P.hover && !P.pressed && Math.abs(P.vsx) + Math.abs(P.vsy) + Math.abs(P.vsly) < 0.05 && P.impulse < 0.01;
    };
    orb.destroy = function () { if (orb.view && orb.view.destroy) orb.view.destroy(); orb.view = null; };
    orb.setTheme(id);
    return orb;
  }

  W.__pageAgentMotions = {
    register: register, get: get, has: has, list: function () { return ORDER.map(function (i) { return REG[i]; }); },
    createOrb: createOrb, PHASES: PHASES, TONES: TONES,
    util: { clamp: clamp, lerp: lerp, smooth: smooth, mix: mix, rgb: rgb, rampAt: rampAt, hash: hash, noise1: noise1, noise2: noise2,
      lum: lum, contrast: contrast, sv: sv, TAU: TAU }
  };
})();
