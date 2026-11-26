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
    var last = document.querySelector(".linger-last .linger-hero img");
    if (last && !reduceMotion) {
      last.style.transform = "scale(" + (1 + p * 0.04).toFixed(4) + ")";
    }
  }

  function maybeFlash(st) {
    /* Intentionally unused: a flash of the figure would pay off the scare
       before the reader has reached the end and turned back. */
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
    ["a-music", "a-wind", "a-drone", "a-steps", "a-static", "a-rumble", "a-hiss"].forEach(function (id) {
      var el = getStem(id);
      if (!el) return;
      el.volume = 0;
      tryPlay(el);
    });
  }

  /* Music is full while the page is still clean, then crossfades
     into the dissonant bed as --u rises. At u=0, noise stems are silent. */
  function musicGain(vu) {
    if (vu <= 0.12) return 1;
    if (vu >= 0.40) return 0;
    return 1 - (vu - 0.12) / 0.28;
  }
  function noiseGain(vu) {
    if (vu <= 0.16) return 0;
    if (vu >= 0.48) return 1;
    return (vu - 0.16) / 0.32;
  }

  function setMix(vu, st) {
    var music = getStem("a-music");
    var wind = getStem("a-wind");
    var drone = getStem("a-drone");
    var steps = getStem("a-steps");
    var stat = getStem("a-static");
    var rumble = getStem("a-rumble");
    var hiss = getStem("a-hiss");
    var stems = [music, wind, drone, steps, stat, rumble, hiss];
    if (!soundOn) {
      stems.forEach(function (el) { if (el) el.volume = 0; });
      return;
    }
    var mg = musicGain(vu);
    var ng = noiseGain(vu);
    if (watched) mg = 0;
    if (music) music.volume = mg * 0.56;
    if (wind) wind.volume = ng * 0.22;
    if (drone) drone.volume = ng * (watched ? 0.48 : 0.42);
    if (rumble) rumble.volume = ng * (watched ? 0.40 : 0.32);
    if (stat) stat.volume = ng * 0.22;
    if (hiss) hiss.volume = ng * (watched ? 0.28 : 0.20);
    if (steps) steps.volume = ng > 0.35 ? (ng - 0.35) / 0.65 * 0.36 : 0;
  }

  function playSting() {
    if (!soundOn) return;
    var el = getStem("a-sting");
    if (!el) return;
    el.volume = 0.28;
    el.currentTime = 0;
    tryPlay(el);
  }

  function setSound(on) {
    soundOn = on;
    var btn = document.getElementById("sound-toggle");
    if (btn) {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      setText(btn, on ? "音乐 开" : "音乐 关");
    }
    if (on) {
      unlockAudio();
      setMix(maxU, maxStage);
    } else {
      ["a-music", "a-wind", "a-drone", "a-steps", "a-static", "a-rumble", "a-hiss", "a-sting"].forEach(function (id) {
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
    /* Flip ink once the page has already started to darken, so
       scroll-back to earlier sections never lands on mid-gray type. */
    return clamp((v - 0.46) / 0.12, 0, 1);
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
    checkWatch();
    setMix(u, stage);
    applyParallax();
  }

  /* Scare is armed only after the reader truly reaches (or nearly
     reaches) the bottom. The first ~0.42vh of scroll-up still does
     nothing; the scare fires after a total of ~1.05vh of scroll-up. */
  var END_NEAR_VH = 0.08;
  var TRIGGER_VH = 1.05;
  var reachedEnd = false;
  var watched = false;

  function maxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  function fromBottom() {
    return maxScrollY() - window.scrollY;
  }
  function checkWatch() {
    var H = window.innerHeight || 1;
    var from = fromBottom();
    if (from <= H * END_NEAR_VH) reachedEnd = true;
    if (!reachedEnd || watched) return;
    if (from >= H * TRIGGER_VH) triggerWatch();
  }
  function triggerWatch() {
    if (watched) return;
    watched = true;
    root.classList.add("is-watched");
    if (soundOn) {
      var music = getStem("a-music");
      if (music) music.volume = 0;
      playSting();
    }
    setMix(maxU, maxStage);
  }

  function applyParallax() {
    if (reduceMotion || window.innerWidth < 900) return;
    document.querySelectorAll(".pair, .hero-visual, .portrait-pair, .img-pair, .linger-frame, .linger-hero").forEach(function (el) {
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
      var nodes = document.querySelectorAll("#break .bw, #break .scatter p, #finale .linger-copy p, #finale .linger-copy h2");
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
    } else if (token === "late" || token === "near-end") {
      jumpTo(document.getElementById("finale"), 0.62);
    } else if (token === "hall" || token === "5" || token === "end" || token === "bottom") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
    } else if (token === "infect" || token === "back-mid") {
      jumpTo(document.getElementById("notice"), 0.35);
      tick();
      setTimeout(function () {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        tick();
      }, 80);
      return;
    } else if (token === "hold" || token === "back-a-little") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
      tick();
      window.scrollTo({ top: Math.max(0, maxScrollY() - window.innerHeight * 0.40), left: 0, behavior: "instant" });
    } else if (token === "watch" || token === "scare") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
      tick();
      window.scrollTo({ top: Math.max(0, maxScrollY() - window.innerHeight * 1.10), left: 0, behavior: "instant" });
    } else if (token === "back") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
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
