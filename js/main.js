(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var soundOn = false;
  var flashed = false;
  var stingPlayed = false;
  var lastShake = 0;
  var u = 0;
  var fp = 0;
  var stage = 1;
  var maxStage = 1;
  var maxU = 0;
  var maxFp = 0;
  var titleBase = "澄栖 — 把夜晚，还给安静";

  var navHrefs = [
    { el: "nav-product", hrefs: ["#product", "#product", "#product", "#break", "#break"] },
    { el: "nav-design",  hrefs: ["#craft", "#craft", "#craft", "#notice", "#notice"] },
    { el: "nav-story",   hrefs: ["#story", "#story", "#story", "#traces", "#finale"] },
    { el: "nav-order",   hrefs: ["#plans", "#plans", "#plans", "#plans", "#finale"] }
  ];

  var titles = [
    titleBase,
    titleBase,
    "澄栖 — 不要停",
    "澄栖 — 我们看到你了",
    "门还开着"
  ];

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function sectionTop(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function stageFromU(v) {
    if (v < 0.18) return 1;
    if (v < 0.42) return 2;
    if (v < 0.60) return 3;
    if (v < 0.78) return 4;
    return 5;
  }

  /* Intensity begins in mid-to-late marketing (stories onward),
     then keeps climbing through traces, notice, break, and finale. */
  function uFromDOM() {
    /* Probe the upper reading line, not mid-viewport, so short sections
       do not leap to their end the moment their heading appears. */
    var y = window.scrollY + window.innerHeight * 0.36;
    var t0 = sectionTop("stories");
    var t2 = sectionTop("traces");
    var t3 = sectionTop("notice");
    var t4 = sectionTop("break");
    var t5 = sectionTop("finale");
    var end = Math.max(document.documentElement.scrollHeight, t5 + window.innerHeight);
    if (!t0 || y <= t0) return 0;
    if (y < t2 || !t2) return 0.00 + clamp((y - t0) / Math.max(1, t2 - t0), 0, 1) * 0.30;
    if (y < t3 || !t3) return 0.30 + clamp((y - t2) / Math.max(1, t3 - t2), 0, 1) * 0.18;
    if (y < t4 || !t4) return 0.48 + clamp((y - t3) / Math.max(1, t4 - t3), 0, 1) * 0.16;
    if (y < t5 || !t5) return 0.64 + clamp((y - t4) / Math.max(1, t5 - t4), 0, 1) * 0.16;
    return 0.80 + clamp((y - t5) / Math.max(1, end - t5), 0, 1) * 0.20;
  }

  function updateNav(st) {
    var i = st - 1;
    navHrefs.forEach(function (item) {
      var el = document.getElementById(item.el);
      if (el && item.hrefs && item.hrefs[i]) el.setAttribute("href", item.hrefs[i]);
    });
    if (document.title !== titles[i]) document.title = titles[i];
  }

  function applyLiveMorphs(vu) {
    document.querySelectorAll(".live-morph").forEach(function (el) {
      var start = parseFloat(el.getAttribute("data-start") || "0");
      var span = parseFloat(el.getAttribute("data-span") || "0.14");
      if (!(span > 0)) span = 0.14;
      var p = clamp((vu - start) / span, 0, 1);
      el.style.setProperty("--mp", p.toFixed(4));
    });
  }

  function finaleProgress() {
    var el = document.getElementById("finale");
    if (!el) return 0;
    var range = el.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return clamp((-el.getBoundingClientRect().top) / range, 0, 1);
  }

  function applyFinale(p) {
    fp = p;
    root.style.setProperty("--fp", p.toFixed(4));
    var hall = document.querySelector(".shot-hall");
    var near = document.querySelector(".shot-near");
    var door = document.querySelector(".shot-door");
    var face = document.querySelector(".shot-face");
    var l0 = document.querySelector(".finale-copy .l0");
    var l1 = document.querySelector(".finale-copy .l1");
    var l2 = document.querySelector(".finale-copy .l2");

    var hallOp, nearOp, doorOp, faceOp, hallSc, nearSc, doorSc, faceSc;
    if (p < 0.22) {
      hallOp = 1;
      nearOp = clamp((p - 0.14) / 0.12, 0, 1);
      doorOp = 0;
      faceOp = 0;
    } else if (p < 0.48) {
      hallOp = clamp(1 - (p - 0.22) / 0.14, 0, 1);
      nearOp = 1;
      doorOp = clamp((p - 0.36) / 0.14, 0, 1);
      faceOp = 0;
    } else if (p < 0.78) {
      hallOp = 0;
      nearOp = clamp(1 - (p - 0.48) / 0.16, 0, 1);
      doorOp = 1;
      faceOp = 0;
    } else if (p < 0.82) {
      hallOp = 0;
      nearOp = 0;
      doorOp = clamp(1 - (p - 0.78) / 0.04, 0, 1);
      faceOp = 0;
    } else {
      hallOp = 0;
      nearOp = 0;
      doorOp = 0;
      faceOp = 1;
    }

    hallSc = 1 + p * 0.16;
    nearSc = 1.02 + clamp((p - 0.14) / 0.4, 0, 1) * 0.18;
    doorSc = 1.04 + clamp((p - 0.36) / 0.42, 0, 1) * 0.24;
    faceSc = 1 + clamp((p - 0.82) / 0.18, 0, 1) * 0.08;
    if (reduceMotion) hallSc = nearSc = doorSc = faceSc = 1;

    if (hall) { hall.style.opacity = String(hallOp); hall.style.transform = "scale(" + hallSc + ")"; }
    if (near) { near.style.opacity = String(nearOp); near.style.transform = "scale(" + nearSc + ")"; }
    if (door) { door.style.opacity = String(doorOp); door.style.transform = "scale(" + doorSc + ")"; }
    if (face) { face.style.opacity = String(faceOp); face.style.transform = "scale(" + faceSc + ")"; }
    if (l0) l0.classList.toggle("is-on", p > 0.28 && p < 0.78);
    if (l1) l1.classList.toggle("is-on", p > 0.86);
    if (l2) l2.classList.toggle("is-on", p > 0.92);

    if (p >= 0.82 && !stingPlayed) {
      stingPlayed = true;
      playSting();
    }
  }

  var lastFlash = 0;
  function maybeFlash(st) {
    if (reduceMotion || st < 3) return;
    var now = performance.now();
    var gap = flashed ? 9000 : 1600;
    if (now - lastFlash < gap) return;
    if (flashed && Math.random() > 0.08) return;
    flashed = true;
    lastFlash = now;
    var flash = document.getElementById("flash");
    if (!flash) return;
    flash.style.backgroundImage = "url('images/window-figure.jpg')";
    flash.classList.add("is-on");
    setTimeout(function () { flash.classList.remove("is-on"); }, 90);
    setTimeout(function () { flash.style.backgroundImage = "none"; }, 160);
  }

  function maybeShake(st) {
    if (reduceMotion || st < 3) return;
    var now = performance.now();
    if (now - lastShake < (st >= 4 ? 2400 : 3600)) return;
    if (Math.random() > (st >= 4 ? 0.06 : 0.03)) return;
    lastShake = now;
    document.body.classList.add("is-shaking");
    setTimeout(function () { document.body.classList.remove("is-shaking"); }, st >= 4 ? 320 : 240);
  }

  function getStem(id) { return document.getElementById(id); }

  function tryPlay(el) {
    if (!el) return;
    var p = el.play();
    if (p && p.catch) p.catch(function () {});
  }

  function unlockAudio() {
    ["a-wind", "a-drone", "a-steps", "a-static", "a-rumble", "a-hiss"].forEach(function (id) {
      var el = getStem(id);
      if (!el) return;
      el.volume = 0;
      tryPlay(el);
    });
  }

  function setMix(vu, st) {
    var wind = getStem("a-wind");
    var drone = getStem("a-drone");
    var steps = getStem("a-steps");
    var stat = getStem("a-static");
    var rumble = getStem("a-rumble");
    var hiss = getStem("a-hiss");
    var stems = [wind, drone, steps, stat, rumble, hiss];
    if (!soundOn) {
      stems.forEach(function (el) { if (el) el.volume = 0; });
      return;
    }
    if (wind) wind.volume = clamp(0.10 + vu * 0.34, 0, 0.44);
    if (drone) drone.volume = clamp(vu * 0.62, 0, 0.54);
    if (rumble) rumble.volume = vu >= 0.16 ? clamp((vu - 0.16) * 0.48, 0, 0.36) : 0;
    if (stat) stat.volume = vu >= 0.22 ? clamp((vu - 0.22) * 0.55, 0, 0.30) : 0;
    if (hiss) hiss.volume = vu >= 0.26 ? clamp((vu - 0.26) * 0.42, 0, 0.26) : 0;
    if (steps) steps.volume = vu >= 0.30 ? clamp((vu - 0.30) * 0.72, 0, 0.46) : 0;
  }

  function playSting() {
    if (!soundOn) return;
    var el = getStem("a-sting");
    if (!el) return;
    el.volume = 0.38;
    el.currentTime = 0;
    tryPlay(el);
  }

  function setSound(on) {
    soundOn = on;
    var btn = document.getElementById("sound-toggle");
    if (btn) {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      setText(btn, on ? "声音 开" : "声音 关");
    }
    if (on) {
      unlockAudio();
      setMix(maxU, maxStage);
    } else {
      ["a-wind", "a-drone", "a-steps", "a-static", "a-rumble", "a-hiss", "a-sting"].forEach(function (id) {
        var el = getStem(id);
        if (el) el.volume = 0;
      });
    }
  }

  function bgT(v) {
    if (v < 0.16) return v / 0.16 * 0.04;
    if (v < 0.32) return 0.04 + (v - 0.16) / 0.16 * 0.12;
    if (v < 0.48) return 0.16 + (v - 0.32) / 0.16 * 0.22;
    if (v < 0.64) return 0.38 + (v - 0.48) / 0.16 * 0.42;
    return 0.80 + (v - 0.64) / 0.36 * 0.20;
  }

  function inkT(v) {
    return clamp((v - 0.52) / 0.16, 0, 1);
  }

  function tick() {
    var uNow = uFromDOM();
    if (uNow > maxU) maxU = uNow;
    var stNow = stageFromU(maxU);
    if (stNow > maxStage) maxStage = stNow;
    var fpNow = finaleProgress();
    if (fpNow > maxFp) maxFp = fpNow;

    stage = maxStage;
    u = maxU;

    root.style.setProperty("--u", u.toFixed(4));
    root.style.setProperty("--bg-t", bgT(u).toFixed(4));
    root.style.setProperty("--ink-t", inkT(u).toFixed(4));
    root.setAttribute("data-stage", String(stage));
    updateNav(stage);
    applyLiveMorphs(u);
    applyFinale(Math.max(fpNow, maxFp));
    maybeFlash(stage);
    maybeShake(stage);
    setMix(u, stage);
    applyParallax();
  }

  function applyParallax() {
    if (reduceMotion || window.innerWidth < 900) return;
    document.querySelectorAll(".pair, .hero-visual, .portrait-pair").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > window.innerHeight + 80) return;
      var mid = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.setProperty("--par", clamp(mid / window.innerHeight, -1, 1).toFixed(3));
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      tick();
      ticking = false;
    });
  }

  function onWheel(e) {
    if (reduceMotion || maxStage < 3) return;
    if (e.deltaY >= 0) return;
    e.preventDefault();
    window.scrollBy(0, e.deltaY * 0.48);
  }

  var lastTouchY = null;
  function onTouchStart(e) {
    if (e.touches && e.touches[0]) lastTouchY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (reduceMotion || maxStage < 3 || lastTouchY == null) return;
    var y = e.touches[0].clientY;
    var dy = lastTouchY - y;
    lastTouchY = y;
    if (dy < 0) {
      e.preventDefault();
      window.scrollBy(0, dy * 0.48);
    }
  }

  var ghost = document.getElementById("cursor-ghost");
  var gx = 0, gy = 0, mx = 0, my = 0;
  window.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  function followCursor() {
    if (ghost && maxStage >= 4) {
      gx += (mx - gx) * 0.08;
      gy += (my - gy) * 0.08;
      ghost.style.left = gx + "px";
      ghost.style.top = gy + "px";
    }
    requestAnimationFrame(followCursor);
  }

  function glitchTick() {
    if (maxStage >= 4 && maxStage < 5 && !reduceMotion) {
      var nodes = document.querySelectorAll("#break .bw, #break .scatter p");
      if (nodes.length) {
        var n = nodes[Math.floor(Math.random() * nodes.length)];
        n.classList.add("can-glitch");
        var orig = n.textContent;
        if (Math.random() < 0.4) {
          var chars = orig.split("");
          var i = Math.floor(Math.random() * chars.length);
          var pool = "安静看门它还在下夜里";
          chars[i] = pool[Math.floor(Math.random() * pool.length)];
          n.textContent = chars.join("");
          setTimeout(function () { n.textContent = orig; n.classList.remove("can-glitch"); }, 180);
        } else {
          setTimeout(function () { n.classList.remove("can-glitch"); }, 180);
        }
      }
    }
    setTimeout(glitchTick, 1600 + Math.random() * 1400);
  }

  function bindSound() {
    var btn = document.getElementById("sound-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () { setSound(!soundOn); });
  }

  function bindForms() {
    ["wait-form", "show-form"].forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var wrap = form.closest(".form-wrap") || form.parentElement;
        if (wrap) wrap.classList.add("is-done");
      });
    });
  }

  function bindNav() {
    var btn = document.getElementById("nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      setText(btn, open ? "关闭" : "菜单");
    });
    nav.querySelectorAll(".links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        setText(btn, "菜单");
      });
    });
  }

  function bindReveals() {
    var nodes = document.querySelectorAll(
      "main > section, .feature, .review, .plan, .split, .scene, .story-feature, .pair, .form-wrap, .editorial-body, .spec-wrap, .letter, .log li"
    );
    if (reduceMotion) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    nodes.forEach(function (n) {
      if (n.id === "hero") return;
      n.classList.add("reveal");
      io.observe(n);
    });
  }

  function jumpTo(el, inner) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY;
    if (inner != null && el.offsetHeight > window.innerHeight) {
      top += (el.offsetHeight - window.innerHeight) * inner;
    } else {
      top -= 72;
    }
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "instant" });
  }

  function scrollPreview(token) {
    var finale = document.getElementById("finale");
    if (token === "1" || token === "hero") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else if (token === "mid" || token === "story") {
      jumpTo(document.getElementById("story"), null);
    } else if (token === "scenes") {
      jumpTo(document.getElementById("scenes"), null);
    } else if (token === "stories") {
      jumpTo(document.getElementById("stories"), null);
    } else if (token === "plans") {
      jumpTo(document.getElementById("plans"), null);
    } else if (token === "rooms") {
      jumpTo(document.getElementById("rooms"), null);
    } else if (token === "reprint") {
      jumpTo(document.getElementById("reprint"), null);
    } else if (token === "2" || token === "quiet" || token === "traces") {
      jumpTo(document.getElementById("traces"), null);
    } else if (token === "3" || token === "notice") {
      jumpTo(document.getElementById("notice"), null);
    } else if (token === "4" || token === "break") {
      jumpTo(document.getElementById("break"), null);
    } else if (token === "hall") {
      jumpTo(finale, 0.12);
    } else if (token === "door") {
      jumpTo(finale, 0.48);
    } else if (token === "5" || token === "face") {
      jumpTo(finale, 0.92);
    } else if (token === "back") {
      jumpTo(document.getElementById("break"), null);
      tick();
      setTimeout(function () {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        tick();
      }, 80);
      return;
    }
    tick();
  }

  function applyPreview() {
    var m = /[?&]preview=([a-z0-9-]+)/i.exec(location.search);
    if (!m) return false;
    var token = m[1];
    function go() { scrollPreview(token); }
    go();
    window.addEventListener("load", go);
    setTimeout(go, 250);
    setTimeout(go, 800);
    return true;
  }

  function init() {
    root.setAttribute("data-stage", "1");
    bindSound();
    bindForms();
    bindNav();
    bindReveals();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    followCursor();
    glitchTick();
    tick();
    applyPreview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
