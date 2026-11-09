/* 2~10번 모션. 모두 캔버스에 그린다 (좌표 120×120, 원점은 방울 가운데).
   공통 물리값을 받는다: T 세기, E 에너지, w 상태별 가중치(0~1), lx/ly 커서 쪽 기울기, impulse 순간 자극, pressed/hover. */
(function () {
  "use strict";
  var M = window.__pageAgentMotions;
  if (!M) return;
  var U = M.util, clamp = U.clamp, lerp = U.lerp, smooth = U.smooth, rgb = U.rgb, mix = U.mix, noise1 = U.noise1, TAU = U.TAU;
  var sin = Math.sin, cos = Math.cos, PI = Math.PI;

  function canvasTheme(def, make) {
    def.build = function (env) {
      var c = env.canvas(), S = { t: 0 }, paint = make(env, c, S);
      return { draw: function (P, dt) { S.t += dt; c.begin(); c.g.save(); paint(P, dt); c.g.restore(); }, destroy: c.remove };
    };
    M.register(def);
  }
  function halo(g, env, T, r) {
    var hg = g.createRadialGradient(0, 0, 8, 0, 0, r);
    hg.addColorStop(0, env.col(T + 0.1, 0.1 + 0.36 * T)); hg.addColorStop(1, env.col(T + 0.1, 0));
    g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  }
  function lean(P) { return { a: Math.atan2(P.ly, P.lx), m: Math.min(1, Math.hypot(P.lx, P.ly) / 3.5) }; }

  /* ---------------------------------------------------------------- 2. 자성 유체 */
  canvasTheme({
    id: "ferro", name: "자성 유체", rule: "자기장이 곧 상태다", tone: "green",
    concept: "검은 액체가 자석에 반응해 가시를 세운다. 일이 많을수록 가시가 길고 날카로워지고, 커서(자석) 쪽으로 쏠린다.",
    moves: "대기: 매끈한 검은 구슬이 숨쉼 · 생각: 가시가 돋아 천천히 돎 · 검색: 가시가 파도치며 길게 뻗음 · 답변: 글자마다 가시가 움찔 · 오류: 가시가 스르르 가라앉음 · 누름: 가시가 움츠렸다 튀어나옴",
    ramp: [[0, [58, 62, 56]], [0.15, [52, 70, 20]], [0.3, [96, 128, 22]], [0.45, [140, 178, 30]], [0.6, [176, 214, 44]], [0.75, [204, 236, 84]], [0.9, [226, 246, 150]], [1, [246, 255, 224]]],
    rates: { up: 5, down: 1.6, quench: 8 },
    fx: { kind: "drop", all: true, life: 0.95, error: "burst" },
    reveal: { kind: "poly", open: 520, close: 300, rim: 0.6, edge: function (a, q) { return 0.2 * sin(PI * q) * Math.pow(Math.abs(cos(7 * a + q * 3)), 4); } },
    melt: { y: 0, sx: 0.9, sy: 0.9, blur: 3 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g; S.rot = 0;
    return function (P, dt) {
      var T = P.T, E = P.E, L = lean(P);
      S.rot += dt * (0.1 + 0.9 * E);
      c.body(P, 1 + 0.02 * sin(P.t * TAU / 6));
      c.shadow(0.3);
      halo(g, env, T, 34 + 14 * T);
      var amp = (0.7 + 9 * E + P.impulse * 22) * smooth(0.04, 0.2, T) * (P.pressed ? 0.25 : 1), sh = 1.2 + 2 * E, ws = P.w.searching;
      g.beginPath();
      for (var i = 0; i <= 200; i++) {
        var th = i / 200 * TAU, ph = 11 * (th - S.rot);
        var s = Math.pow(0.5 + 0.5 * cos(ph), sh) + 0.4 * Math.pow(0.5 + 0.5 * cos(ph + PI), 3);
        var r = 23 + 0.6 * sin(S.t * 1.05) + amp * s * (1 + 0.9 * L.m * cos(th - L.a)) * (1 + 0.5 * ws * sin(th * 2 - S.t * 6));
        if (i) g.lineTo(cos(th) * r, sin(th) * r); else g.moveTo(cos(th) * r, sin(th) * r);
      }
      g.closePath();
      var bg = g.createRadialGradient(-8, -9, 2, 0, 0, 30);
      bg.addColorStop(0, "#343a35"); bg.addColorStop(0.5, "#111412"); bg.addColorStop(1, "#040504");
      g.fillStyle = bg; g.fill();
      g.strokeStyle = env.col(T + 0.25, 0.5 + 0.4 * T); g.lineWidth = 1.1; g.stroke();
      g.fillStyle = "rgba(255,255,255,.26)";
      g.beginPath(); g.ellipse(-8 - P.lx * 0.6, -10 - P.ly * 0.6, 6, 3.2, -0.6, 0, TAU); g.fill();
    };
  });

  /* ---------------------------------------------------------------- 3. 수은 */
  canvasTheme({
    id: "mercury", name: "수은", rule: "뭉침과 갈라짐이 곧 상태다", tone: "cool",
    concept: "거울 같은 액체 금속. 일을 시작하면 작은 구슬들이 떨어져 나와 돌고, 끝나면 다시 한 덩이로 합쳐진다.",
    moves: "대기: 한 덩이가 느리게 일렁임 · 생각: 구슬이 갈라져 나와 주위를 돎 · 검색: 구슬이 멀리 빠르게 돎 · 답변: 다시 뭉치며 표면에 잔물결 · 오류: 여러 알로 흩어져 떪 · 누름: 납작해졌다 출렁",
    ramp: [[0, [66, 70, 76]], [0.2, [98, 106, 116]], [0.4, [134, 144, 156]], [0.6, [172, 182, 194]], [0.8, [208, 216, 226]], [1, [244, 248, 252]]],
    rates: { up: 3, down: 1.2, quench: 8 },
    fx: { kind: "bead", life: 0.8, error: "burst" },
    reveal: { kind: "poly", open: 600, close: 320, rim: 0.5, edge: function (a, q, t) { return (1 - q) * (0.09 * sin(3 * a + t * 5) + 0.05 * sin(5 * a - t * 7)); } },
    melt: { y: 22, sx: 1.04, sy: 0.8, blur: 4 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g, N = 80, buf = document.createElement("canvas");
    buf.width = buf.height = N;
    var bx = buf.getContext("2d"), img = bx.createImageData(N, N), d = img.data, sc = 120 / N;
    S.a = [0, 1.3, 2.6, 3.9, 5.2];
    return function (P, dt) {
      var T = P.T, E = P.E, err = P.w.error, out = clamp((E - 0.2) / 0.6, 0, 1) * (1 - P.w.answering * 0.8);
      var balls = [[P.lx * 1.2, P.ly * 1.2, lerp(22 - 2.4 * out, 11, err)]], i, b;
      for (i = 0; i < 5; i++) {
        S.a[i] += dt * (0.5 + 2.4 * E) * (i % 2 ? 1 : -0.8);
        var rho = lerp(lerp(7, 22 + 3 * sin(S.t * 1.7 + i * 2), out), 19, err);
        balls.push([cos(S.a[i]) * rho + P.slx * 0.5, sin(S.a[i]) * rho * 0.92 + P.sly * 0.5, lerp(5.5 + (i % 3), 7.5, err)]);
      }
      var hi = env.heat(1), wob = P.impulse * 1.6 + P.w.answering * 0.06, sway = 0.08 * sin(S.t * 0.9), gain = 0.72 + 0.5 * T, o = 0;
      for (var py = 0; py < N; py++) {
        var y = ((py + 0.5) * sc - 60) / P.sy;
        for (var px = 0; px < N; px++, o += 4) {
          var x = ((px + 0.5) * sc - 60) / P.sx, f = 0, gx = 0, gy = 0;
          for (i = 0; i < 6; i++) {
            b = balls[i];
            var dx = x - b[0], dy = y - b[1], d2 = dx * dx + dy * dy + 0.01, q = b[2] * b[2] / d2;
            f += q; gx += q * dx / d2; gy += q * dy / d2;
          }
          if (f < 1) { d[o + 3] = 0; continue; }
          var s = Math.sqrt(1 / f), gl = Math.hypot(gx, gy) + 1e-6;
          var nx = gx / gl * s + wob * sin((x + y) * 0.55 - S.t * 20), ny = gy / gl * s, nz = Math.sqrt(Math.max(0, 1 - s * s));
          var rx = 2 * nz * nx, ry = 2 * nz * ny + sway;
          var Lm = 0.1 + 0.8 * smooth(-0.1, -0.62, ry) + 0.3 * smooth(0.25, 0.95, ry);
          Lm *= 0.5 + 0.5 * smooth(0, 0.22, Math.abs(ry + 0.03));
          Lm += 0.45 * Math.exp(-Math.pow((rx - 0.5) / 0.13, 2)) * smooth(0.35, -0.3, ry);
          Lm = clamp(Lm * gain, 0.04, 1.1);
          d[o] = hi[0] * Lm; d[o + 1] = hi[1] * Lm; d[o + 2] = hi[2] * Lm; d[o + 3] = clamp((f - 1) * 9, 0, 1) * 255;
        }
      }
      bx.putImageData(img, 0, 0);
      g.save(); g.translate(60 + P.lx, 60 + P.ly); c.shadow(0.3); g.restore();
      g.imageSmoothingEnabled = true;
      g.drawImage(buf, P.shake * sin(P.t * 55), 0, 120, 120);
    };
  });

  /* ---------------------------------------------------------------- 4. 플라즈마 구 */
  canvasTheme({
    id: "plasma", name: "플라즈마 구", rule: "방전이 곧 상태다", tone: "violet",
    concept: "유리구 안에서 빛줄기가 중심에서 벽으로 뻗는다. 일이 많을수록 줄기가 늘고 빨라지며, 커서를 대면 그쪽으로 모인다.",
    moves: "대기: 가는 줄기 둘이 느리게 떠돎 · 생각: 줄기가 늘고 빨라짐 · 검색: 줄기가 유리 밖으로 튐 · 답변: 굵은 줄기가 글자마다 맥동 · 오류: 줄기가 꺼지고 중심만 깜빡 · 누름: 중심이 부풀고 줄기가 짧아짐",
    ramp: [[0, [60, 56, 68]], [0.12, [70, 24, 110]], [0.28, [124, 40, 190]], [0.42, [176, 64, 232]], [0.58, [214, 96, 246]], [0.72, [236, 140, 250]], [0.86, [246, 190, 252]], [1, [255, 240, 255]]],
    rates: { up: 8, down: 3, quench: 12 },
    fx: { kind: "bolt", all: true, life: 0.26 },
    reveal: { kind: "circle", open: 420, close: 240, rim: 1.2, flicker: true },
    melt: { y: 0, sx: 1, sy: 1, blur: 9, dur: 260 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g; S.f = [];
    for (var i = 0; i < 9; i++) S.f.push({ a: i * 0.7, s: i * 13.7 });
    return function (P, dt) {
      var T = P.T, E = P.E, L = lean(P);
      c.body(P, 1); c.shadow(0.28);
      halo(g, env, T, 34 + 12 * T);
      c.lens(26, [30, 16, 44], [8, 4, 14], 0.94);
      var n = P.w.error > 0.5 ? 0 : Math.round(lerp(2, 8, E)) + (P.hover ? 1 : 0);
      var flick = env.reduced ? 1 : 0.86 + 0.14 * noise1(S.t * 31);
      var reach = P.pressed ? 15 : 24.5, thick = 1 + P.w.answering * 1.2 + P.impulse * 6;
      g.globalCompositeOperation = "lighter";
      for (var i2 = 0; i2 < n; i2++) {
        var F = S.f[i2];
        F.a += dt * (noise1(S.t * 0.6 + F.s) - 0.5) * (1.5 + 5 * E);
        var a = (i2 === 0 && L.m > 0.15) ? L.a : F.a + (L.m > 0.15 ? 0.5 * sin(L.a - F.a) * L.m : 0);
        var bow = (noise1(S.t * (1.2 + 2 * E) + F.s * 3) - 0.5) * 14, ex = 0, ey = 0;
        g.beginPath(); g.moveTo(0, 0);
        for (var s = 1; s <= 6; s++) {
          var u = s / 6, off = bow * sin(u * PI) + (noise1(S.t * (9 + 10 * E) + F.s + s * 7.3) - 0.5) * 5 * sin(u * PI);
          ex = cos(a) * reach * u - sin(a) * off; ey = sin(a) * reach * u + cos(a) * off;
          g.lineTo(ex, ey);
        }
        g.strokeStyle = env.col(T + 0.05, 0.3 * flick); g.lineWidth = 3.4 * thick; g.stroke();
        g.strokeStyle = env.col(1, 0.9 * flick); g.lineWidth = 0.9 * thick; g.stroke();
        var sg = g.createRadialGradient(ex, ey, 0, ex, ey, 5);
        sg.addColorStop(0, env.col(0.85, 0.55 * flick)); sg.addColorStop(1, env.col(0.6, 0));
        g.fillStyle = sg; g.beginPath(); g.arc(ex, ey, 5, 0, TAU); g.fill();
        if (P.w.searching > 0.3) {
          var o2 = 26 + 7 * noise1(S.t * 14 + F.s);
          g.beginPath(); g.moveTo(cos(a) * 26, sin(a) * 26); g.lineTo(cos(a + 0.08) * o2, sin(a + 0.08) * o2);
          g.strokeStyle = env.col(0.95, 0.8 * P.w.searching * flick); g.lineWidth = 0.9; g.stroke();
        }
      }
      var cr = (P.pressed ? 9 : 5) + 2 * T + P.impulse * 10, on = P.w.error > 0.5 ? (noise1(S.t * 18) > 0.6 ? 0.5 : 0.12) : 1;
      var cg = g.createRadialGradient(0, 0, 0, 0, 0, cr);
      cg.addColorStop(0, "rgba(255,255,255," + on.toFixed(2) + ")"); cg.addColorStop(0.4, env.col(T + 0.3, 0.8 * on)); cg.addColorStop(1, env.col(T, 0));
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.fill();
      g.globalCompositeOperation = "source-over";
      c.glass(26, 1);
    };
  });

  /* ---------------------------------------------------------------- 5. 비눗방울 */
  canvasTheme({
    id: "bubble", name: "비눗방울", rule: "막의 빛깔이 곧 상태다", tone: "violet",
    concept: "얇은 막에 무지갯빛이 흐르는 방울. 둥실 떠서 일렁이고, 일이 많을수록 빛깔이 빨리 돈다. 오류가 나면 터지고 다시 불어난다.",
    moves: "대기: 둥실 떠서 천천히 빛깔이 돎 · 생각: 막이 출렁이고 빛깔이 빨라짐 · 검색: 작은 방울이 떨어져 떠오름 · 답변: 글자마다 막이 떨림 · 오류: 터져서 고리만 남았다가 다시 불어남 · 누름: 눌렸다 젤리처럼 떨림",
    ramp: [[0, [70, 68, 78]], [0.15, [120, 70, 150]], [0.3, [214, 84, 170]], [0.45, [246, 128, 120]], [0.6, [244, 196, 92]], [0.75, [150, 224, 140]], [0.88, [130, 226, 226]], [1, [240, 252, 255]]],
    rates: { up: 2, down: 0.8, quench: 10 },
    fx: { kind: "bubble", life: 1.5, speed: 0.45, error: "burst" },
    reveal: { kind: "poly", open: 620, close: 300, rim: 1, margin: 0.1, edge: function (a, q, t) { return 0.05 * sin(PI * q) * sin(2 * a + t * 9); } },
    melt: { y: -14, sx: 1.05, sy: 1.05, blur: 2, dur: 300 }, scan: "ring"
  }, function (env, c, S) {
    var g = c.g; S.spin = 0; S.inf = 1;
    return function (P, dt) {
      var T = P.T, E = P.E, want = P.phase === "error" ? 0 : 1;
      S.spin += dt * (0.25 + 1.6 * E);
      S.inf += (want - S.inf) * (1 - Math.exp(-dt * (want ? 4 : 16)));
      g.translate(0, env.reduced ? 0 : 1.4 * sin(S.t * 0.8));
      c.body(P, 1 + 0.018 * sin(P.t * TAU / 6));
      g.strokeStyle = "rgba(170,170,184," + (0.75 * (1 - S.inf)).toFixed(3) + ")"; g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.stroke();
      if (S.inf > 0.03) {
        var w = 0.012 + 0.05 * E + P.impulse * 0.3, R = 25 * S.inf;
        g.save();
        g.rotate(S.t * 0.7); g.scale(1 + w * sin(S.t * 3.1), 1 - w * sin(S.t * 3.1)); g.rotate(-S.t * 0.7);
        if (g.createConicGradient) {
          var cg = g.createConicGradient(S.spin, 0, 0);
          for (var j = 0; j <= 6; j++) { var u = (j / 6 + T * 0.8) % 1; cg.addColorStop(j / 6, env.col(0.2 + 0.7 * u, 1)); }
          g.fillStyle = cg;
        } else g.fillStyle = env.col(T + 0.2, 1);
        g.globalAlpha = 0.5 + 0.45 * T;
        g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.globalAlpha = 1;
        // 가운데를 비워 얇은 막처럼 보이게
        g.globalCompositeOperation = "destination-out";
        var hole = g.createRadialGradient(0, 0, 0, 0, 0, R);
        hole.addColorStop(0, "rgba(0,0,0,1)"); hole.addColorStop(0.55, "rgba(0,0,0,.86)"); hole.addColorStop(0.9, "rgba(0,0,0,.3)"); hole.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = hole; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.globalCompositeOperation = "source-over";
        var tint = g.createRadialGradient(0, 0, 0, 0, 0, R);
        tint.addColorStop(0, "rgba(20,16,30,.10)"); tint.addColorStop(1, "rgba(20,16,30,.34)");
        g.fillStyle = tint; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, R - 0.4, 0, TAU); g.stroke();
        g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, R - 5, PI * 1.12, PI * 1.38); g.stroke();
        g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, R - 4.5, PI * 0.15, PI * 0.3); g.stroke();
        g.restore();
      }
      g.globalCompositeOperation = "destination-over";
      c.shadow(0.2 * S.inf + 0.06);
    };
  });

  /* ---------------------------------------------------------------- 6. 자이로 */
  canvasTheme({
    id: "gyro", name: "자이로", rule: "회전이 곧 상태다", tone: "warm",
    concept: "황동 고리 셋이 서로 다른 축으로 도는 자이로스코프. 관성이 있어 천천히 빨라지고 천천히 멎는다.",
    moves: "대기: 느린 세차 운동 · 생각: 고리가 속도를 올림 · 검색: 바깥 고리가 넓어지며 위성이 돎 · 답변: 고리가 박자를 맞추고 중심이 맥동 · 오류: 축이 기울어 멈춤 · 누름: 고리가 한 평면으로 잠김",
    ramp: [[0, [66, 62, 54]], [0.15, [92, 70, 30]], [0.3, [146, 108, 40]], [0.45, [190, 144, 52]], [0.6, [222, 176, 72]], [0.75, [240, 204, 110]], [0.9, [250, 230, 170]], [1, [255, 248, 226]]],
    rates: { up: 1.6, down: 0.5, quench: 6 },
    fx: { kind: "arc", all: true, life: 0.9, count: 0.7 },
    reveal: { kind: "poly", open: 560, close: 300, rim: 0.5, margin: 0.3, edge: function (a, q) { var m = PI / 3, x = ((a + (1 - q) * 1.2) % m + m) % m; return cos(PI / 6) / cos(x - PI / 6) - 1; } },
    melt: { y: 0, sx: 0.86, sy: 0.86, blur: 2, rot: -4 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g; S.a = [0, 1, 2]; S.w = [0.3, 0.5, 2]; S.flat = 0;
    function half(r, rot, tilt, front, col, lw) {
      var ry = Math.max(0.5, r * Math.abs(cos(tilt))), lower = sin(tilt) >= 0;
      g.save(); g.rotate(rot);
      g.beginPath(); g.ellipse(0, 0, r, ry, 0, (front === lower) ? 0 : PI, (front === lower) ? PI : TAU);
      g.strokeStyle = "rgba(0,0,0,.38)"; g.lineWidth = lw + 1.4; g.stroke();
      g.strokeStyle = col; g.lineWidth = lw; g.stroke();
      g.restore();
    }
    return function (P, dt) {
      var T = P.T, E = P.E, err = P.w.error, ws = P.w.searching;
      var tw = err > 0.5 ? [0, 0, 0] : [0.25 + 1.2 * E, 0.4 + 2.2 * E, 1.5 + 9 * E], i;
      for (i = 0; i < 3; i++) { S.w[i] += (tw[i] - S.w[i]) * (1 - Math.exp(-dt * (err > 0.5 ? 5 : 1.4))); S.a[i] += S.w[i] * dt; }
      S.flat += ((P.pressed ? 1 : 0) - S.flat) * (1 - Math.exp(-dt * 12));
      c.body(P, 1); c.shadow(0.26);
      c.lens(27, [34, 28, 20], [10, 8, 6], 0.84);
      g.rotate(0.35 * err + P.lx * 0.04);
      var k = 1 - S.flat, r0 = 24 + 3.2 * ws * (0.5 + 0.5 * sin(S.t * 5));
      var rings = [[r0, S.a[0] * 0.3, (S.a[0] + P.ly * 0.08) * k, 1.9], [19, 1.2 + S.a[1] * 0.2, (S.a[1] * 1.3 + 1) * k, 1.7], [13.5, -0.5, (1.15 + 0.12 * sin(S.t * 1.05)) * k, 2.2]];
      for (i = 0; i < 3; i++) half(rings[i][0], rings[i][1], rings[i][2], false, env.col(T - 0.1, 0.5), rings[i][3] * 0.8);
      var cr = 4 + 1.5 * T + P.impulse * 9, cg = g.createRadialGradient(-1, -1, 0, 0, 0, cr * 2.2);
      cg.addColorStop(0, env.col(1, 1)); cg.addColorStop(0.35, env.col(T + 0.3, 0.95)); cg.addColorStop(1, env.col(T, 0));
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, cr * 2.2, 0, TAU); g.fill();
      for (i = 0; i < 3; i++) half(rings[i][0], rings[i][1], rings[i][2], true, env.col(T + 0.15, 1), rings[i][3]);
      // 회전자 위의 표식 셋: 도는 빠르기가 보인다
      g.save(); g.rotate(-0.5);
      for (i = 0; i < 3; i++) {
        var a = S.a[2] + i * TAU / 3, ry = 13.5 * Math.abs(cos(rings[2][2]));
        g.fillStyle = env.col(1, 0.55 + 0.45 * sin(a)); g.beginPath(); g.arc(cos(a) * 13.5, sin(a) * ry, 1.3, 0, TAU); g.fill();
      }
      g.restore();
      if (ws > 0.05) {
        var sa = S.t * 4.2;
        g.fillStyle = env.col(1, ws); g.beginPath(); g.arc(cos(sa) * r0, sin(sa) * r0 * Math.abs(cos(rings[0][2])), 1.8, 0, TAU); g.fill();
      }
      c.glass(27, 0.7);
    };
  });

  /* ---------------------------------------------------------------- 7. 점 구름 */
  canvasTheme({
    id: "swarm", name: "점 구름", rule: "대형이 곧 상태다", tone: "cool",
    concept: "빛나는 점 120개가 하는 일에 따라 다른 모양으로 모인다. 구, 글줄, 매듭, 고리, 물결.",
    moves: "대기: 구 모양으로 천천히 돎 · 읽기: 글줄처럼 가지런히 늘어섬 · 생각: 매듭 모양으로 빠르게 흐름 · 검색: 고리가 되어 넓어졌다 좁아짐 · 답변: 물결이 되어 글자마다 출렁 · 오류: 바닥에 쌓임 · 누름: 한 점으로 뭉쳤다 퍼짐",
    ramp: [[0, [60, 66, 76]], [0.15, [28, 60, 120]], [0.3, [40, 100, 190]], [0.45, [62, 140, 232]], [0.6, [104, 176, 248]], [0.75, [150, 204, 252]], [0.9, [200, 228, 255]], [1, [240, 248, 255]]],
    rates: { up: 4, down: 1.5, quench: 8 },
    fx: { kind: "dot", all: true, life: 1.1, speed: 0.6, count: 1.5, error: "burst" },
    reveal: { kind: "poly", open: 560, close: 300, rim: 0.7, points: 120, margin: 0.15, edge: function (a, q) { return 0.09 * (1 - q * 0.6) * (noise1(a * 14 + 3) - 0.5); } },
    melt: { y: 0, sx: 1.06, sy: 1.06, blur: 10, dur: 340 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g, N = 120, pts = [], i;
    for (i = 0; i < N; i++) { var yy = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - yy * yy), th = i * 2.39996; pts.push([cos(th) * rr, yy, sin(th) * rr, U.hash(i * 3.1)]); }
    S.rot = 0; S.sc = 1;
    return function (P, dt) {
      var T = P.T, E = P.E, w = P.w, ws = w.idle + w.listening;
      S.rot += dt * (0.3 + 1.6 * E);
      S.sc += ((P.pressed ? 0.25 : 1) - S.sc) * (1 - Math.exp(-dt * 14));
      c.body(P, 1); c.shadow(0.24);
      c.lens(27, [22, 28, 40], [6, 8, 12], 0.82);
      var cr = cos(S.rot), sr = sin(S.rot), R = 21 * (1 + 0.04 * sin(P.t * TAU / 6)) * (1 - 0.12 * w.listening), sweep = (S.t * 0.9) % 1;
      g.globalCompositeOperation = "lighter";
      for (var k = 0; k < N; k++) {
        var p = pts[k], u = k / N, a = u * TAU;
        var x = (p[0] * cr + p[2] * sr) * R * ws, y = p[1] * R * ws, z = (-p[0] * sr + p[2] * cr) * ws, lit = 0;
        if (w.reading > 0.01) { var col = Math.floor(k / 5) / (N / 5); x += (col - 0.5) * 38 * w.reading; y += ((k % 5) - 2) * 7.5 * w.reading; lit = Math.abs(col - sweep) < 0.07 ? w.reading : 0; }
        if (w.thinking > 0.01) { var a2 = a + S.t * 1.2; x += 19 * sin(2 * a2 + S.t * 0.4) * w.thinking; y += 19 * sin(3 * a2) * w.thinking; z += cos(5 * a2) * w.thinking; }
        if (w.searching > 0.01) { var a3 = a + S.t * 2, r3 = 14 + 9 * (0.5 + 0.5 * sin(S.t * 4 - (k % 3) * 2.1)); x += cos(a3) * r3 * w.searching; y += sin(a3) * r3 * 0.5 * w.searching; z += sin(a3) * w.searching; }
        if (w.answering > 0.01) { var ph = u * 9 - S.t * 5; x += (u - 0.5) * 44 * w.answering; y += (sin(ph) * (5 + P.impulse * 40) * (1 - Math.abs(u - 0.5) * 1.2) + ((k % 3) - 1) * 3.5) * w.answering; z += cos(ph) * 0.5 * w.answering; }
        if (w.error > 0.01) { x += ((u - 0.5) * 36 + (p[3] - 0.5) * 3) * w.error; y += (20 - (k % 4) * 1.6 - p[3] * 2) * w.error; }
        x = x * S.sc + P.lx * z * 0.8; y = y * S.sc + P.ly * z * 0.8;
        var depth = 0.5 + 0.5 * clamp(z, -1, 1);
        g.fillStyle = env.col(T + 0.12 + 0.25 * depth + lit * 0.4, (0.35 + 0.65 * depth) * (0.75 + 0.25 * sin(S.t * 3 + p[3] * 40)));
        g.beginPath(); g.arc(x, y, 0.55 + 1.05 * depth + lit * 0.6, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";
    };
  });

  /* ---------------------------------------------------------------- 8. 파형 */
  canvasTheme({
    id: "wave", name: "파형", rule: "신호의 모양이 곧 상태다", tone: "green",
    concept: "둥근 오실로스코프 화면에 초록 선 하나. 같은 선이 하는 일에 따라 사인파, 펄스, 리사주 도형, 레이더, 목소리 파형으로 바뀐다.",
    moves: "대기: 느린 사인파가 숨쉼 · 읽기: 네모난 펄스가 흐름 · 생각: 리사주 도형이 돎 · 검색: 레이더 고리와 도는 빔 · 답변: 목소리 같은 파형 · 오류: 한 줄로 죽음 · 누름: 한 점으로 줄었다 켜짐",
    ramp: [[0, [58, 66, 60]], [0.15, [16, 84, 48]], [0.3, [24, 136, 76]], [0.45, [40, 186, 104]], [0.6, [72, 224, 134]], [0.75, [124, 246, 170]], [0.9, [188, 255, 212]], [1, [236, 255, 244]]],
    rates: { up: 6, down: 2.5, quench: 12 },
    fx: { kind: "ring", life: 1, count: 0.25, stagger: 0.12 },
    reveal: { kind: "crt", open: 460, close: 260, rim: 1 },
    melt: { y: 0, sx: 1, sy: 0.02, blur: 0, dur: 260 }, scan: "ring"
  }, function (env, c, S) {
    var g = c.g, N = 96; S.sc = 1;
    return function (P, dt) {
      var T = P.T, w = P.w, wi = w.idle + w.listening;
      S.sc += ((P.pressed ? 0.04 : 1) - S.sc) * (1 - Math.exp(-dt * 16));
      c.body(P, 1); c.shadow(0.26);
      c.lens(27, [14, 30, 20], [4, 10, 6], 0.94);
      g.strokeStyle = env.col(0.5, 0.14); g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(-24, 0); g.lineTo(24, 0); g.moveTo(0, -24); g.lineTo(0, 24); g.moveTo(13, 0); g.arc(0, 0, 13, 0, TAU); g.stroke();
      g.save();
      g.beginPath(); g.arc(0, 0, 25.5, 0, TAU); g.clip();
      var amp0 = 3.2 + 1.6 * sin(P.t * TAU / 6) + P.impulse * 30, voice = 7 + 6 * noise1(S.t * 6) + P.impulse * 40, blip = 7 * Math.exp(-P.since * 2.5);
      g.beginPath();
      for (var i = 0; i < N; i++) {
        var u = i / (N - 1), a = u * TAU, lx = (u - 0.5) * 46;
        var x = lx * (wi + w.reading + w.answering + w.error), y = sin(a * (1 + w.listening) - S.t * 1.6) * amp0 * wi;
        y += ((Math.floor(u * 8 - S.t * 3) & 1) ? -6 : 6) * w.reading;
        x += 19 * sin(3 * a + S.t * 0.9) * w.thinking; y += 19 * sin(2 * a + S.t * 0.35) * w.thinking;
        var rr = 17 + 2.5 * sin(a * 6 + S.t * 8);
        x += cos(a) * rr * w.searching; y += sin(a) * rr * w.searching;
        y += (sin(u * 31 - S.t * 13) * 0.6 + sin(u * 17 + S.t * 9) * 0.4) * sin(u * PI) * voice * w.answering;
        if (Math.abs(u - 0.5) < 0.05) y -= blip * w.error * cos((u - 0.5) * PI * 10);
        x *= S.sc; y *= S.sc;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.shadowColor = env.col(T + 0.2, 0.95); g.shadowBlur = 6 * c.k;
      g.strokeStyle = env.col(T + 0.25, 1); g.lineWidth = 1.5; g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = env.col(1, 0.75); g.lineWidth = 0.6; g.stroke();
      if (w.searching > 0.05) {
        var sa = S.t * 3;
        g.strokeStyle = env.col(0.8, 0.5 * w.searching); g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(cos(sa) * 25, sin(sa) * 25); g.stroke();
      }
      g.restore();
      c.glass(27, 1);
    };
  });

  /* ---------------------------------------------------------------- 9. 일식 */
  canvasTheme({
    id: "eclipse", name: "일식", rule: "새어 나오는 빛이 곧 상태다", tone: "warm",
    concept: "검은 원반 뒤에서 빛이 샌다. 평소엔 옅은 코로나만 숨쉬다가, 생각하면 빛줄기가 길어지고, 답할 때는 원반이 비켜나 초승달 모양 빛이 드러난다.",
    moves: "대기: 옅은 코로나가 숨쉼 · 생각: 빛 구슬이 가장자리를 돌고 코로나가 길어짐 · 검색: 홍염이 솟음 · 답변: 원반이 비켜나며 초승달 빛 · 오류: 개기식, 가는 고리만 남음 · 누름: 원반이 커져 빛을 가림",
    ramp: [[0, [64, 60, 62]], [0.15, [110, 30, 52]], [0.3, [176, 48, 76]], [0.45, [226, 78, 96]], [0.6, [248, 120, 118]], [0.75, [255, 170, 150]], [0.9, [255, 220, 200]], [1, [255, 246, 238]]],
    rates: { up: 2, down: 0.6, quench: 7 },
    fx: { kind: "streak", gravity: 0, drag: 3.2, trail: 0.05, speed: 1.5, all: true, life: 0.7 },
    reveal: { kind: "circle", open: 700, close: 340, rim: 1.4, rimW: 96 },
    melt: { y: 0, sx: 1, sy: 1, blur: 8, dur: 420 }, scan: "ring"
  }, function (env, c, S) {
    var g = c.g; S.rot = 0; S.bead = -0.9;
    return function (P, dt) {
      var T = P.T, E = P.E, w = P.w, L = lean(P), live = smooth(0.03, 0.16, T), i;
      S.rot += dt * (0.05 + 0.5 * E);
      if (L.m > 0.15) S.bead += sin(L.a - S.bead) * (1 - Math.exp(-dt * 8)); else S.bead += dt * 2.6 * (w.thinking + w.searching);
      c.body(P, 1);
      var dg = g.createRadialGradient(0, 0, 0, 0, 0, 46);
      dg.addColorStop(0, "rgba(8,6,8,.74)"); dg.addColorStop(0.5, "rgba(8,6,8,.62)"); dg.addColorStop(1, "rgba(8,6,8,0)");
      g.fillStyle = dg; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.fill();
      g.globalCompositeOperation = "lighter";
      var breath = 1 + 0.12 * sin(P.t * TAU / 6);
      for (var layer = 0; layer < 2; layer++) {
        var maxL = (layer ? 9 : 4.5) + (layer ? 16 : 7) * (0.35 + 0.9 * E) * breath;
        g.beginPath();
        for (i = 0; i <= 120; i++) {
          var th = i / 120 * TAU;
          var s = 0.5 + 0.25 * sin(3 * th + S.rot * 2 + layer) + 0.15 * sin(7 * th - S.rot * 3) + 0.1 * sin(13 * th + S.rot * 5);
          var r = 22 + maxL * s * live * (1 + 0.8 * L.m * cos(th - L.a)) * (P.pressed ? 0.45 : 1);
          if (i) g.lineTo(cos(th) * r, sin(th) * r); else g.moveTo(cos(th) * r, sin(th) * r);
        }
        var cg = g.createRadialGradient(0, 0, 21, 0, 0, 23 + maxL * 1.2);
        cg.addColorStop(0, env.col(T + 0.3, (layer ? 0.35 : 0.8) * live)); cg.addColorStop(1, env.col(T, 0));
        g.fillStyle = cg; g.fill();
      }
      if (w.searching > 0.05) {
        g.strokeStyle = env.col(0.5, 0.85 * w.searching); g.lineWidth = 1.2;
        for (i = 0; i < 3; i++) { var pa = S.rot * 3 + i * 2.1; g.beginPath(); g.arc(cos(pa) * 23.5, sin(pa) * 23.5, 3 + 2 * sin(S.t * 5 + i * 2), 0, TAU); g.stroke(); }
      }
      g.globalCompositeOperation = "source-over";
      var off = 2.8 * w.answering + P.impulse * 8;
      if (w.answering > 0.02) { g.shadowColor = env.col(0.8, 0.9); g.shadowBlur = 8 * c.k; g.fillStyle = env.col(1, w.answering); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.shadowBlur = 0; }
      var mg = g.createRadialGradient(off - 6, off - 7, 2, off, off, 24);
      mg.addColorStop(0, "#1a171d"); mg.addColorStop(1, "#050406");
      g.fillStyle = mg; g.beginPath(); g.arc(off * 0.7, off * 0.7, P.pressed ? 24.5 : 22, 0, TAU); g.fill();
      g.strokeStyle = env.col(T + 0.2, 0.25 + 0.7 * live); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 22.4, 0, TAU); g.stroke();
      var ba = live * (0.22 + 0.78 * Math.max(w.thinking, w.searching, P.hover ? 1 : 0)), bx = cos(S.bead) * 22.4, by = sin(S.bead) * 22.4;
      g.globalCompositeOperation = "lighter";
      var bg = g.createRadialGradient(bx, by, 0, bx, by, 6);
      bg.addColorStop(0, env.col(1, ba)); bg.addColorStop(0.3, env.col(0.85, 0.6 * ba)); bg.addColorStop(1, env.col(0.6, 0));
      g.fillStyle = bg; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill();
      g.strokeStyle = env.col(1, 0.6 * ba); g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx + 8, by); g.moveTo(bx, by - 8); g.lineTo(bx, by + 8); g.stroke();
      g.globalCompositeOperation = "source-over";
    };
  });

  /* ---------------------------------------------------------------- 10. 결정 */
  canvasTheme({
    id: "crystal", name: "결정", rule: "면에 닿는 빛이 곧 상태다", tone: "cool",
    concept: "육각 기둥에 뾰족한 끝이 달린 얼음빛 결정. 천천히 돌며 면마다 빛이 스치고, 일이 많을수록 빨리 돌고 속에서 빛이 차오른다.",
    moves: "대기: 천천히 돌며 면에 빛이 스침 · 생각: 빨리 돌고 속이 밝아짐 · 검색: 면이 번쩍이며 빛을 뿌림 · 답변: 위에서 아래로 빛이 흘러내림 · 오류: 금이 가고 뿌옇게 식음 · 누름: 눌렸다 튕기며 조각이 튐",
    ramp: [[0, [60, 68, 72]], [0.15, [20, 84, 104]], [0.3, [30, 132, 160]], [0.45, [44, 178, 208]], [0.6, [90, 212, 236]], [0.75, [146, 232, 248]], [0.9, [202, 246, 255]], [1, [240, 253, 255]]],
    rates: { up: 3, down: 1, quench: 9 },
    fx: { kind: "shard", life: 0.9, error: "burst" },
    reveal: { kind: "poly", open: 520, close: 280, rim: 0.6, margin: 0.45, edge: function (a, q) { var m = PI / 2, x = ((a + PI / 4) % m + m) % m; return cos(PI / 4) / cos(x - PI / 4) * (1 + 0.2 * (1 - q)) - 1; } },
    melt: { y: 18, sx: 1, sy: 1, blur: 1, rot: 5 }, scan: "line"
  }, function (env, c, S) {
    var g = c.g, V = [[0, -25, 0]], F = [], i;
    for (i = 0; i < 6; i++) V.push([cos(i * PI / 3) * 14, -9, sin(i * PI / 3) * 14]);
    for (i = 0; i < 6; i++) V.push([cos(i * PI / 3) * 14, 9, sin(i * PI / 3) * 14]);
    V.push([0, 25, 0]);
    for (i = 0; i < 6; i++) { var j = (i + 1) % 6; F.push([0, 1 + i, 1 + j]); F.push([1 + i, 7 + i, 7 + j, 1 + j]); F.push([13, 7 + j, 7 + i]); }
    S.rot = 0;
    return function (P, dt) {
      var T = P.T, E = P.E, w = P.w;
      S.rot += dt * (0.25 + 1.5 * E);
      c.body(P, 1 + 0.015 * sin(P.t * TAU / 6)); c.shadow(0.3);
      halo(g, env, T, 34 + 12 * T);
      var cy = cos(S.rot), sy = sin(S.rot), tilt = 0.32 + P.ly * 0.05, ct = cos(tilt), st = sin(tilt), roll = P.lx * 0.05 + 0.12 * sin(S.t * 0.5), cr = cos(roll), sr = sin(roll);
      var pts = V.map(function (v) {
        var x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy, y = v[1] * ct - z * st; z = v[1] * st + z * ct;
        return [x * cr - y * sr, x * sr + y * cr, z];
      });
      var lx = -0.4 + P.lx * 0.12, ly = -0.7, lz = 0.6, ll = Math.hypot(lx, ly, lz), faces = F.map(function (f) {
        var a = pts[f[0]], b = pts[f[1]], d = pts[f[2]];
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1, mx = 0, my = 0, mz = 0;
        f.forEach(function (q) { mx += pts[q][0]; my += pts[q][1]; mz += pts[q][2]; });
        if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        return { f: f, z: mz / f.length, cy: my / f.length, nz: nz / nl, b: Math.max(0, (nx * lx + ny * ly + nz * lz) / (nl * ll)) };
      }).sort(function (p, q) { return p.z - q.z; });
      var glowDone = false;
      faces.forEach(function (fc) {
        var front = fc.nz > 0;
        if (front && !glowDone) {
          glowDone = true;
          g.globalCompositeOperation = "lighter";
          var ig = g.createRadialGradient(0, 0, 0, 0, 0, 17);
          ig.addColorStop(0, env.col(T + 0.3, 0.12 + 0.5 * T)); ig.addColorStop(1, env.col(T, 0));
          g.fillStyle = ig; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill();
          g.globalCompositeOperation = "source-over";
        }
        g.beginPath();
        fc.f.forEach(function (q, n) { if (n) g.lineTo(pts[q][0], pts[q][1]); else g.moveTo(pts[q][0], pts[q][1]); });
        g.closePath();
        if (front) {
          var flow = w.answering * Math.max(0, sin(S.t * 6 - fc.cy * 0.25)) * 0.25 + w.searching * 0.2 * noise1(S.t * 9 + fc.cy);
          g.fillStyle = rgb(mix(env.heat(T - 0.12 + 0.34 * fc.b + flow), [255, 255, 255], Math.pow(fc.b, 18) * 0.85), 0.88);
        } else g.fillStyle = env.col(T - 0.1, 0.28);
        g.fill();
        g.strokeStyle = env.col(T + 0.4, front ? 0.5 : 0.15); g.lineWidth = 0.6; g.stroke();
      });
      if (w.error > 0.05) {
        g.strokeStyle = "rgba(8,12,14," + (0.85 * w.error).toFixed(3) + ")"; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(-3, -18); g.lineTo(2, -8); g.lineTo(-4, -1); g.lineTo(3, 7); g.lineTo(-1, 16); g.moveTo(2, -8); g.lineTo(9, -4); g.moveTo(-4, -1); g.lineTo(-10, 3); g.stroke();
      }
    };
  });
})();
