/* 페이지 에이전트 위젯.
   북마클릿이 이 파일을 아무 페이지에나 주입한다. 그래서
   - 호스트 페이지와 Shadow DOM으로 격리하고, 스타일은 adoptedStyleSheets로 넣는다 (CSP style-src 회피).
   - innerHTML을 쓰지 않는다 (Trusted Types 사이트에서도 동작, XSS 차단).
   - 외부 리소스를 불러오지 않는다.
   방울의 모양과 움직임은 모션 테마(web/motions/*.js)가 정한다. 서버가 이 파일 앞에 붙여서 보낸다.
   모션 명세: docs/motion.md */
(function () {
  "use strict";
  var W = window, D = document;
  if (W.__pageAgent) { W.__pageAgent.toggle(); return; }
  var M = W.__pageAgentMotions;
  if (!M || !M.list().length) return;

  var VERSION = "0.2.0";
  var ICONS = W.__pageAgentIcons || {};
  var MODE = W.__pageAgentMode === "window" ? "window" : "overlay";
  var SERVER = (function () {
    if (W.__pageAgentServer) return String(W.__pageAgentServer).replace(/\/+$/, "");
    var cs = D.currentScript;
    if (cs && cs.src) { try { return new URL(cs.src).origin; } catch (e) { /* ignore */ } }
    return location.origin;
  })();
  var TAS = W.__pageAgentTAS || (location.protocol === "https:" && /^http:/i.test(SERVER)
    ? (/^http:\/\/(localhost|127\.|\[::1\])/i.test(SERVER) ? "loopback" : "local") : "");
  var MQ = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var REDUCED = !!(MQ && MQ.matches);
  var STORE_KEY = MODE === "window" ? "pageAgent:win:v1" : "pageAgent:v1";
  var SVGNS = "http://www.w3.org/2000/svg";
  var UID = "pa" + Math.random().toString(36).slice(2, 8);

  /* ------------------------------------------------------------ 작은 도구 */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function now() { return performance.now(); }

  function append(el, kids) {
    if (kids == null) return el;
    if (!Array.isArray(kids)) kids = [kids];
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === "string" ? D.createTextNode(c) : c);
    }
    return el;
  }
  function h(tag, props, kids) {
    var el = D.createElement(tag);
    if (props) {
      for (var k in props) {
        var v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style") { for (var sk in v) el.style.setProperty(sk, v[sk]); }
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    return append(el, kids);
  }
  function sv(tag, attrs, kids) {
    var el = D.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function icon(name, size) {
    var svg = sv("svg", {
      class: "i", width: size || 20, height: size || 20, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round",
      "aria-hidden": "true", focusable: "false"
    });
    (ICONS[name] || []).forEach(function (n) { svg.appendChild(sv(n[0], n[1])); });
    return svg;
  }
  function setIcon(btn, name) {
    var old = btn.querySelector("svg.i");
    var next = icon(name);
    if (old) btn.replaceChild(next, old); else btn.appendChild(next);
    if (!REDUCED && next.animate) {
      next.animate([{ transform: "scale(.6) rotate(-35deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" });
    }
  }
  function hostOf(url) { try { return new URL(url).host; } catch (e) { return ""; } }
  function cleanUrl(url) { return String(url || "").replace(/([?&])utm_source=openai(&|$)/, function (m, a, b) { return b ? a : ""; }).replace(/[?&]$/, ""); }
  function safeUrl(url) { return /^(https?:|mailto:)/i.test(url) ? url : null; }
  function fmtSec(ms) { var s = ms / 1000; return (s < 10 ? s.toFixed(1) : Math.round(s)) + "초"; }

  /* ------------------------------------------------------------ 모션 테마와 색 램프 */

  var MOTION_KEY = "pageAgent:motion";
  var THEME = M.get((function () {
    // 우선순위: 북마클릿·페이지가 지정한 값 → 이 사이트에서 고른 값 → 서버 기본값
    var want = W.__pageAgentMotion;
    if (!M.has(want)) { try { want = W.localStorage.getItem(MOTION_KEY); } catch (e) { want = null; } }
    if (!M.has(want)) want = W.__pageAgentMotionDefault;
    return want;
  })());
  var TONE = M.TONES[THEME.tone] || M.TONES.warm;
  var rgb = M.util.rgb, mix = M.util.mix;
  /* 테마의 색 램프. 0 = 꺼짐(오류), 1 = 가장 밝음. 강조색은 모두 여기서 나온다. */
  function heat(t) { return M.util.rampAt(THEME.ramp, t); }
  var TEXT_RGB = TONE.rgb;

  /* 스프링 이징을 CSS linear()로 굽는다. 지원하지 않으면 cubic-bezier로. */
  function bakeSpring(k, c) {
    var x = 0, v = 0, dt = 1 / 240, t = 0, pts = [0], step = 0;
    while (t < 2) {
      var a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; step++;
      if (step % 4 === 0) pts.push(x);
      if (t > 0.3 && Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02) break;
    }
    pts.push(1);
    var ease = "linear(" + pts.map(function (p) { return p.toFixed(4); }).join(",") + ")";
    var ok = W.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
    return ok ? { ease: ease, dur: Math.round(t * 1000) } : { ease: "cubic-bezier(.2,.9,.25,1.04)", dur: 480 };
  }
  var SPRING_PANEL = bakeSpring(150, 17);
  var SPRING_DROP = bakeSpring(260, 13);

  /* ------------------------------------------------------------ 스타일 */

  var CSS_TEXT = [
    ":host{all:initial}",
    "*,*::before,*::after{box-sizing:border-box}",
    ".root{--bg:#141210;--bg2:#1b1815;--bg3:#25211d;--bg4:#312b26;--line:rgba(238,226,214,.09);--line2:rgba(238,226,214,.17);",
    "--text:#eee7e0;--text2:#b5aba2;--text3:#958b82;--heat:rgb(128,27,11);--heat-ui:rgb(225,80,18);--heat-ink:#1c0d04;--heat-k:.2;",
    "--bg0:#0e0c0b;--text-hi:#fff6ee;--mid:rgb(241,107,22);--hot2:rgb(255,192,94);--hot:rgb(255,229,170);--white-hot:rgb(255,249,236);--glow:rgba(255,145,44,.6);--err-line:rgba(182,39,14,.6);--err-ink:rgb(232,96,30);",
    "--font:'Pretendard Variable',Pretendard,'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "--mono:D2Coding,'JetBrains Mono',Consolas,'Courier New',monospace;",
    "font-family:var(--font);font-size:16px;line-height:1.7;color:var(--text);-webkit-font-smoothing:antialiased;letter-spacing:-.003em;text-align:left;font-weight:400;word-break:keep-all;overflow-wrap:anywhere}",
    ".root ::selection{background:color-mix(in srgb,var(--mid) 38%,transparent);color:#fff}",
    "button{font:inherit;color:inherit;margin:0}",
    "svg.i{display:block;flex:none}",

    /* 방울 */
    ".orb{position:fixed;right:24px;bottom:24px;width:60px;height:60px;z-index:3;border:0;padding:0;background:transparent;cursor:pointer;border-radius:50%;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
    ".orb .blob{position:absolute;left:-30px;top:-30px;width:120px;height:120px;overflow:visible;pointer-events:none}",
    ".orb:focus-visible::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--heat-ui)}",
    ".orb .ping{position:absolute;inset:6px;border-radius:50%;border:1.5px solid var(--heat-ui);opacity:0;pointer-events:none}",
    ".orb.unread .ping{animation:pa-ping 2.8s cubic-bezier(.16,1,.3,1) infinite}",
    "@keyframes pa-ping{0%{transform:scale(.92);opacity:.9}70%,100%{transform:scale(1.95);opacity:0}}",

    /* 패널 */
    ".panel{position:fixed;right:24px;bottom:96px;width:420px;height:min(660px,calc(100vh - 120px));z-index:2;display:none;flex-direction:column;",
    "background:var(--bg);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 70px -18px rgba(0,0,0,.6),0 12px 28px -10px rgba(0,0,0,.4);overflow:hidden;color:var(--text)}",
    ".panel.on{display:flex}",
    ".panel.xl{width:min(900px,calc(100vw - 48px));height:calc(100vh - 120px)}",
    ".panel::before{content:'';position:absolute;left:20px;right:20px;top:0;height:2px;z-index:3;pointer-events:none;box-shadow:0 1px calc(4px + var(--heat-k) * 16px) var(--heat-ui);",
    "background:linear-gradient(90deg,transparent,var(--heat-ui) 28%,var(--heat-ui) 72%,transparent);opacity:calc(.22 + var(--heat-k) * .78);transition:opacity .3s}",
    ".panel.flare::before{opacity:1;left:0;right:0;transition:none}",
    ".rim{position:absolute;inset:0;pointer-events:none;z-index:6}",

    /* 헤더 */
    ".hd{display:flex;align-items:center;gap:10px;padding:12px 10px 12px 20px;border-bottom:1px solid var(--line);flex:none;min-height:64px}",
    ".hd-text{flex:1;min-width:0}",
    ".hd-name{font-size:16px;font-weight:650;line-height:1.35;letter-spacing:-.01em;color:var(--text)}",
    ".hd-sub{font-size:13px;line-height:1.45;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".hd-acts{display:flex;gap:2px;flex:none}",
    ".ib{width:38px;height:38px;display:grid;place-items:center;border:0;background:transparent;color:var(--text2);border-radius:10px;cursor:pointer;transition:background .15s,color .15s,transform .12s}",
    ".ib:hover{background:var(--bg3);color:var(--text)}",
    ".ib:active{transform:scale(.9)}",
    ".ib:focus-visible{outline:2px solid var(--heat-ui);outline-offset:-2px}",
    ".ib[disabled]{opacity:.4;pointer-events:none}",

    /* 대화 목록 */
    ".list{flex:1;overflow-y:auto;overflow-x:hidden;padding:20px 20px 6px;overscroll-behavior:contain}",
    ".list::-webkit-scrollbar{width:10px}.list::-webkit-scrollbar-track{background:transparent}.list::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:10px;border:3px solid var(--bg)}.list::-webkit-scrollbar-button{display:none;width:0;height:0}",
    "textarea::-webkit-scrollbar{width:8px}textarea::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:8px}textarea::-webkit-scrollbar-button{display:none;width:0;height:0}",
    "@supports not selector(::-webkit-scrollbar){.list,textarea{scrollbar-width:thin;scrollbar-color:var(--bg4) transparent}}",
    ".panel.xl .list>*{max-width:760px;margin-left:auto;margin-right:auto}",
    ".panel.xl .hd,.root.win .hd{padding-left:max(20px,calc((100% - 760px) / 2));padding-right:max(10px,calc((100% - 760px) / 2 - 10px))}",
    ".msg{margin:0 0 24px}",
    ".me{display:flex;flex-direction:column;align-items:flex-end}",
    ".bubble{max-width:88%;background:var(--bg3);border:1px solid var(--line);border-radius:16px 16px 6px 16px;padding:9px 14px;white-space:pre-wrap;color:var(--text)}",
    ".me .tag{margin-top:6px;font-size:13px;line-height:1.4;color:var(--text3);display:flex;align-items:center;gap:5px}",
    ".me .tag svg.i{width:14px;height:14px}",

    /* 공정 기록 */
    ".log{margin:0 0 10px}",
    ".strip{display:flex;gap:2px;height:4px;width:100%;max-width:300px}",
    ".strip i{display:block;height:100%;min-width:4px;border-radius:2px;flex-basis:0}",
    ".log-text{margin-top:6px;font-size:13px;line-height:1.5;color:var(--text2);min-height:20px;overflow:hidden}",
    ".log-text span{display:inline-block}",
    ".notice{font-size:13px;color:var(--text3);margin-top:8px}",

    /* 검색 줄 */
    ".searches{display:flex;flex-direction:column;gap:4px;margin:0 0 12px}",
    ".sq{display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.5;color:var(--text2);min-height:26px}",
    ".sq svg.i{width:16px;height:16px;color:var(--text3)}",
    ".sq .q{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
    /* 검색어가 오기 전: 아지랑이가 지나가는 막대 */
    ".sq.live .q{display:block;width:150px;height:10px;border-radius:5px;background:linear-gradient(90deg,var(--bg3) 0%,var(--bg3) 32%,color-mix(in srgb,var(--heat-ui) 75%,transparent) 50%,var(--bg3) 68%,var(--bg3) 100%);background-size:260% 100%;animation:pa-shimmer 1.4s linear infinite}",
    "@keyframes pa-shimmer{from{background-position:100% 0}to{background-position:-160% 0}}",
    ".sq.lit svg.i{color:var(--heat-ui);animation:pa-lit 1s ease-out}",
    "@keyframes pa-lit{from{color:var(--hot);filter:drop-shadow(0 0 5px var(--glow))}}",

    /* 답변 본문 */
    ".md{color:var(--text)}",
    ".md>.lv{display:contents}",
    ".md p{margin:0 0 12px}",
    ".md h1,.md h2,.md h3,.md h4{font-size:17px;font-weight:700;margin:18px 0 8px;line-height:1.45;letter-spacing:-.01em;color:var(--text-hi)}",
    ".md h1{font-size:19px}",
    ".md>:first-child,.md>.lv:first-child>:first-child{margin-top:0}",
    ".md ul,.md ol{margin:0 0 12px;padding-left:22px}.md li{margin:3px 0}.md li>ul,.md li>ol{margin:4px 0}.md li::marker{color:var(--text3)}",
    ".md blockquote{margin:0 0 12px;padding:2px 0 2px 14px;border-left:1px solid var(--line2);color:var(--text2)}",
    ".md code{font-family:var(--mono);font-size:14px;background:color-mix(in srgb,var(--text) 7%,transparent);border-radius:5px;padding:1px 5px}",
    ".md pre{margin:0 0 12px;background:var(--bg0);border:1px solid var(--line);border-radius:12px;padding:12px 14px;overflow-x:auto;font-size:14px;line-height:1.6}",
    ".md pre code{background:none;padding:0;white-space:pre}",
    ".md .tbl{overflow-x:auto;margin:0 0 12px;border:1px solid var(--line);border-radius:10px}",
    ".md table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.55}",
    ".md th,.md td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);vertical-align:top;font-variant-numeric:tabular-nums}",
    ".md th{color:var(--text2);font-weight:600;background:var(--bg2)}.md tr:last-child td{border-bottom:0}",
    ".md a{color:color-mix(in srgb,var(--heat-ui) 52%,#fff);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--heat-ui) 60%,transparent);text-underline-offset:3px}",
    ".md a:hover{text-decoration-color:currentColor}",
    ".md a.cite{text-decoration:none;font-size:13px;line-height:1.5;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--heat-ui) 16%,transparent);color:color-mix(in srgb,var(--heat-ui) 42%,#fff);margin:0 1px;white-space:nowrap}",
    ".md a.cite:hover{background:color-mix(in srgb,var(--heat-ui) 28%,transparent)}",
    ".md hr{border:0;border-top:1px solid var(--line);margin:16px 0}",
    ".md strong{font-weight:700;color:var(--text-hi)}",
    ".hot{-webkit-background-clip:text;background-clip:text;color:transparent}",
    ".bead{display:inline-block;width:9px;height:9px;border-radius:50%;margin-left:4px;vertical-align:.02em;",
    "background:radial-gradient(circle at 38% 34%,var(--white-hot),var(--hot2) 45%,var(--mid) 85%);box-shadow:0 0 10px 2px var(--glow);animation:pa-bead 1.1s ease-in-out infinite}",
    "@keyframes pa-bead{50%{transform:scale(.72);box-shadow:0 0 5px 1px color-mix(in srgb,var(--glow) 50%,transparent)}}",

    /* 출처·도구 */
    ".sources{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}",
    ".src{display:inline-flex;align-items:center;gap:6px;max-width:100%;font-size:13px;line-height:1.4;color:var(--text2);text-decoration:none;padding:5px 10px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);transition:border-color .15s,color .15s}",
    ".src:hover{color:var(--text);border-color:var(--line2)}",
    ".src b{font-weight:600;color:var(--text);flex:none}",
    ".src span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}",
    ".tools{display:flex;gap:2px;margin:6px 0 0 -9px}",
    ".tools .ib{width:34px;height:34px}.tools svg.i{width:18px;height:18px}",

    /* 오류 */
    ".err{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid var(--err-line);background:color-mix(in srgb,var(--bg4) 55%,transparent);border-radius:12px;color:var(--text);font-size:15px;line-height:1.6;margin-top:4px}",
    ".err>svg.i{color:var(--err-ink);margin-top:3px;width:18px;height:18px}",
    ".err-body{flex:1;min-width:0}",
    ".err-detail{font-size:13px;color:var(--text2);margin-top:4px}",
    ".err-acts{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}",
    ".btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:10px;border:1px solid var(--line2);background:var(--bg3);color:var(--text);font-size:14px;cursor:pointer;transition:background .15s}",
    ".btn:hover{background:var(--bg4)}.btn svg.i{width:16px;height:16px}",
    ".btn:focus-visible{outline:2px solid var(--heat-ui);outline-offset:2px}",

    /* 빈 상태 */
    ".empty{padding:22px 2px 8px}",
    ".empty-title{font-size:21px;font-weight:700;letter-spacing:-.02em;line-height:1.4;margin-bottom:6px;color:var(--text-hi)}",
    ".empty-sub{color:var(--text2);font-size:15px;line-height:1.6;margin-bottom:22px}",
    ".sugs{display:flex;flex-direction:column;gap:8px;align-items:flex-start}",
    ".sug{font-size:15px;line-height:1.5;text-align:left;color:var(--text);background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:9px 14px;cursor:pointer;transition:border-color .15s,background .15s,transform .12s}",
    ".sug:hover{border-color:var(--line2);background:var(--bg3)}.sug:active{transform:scale(.98)}",
    ".sug:focus-visible{outline:2px solid var(--heat-ui);outline-offset:2px}",

    /* 입력부 */
    ".composer{flex:none;padding:10px 14px 14px;border-top:1px solid var(--line);background:var(--bg)}",
    ".panel.xl .composer>*{max-width:760px;margin-left:auto;margin-right:auto}",
    ".chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}",
    ".chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:30px;padding:0 10px;font-size:13px;line-height:1;color:var(--text2);background:var(--bg2);border:1px solid var(--line);border-radius:8px}",
    ".chip svg.i{width:15px;height:15px}",
    ".chip span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:250px;line-height:1.4}",
    ".chip.sel{color:color-mix(in srgb,var(--heat-ui) 40%,#fff);border-color:color-mix(in srgb,var(--heat-ui) 45%,transparent);background:color-mix(in srgb,var(--heat-ui) 10%,transparent);padding-right:3px}",
    ".chip .x{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;border:0;background:transparent;color:inherit;cursor:pointer}",
    ".chip .x:hover{background:color-mix(in srgb,var(--heat-ui) 22%,transparent)}.chip .x svg.i{width:14px;height:14px}",
    ".chip.flash{animation:pa-chip .8s ease-out}",
    "@keyframes pa-chip{from{border-color:var(--hot2);box-shadow:0 0 0 3px color-mix(in srgb,var(--glow) 35%,transparent);color:var(--hot)}}",
    ".field{display:flex;align-items:flex-end;gap:8px;background:var(--bg2);border:1px solid var(--line2);border-radius:16px;padding:6px 6px 6px 14px;transition:border-color .2s,box-shadow .2s}",
    ".field:focus-within{border-color:var(--heat-ui);box-shadow:0 0 0 3px color-mix(in srgb,var(--heat-ui) 14%,transparent)}",
    "textarea{flex:1;resize:none;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:16px;line-height:1.6;padding:6px 0;margin:0;",
    "max-height:170px;min-height:38px;height:38px;caret-color:var(--heat-ui)}",
    "textarea::placeholder{color:var(--text3);opacity:1}",
    ".send{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:12px;border:0;cursor:pointer;background:var(--bg4);color:var(--text3);",
    "transition:background .25s,color .25s,transform .12s,box-shadow .25s}",
    ".send.ready{background:var(--heat-ui);color:var(--heat-ink);box-shadow:0 6px 14px -6px rgba(0,0,0,.65)}",
    ".send.stop{background:var(--bg4);color:var(--text)}",
    ".send:active{transform:scale(.88)}.send:focus-visible{outline:2px solid var(--heat-ui);outline-offset:2px}",

    /* 툴팁·효과 */
    ".tip{position:fixed;left:0;top:0;z-index:10;pointer-events:none;font-size:13px;line-height:1.4;color:var(--text);background:var(--bg4);border:1px solid var(--line2);",
    "padding:6px 10px;border-radius:8px;box-shadow:0 10px 24px -8px rgba(0,0,0,.55);opacity:0;transition:opacity .12s;max-width:320px;white-space:normal;overflow-wrap:anywhere}",
    ".tip.on{opacity:1}",
    ".fx{position:fixed;left:0;top:0;pointer-events:none;z-index:4}",
    ".scan{position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;display:none}",
    ".scan i{position:absolute;left:0;right:0;top:0;height:180px;background:linear-gradient(to bottom,transparent 0%,color-mix(in srgb,var(--mid) 4%,transparent) 55%,color-mix(in srgb,var(--mid) 15%,transparent) 93%,color-mix(in srgb,var(--hot2) 50%,transparent) 99%,transparent 100%)}",
    ".scan i::after{content:'';position:absolute;left:0;right:0;bottom:1px;height:1.5px;background:var(--hot);box-shadow:0 0 14px 3px var(--glow)}",
    ".scan b{position:absolute;border-radius:50%;border:1.5px solid var(--hot);box-shadow:0 0 22px 3px var(--glow),inset 0 0 22px 3px var(--glow)}",
    ".cast{animation:pa-cast .95s cubic-bezier(.2,.7,.2,1) both}",
    "@keyframes pa-cast{from{color:var(--hot2);text-shadow:0 0 12px var(--glow)}}",
    ".melt{color:var(--hot2)!important;transition:color .18s}",
    ".melt *{color:inherit!important}",

    /* 새 창 모드 */
    ".root.win .panel{inset:0;width:auto;height:auto;border-radius:0;border:0;box-shadow:none}",
    ".root.win .hd{padding-left:12px}",
    ".root.win .orb{position:relative;right:auto;bottom:auto;width:44px;height:44px;flex:none}",
    ".root.win .orb .blob{left:-22px;top:-22px;width:88px;height:88px}",
    ".root.win .list>*,.root.win .composer>*{max-width:760px;margin-left:auto;margin-right:auto}",

    "@media (pointer:coarse){.ib,.send{width:44px;height:44px}.chip .x{width:32px;height:32px}}",
    "@media (max-width:520px){.panel{right:12px;left:12px;width:auto;bottom:88px;height:calc(100vh - 104px)}.panel.xl{width:auto;height:calc(100vh - 104px)}.orb{right:16px;bottom:16px}}",
    "@media (prefers-reduced-motion:reduce){.cast{animation-duration:.01ms}.bead{animation:none}.sq.live .q{animation:none}",
    ".orb.unread .ping{animation:none;opacity:.85;transform:scale(1.2)}.chip.flash{animation-duration:.01ms}}"
  ].join("\n");

  /* ------------------------------------------------------------ 뼈대 */

  var host = h("div", { id: "__page_agent_host", "data-version": VERSION });
  host.style.cssText = "all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
  var shadow = host.attachShadow({ mode: "open" });
  try {
    var sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS_TEXT);
    shadow.adoptedStyleSheets = [sheet];
  } catch (e) {
    shadow.appendChild(h("style", { text: CSS_TEXT }));
  }
  var root = h("div", { class: "root" + (MODE === "window" ? " win" : "") });
  shadow.appendChild(root);
  (MODE === "window" ? D.body : D.documentElement).appendChild(host);

  // 위젯 안에서 친 키가 호스트 사이트의 단축키로 새지 않게 막는다.
  ["keydown", "keyup", "keypress"].forEach(function (t) {
    root.addEventListener(t, function (e) { e.stopPropagation(); });
  });

  var scanBand = h("i"), scanRing = h("b");
  var scanEl = h("div", { class: "scan", "aria-hidden": "true" }, [scanBand, scanRing]);
  var tipEl = h("div", { class: "tip", role: "tooltip" });
  root.appendChild(scanEl);

  /* ------------------------------------------------------------ 방울 (SVG) */

  var orbEl = h("button", { class: "orb", type: "button", "aria-label": "페이지 에이전트 열기", "data-tip": "페이지 에이전트" });
  var pingEl = h("span", { class: "ping", "aria-hidden": "true" });
  orbEl.appendChild(pingEl);
  var ORB = M.createOrb(orbEl, THEME.id, { reduced: REDUCED, box: MODE === "window" ? 88 : 120 });
  var P = ORB.P;   // 방울의 물리 상태 (눌림·기울기·출렁임·세기 T·에너지 E)

  function setPhase(ph) {
    var prev = P.phase;
    ORB.setPhase(ph);
    if (ph === "error" && prev !== "error") fxError();
  }
  function kick(heatAmt, sq) { ORB.kick(heatAmt, sq); }

  /* 테마가 바뀌면 달라지는 색을 한 번에 넣는다. */
  var lastCss = { T: -1 };
  function applyTheme() {
    TONE = M.TONES[THEME.tone] || M.TONES.warm;
    TEXT_RGB = TONE.rgb;
    var s = root.style;
    ["bg0", "bg", "bg2", "bg3", "bg4", "line", "line2", "text", "text2", "text3"].forEach(function (k) { s.setProperty("--" + k, TONE[k]); });
    s.setProperty("--text-hi", TONE.hi);
    s.setProperty("--mid", rgb(heat(0.58)));
    s.setProperty("--hot2", rgb(heat(0.82)));
    s.setProperty("--hot", rgb(heat(0.92)));
    s.setProperty("--white-hot", rgb(heat(1)));
    s.setProperty("--glow", rgb(heat(0.7), 0.6));
    s.setProperty("--err-line", rgb(heat(0.32), 0.6));
    s.setProperty("--err-ink", rgb(heat(0.5)));
    root.setAttribute("data-motion", THEME.id);
    lastCss.T = -1;
  }
  applyTheme();

  function stepOrb(dt) {
    ORB.step(dt);
    // CSS 변수: 너무 자주 바꾸면 스타일 재계산이 늘어서 변화가 있을 때만
    if (Math.abs(P.T - lastCss.T) > 0.006) {
      lastCss.T = P.T;
      root.style.setProperty("--heat", rgb(heat(P.T)));
      // 하한 0.36: 가장 어두운 상태(오류)에서도 바탕 위에서 3:1 이상
      var ui = heat(clamp(P.T + 0.18, 0.36, 0.9));
      root.style.setProperty("--heat-ui", rgb(ui));
      // Ink Flip: 강조색 채움 위의 글자는 어두운 먹색과 밝은 색 중 대비가 큰 쪽
      var dark = M.util.contrast(ui, TONE.inkDark) >= M.util.contrast(ui, TONE.inkLight);
      root.style.setProperty("--heat-ink", rgb(dark ? TONE.inkDark : TONE.inkLight));
      root.style.setProperty("--heat-k", P.T.toFixed(3));
    }
  }

  function orbCenter() {
    var r = orbEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ------------------------------------------------------------ 불티·김 (캔버스) */

  var FX = { cv: null, ctx: null, parts: [], dpr: 1, idleSince: 0 };
  function fxEnsure() {
    if (REDUCED) return false;
    if (!FX.cv) {
      FX.cv = h("canvas", { class: "fx", "aria-hidden": "true" });
      root.appendChild(FX.cv);
      FX.ctx = FX.cv.getContext("2d");
    }
    var dpr = Math.min(W.devicePixelRatio || 1, 1.5), w = W.innerWidth, hh = W.innerHeight;
    if (FX.cv.width !== Math.round(w * dpr) || FX.cv.height !== Math.round(hh * dpr)) {
      FX.dpr = dpr;
      FX.cv.width = Math.round(w * dpr); FX.cv.height = Math.round(hh * dpr);
      FX.cv.style.width = w + "px"; FX.cv.style.height = hh + "px";
    }
    return true;
  }
  /* 테마의 입자 n개를 (x, y)에서 뿌린다. 모양과 물리는 THEME.fx가 정한다 (불티·구슬·방전·파문…). */
  function fxSparks(n, x, y, o) {
    if (!fxEnsure()) return;
    o = o || {};
    var f = THEME.fx || {}, kind = f.kind || "streak";
    var base = o.angle == null ? -Math.PI / 2 : o.angle, spread = f.all ? Math.PI : (o.spread == null ? 1.25 : o.spread);
    if (f.count) n = Math.max(1, Math.round(n * f.count));
    for (var i = 0; i < n; i++) {
      var a = base + (Math.random() - 0.5) * 2 * spread, sp = (o.speed || 230) * (f.speed || 1) * (0.45 + Math.random() * 0.8);
      FX.parts.push({
        k: kind, x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12, ox: x, oy: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (f.life || 0.78) * (0.58 + Math.random() * 0.84), age: f.stagger ? -i * f.stagger : 0,
        heat: o.heat == null ? 1 : o.heat, w: 1 + Math.random() * 1.3, a: a, seed: Math.random() * 100
      });
    }
  }
  function fxSteam() {
    if (!fxEnsure()) return;
    var c = orbCenter();
    for (var i = 0; i < 9; i++) {
      FX.parts.push({
        k: "steam", x: c.x + (Math.random() - 0.5) * 30, y: c.y - 8 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 22, vy: -30 - Math.random() * 40, life: 0.9 + Math.random() * 0.7, age: -i * 0.04,
        r: 5 + Math.random() * 6
      });
    }
  }
  /* 오류가 났을 때: 쇳물은 김, 다른 테마는 제 입자를 힘없이 흩뿌린다. */
  function fxError() {
    var e = (THEME.fx || {}).error;
    if (e === "steam") fxSteam();
    else if (e === "burst") { var c = orbCenter(); fxSparks(14, c.x, c.y, { speed: 170, spread: Math.PI, heat: 0.5 }); }
  }
  function fxMessenger(target, done) {
    if (!fxEnsure() || !target) { if (done) done(); return; }
    var c = orbCenter(), r = target.getBoundingClientRect();
    FX.parts.push({
      k: "msg", x0: c.x, y0: c.y - 10, x1: r.left + 8, y1: r.top + r.height / 2,
      cx: (c.x + r.left) / 2 + 40, cy: Math.min(c.y, r.top) - 60, age: 0, life: 0.62, done: done, x: c.x, y: c.y
    });
  }
  function fxMove(p, dt, gravity, drag) {
    p.vy += gravity * dt;
    var d = Math.exp(-dt * drag);
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  function fxStep(dt) {
    if (!FX.parts.length) {
      if (FX.cv && FX.cv.width && now() - FX.idleSince > 1200) { FX.cv.width = 0; FX.cv.height = 0; }
      return;
    }
    fxEnsure();
    FX.idleSince = now();
    var ctx = FX.ctx, d = FX.dpr, f = THEME.fx || {}, TAU = Math.PI * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, FX.cv.width, FX.cv.height);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    var next = [];
    for (var i = 0; i < FX.parts.length; i++) {
      var p = FX.parts[i];
      p.age += dt;
      if (p.age < 0) { next.push(p); continue; }
      var k = p.age / p.life;
      if (k >= 1) { if (p.k === "msg" && p.done) p.done(); continue; }
      var fade = Math.min(1, (1 - k) * 1.5), temp = p.heat * (1 - k), px = p.x, py = p.y;
      ctx.globalCompositeOperation = "source-over";
      switch (p.k) {
        case "streak": {   // 불티·빛줄기: 지나간 자리를 짧은 선으로
          p.vy += (f.gravity || 0) * dt;
          var dr = f.drag == null ? 1.2 : f.drag;
          p.vx *= Math.exp(-dt * dr); p.vy *= Math.exp(-dt * dr * 0.5);
          p.x += p.vx * dt; p.y += p.vy * dt;
          var tr = f.trail || 0.012;
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgb(heat(0.35 + 0.65 * temp), fade);
          ctx.lineWidth = p.w * (0.5 + temp);
          ctx.beginPath(); ctx.moveTo(px - p.vx * tr, py - p.vy * tr); ctx.lineTo(p.x, p.y); ctx.stroke();
          break;
        }
        case "bead": {     // 수은 구슬: 무겁게 떨어진다
          fxMove(p, dt, 1150, 0.7);
          var br = p.w * 1.9 * (1 - 0.35 * k);
          var bg = ctx.createRadialGradient(p.x - br * 0.35, p.y - br * 0.4, 0, p.x, p.y, br);
          bg.addColorStop(0, rgb([255, 255, 255], fade)); bg.addColorStop(0.4, rgb(heat(0.72), fade)); bg.addColorStop(1, rgb(heat(0.14), fade));
          ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, TAU); ctx.fill();
          break;
        }
        case "drop": {     // 자성 유체: 튀어 나갔다가 자석에 끌려 돌아온다
          var pull = 60 * Math.max(0, k - 0.18);
          p.vx += (p.ox - p.x) * pull * dt; p.vy += (p.oy - p.y) * pull * dt;
          fxMove(p, dt, 0, 2.6);
          var dr2 = p.w * 1.7 * (1 - 0.5 * k);
          ctx.fillStyle = "rgba(6,8,6," + fade.toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, dr2, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgb(heat(0.8), fade * 0.9); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, dr2, 0, TAU); ctx.stroke();
          break;
        }
        case "bolt": {     // 방전: 제자리에서 번쩍이는 갈지자 선 (프레임마다 모양이 바뀐다)
          var len = 10 + p.w * 11, nx = Math.cos(p.a), ny = Math.sin(p.a);
          ctx.globalCompositeOperation = "lighter";
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          for (var s = 1; s <= 5; s++) {
            var off = (Math.random() - 0.5) * 9 * (s < 5 ? 1 : 0.4);
            ctx.lineTo(p.x + nx * len * s / 5 - ny * off, p.y + ny * len * s / 5 + nx * off);
          }
          ctx.strokeStyle = rgb(heat(0.72), fade * 0.45); ctx.lineWidth = 3.2; ctx.stroke();
          ctx.strokeStyle = rgb(heat(1), fade); ctx.lineWidth = 1; ctx.stroke();
          break;
        }
        case "bubble": {   // 비눗방울: 흔들리며 떠오르다 터진다
          p.vx += Math.sin(p.age * 6 + p.seed) * 46 * dt;
          fxMove(p, dt, -150, 1.7);
          var pop = k > 0.86 ? (k - 0.86) / 0.14 : 0;
          var ur = p.w * 2.5 * (1 + pop * 0.7), ua = (1 - pop) * Math.min(1, k * 9);
          ctx.strokeStyle = rgb(heat(0.4 + 0.5 * ((p.seed * 0.37 + p.age * 0.35) % 1)), ua * 0.95); ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(p.x, p.y, ur, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255," + (ua * 0.75).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, ur * 0.62, -2.5, -1.7); ctx.stroke();
          break;
        }
        case "arc": {      // 자이로: 가운데를 돌던 짧은 호가 바깥으로 풀려 나간다
          var ar = 22 + 78 * (1 - Math.pow(1 - k, 2)) * (0.55 + p.w * 0.3);
          var aa = p.a + (2.4 + p.w) * p.age * (p.seed > 50 ? 1 : -1);
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgb(heat(0.5 + 0.5 * temp), fade); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(p.ox, p.oy, ar, aa, aa + 0.12 + 0.5 * (1 - k)); ctx.stroke();
          break;
        }
        case "dot": {      // 점: 흩어져 떠다니다 깜빡이며 사라진다
          p.vx += Math.cos(p.seed + p.age * 3) * 34 * dt; p.vy += Math.sin(p.seed * 1.7 + p.age * 3.4) * 34 * dt;
          fxMove(p, dt, 0, 2.4);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgb(heat(0.6 + 0.4 * temp), fade * (0.55 + 0.45 * Math.sin(p.age * 22 + p.seed)));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.w * 0.95, 0, TAU); ctx.fill();
          break;
        }
        case "ring": {     // 파문: 한 점에서 퍼지는 고리
          var rr = 8 + 150 * (1 - Math.pow(1 - k, 2.2)) * (0.5 + p.w * 0.3);
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgb(heat(0.82), (1 - k) * (1 - k) * 0.85); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p.ox, p.oy, rr, 0, TAU); ctx.stroke();
          break;
        }
        case "shard": {    // 결정 조각: 돌면서 떨어지고, 면이 빛을 받을 때 번쩍인다
          fxMove(p, dt, 520, 0.9);
          var rot = p.a + p.age * (4 + p.w * 3), sz = 2.2 + p.w * 1.7;
          var glint = Math.pow(Math.max(0, Math.sin(rot * 2 + p.seed)), 6);
          ctx.fillStyle = rgb(heat(0.62 + 0.38 * glint), fade * (0.7 + 0.3 * glint));
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(rot) * sz, p.y + Math.sin(rot) * sz);
          ctx.lineTo(p.x + Math.cos(rot + 2.3) * sz * 0.8, p.y + Math.sin(rot + 2.3) * sz * 0.8);
          ctx.lineTo(p.x + Math.cos(rot + 4.1) * sz * 0.55, p.y + Math.sin(rot + 4.1) * sz * 0.55);
          ctx.closePath(); ctx.fill();
          break;
        }
        case "steam": {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= Math.exp(-dt * 0.8); p.r += dt * 16;
          ctx.fillStyle = "rgba(205,200,196," + (0.32 * (1 - k) * Math.min(1, k * 6)).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
          break;
        }
        case "msg": {      // 방울에서 검색 줄로 날아가는 전령
          var e = 1 - Math.pow(1 - k, 3), u = 1 - e;
          var mx = u * u * p.x0 + 2 * u * e * p.cx + e * e * p.x1, my = u * u * p.y0 + 2 * u * e * p.cy + e * e * p.y1;
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgb(heat(0.95), 0.9); ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
          ctx.fillStyle = rgb(heat(1), 1);
          ctx.beginPath(); ctx.arc(mx, my, 2.6, 0, TAU); ctx.fill();
          if (Math.random() < 0.6) {
            next.push({ k: f.kind === "streak" ? "streak" : "dot", x: mx, y: my, ox: mx, oy: my, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
              life: 0.35, age: 0, heat: 0.8, w: 1, a: 0, seed: Math.random() * 100 });
          }
          p.x = mx; p.y = my;
          break;
        }
      }
      next.push(p);
    }
    FX.parts = next;
    ctx.globalCompositeOperation = "source-over";
  }

  /* 페이지를 읽는 순간: 빛줄 하나가 페이지를 위에서 아래로 훑거나(line), 방울에서 고리가 퍼진다(ring). */
  function scanPage() {
    if (MODE !== "overlay" || REDUCED || !scanEl.animate) return;
    var ring = THEME.scan === "ring", a;
    scanEl.style.display = "block";
    scanBand.style.display = ring ? "none" : "";
    scanRing.style.display = ring ? "" : "none";
    if (ring) {
      var c = orbCenter(), R = Math.hypot(c.x, c.y) + 40;
      scanRing.style.left = c.x + "px"; scanRing.style.top = c.y + "px";
      scanRing.style.width = scanRing.style.height = (R * 2) + "px";
      a = scanRing.animate([
        { transform: "translate(-50%,-50%) scale(.03)", opacity: 1 },
        { transform: "translate(-50%,-50%) scale(1)", opacity: 0.35 }
      ], { duration: 900, easing: "cubic-bezier(.2,.6,.3,1)" });
    } else {
      a = scanBand.animate([
        { transform: "translateY(-185px)", opacity: 0.2 },
        { transform: "translateY(" + Math.round(W.innerHeight * 0.15) + "px)", opacity: 1, offset: 0.18 },
        { transform: "translateY(" + (W.innerHeight + 10) + "px)", opacity: 0.85 }
      ], { duration: 820, easing: "cubic-bezier(.4,.05,.3,1)" });
    }
    a.onfinish = function () { scanEl.style.display = "none"; };
  }

  /* ------------------------------------------------------------ 패널 뼈대 */

  var state = { open: false, expanded: false, busy: false, messages: [], current: null, pendingSel: null, remotePage: null };

  var panel = h("div", { class: "panel", role: "dialog", "aria-label": "페이지 에이전트", "aria-modal": "false" });
  var rimEl = h("div", { class: "rim", "aria-hidden": "true" });
  var nameEl = h("div", { class: "hd-name", text: "페이지 에이전트" });
  var subEl = h("div", { class: "hd-sub" });
  var btnNew = h("button", { class: "ib", type: "button", "aria-label": "새 대화", "data-tip": "새 대화" }, icon("square-pen"));
  var btnExpand = h("button", { class: "ib", type: "button", "aria-label": "창 확대", "data-tip": "창 확대" }, icon("maximize-2"));
  var btnClose = h("button", { class: "ib", type: "button", "aria-label": "닫기", "data-tip": "닫기" }, icon("x"));
  var header = h("div", { class: "hd" }, [
    MODE === "window" ? orbEl : null,
    h("div", { class: "hd-text" }, [nameEl, subEl]),
    h("div", { class: "hd-acts" }, [btnNew, MODE === "window" ? null : btnExpand, btnClose])
  ]);
  var listEl = h("div", { class: "list", role: "log", "aria-live": "polite", tabindex: "-1" });
  var chipsEl = h("div", { class: "chips" });
  var ta = h("textarea", { rows: "1", placeholder: "이 페이지에 대해 물어보세요", "aria-label": "질문 입력", enterkeyhint: "send" });
  var btnSend = h("button", { class: "send", type: "button", "aria-label": "보내기", "data-tip": "보내기" }, icon("arrow-up"));
  var composer = h("div", { class: "composer" }, [chipsEl, h("div", { class: "field" }, [ta, btnSend])]);
  append(panel, [rimEl, header, listEl, composer]);
  root.appendChild(panel);
  if (MODE === "overlay") root.appendChild(orbEl);
  root.appendChild(tipEl);

  /* ------------------------------------------------------------ 툴팁 (1초 머물면) */

  var tipTimer = 0, tipFor = null;
  function hideTip() { clearTimeout(tipTimer); tipFor = null; tipEl.classList.remove("on"); }
  function showTip(el) {
    var text = el.getAttribute("data-tip");
    if (!text || !el.isConnected) return;
    tipEl.textContent = text;
    tipEl.classList.add("on");
    var r = el.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
    var x = clamp(r.left + r.width / 2 - tr.width / 2, 8, W.innerWidth - tr.width - 8);
    var y = r.top - tr.height - 8;
    if (y < 8) y = r.bottom + 8;
    tipEl.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
  }
  root.addEventListener("pointerover", function (e) {
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el === tipFor) return;
    hideTip();
    if (!el || e.pointerType === "touch") return;
    tipFor = el;
    tipTimer = setTimeout(function () { showTip(el); }, 1000);
  });
  root.addEventListener("pointerout", function (e) {
    if (tipFor && !(e.relatedTarget && tipFor.contains(e.relatedTarget))) hideTip();
  });
  root.addEventListener("pointerdown", hideTip, true);
  root.addEventListener("focusout", hideTip);

  /* ------------------------------------------------------------ 페이지 읽기 */

  function norm(s) {
    return String(s || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  }
  function metaDesc() {
    var m = D.querySelector('meta[name="description"],meta[property="og:description"]');
    return m ? (m.getAttribute("content") || "").slice(0, 500) : "";
  }
  function framesText(budget) {
    var out = [];
    for (var i = 0; i < W.frames.length && budget > 0; i++) {
      try {
        var fd = W.frames[i].document, t = norm(fd.body ? fd.body.innerText : "");
        if (t) { out.push("[프레임 " + (i + 1) + (fd.title ? ": " + fd.title : "") + "]\n" + t.slice(0, budget)); budget -= t.length; }
      } catch (e) { /* 다른 출처의 프레임은 읽을 수 없다 */ }
    }
    return out.join("\n\n");
  }
  function visibleText(limit) {
    if (!D.body) return "";
    var vw = W.innerWidth, vh = W.innerHeight, out = [], size = 0, seen = 0, cache = new Map(), lastBlock = null;
    var walker = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT);
    var skip = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|TEXTAREA)$/;
    while (walker.nextNode() && size < limit && seen < 30000) {
      seen++;
      var n = walker.currentNode, txt = n.nodeValue;
      if (!txt || !/\S/.test(txt)) continue;
      var el = n.parentElement;
      if (!el || skip.test(el.tagName)) continue;
      var vis = cache.get(el);
      if (vis === undefined) {
        var r = el.getBoundingClientRect();
        vis = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
        if (vis && el.checkVisibility) vis = el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        cache.set(el, vis);
      }
      if (!vis) continue;
      var block = el.closest("p,li,h1,h2,h3,h4,h5,h6,td,th,pre,blockquote,dd,dt,figcaption,label,div,section,article");
      txt = txt.replace(/\s+/g, " ").trim();
      out.push((block !== lastBlock && out.length ? "\n" : " ") + txt);
      lastBlock = block;
      size += txt.length + 1;
    }
    return norm(out.join("")).slice(0, limit);
  }
  function capturePage() {
    var MAX = 60000, body = "", main = "";
    try { body = norm(D.body ? D.body.innerText : ""); } catch (e) { body = ""; }
    var text = body;
    if (body.length > MAX) {
      var best = null, bestLen = 0;
      D.querySelectorAll("main,article,[role=main]").forEach(function (el) {
        var l = (el.innerText || "").length;
        if (l > bestLen) { best = el; bestLen = l; }
      });
      if (best && bestLen > 800) { main = norm(best.innerText); text = main; }
    }
    if (text.length < MAX) {
      var ft = framesText(MAX - text.length);
      if (ft) text = text ? text + "\n\n" + ft : ft;
    }
    var vis = "";
    try { vis = visibleText(6000); } catch (e) { vis = ""; }
    return {
      url: location.href, title: D.title || "", lang: D.documentElement.lang || "", description: metaDesc(),
      selection: state.pendingSel ? state.pendingSel.text : "", visible: vis,
      text: text.slice(0, MAX), textLength: text.length
    };
  }

  /* 새 창 모드: 원래 페이지가 보내 주는 내용을 받는다. */
  var pageWaiters = [];
  function readHashPage() {
    var q = {};
    String(location.hash || "").replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i > 0) { try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* ignore */ } }
    });
    return q.u ? { url: q.u, title: q.t || "", text: "", via: "hash" } : null;
  }
  if (MODE === "window") {
    state.remotePage = readHashPage();
    W.addEventListener("message", function (e) {
      var m = e.data;
      if (!m || m.type !== "page-agent:page" || !m.page) return;
      if (W.opener && e.source !== W.opener) return;
      state.remotePage = m.page;
      renderChips();
      updateSub();
      var ws = pageWaiters; pageWaiters = [];
      ws.forEach(function (f) { f(m.page); });
    });
    if (W.opener) { try { W.opener.postMessage({ type: "page-agent:hello" }, "*"); } catch (e) { /* 끊긴 창 */ } }
  }
  function requestPage() {
    return new Promise(function (resolve) {
      if (MODE !== "window") { resolve(capturePage()); return; }
      if (!W.opener) { resolve(state.remotePage); return; }
      var done = false;
      pageWaiters.push(function (p) { if (!done) { done = true; resolve(p); } });
      try { W.opener.postMessage({ type: "page-agent:need-page" }, "*"); } catch (e) { /* ignore */ }
      setTimeout(function () { if (!done) { done = true; resolve(state.remotePage); } }, 800);
    });
  }

  /* 페이지에서 고른 글: 입력창을 누르면 선택이 풀리므로 고를 때마다 기억해 둔다. */
  if (MODE === "overlay") {
    D.addEventListener("selectionchange", function () {
      var sel = W.getSelection && W.getSelection();
      if (!sel || sel.isCollapsed) return;
      var node = sel.anchorNode;
      if (node && (node === host || host.contains(node))) return;
      var text = String(sel).trim();
      if (text.length < 2) return;
      var prev = state.pendingSel;
      state.pendingSel = { text: text.slice(0, 8000), at: Date.now() };
      if (state.open && (!prev || prev.text !== state.pendingSel.text)) {
        clearTimeout(state.selTimer);
        state.selTimer = setTimeout(function () { renderChips(true); kick(0.05); }, 140);
      }
    });
  }

  /* ------------------------------------------------------------ 마크다운 → DOM */

  // 재귀 호출이 lastIndex를 건드리지 않도록 호출마다 새 RegExp를 만든다.
  var INLINE_SRC = /(\(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)\))|(\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\))|(\*\*([^*\n]+?)\*\*)|(__([^_\n]+?)__)|(~~([^~\n]+?)~~)|(\*([^*\s][^*\n]*?)\*)|(https?:\/\/[^\s<>()\[\]]+[^\s<>()\[\].,;:!?'"])/.source;
  function inline(text) {
    var frag = D.createDocumentFragment();
    var parts = String(text).split(/(`[^`\n]+`)/);
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (!seg) continue;
      if (i % 2 === 1) { frag.appendChild(h("code", { text: seg.slice(1, -1) })); continue; }
      var last = 0, m, re = new RegExp(INLINE_SRC, "g");
      while ((m = re.exec(seg))) {
        if (m.index > last) frag.appendChild(D.createTextNode(seg.slice(last, m.index)));
        last = re.lastIndex;
        if (m[1]) {
          var cu = safeUrl(m[3]);
          frag.appendChild(cu ? h("a", { class: "cite", href: cu, target: "_blank", rel: "noopener noreferrer", "data-tip": cleanUrl(cu) }, m[2].replace(/^www\./, "")) : D.createTextNode(m[0]));
        } else if (m[4]) {
          var u = safeUrl(m[6]);
          frag.appendChild(u ? h("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, inline(m[5])) : D.createTextNode(m[0]));
        } else if (m[7]) frag.appendChild(h("strong", null, inline(m[8])));
        else if (m[9]) frag.appendChild(h("strong", null, inline(m[10])));
        else if (m[11]) frag.appendChild(h("s", null, inline(m[12])));
        else if (m[13]) frag.appendChild(h("em", null, inline(m[14])));
        else if (m[15]) frag.appendChild(h("a", { href: m[15], target: "_blank", rel: "noopener noreferrer" }, cleanUrl(m[15])));
      }
      if (last < seg.length) frag.appendChild(D.createTextNode(seg.slice(last)));
    }
    return frag;
  }

  var LI_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  function isTable(lines, i) { return lines[i].indexOf("|") >= 0 && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]); }
  function cells(line) { return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); }); }
  function blockStart(lines, i) {
    var l = lines[i];
    return /^\s*(```|~~~)/.test(l) || /^#{1,6}\s/.test(l) || /^\s*>/.test(l) || LI_RE.test(l) || isTable(lines, i) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
  }
  function parseList(lines, i) {
    var m = lines[i].match(LI_RE), base = m[1].length, ordered = /\d/.test(m[2]);
    var list = h(ordered ? "ol" : "ul");
    if (ordered && parseInt(m[2], 10) !== 1) list.setAttribute("start", String(parseInt(m[2], 10)));
    while (i < lines.length) {
      m = lines[i].match(LI_RE);
      if (!m) {
        if (lines[i].trim() && /^\s+/.test(lines[i]) && list.lastChild) {
          list.lastChild.appendChild(h("br")); list.lastChild.appendChild(inline(lines[i].trim())); i++; continue;
        }
        break;
      }
      var ind = m[1].length;
      if (ind < base) break;
      if (ind > base + 1) {
        var sub = parseList(lines, i);
        (list.lastChild || list).appendChild(sub.node);
        i = sub.next; continue;
      }
      if (/\d/.test(m[2]) !== ordered) break;
      list.appendChild(h("li", null, inline(m[3])));
      i++;
    }
    return { node: list, next: i };
  }
  function md(src) {
    var frag = D.createDocumentFragment(), lines = String(src).replace(/\r/g, "").split("\n"), i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!/\S/.test(line)) { i++; continue; }
      var fence = line.match(/^\s*(```|~~~)\s*([\w+#.-]*)/);
      if (fence) {
        var code = []; i++;
        while (i < lines.length && lines[i].trim().indexOf(fence[1]) !== 0) code.push(lines[i++]);
        i++;
        frag.appendChild(h("pre", null, h("code", { "data-lang": fence[2] || null, text: code.join("\n") })));
        continue;
      }
      var hd = line.match(/^(#{1,6})\s+(.*)$/);
      if (hd) { frag.appendChild(h("h" + Math.min(4, hd[1].length), null, inline(hd[2].replace(/\s+#+\s*$/, "")))); i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { frag.appendChild(h("hr")); i++; continue; }
      if (/^\s*>/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
        frag.appendChild(h("blockquote", null, md(q.join("\n"))));
        continue;
      }
      if (isTable(lines, i)) {
        var head = cells(lines[i]); i += 2;
        var tbody = h("tbody");
        while (i < lines.length && lines[i].indexOf("|") >= 0 && /\S/.test(lines[i])) {
          var row = cells(lines[i++]);
          tbody.appendChild(h("tr", null, head.map(function (_, k) { return h("td", null, inline(row[k] || "")); })));
        }
        frag.appendChild(h("div", { class: "tbl" }, h("table", null, [
          h("thead", null, h("tr", null, head.map(function (c) { return h("th", null, inline(c)); }))), tbody])));
        continue;
      }
      if (LI_RE.test(line)) { var lst = parseList(lines, i); frag.appendChild(lst.node); i = lst.next; continue; }
      var p = h("p"), first = true;
      while (i < lines.length && /\S/.test(lines[i]) && (first || !blockStart(lines, i))) {
        if (!first) p.appendChild(h("br"));
        p.appendChild(inline(lines[i].trim()));
        first = false; i++;
      }
      frag.appendChild(p);
    }
    return frag;
  }
  /* 빈 줄로 블록을 나눈다. 마지막 블록이 아직 쓰이는 중이면 open. */
  function splitBlocks(src) {
    var lines = src.split("\n"), blocks = [], cur = [], fence = null;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i], f = l.match(/^\s*(```|~~~)/);
      if (f) fence = fence ? (l.trim().indexOf(fence) === 0 ? null : fence) : f[1];
      if (!fence && !/\S/.test(l)) {
        // 마지막 줄은 아직 쓰이는 중이다. 줄바꿈 하나로 블록을 닫지 않는다 ("\n\n"이어야 닫힘).
        if (i === lines.length - 1) continue;
        if (cur.length) { blocks.push(cur.join("\n")); cur = []; }
        continue;
      }
      cur.push(l);
    }
    var open = cur.length > 0;
    if (open) blocks.push(cur.join("\n"));
    return { blocks: blocks, open: open };
  }

  /* ------------------------------------------------------------ 흐르는 답 (뜨거운 꼬리) */

  var HOT_MS = 900;
  function LiveText(el) {
    this.el = el; this.src = ""; this.done = 0; this.ended = false; this.dirty = false;
    this.live = h("div", { class: "lv" }); el.appendChild(this.live);
    this.arr = []; this.lastLen = 0; this.cool = false;
  }
  LiveText.prototype.push = function (t) { this.src += t; this.dirty = true; };
  LiveText.prototype.end = function () { this.ended = true; this.dirty = true; };
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  LiveText.prototype.frame = function (t) {
    var sb = splitBlocks(this.src);
    var closed = this.ended ? sb.blocks.length : sb.blocks.length - (sb.open ? 1 : 0);
    var hotLeft = this.arr.length > 0 && t - this.arr[this.arr.length - 1].t < HOT_MS;
    // 끝났어도 마지막 블록은 다 식을 때까지 라이브로 둔다
    var finalUpTo = (this.ended && hotLeft && !REDUCED) ? Math.max(this.done, closed - 1) : closed;
    var finalized = false;
    while (this.done < finalUpTo) {
      clear(this.live);
      this.el.insertBefore(md(sb.blocks[this.done]), this.live);
      this.done++;
      this.arr = []; this.lastLen = 0; finalized = true;
    }
    var liveSrc = this.done < sb.blocks.length ? sb.blocks[this.done] : "";
    var allDone = this.ended && this.done >= sb.blocks.length;
    if (allDone && !this.rebuilt) {
      // 끝나면 원문 전체로 한 번 다시 그려, 조각 렌더링에서 생긴 어긋남이 남지 않게 한다.
      this.rebuilt = true;
      clear(this.el);
      this.el.appendChild(md(this.src));
      return true;
    }
    if (!(this.dirty || finalized || hotLeft)) return allDone;
    this.dirty = false;
    clear(this.live);
    if (liveSrc) {
      this.live.appendChild(md(this.ended ? liveSrc : closeOpenMarks(liveSrc)));
      var L = this.live.textContent.length;
      if (L > this.lastLen) { this.arr.push({ len: L, t: t }); this.lastLen = L; }
      if (!REDUCED) applyHeat(this.live, this.arr, t);
      if (!this.ended) addBead(this.live);
    }
    return allDone && !liveSrc;
  };
  /* 쓰이는 중인 문단의 닫히지 않은 `, **, * 를 임시로 닫아 기호가 그대로 보이지 않게 한다.
     순서: 끝에 홀로 온 * 제거 → 굵게 닫기 → 기울임 닫기. 줄 머리의 "* " 목록 기호는 세지 않는다. */
  function closeOpenMarks(src) {
    if (/^\s*(```|~~~)/.test(src)) return src;
    var noCode = src.replace(/`[^`\n]*`/g, "");
    if ((noCode.match(/`/g) || []).length % 2) return src + "`";
    if (/(^|[^*])\*$/.test(src)) { src = src.slice(0, -1); noCode = noCode.slice(0, -1); }
    var bold = (noCode.match(/\*\*/g) || []).length;
    if (bold % 2) {
      if (/\*\*\s*$/.test(src)) return src.replace(/\*\*\s*$/, "");
      src += "**"; noCode += "**";
    }
    var single = (noCode.replace(/^\s*\*\s/gm, "").replace(/\*\*/g, "").match(/\*/g) || []).length;
    if (single % 2) src += "*";
    return src;
  }
  function ageAt(arr, idx, t) {
    for (var i = 0; i < arr.length; i++) if (idx < arr[i].len) return t - arr[i].t;
    return HOT_MS;
  }
  function heatColorForAge(age) {
    var k = clamp(1 - age / HOT_MS, 0, 1);
    if (k <= 0) return rgb(TEXT_RGB);
    var hc = heat(0.62 + 0.38 * k);
    return rgb(mix(TEXT_RGB, hc, Math.pow(k, 0.7)));
  }
  function applyHeat(container, arr, t) {
    if (!arr.length) return;
    var coolLen = 0;
    for (var i = arr.length - 1; i >= 0; i--) { if (t - arr[i].t >= HOT_MS) { coolLen = arr[i].len; break; } }
    var total = arr[arr.length - 1].len;
    if (coolLen >= total) return;
    var walker = D.createTreeWalker(container, NodeFilter.SHOW_TEXT), pos = 0, nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var len = n.nodeValue.length, start = pos, end = pos + len;
      pos = end;
      if (end <= coolLen || !len) return;
      var from = Math.max(0, coolLen - start), hotNode = from > 0 ? n.splitText(from) : n;
      var a = ageAt(arr, start + from, t), b = ageAt(arr, end - 1, t);
      var span = h("span", { class: "hot" });
      span.style.backgroundImage = "linear-gradient(90deg," + heatColorForAge(a) + "," + heatColorForAge(b) + ")";
      hotNode.parentNode.replaceChild(span, hotNode);
      span.appendChild(hotNode);
    });
  }
  function addBead(container) {
    var el = container, blocky = /^(P|LI|UL|OL|BLOCKQUOTE|TABLE|TBODY|THEAD|TR|TD|TH|DIV|PRE|H1|H2|H3|H4)$/;
    while (el.lastElementChild && blocky.test(el.lastElementChild.tagName)) el = el.lastElementChild;
    if (el.tagName === "PRE" && el.lastElementChild) el = el.lastElementChild;
    if (el === container) el = container.appendChild(h("p"));
    el.appendChild(h("span", { class: "bead", "aria-hidden": "true" }));
  }

  /* ------------------------------------------------------------ 메시지 그리기 */

  function cast(el, delay) {
    if (!el || REDUCED) return;
    el.classList.remove("cast");
    void el.offsetWidth;
    el.style.animationDelay = (delay || 0) + "ms";
    el.classList.add("cast");
    setTimeout(function () { el.classList.remove("cast"); el.style.animationDelay = ""; }, (delay || 0) + 1000);
  }
  function scrollDown(force) {
    var nearBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 140;
    if (force || nearBottom) listEl.scrollTop = listEl.scrollHeight;
  }

  function renderEmpty() {
    var page = MODE === "window" ? state.remotePage : { title: D.title, url: location.href };
    var title = page && (page.title || hostOf(page.url));
    var sugs = [
      ["이 페이지 핵심만 3줄로 요약해줘", true],
      ["중요한 숫자·날짜·이름만 표로 정리해줘", true],
      ["이 주제의 최신 소식을 웹에서 찾아줘", false]
    ];
    var tEl = h("div", { class: "empty-title", text: page && page.url ? "이 페이지를 읽고 답합니다" : "무엇이든 물어보세요" });
    var sEl = h("div", { class: "empty-sub", text: title ? "지금 페이지: " + title : "웹 검색으로 최신 정보도 찾아 드립니다." });
    var box = h("div", { class: "empty" }, [tEl, sEl, h("div", { class: "sugs" }, sugs.map(function (s, i) {
      var b = h("button", { class: "sug", type: "button", text: s[0], onclick: function () { submit(s[0]); } });
      return b;
    }))]);
    listEl.appendChild(box);
    return box;
  }

  function renderUser(m, animate) {
    var bubble = h("div", { class: "bubble", text: m.content });
    var tag = m.sel ? h("div", { class: "tag" }, [icon("text-select", 14), "선택한 부분 포함"]) : null;
    var el = h("div", { class: "msg me" }, [bubble, tag]);
    listEl.appendChild(el);
    if (animate && !REDUCED && el.animate) {
      el.animate([{ transform: "translateY(18px) scale(.97)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: SPRING_DROP.dur, easing: SPRING_DROP.ease });
      cast(bubble, 0);
    }
    return el;
  }

  var SEG_HEAT = { read: 0.46, think: 0.62, search: 0.74, answer: 0.88 };
  function assistantView(m) {
    var strip = h("div", { class: "strip", "aria-hidden": "true" });
    var logText = h("div", { class: "log-text" });
    var log = h("div", { class: "log" }, [strip, logText]);
    var searches = h("div", { class: "searches" });
    var mdEl = h("div", { class: "md" });
    var after = h("div");
    var el = h("div", { class: "msg ai" }, [log, searches, mdEl, after]);
    listEl.appendChild(el);
    return { el: el, strip: strip, logText: logText, searches: searches, md: mdEl, after: after, segs: [], chips: {}, label: "" };
  }
  function setLabel(v, text) {
    if (v.label === text) return;
    v.label = text;
    var span = h("span", { text: text });
    while (v.logText.firstChild) v.logText.removeChild(v.logText.firstChild);
    v.logText.appendChild(span);
    if (!REDUCED && span.animate && text) {
      span.animate([{ transform: "translateY(70%)", opacity: 0, filter: "blur(2px)" }, { transform: "none", opacity: 1, filter: "none" }],
        { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" });
    }
  }
  function seg(v, kind) {
    var t = now(), last = v.segs[v.segs.length - 1];
    if (last && last.kind === kind) return;
    if (last) last.end = t;
    var bar = h("i", { "data-k": kind });
    bar.style.background = rgb(heat(SEG_HEAT[kind]));
    v.strip.appendChild(bar);
    v.segs.push({ kind: kind, start: t, end: 0, bar: bar });
  }
  function tickSegs(v, t) {
    v.segs.forEach(function (s) { s.bar.style.flexGrow = String(Math.max(1, ((s.end || t) - s.start))); });
  }
  function summarize(segs, searchCount, totalMs) {
    var think = 0, answer = 0;
    segs.forEach(function (s) { var d = (s.end || now()) - s.start; if (s.kind === "think" || s.kind === "read") think += d; if (s.kind === "answer") answer += d; });
    var parts = [];
    if (think > 150) parts.push("생각 " + fmtSec(think));
    if (searchCount) parts.push("웹 검색 " + searchCount + "회");
    if (answer > 150) parts.push("답변 " + fmtSec(answer));
    parts.push("전체 " + fmtSec(totalMs));
    return parts.join(" · ");
  }
  function addSearchChip(v, id) {
    var q = h("span", { class: "q" });
    var row = h("div", { class: "sq live", role: "status", "aria-label": "웹 검색 중" }, [icon("search", 16), q]);
    v.searches.appendChild(row);
    v.chips[id] = { row: row, q: q };
    if (!REDUCED && row.animate) row.animate([{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" });
    return row;
  }
  function searchLabel(ev) {
    if (ev.kind === "open_page" && ev.url) return "페이지 열람: " + hostOf(ev.url);
    if (ev.kind === "find_in_page" && ev.url) return "페이지에서 찾기: " + hostOf(ev.url);
    return ev.query || "웹 검색";
  }
  function renderSources(v, m, animate) {
    if (!m.sources || !m.sources.length) return;
    var box = h("div", { class: "sources" });
    m.sources.slice(0, 8).forEach(function (s, i) {
      var a = h("a", { class: "src", href: s.url, target: "_blank", rel: "noopener noreferrer", "data-tip": (s.title ? s.title + " · " : "") + cleanUrl(s.url) },
        [h("b", { text: String(i + 1) }), h("span", { text: (hostOf(s.url).replace(/^www\./, "")) + (s.title ? " · " + s.title : "") })]);
      box.appendChild(a);
      if (animate && !REDUCED && a.animate) {
        a.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
          { duration: 360, delay: i * 55, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
        cast(a.lastChild, i * 55);
      }
    });
    v.after.appendChild(box);
  }
  function renderTools(v, m) {
    var btn = h("button", { class: "ib", type: "button", "aria-label": "답변 복사", "data-tip": "답변 복사" }, icon("copy"));
    btn.addEventListener("click", function () {
      copyText(m.content);
      setIcon(btn, "check");
      btn.setAttribute("aria-label", "복사했어요");
      kick(0.05);
      setTimeout(function () { setIcon(btn, "copy"); btn.setAttribute("aria-label", "답변 복사"); }, 1500);
    });
    v.after.appendChild(h("div", { class: "tools" }, btn));
  }
  function copyText(text) {
    if (navigator.clipboard && W.isSecureContext) { navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); }); return; }
    legacyCopy(text);
  }
  function legacyCopy(text) {
    var t = h("textarea", { style: { position: "fixed", left: "-9999px", top: "0" } });
    t.value = text; root.appendChild(t); t.select();
    try { D.execCommand("copy"); } catch (e) { /* ignore */ }
    root.removeChild(t);
  }
  function renderError(v, m) {
    var e = m.error;
    var acts = h("div", { class: "err-acts" }, [
      h("button", { class: "btn", type: "button", onclick: function () { retry(m); } }, [icon("rotate-ccw", 16), "다시 시도"]),
      e.kind === "network" && MODE === "overlay" ? h("button", { class: "btn", type: "button", onclick: openPopup }, [icon("app-window", 16), "새 창으로 열기"]) : null
    ]);
    v.after.appendChild(h("div", { class: "err", role: "alert" }, [icon("circle-alert", 18), h("div", { class: "err-body" }, [
      h("div", { text: e.message }), e.detail ? h("div", { class: "err-detail", text: e.detail }) : null, acts])]));
  }
  function renderAssistantStatic(m) {
    var v = assistantView(m);
    if (m.log && m.log.segs) {
      m.log.segs.forEach(function (s) {
        var bar = h("i", { "data-k": s.kind }); bar.style.background = rgb(heat(SEG_HEAT[s.kind] || 0.6)); bar.style.flexGrow = String(Math.max(1, s.ms));
        v.strip.appendChild(bar);
      });
      v.logText.appendChild(h("span", { text: m.log.text || "" }));
    }
    (m.searches || []).forEach(function (q) {
      v.searches.appendChild(h("div", { class: "sq" }, [icon("search", 16), h("span", { class: "q", text: q })]));
    });
    if (m.content) v.md.appendChild(md(m.content));
    if (m.stopped) v.after.appendChild(h("div", { class: "notice", text: "여기서 중단했어요." }));
    if (m.notice) v.after.appendChild(h("div", { class: "notice", text: m.notice }));
    renderSources(v, m, false);
    if (m.error) renderError(v, m);
    else if (m.content) renderTools(v, m);
    m.view = v;
    return v;
  }

  function renderAll() {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    if (!state.messages.length) { renderEmpty(); return; }
    state.messages.forEach(function (m) { if (m.role === "user") m.view = { el: renderUser(m, false) }; else renderAssistantStatic(m); });
    listEl.scrollTop = listEl.scrollHeight;
  }

  /* ------------------------------------------------------------ 입력부 */

  function updateSub() {
    var page = MODE === "window" ? state.remotePage : { title: D.title, url: location.href };
    subEl.textContent = page && page.url ? (hostOf(page.url) || page.url) + (page.title ? " · " + page.title : "") : "연결된 페이지 없음";
  }
  function renderChips(flashSel) {
    while (chipsEl.firstChild) chipsEl.removeChild(chipsEl.firstChild);
    var page = MODE === "window" ? state.remotePage : { title: D.title, url: location.href, text: "1" };
    if (page && page.url) {
      var label = page.title || hostOf(page.url);
      var noBody = MODE === "window" && !page.text;
      chipsEl.appendChild(h("span", { class: "chip page", "data-tip": noBody ? "본문 없이 주소와 제목만 받았어요" : "질문할 때 이 페이지 내용을 함께 보냅니다" },
        [icon(noBody ? "globe" : "file-text", 15), h("span", { text: label })]));
    }
    var sel = state.pendingSel || (MODE === "window" && page && page.selection ? { text: page.selection } : null);
    if (sel && sel.text) {
      var x = h("button", { class: "x", type: "button", "aria-label": "선택한 부분 빼기", "data-tip": "선택한 부분 빼기" }, icon("x", 14));
      x.addEventListener("click", function () { state.pendingSel = null; if (state.remotePage) state.remotePage.selection = ""; renderChips(); ta.focus(); });
      var chip = h("span", { class: "chip sel" }, [icon("text-select", 15), h("span", { text: "선택한 부분 " + sel.text.length.toLocaleString() + "자" }), x]);
      chipsEl.appendChild(chip);
      if (flashSel && !REDUCED) { chip.classList.add("flash"); cast(chip.children[1], 0); }
    }
  }
  function flashPageChip() {
    var c = chipsEl.querySelector(".chip.page");
    if (!c || REDUCED) return;
    c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
  }
  function autosize() {
    ta.style.height = "38px";
    ta.style.height = Math.min(170, Math.max(38, ta.scrollHeight)) + "px";
  }
  function updateSend() {
    btnSend.classList.toggle("ready", !state.busy && !!ta.value.trim());
    btnSend.classList.toggle("stop", state.busy);
  }
  function setBusy(b) {
    state.busy = b;
    var want = b ? "square" : "arrow-up";
    if (btnSend.getAttribute("data-icon") !== want) { setIcon(btnSend, want); btnSend.setAttribute("data-icon", want); }
    btnSend.setAttribute("aria-label", b ? "답변 멈추기" : "보내기");
    btnSend.setAttribute("data-tip", b ? "멈추기" : "보내기");
    updateSend();
  }
  btnSend.setAttribute("data-icon", "arrow-up");

  ta.addEventListener("input", function () {
    autosize(); updateSend();
    if (!REDUCED) { P.vsx += (Math.random() > 0.5 ? 0.35 : -0.35); kick(0.018); }
  });
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submit(ta.value);
    }
  });
  ta.addEventListener("focus", function () { if (!state.busy && P.phase === "idle") setPhase("listening"); });
  ta.addEventListener("blur", function () { if (P.phase === "listening") setPhase("idle"); });
  btnSend.addEventListener("click", function () { if (state.busy) stop(); else submit(ta.value); });

  /* ------------------------------------------------------------ 대화 */

  function history() {
    return state.messages.filter(function (m) { return !m.pending && !(m.role === "assistant" && (m.error || !m.content)); })
      .map(function (m) { return { role: m.role, content: m.content, page: m.page || null }; });
  }

  function submit(text) {
    text = String(text || "").trim();
    if (!text || state.busy) return;
    var empty = listEl.querySelector(".empty");
    if (empty) empty.remove();
    var page = MODE === "window" ? state.remotePage : { url: location.href, title: D.title };
    var um = { role: "user", content: text, page: page ? { url: page.url, title: page.title } : null, sel: !!(state.pendingSel || (page && page.selection)) };
    state.messages.push(um);
    um.view = { el: renderUser(um, true) };
    ta.value = ""; autosize();
    scrollDown(true);
    run();
  }

  function run() {
    var am = { role: "assistant", content: "", sources: [], searches: [], pending: true };
    state.messages.push(am);
    var v = assistantView(am);
    v.el.setAttribute("aria-busy", "true");
    am.view = v;
    var live = new LiveText(v.md);
    var cur = { am: am, v: v, live: live, ctrl: W.AbortController ? new AbortController() : null, started: now(), searching: 0, searchCount: 0, finished: false };
    state.current = cur;
    setBusy(true);
    setPhase("reading");
    seg(v, "read");
    setLabel(v, "페이지 읽는 중");
    kick(0.12, 0.8);
    scanPage();
    flashPageChip();
    scrollDown(true);

    requestPage().then(function (page) {
      if (cur.finished) return;
      if (state.pendingSel && page && MODE === "overlay") page.selection = state.pendingSel.text;
      var hist = history();
      state.pendingSel = null;
      if (MODE === "window" && state.remotePage) state.remotePage.selection = "";
      renderChips();
      var opts = { method: "POST", headers: { "content-type": "text/plain;charset=UTF-8" }, body: JSON.stringify({ messages: hist, page: page }) };
      if (cur.ctrl) opts.signal = cur.ctrl.signal;
      if (TAS) opts.targetAddressSpace = TAS;
      return fetch(SERVER + "/api/chat", opts).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            var msg = "서버가 요청을 처리하지 못했어요 (" + res.status + ").";
            try { var j = JSON.parse(t); if (j.error) msg = j.error; } catch (e) { /* ignore */ }
            throw { kind: "server", message: msg };
          });
        }
        if (!res.body || !res.body.getReader) throw { kind: "server", message: "이 브라우저는 스트리밍 응답을 읽지 못해요." };
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { if (!cur.finished) finish(cur); return; }
            buf += dec.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf("\n\n")) >= 0) {
              var chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
              chunk.split("\n").forEach(function (line) {
                if (line.indexOf("data:") !== 0) return;
                var ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { return; }
                handle(cur, ev);
              });
            }
            if (cur.finished) { try { reader.cancel(); } catch (e) { /* ignore */ } return; }
            return pump();
          });
        }
        return pump();
      });
    }).catch(function (err) {
      if (cur.finished) return;
      if (err && err.name === "AbortError") { stopped(cur); return; }
      if (err && err.kind) { fail(cur, err.message, err.detail || "", err.kind); return; }
      var https = location.protocol === "https:" && /^http:/i.test(SERVER);
      fail(cur, "에이전트 서버(" + hostOf(SERVER) + ")에 연결하지 못했어요.",
        https && MODE === "overlay"
          ? "https 페이지에서는 브라우저가 사내 서버 접근을 막을 수 있어요. 주소창 왼쪽 아이콘의 '로컬 네트워크 액세스'를 허용하거나 새 창으로 열어 보세요."
          : "서버 PC에서 에이전트가 켜져 있는지 확인해 주세요.", "network");
    });
  }

  function handle(cur, ev) {
    if (cur.finished) return;
    var v = cur.v, am = cur.am;
    switch (ev.type) {
      case "start":
      case "phase":
        if (P.phase === "reading") { setPhase("thinking"); seg(v, "think"); setLabel(v, "생각하는 중"); }
        break;
      case "search":
        if (ev.status === "in_progress") {
          cur.searching++;
          setPhase("searching"); seg(v, "search"); setLabel(v, "웹 검색 중");
          var row = addSearchChip(v, ev.id);
          var c = orbCenter();
          fxSparks(10, c.x, c.y - 6, { speed: 260 });
          fxMessenger(row, function () { if (row.isConnected) row.classList.add("lit"); });
          scrollDown();
        } else if (ev.status === "completed") {
          cur.searching = Math.max(0, cur.searching - 1);
          cur.searchCount++;
          var chip = v.chips[ev.id] || { row: addSearchChip(v, ev.id), q: null };
          if (!chip.q) chip.q = chip.row.querySelector(".q");
          var label = searchLabel(ev);
          chip.q.textContent = label;
          chip.row.classList.remove("live");
          chip.row.removeAttribute("aria-label");
          cast(chip.q, 0);
          chip.row.classList.add("lit");
          am.searches.push(label);
          if (!cur.searching && P.phase === "searching") { setPhase("thinking"); seg(v, "think"); setLabel(v, "찾은 내용을 읽는 중"); }
        }
        break;
      case "delta":
        if (P.phase !== "answering") { setPhase("answering"); seg(v, "answer"); setLabel(v, "답변하는 중"); }
        am.content += ev.text;
        cur.live.push(ev.text);
        if (!REDUCED) { kick(0.012); P.vsy += 0.18; }
        break;
      case "cite":
        var u = cleanUrl(ev.url);
        if (!am.sources.some(function (s) { return cleanUrl(s.url) === u; })) am.sources.push({ url: ev.url, title: ev.title || "" });
        break;
      case "notice":
        am.notice = ev.message;
        break;
      case "error":
        fail(cur, ev.message || "답을 만들지 못했어요.", ev.detail || "", "upstream");
        break;
      case "done":
        finish(cur);
        break;
    }
  }

  function closeSegs(cur) {
    var t = now();
    cur.v.segs.forEach(function (s) { if (!s.end) s.end = t; });
    tickSegs(cur.v, t);
  }
  function wrapUp(cur) {
    cur.finished = true;
    cur.v.el.removeAttribute("aria-busy");
    if (state.current === cur) state.current = null;
    closeSegs(cur);
    cur.live.end();
    var am = cur.am;
    am.pending = false;
    am.log = { segs: cur.v.segs.map(function (s) { return { kind: s.kind, ms: Math.round(s.end - s.start) }; }) };
    setBusy(false);
  }
  function finish(cur) {
    if (cur.finished) return;
    var total = now() - cur.started;
    wrapUp(cur);
    var am = cur.am, v = cur.v;
    if (!am.content.trim()) { failAfter(cur, "모델이 빈 답을 보냈어요. 다시 시도해 주세요.", "", "upstream"); return; }
    am.log.text = summarize(v.segs, cur.searchCount, total);
    setLabel(v, am.log.text);
    if (am.notice) v.after.appendChild(h("div", { class: "notice", text: am.notice }));
    renderSources(v, am, true);
    renderTools(v, am);
    setPhase(ta === shadow.activeElement ? "listening" : "idle");
    if (!state.open) { P.unread = true; orbEl.classList.add("unread"); }
    save();
    scrollDown();
  }
  function stopped(cur) {
    if (cur.finished) return;
    var total = now() - cur.started;
    wrapUp(cur);
    cur.am.stopped = true;
    cur.am.log.text = summarize(cur.v.segs, cur.searchCount, total) + " · 중단";
    setLabel(cur.v, cur.am.log.text);
    cur.v.after.appendChild(h("div", { class: "notice", text: "여기서 중단했어요." }));
    if (cur.am.content) renderTools(cur.v, cur.am);
    setPhase("idle");
    save();
  }
  function fail(cur, message, detail, kind) {
    if (cur.finished) return;
    wrapUp(cur);
    failAfter(cur, message, detail, kind);
  }
  function failAfter(cur, message, detail, kind) {
    var am = cur.am;
    am.error = { message: message, detail: detail, kind: kind };
    am.log.text = "실패";
    setLabel(cur.v, "실패");
    if (am.content) renderSources(cur.v, am, false);
    renderError(cur.v, am);
    setPhase("error");
    setTimeout(function () { if (P.phase === "error") setPhase("idle"); }, 1300);
    save();
    scrollDown(true);
  }
  function stop() {
    var cur = state.current;
    if (!cur) return;
    if (cur.ctrl) cur.ctrl.abort(); else stopped(cur);
  }
  function retry(m) {
    if (state.busy) return;
    var i = state.messages.indexOf(m);
    if (i < 0) return;
    state.messages.splice(i, 1);
    if (m.view && m.view.el) m.view.el.remove();
    run();
  }

  function newChat() {
    if (state.current) stop();
    var nodes = Array.prototype.slice.call(listEl.children);
    state.messages = [];
    state.pendingSel = null;
    save();
    var c = orbCenter();
    var finishClear = function () {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var box = renderEmpty();
      renderChips();
      if (!REDUCED) Array.prototype.forEach.call(box.querySelectorAll(".empty-title,.empty-sub,.sug"), function (el, i) { cast(el, i * 70); });
      ta.focus();
      // 사라진 메시지를 방울이 받아 삼킨다
      kick(0.22, 1.6);
      if (nodes.length) fxSparks(14, c.x, c.y - 8, { speed: 240 });
    };
    if (REDUCED || !nodes.length || !nodes[0].animate) { finishClear(); return; }
    // 사라지는 모양은 테마가 정한다 (녹아내림, 터짐, 흩어짐, 한 줄로 접힘…)
    var ml = THEME.melt || {};
    var end = "translate(" + (ml.x || 0) + "px," + (ml.y == null ? 26 : ml.y) + "px) scale(" + (ml.sx == null ? 1 : ml.sx) + "," + (ml.sy == null ? 0.92 : ml.sy) + ")" +
      (ml.rot ? " rotate(" + ml.rot + "deg)" : "");
    var anims = nodes.reverse().map(function (el, i) {
      el.classList.add("melt");
      return el.animate([
        { opacity: 1, transform: "none", filter: "blur(0)" },
        { opacity: 0, transform: end, filter: "blur(" + (ml.blur == null ? 6 : ml.blur) + "px)" }
      ], { duration: ml.dur || 380, delay: Math.min(i, 8) * 28, easing: "cubic-bezier(.55,0,.75,.3)", fill: "forwards" });
    });
    Promise.all(anims.map(function (a) { return a.finished; })).then(finishClear, finishClear);
  }

  /* ------------------------------------------------------------ 열기·닫기·확대 */

  var pourAnim = 0;
  /* 패널이 방울에서 나오고 방울로 들어간다. 모양은 테마가 정한다:
     circle = 원으로 번짐, poly = 가장자리가 살아 있는 다각형, crt = 가로줄이 펴진 뒤 위아래로 열림. */
  function pour(opening, done) {
    cancelAnimationFrame(pourAnim);
    panel.style.opacity = "";
    if (REDUCED || MODE === "window") {
      panel.style.clipPath = "";
      if (panel.animate) panel.animate([{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }], { duration: 160 });
      setTimeout(done, opening ? 0 : 150);
      return;
    }
    var rv = THEME.reveal || {}, kind = rv.kind || "circle";
    var r = panel.getBoundingClientRect(), c = orbCenter();
    var ox = c.x - r.left, oy = c.y - r.top;
    var R = Math.max(Math.hypot(ox, oy), Math.hypot(ox - r.width, oy), Math.hypot(ox, oy - r.height), Math.hypot(ox - r.width, oy - r.height)) + 24;
    if (kind === "poly") R *= 1 + (rv.margin == null ? 0.25 : rv.margin);
    var t0 = now(), dur = opening ? (rv.open || 560) : (rv.close || 300);
    var rimK = rv.rim == null ? 1 : rv.rim, rimW = rv.rimW || 46;
    var easeOut = function (x) { return 1 - Math.pow(1 - x, 4); };
    var easeIn = function (x) { return x * x * x; };
    function frame() {
      var k = clamp((now() - t0) / dur, 0, 1);
      var p = opening ? easeOut(k) : easeIn(k);
      var q = opening ? p : 1 - p, rr = q * R;      // q: 0 = 닫힘, 1 = 다 열림
      var hc = heat(opening ? 0.96 - 0.5 * p : 0.62 + 0.3 * p);
      var a = (opening ? 1 - p * p : 0.5 + 0.5 * p) * rimK;
      if (kind === "crt") {
        var wx = clamp(q / 0.42, 0, 1), hy = clamp((q - 0.28) / 0.72, 0, 1);
        var ix = (1 - wx) * r.width / 2, iy = (1 - hy) * (r.height / 2 - 1.5);
        panel.style.clipPath = "inset(" + iy.toFixed(1) + "px " + ix.toFixed(1) + "px " + iy.toFixed(1) + "px " + ix.toFixed(1) + "px)";
        var e1 = iy, e2 = r.height - iy, ga = (1 - hy * hy) * rimK;
        rimEl.style.background = "linear-gradient(to bottom," + rgb(hc, 0) + " " + (e1 - 1).toFixed(1) + "px," + rgb(heat(1), 0.95 * ga) + " " + e1.toFixed(1) + "px," +
          rgb(hc, 0.24 * ga) + " " + (e1 + 16).toFixed(1) + "px," + rgb(hc, 0.24 * ga) + " " + (e2 - 16).toFixed(1) + "px," +
          rgb(heat(1), 0.95 * ga) + " " + e2.toFixed(1) + "px," + rgb(hc, 0) + " " + (e2 + 1).toFixed(1) + "px)";
      } else {
        if (kind === "poly") {
          var pts = [], N = rv.points || 72, tt = (now() - t0) / 1000;
          for (var i = 0; i < N; i++) {
            var ang = i / N * Math.PI * 2, rad = Math.max(0, rr * (1 + rv.edge(ang, q, tt)));
            pts.push((ox + Math.cos(ang) * rad).toFixed(1) + "px " + (oy + Math.sin(ang) * rad).toFixed(1) + "px");
          }
          panel.style.clipPath = "polygon(" + pts.join(",") + ")";
        } else {
          panel.style.clipPath = "circle(" + rr.toFixed(1) + "px at " + ox.toFixed(1) + "px " + oy.toFixed(1) + "px)";
        }
        var re = kind === "poly" ? rr / (1 + (rv.margin == null ? 0.25 : rv.margin)) : rr;
        rimEl.style.background = rimK <= 0 ? "" : "radial-gradient(circle at " + ox.toFixed(1) + "px " + oy.toFixed(1) + "px, " +
          rgb(hc, 0) + " " + Math.max(0, re - rimW).toFixed(1) + "px, " + rgb(hc, 0.32 * a) + " " + Math.max(0, re - rimW * 0.26).toFixed(1) + "px, " +
          rgb(heat(1), 0.95 * a) + " " + Math.max(0, re - 1.5).toFixed(1) + "px, " + rgb(hc, 0) + " " + re.toFixed(1) + "px)";
      }
      // 방전처럼 깜빡이며 켜지는 테마
      if (rv.flicker) panel.style.opacity = k < 0.5 && Math.random() < 0.45 ? "0.45" : "";
      if (k < 1) { pourAnim = requestAnimationFrame(frame); return; }
      panel.style.clipPath = "";
      panel.style.opacity = "";
      rimEl.style.background = "";
      done();
    }
    frame();
    if (opening) {
      var R2 = R;
      var els = panel.querySelectorAll(".hd-name,.hd-sub,.chip span,.empty-title,.empty-sub,.sug,.bubble,.md>*,.log-text span");
      Array.prototype.slice.call(els, -40).forEach(function (el) {
        var er = el.getBoundingClientRect();
        var d = Math.hypot(er.left + er.width / 2 - c.x, er.top + er.height / 2 - c.y);
        cast(el, Math.round((d / R2) * dur * 0.7));
      });
    }
  }

  function openPanel() {
    if (state.open) return;
    state.open = true;
    P.unread = false; orbEl.classList.remove("unread");
    orbEl.setAttribute("aria-label", "페이지 에이전트 닫기");
    orbEl.setAttribute("aria-expanded", "true");
    updateSub(); renderChips();
    panel.classList.add("on");
    kick(0.3, 1.4);
    if (MODE === "overlay") { var c = orbCenter(); fxSparks(8, c.x, c.y - 10, { speed: 200, spread: 0.7 }); }
    pour(true, function () { });
    setTimeout(function () { if (state.open) ta.focus({ preventScroll: true }); }, REDUCED ? 0 : 260);
    scrollDown(true);
    save();
  }
  function closePanel() {
    if (!state.open) return;
    if (MODE === "window") { W.close(); return; }
    state.open = false;
    hideTip();
    orbEl.setAttribute("aria-label", "페이지 에이전트 열기");
    orbEl.setAttribute("aria-expanded", "false");
    var hadFocus = shadow.activeElement && panel.contains(shadow.activeElement);
    pour(false, function () {
      panel.classList.remove("on");
      kick(0.2, -1.9);
    });
    if (hadFocus) orbEl.focus({ preventScroll: true });
    save();
  }
  function toggle() { if (state.open) closePanel(); else openPanel(); }

  function setExpanded(on) {
    if (MODE === "window" || state.expanded === on) return;
    var from = panel.getBoundingClientRect();
    state.expanded = on;
    panel.classList.toggle("xl", on);
    var to = panel.getBoundingClientRect();
    setIcon(btnExpand, on ? "minimize-2" : "maximize-2");
    btnExpand.setAttribute("aria-label", on ? "창 축소" : "창 확대");
    btnExpand.setAttribute("data-tip", on ? "창 축소" : "창 확대");
    hideTip();
    kick(0.14, on ? 1.2 : -1.2);
    if (!REDUCED && panel.animate && state.open) {
      panel.animate([{ width: from.width + "px", height: from.height + "px" }, { width: to.width + "px", height: to.height + "px" }],
        { duration: SPRING_PANEL.dur, easing: SPRING_PANEL.ease });
      panel.classList.add("flare");
      setTimeout(function () { panel.classList.remove("flare"); }, 380);
    }
    save();
  }

  btnNew.addEventListener("click", newChat);
  btnExpand.addEventListener("click", function () { setExpanded(!state.expanded); });
  btnClose.addEventListener("click", closePanel);
  panel.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); if (state.busy) stop(); else closePanel(); }
  });

  /* 방울 누르기: 표면장력으로 눌렸다 튕김 */
  if (MODE === "overlay") {
    orbEl.addEventListener("pointerenter", function () { P.hover = true; });
    orbEl.addEventListener("pointerleave", function () { P.hover = false; P.pressed = false; });
    orbEl.addEventListener("pointerdown", function () { P.pressed = true; });
    orbEl.addEventListener("pointerup", function () { if (P.pressed) { P.pressed = false; if (!REDUCED) { P.vsy += 2.6; P.vsx -= 1.4; } } });
    orbEl.addEventListener("click", function () { toggle(); });
    orbEl.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) closePanel(); });
  } else {
    orbEl.setAttribute("tabindex", "-1");
    orbEl.setAttribute("aria-hidden", "true");
    orbEl.removeAttribute("data-tip");
    orbEl.addEventListener("pointerenter", function () { P.hover = true; });
    orbEl.addEventListener("pointerleave", function () { P.hover = false; P.pressed = false; });
    orbEl.addEventListener("pointerdown", function () { P.pressed = true; });
    orbEl.addEventListener("pointerup", function () { if (P.pressed) { P.pressed = false; P.vsy += 2.6; } });
  }

  /* 커서 쪽으로 기울기, 스크롤에 출렁이기 */
  var orbC = null;
  W.addEventListener("resize", function () { orbC = null; }, { passive: true });
  W.addEventListener("pointermove", function (e) {
    if (REDUCED) return;
    if (!orbC) orbC = orbCenter();
    var dx = e.clientX - orbC.x, dy = e.clientY - orbC.y, d = Math.hypot(dx, dy);
    if (d < 220 && d > 0.1) { var k = (1 - d / 220) * 3.5; P.tlx = dx / d * k; P.tly = dy / d * k; }
    else { P.tlx = 0; P.tly = 0; }
  }, { passive: true });
  var lastScrollY = W.scrollY;
  W.addEventListener("scroll", function () {
    var y = W.scrollY, dy = y - lastScrollY; lastScrollY = y;
    if (!REDUCED) P.vsly += clamp(-dy * 1.6, -90, 90);
  }, { passive: true });
  listEl.addEventListener("scroll", (function () {
    var last = 0;
    return function () { var y = listEl.scrollTop, dy = y - last; last = y; if (!REDUCED) P.vsly += clamp(-dy * 0.8, -40, 40); };
  })(), { passive: true });

  /* ------------------------------------------------------------ 저장 (같은 탭·같은 사이트 안에서만) */

  function save() {
    try {
      var data = {
        v: 1, open: state.open, expanded: state.expanded,
        messages: state.messages.filter(function (m) { return !m.pending; }).map(function (m) {
          return { role: m.role, content: m.content, page: m.page, sel: m.sel, sources: m.sources, searches: m.searches, log: m.log, error: m.error, stopped: m.stopped, notice: m.notice };
        })
      };
      W.sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* 저장소를 못 쓰는 사이트 */ }
  }
  function restore() {
    try {
      var raw = W.sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.messages)) state.messages = data.messages.slice(-40);
      if (data && data.expanded && MODE === "overlay") { state.expanded = true; panel.classList.add("xl"); btnExpand.replaceChild(icon("minimize-2"), btnExpand.firstChild); btnExpand.setAttribute("aria-label", "창 축소"); btnExpand.setAttribute("data-tip", "창 축소"); }
    } catch (e) { /* ignore */ }
  }

  /* 페이지에 직접 못 붙는 경우를 위한 새 창 */
  function openPopup() {
    var p = W.open(SERVER + "/panel#u=" + encodeURIComponent(location.href) + "&t=" + encodeURIComponent((D.title || "").slice(0, 200)), "page_agent", "popup,width=480,height=780");
    if (!p) return;
    if (!W.__pageAgentRelay) {
      W.__pageAgentRelay = 1;
      W.addEventListener("message", function (e) {
        var m = e.data;
        if (m && (m.type === "page-agent:hello" || m.type === "page-agent:need-page") && e.source) {
          var snap = capturePage(); snap.via = "popup";
          e.source.postMessage({ type: "page-agent:page", page: snap }, "*");
        }
      });
    }
  }

  /* ------------------------------------------------------------ 메인 루프 */

  var lastT = now(), frameN = 0, drawDt = 0;
  function loop(t) {
    var dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000));
    lastT = t;
    frameN++;
    stepOrb(dt);
    drawDt += dt;
    // 가만히 있을 때는 세 프레임에 한 번만 그린다
    var calm = ORB.calm() && !FX.parts.length && !state.busy;
    if (!calm || frameN % 3 === 0) { ORB.draw(drawDt); drawDt = 0; }
    fxStep(dt);
    var cur = state.current;
    if (cur && !cur.finished) tickSegs(cur.v, t);
    liveViews(t);
    requestAnimationFrame(loop);
  }
  var lives = [];
  function liveViews(t) {
    if (state.current && lives.indexOf(state.current.live) < 0) lives.push(state.current.live);
    var any = false;
    lives = lives.filter(function (l) {
      var done = l.frame(t);
      if (!done) any = true;
      return !done;
    });
    if (any && state.current && !state.current.finished) scrollDown();
  }

  /* ------------------------------------------------------------ 시작 */

  restore();
  renderAll();
  updateSub();
  renderChips();
  autosize();
  /* 모션 테마를 바꾼다. 방울·색·입자·열기 모양이 한꺼번에 바뀐다. remember = 이 사이트에서 기억. */
  function setMotion(id, remember) {
    if (!M.has(id)) return false;
    THEME = M.get(id);
    FX.parts = [];
    ORB.setTheme(id);
    applyTheme();
    Array.prototype.forEach.call(root.querySelectorAll(".strip i[data-k]"), function (bar) {
      bar.style.background = rgb(heat(SEG_HEAT[bar.getAttribute("data-k")] || 0.6));
    });
    if (remember) { try { W.localStorage.setItem(MOTION_KEY, id); } catch (e) { /* 저장소를 못 쓰는 사이트 */ } }
    kick(0.22, 1.4);
    return true;
  }
  /* 모션을 눈으로 확인하기 위해 상태만 잠깐 바꾼다 (모션 고르기 페이지용). 대화 중에는 건드리지 않는다. */
  function showPhase(ph, ms) {
    if (state.busy) return;
    clearTimeout(showPhase.timer);
    setPhase(ph);
    if (ph === "reading") scanPage();
    if (ph === "searching") { var c = orbCenter(); fxSparks(10, c.x, c.y - 6, { speed: 260 }); }
    if (ph !== "idle") showPhase.timer = setTimeout(function () { if (!state.busy) setPhase("idle"); }, ms || 4000);
  }
  W.__pageAgent = { version: VERSION, open: openPanel, close: closePanel, toggle: toggle, server: SERVER,
    motion: function () { return THEME.id; }, setMotion: setMotion, showPhase: showPhase,
    state: function () { return { phase: P.phase, T: +P.T.toFixed(3), E: +P.E.toFixed(3), open: state.open, busy: state.busy, motion: THEME.id }; },
    destroy: function () { host.remove(); delete W.__pageAgent; } };
  if (MODE === "window") { state.open = true; panel.classList.add("on"); }

  // 첫 등장: 흰빛 방울이 떨어져 내려앉고 식는다
  P.T = 1; P.impulse = 0;
  requestAnimationFrame(function (t) { lastT = t; loop(t); });
  if (MODE === "overlay") {
    if (!REDUCED && orbEl.animate) {
      orbEl.animate([
        { transform: "translateY(-46px) scale(.35)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 }
      ], { duration: SPRING_DROP.dur, easing: SPRING_DROP.ease });
      setTimeout(function () { var c = orbCenter(); P.vsx += 3.2; P.vsy -= 3.2; fxSparks(12, c.x, c.y + 14, { speed: 210, spread: 1.0 }); }, 150);
    }
    if (W.__pageAgentAutoOpen !== false) setTimeout(openPanel, REDUCED ? 0 : 340);
  } else {
    setTimeout(function () { ta.focus(); }, 100);
  }
})();
