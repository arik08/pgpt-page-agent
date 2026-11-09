/* 1. 쇳물 방울 — 온도가 곧 상태다. (기본 모션)
   SVG: 몸통 원 + 대류 덩어리를 goo 필터로 붙여 액체 윤곽을 만들고, 그 모양을 마스크로 써서
   온도 그라데이션·대류 빛·산화 껍질(feTurbulence)·반사광을 그린다. */
(function () {
  "use strict";
  var M = window.__pageAgentMotions;
  if (!M) return;
  var U = M.util, sv = U.sv, clamp = U.clamp, rgb = U.rgb;

  M.register({
    id: "molten",
    name: "쇳물 방울",
    rule: "온도가 곧 상태다",
    concept: "뜨거운 금속은 스스로 빛나고, 출렁이고, 식어 간다. 색을 바꾸지 않고 데우고 식힌다.",
    tone: "warm",
    ramp: [
      [0.00, [62, 56, 52]], [0.10, [78, 19, 10]], [0.20, [128, 27, 11]], [0.32, [182, 39, 14]], [0.45, [219, 67, 15]],
      [0.58, [241, 107, 22]], [0.70, [255, 145, 44]], [0.82, [255, 192, 94]], [0.92, [255, 229, 170]], [1.00, [255, 249, 236]]
    ],
    rates: { up: 2.6, down: 0.42, quench: 9 },
    fx: { kind: "streak", gravity: 900, drag: 1.2, speed: 1, error: "steam" },
    reveal: { kind: "circle", open: 560, close: 300, rim: 1 },
    melt: { y: 26, sy: 0.92, blur: 6 },
    scan: "line",
    about: {
      idle: "검붉게 식은 채 6초 주기로 숨쉬듯 달아오른다. 검은 산화 껍질의 금 사이로 빛이 샌다.",
      listening: "껍질이 얇아지고, 글자를 칠 때마다 살짝 데워지며 떨린다.",
      reading: "열선 한 줄이 페이지를 위에서 아래로 훑는다.",
      thinking: "껍질이 녹아 사라지고 안쪽 대류가 빨라진다. 표면이 크게 출렁인다.",
      searching: "방울이 움찔하고 불티가 튄다. 불티 하나가 검색 줄로 날아가 불을 붙인다.",
      answering: "글자 조각마다 맥박이 뛴다. 새 글자는 흰빛으로 나와 식으며 본문색이 된다.",
      error: "담금질. 순식간에 회색으로 식고 김이 오르며 좌우로 떤다.",
      press: "표면장력으로 납작하게 눌렸다가 위로 튕겨 출렁인다.",
      open: "방울 자리에서 쇳물이 흘러나오듯 원으로 번져 패널이 된다. 번지는 가장자리가 빛나다 식는다."
    },
    build: function (env) {
      var id = function (n) { return env.uid + "-" + n; };
      var url = function (n) { return "url(#" + id(n) + ")"; };
      var heat = env.heat, O = {}, crustA = -1;
      var svg = sv("svg", { class: "blob", viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false" });
      var defs = sv("defs");
      defs.appendChild(sv("filter", { id: id("goo"), x: "-25%", y: "-25%", width: "150%", height: "150%", "color-interpolation-filters": "sRGB" }, [
        sv("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "4.2", result: "b" }),
        sv("feColorMatrix", { in: "b", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" })
      ]));
      defs.appendChild(sv("filter", { id: id("soft"), x: "-50%", y: "-50%", width: "200%", height: "200%" }, [
        sv("feGaussianBlur", { stdDeviation: "3.2" })
      ]));
      defs.appendChild(sv("filter", { id: id("crust"), x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" }, [
        // turbulence의 0 근처 능선이 가는 선으로 남는다 → 검은 껍질 사이로 빛나는 균열망
        sv("feTurbulence", { type: "turbulence", baseFrequency: "0.075", numOctaves: "2", seed: String(Math.floor(Math.random() * 90) + 3), result: "n" }),
        sv("feColorMatrix", { in: "n", mode: "matrix", values: "0.25 0 0 0 0.07  0.12 0 0 0 0.04  0.08 0 0 0 0.03  22 0 0 0 -1.25" })
      ]));
      O.stops = [];
      var core = sv("radialGradient", { id: id("core"), gradientUnits: "userSpaceOnUse", cx: "55", cy: "53", r: "36" });
      [0, 0.5, 1].forEach(function (o) { var st = sv("stop", { offset: String(o) }); O.stops.push(st); core.appendChild(st); });
      defs.appendChild(core);
      O.haloStops = [];
      var halo = sv("radialGradient", { id: id("halo") });
      [0, 0.45, 1].forEach(function (o) { var st = sv("stop", { offset: String(o) }); O.haloStops.push(st); halo.appendChild(st); });
      defs.appendChild(halo);
      defs.appendChild(sv("radialGradient", { id: id("shade"), gradientUnits: "userSpaceOnUse", cx: "57", cy: "55", r: "30" }, [
        sv("stop", { offset: "0.6", "stop-color": "#000", "stop-opacity": "0" }),
        sv("stop", { offset: "1", "stop-color": "#000", "stop-opacity": "0.52" })
      ]));

      var mask = sv("mask", { id: id("shape"), maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "120", height: "120" });
      var gooG = sv("g", { filter: url("goo") });
      O.body = sv("circle", { cx: "60", cy: "60", r: "25", fill: "#fff" });
      gooG.appendChild(O.body);
      O.lobes = [];
      for (var i = 0; i < 4; i++) {
        var lb = sv("circle", { cx: "60", cy: "60", r: "11", fill: "#fff" });
        O.lobes.push({ el: lb, a: i * Math.PI / 2 + Math.random(), dir: i % 2 ? -1 : 1, ph: Math.random() * 6.28, f: 0.7 + i * 0.23, r: 10 + (i % 3) });
        gooG.appendChild(lb);
      }
      mask.appendChild(gooG);
      defs.appendChild(mask);
      svg.appendChild(defs);

      O.root = sv("g");
      O.ground = sv("ellipse", { cx: "61", cy: "88", rx: "19", ry: "4.5", fill: "#000", filter: url("soft") });
      O.root.appendChild(O.ground);
      O.halo = sv("circle", { cx: "60", cy: "60", r: "40", fill: url("halo") });
      O.root.appendChild(O.halo);
      var inner = sv("g", { mask: url("shape") });
      inner.appendChild(sv("rect", { x: "0", y: "0", width: "120", height: "120", fill: url("core") }));
      O.cells = [];
      var cellsG = sv("g", { filter: url("soft") });
      for (var j = 0; j < 3; j++) {
        var c = sv("circle", { cx: "60", cy: "60", r: String(9 - j * 1.5) });
        O.cells.push({ el: c, w: 0.6 + j * 0.37, ph: j * 2.1 });
        cellsG.appendChild(c);
      }
      inner.appendChild(cellsG);
      O.crustG = sv("g");
      O.crustG.appendChild(sv("rect", { x: "18", y: "18", width: "84", height: "84", filter: url("crust") }));
      inner.appendChild(O.crustG);
      inner.appendChild(sv("rect", { x: "0", y: "0", width: "120", height: "120", fill: url("shade") }));
      O.spec = sv("ellipse", { cx: "50", cy: "45", rx: "5.6", ry: "3.2", fill: "#fff", transform: "rotate(-35 50 45)" });
      O.spec2 = sv("circle", { cx: "47", cy: "43", r: "1.5", fill: "#fff" });
      inner.appendChild(O.spec);
      inner.appendChild(O.spec2);
      O.root.appendChild(inner);
      svg.appendChild(O.root);
      env.mount.insertBefore(svg, env.mount.firstChild);

      function draw(P, dt) {
        var T = P.T, E = P.E, t = P.t;
        var speed = 0.35 + 2.4 * E;
        for (var li = 0; li < O.lobes.length; li++) { var LL = O.lobes[li]; LL.a += LL.dir * speed * dt * (1 + li * 0.15); }
        for (var ci = 0; ci < O.cells.length; ci++) { var CC = O.cells[ci]; CC.ph += CC.w * (0.4 + 2.2 * E) * dt; }

        var shakeX = P.shake * Math.sin(t * 55);
        var breath = env.reduced ? 1 : 1 + 0.022 * Math.sin(t * Math.PI * 2 / 6);
        O.root.setAttribute("transform",
          "translate(" + (60 + P.lx + shakeX).toFixed(2) + " " + (60 + P.ly).toFixed(2) + ") scale(" +
          (P.sx * breath).toFixed(4) + " " + (P.sy * breath).toFixed(4) + ") translate(-60 -60)");
        O.body.setAttribute("r", (25 + 1.2 * E * Math.sin(t * 3.1)).toFixed(2));

        for (var i2 = 0; i2 < O.lobes.length; i2++) {
          var L = O.lobes[i2];
          var reach = 13.5 + (3 + 9 * E) * (0.5 + 0.5 * Math.sin(t * (L.f + 2.2 * E) + L.ph));
          L.el.setAttribute("cx", (60 + Math.cos(L.a) * reach + P.slx * (0.6 + i2 * 0.15)).toFixed(2));
          L.el.setAttribute("cy", (60 + Math.sin(L.a) * reach + P.sly * (0.6 + i2 * 0.15)).toFixed(2));
          L.el.setAttribute("r", (L.r + 1.5 * Math.sin(t * 1.7 + L.ph)).toFixed(2));
        }

        O.stops[0].setAttribute("stop-color", rgb(heat(T + 0.21)));
        O.stops[1].setAttribute("stop-color", rgb(heat(T)));
        O.stops[2].setAttribute("stop-color", rgb(heat(T - 0.24)));

        var cellC = rgb(heat(T + 0.26));
        for (var j2 = 0; j2 < O.cells.length; j2++) {
          var C = O.cells[j2];
          C.el.setAttribute("cx", (57 + Math.cos(C.ph) * 10 + P.slx * 0.4).toFixed(2));
          C.el.setAttribute("cy", (57 + Math.sin(C.ph * 1.3) * 9 + P.sly * 0.4).toFixed(2));
          C.el.setAttribute("fill", cellC);
          C.el.setAttribute("opacity", (0.08 + 0.6 * E).toFixed(3));
        }

        var crust = clamp((0.42 - T) / 0.26, 0, 1) * 0.94;
        if (Math.abs(crust - crustA) > 0.004) { crustA = crust; O.crustG.setAttribute("opacity", crust.toFixed(3)); }
        O.crustG.setAttribute("transform", "rotate(" + ((t * 3.5) % 360).toFixed(2) + " 60 60)");

        var specA = 0.06 + 0.5 * Math.pow(1 - clamp(T, 0, 1), 1.3);
        var sx = 50 - P.lx * 0.7, sy = 45 - P.ly * 0.7;
        O.spec.setAttribute("cx", sx.toFixed(2)); O.spec.setAttribute("cy", sy.toFixed(2));
        O.spec.setAttribute("transform", "rotate(-35 " + sx.toFixed(1) + " " + sy.toFixed(1) + ")");
        O.spec.setAttribute("opacity", (specA * 0.55).toFixed(3));
        O.spec2.setAttribute("cx", (sx - 3).toFixed(2)); O.spec2.setAttribute("cy", (sy - 2).toFixed(2));
        O.spec2.setAttribute("opacity", Math.min(1, specA * 1.4).toFixed(3));

        O.ground.setAttribute("opacity", (0.3 - 0.16 * T).toFixed(3));
        var hc = rgb(heat(T + 0.04));
        O.halo.setAttribute("r", (31 + 24 * T).toFixed(2));
        O.haloStops[0].setAttribute("stop-color", hc);
        O.haloStops[0].setAttribute("stop-opacity", (0.16 + 0.5 * T).toFixed(3));
        O.haloStops[1].setAttribute("stop-color", hc);
        O.haloStops[1].setAttribute("stop-opacity", (0.06 + 0.22 * T).toFixed(3));
        O.haloStops[2].setAttribute("stop-color", hc);
        O.haloStops[2].setAttribute("stop-opacity", "0");
      }
      return { draw: draw, destroy: function () { if (svg.parentNode) svg.parentNode.removeChild(svg); } };
    }
  });
})();
