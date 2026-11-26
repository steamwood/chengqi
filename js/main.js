(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = false;
  var soundOn = false;
  var audioArmed = false;
  var hasGesture = false;
  var soundLocked = false;
  var deepReached = false;
  var pollutedOnce = false;
  var deepReturnNoted = false;
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
  var LOCK_U = 0.16;
  var DEEP_U = 0.66;
  var POLLUTE_U = 0.16;

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

  var navVoice = {
    mid: { "nav-product": "门口", "nav-design": "别看", "nav-story": "还在", "nav-order": "留下" },
    deep: { "nav-product": "门口", "nav-design": "别看", "nav-story": "还在", "nav-order": "留下" },
    watch: { "nav-product": "回头", "nav-design": "看着", "nav-story": "还在", "nav-order": "留下" }
  };

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

  function currentTitle() {
    if (watched) return "澄栖 — 它还在看";
    if (deepReached) return "澄栖 — 路已经改过了";
    var i = Math.max(0, stage - 1);
    return titles[i] || titleBase;
  }

  function updateNav(st) {
    var i = st - 1;
    navHrefs.forEach(function (item) {
      var el = document.getElementById(item.el);
      if (el && item.hrefs && item.hrefs[i]) el.setAttribute("href", item.hrefs[i]);
    });
    var next = currentTitle();
    if (document.title !== next) document.title = next;
    applyNavVoice();
  }

  function applyNavVoice() {
    var pack = navVoice.mid;
    if (watched) pack = navVoice.watch;
    else if (deepReached) pack = navVoice.deep;
    Object.keys(pack).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var to = el.querySelector(".m-to");
      if (to) setText(to, pack[id]);
    });
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
    if (last) {
      last.style.transform = "scale(" + (1 + p * 0.04).toFixed(4) + ")";
    }
  }

  function maybeFlash(st) {
    /* Rare, low-frequency canvas flash is handled in the canvas loop. */
  }

  function maybeShake(st) {
    if (st < 3) return;
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
      if (!audioArmed && !soundOn) el.volume = 0;
      tryPlay(el);
    });
    ensureAudioGraph();
  }

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

  var audioCtx = null;
  var noiseSrc = null;
  var noiseFilter = null;
  var noiseGainNode = null;

  function ensureAudioGraph() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!audioCtx) {
      try {
        audioCtx = new AC();
        var len = Math.floor(audioCtx.sampleRate * 3);
        var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        var d = buf.getChannelData(0);
        var last = 0;
        for (var i = 0; i < len; i++) {
          var white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          d[i] = last * 3.2;
        }
        noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = buf;
        noiseSrc.loop = true;
        noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.value = 420;
        noiseFilter.Q.value = 0.7;
        noiseGainNode = audioCtx.createGain();
        noiseGainNode.gain.value = 0;
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGainNode);
        noiseGainNode.connect(audioCtx.destination);
        noiseSrc.start();
      } catch (err) {
        audioCtx = null;
        return false;
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
    return !!audioCtx;
  }

  function audioWanted() {
    return soundOn || (soundLocked && audioArmed);
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
    if (!audioWanted()) {
      stems.forEach(function (el) { if (el) el.volume = 0; });
      if (noiseGainNode) noiseGainNode.gain.value = 0;
      return;
    }
    var mg = musicGain(vu);
    var ng = noiseGain(vu);
    if (watched) mg = 0;
    if (music) music.volume = mg * 0.56;
    if (wind) wind.volume = ng * 0.20;
    if (drone) drone.volume = ng * (watched ? 0.42 : 0.36);
    if (rumble) rumble.volume = ng * (watched ? 0.34 : 0.26);
    if (stat) stat.volume = ng * 0.18;
    if (hiss) hiss.volume = ng * (watched ? 0.24 : 0.16);
    if (steps) steps.volume = ng > 0.35 ? (ng - 0.35) / 0.65 * 0.28 : 0;
    if (noiseGainNode && noiseFilter) {
      noiseFilter.frequency.value = 380 + ng * 720;
      noiseGainNode.gain.value = ng * (watched ? 0.07 : 0.05);
    }
  }

  function armAudio() {
    if (audioArmed) {
      unlockAudio();
      setMix(maxU, maxStage);
      return;
    }
    audioArmed = true;
    soundOn = true;
    var btn = document.getElementById("sound-toggle");
    if (btn) {
      btn.classList.add("is-on");
      btn.setAttribute("aria-pressed", "true");
      setText(btn, "音乐 开");
    }
    unlockAudio();
    setMix(maxU, maxStage);
  }

  function playSting() {
    if (!audioWanted()) return;
    var el = getStem("a-sting");
    if (!el) return;
    el.volume = 0.18;
    el.currentTime = 0;
    tryPlay(el);
    if (noiseGainNode) {
      var g = noiseGainNode.gain.value;
      noiseGainNode.gain.value = Math.max(0, g * 0.2);
      setTimeout(function () {
        if (noiseGainNode) noiseGainNode.gain.value = g;
      }, 420);
    }
  }

  function showSoundRemark(msg) {
    var el = document.getElementById("sound-remark");
    if (!el) return;
    setText(el, msg);
    el.classList.add("is-on");
    clearTimeout(showSoundRemark._t);
    showSoundRemark._t = setTimeout(function () { el.classList.remove("is-on"); }, 4200);
  }

  function remarkForLock() {
    if (watched) return "它比开关更早知道你会伸手。";
    if (maxU >= 0.72) return "请不必再试。它已经在听了。";
    if (maxU >= 0.42) return "关开关，灯也不会回去。声音也是。";
    return "今晚的声音，我们先帮你留着。";
  }

  function setSound(on) {
    if (soundLocked) {
      armAudio();
      showSoundRemark(remarkForLock());
      return;
    }
    soundOn = on;
    if (on) audioArmed = true;
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
      if (noiseGainNode) noiseGainNode.gain.value = 0;
    }
  }

  function markGesture() {
    hasGesture = true;
    unlockAudio();
    if (soundLocked) armAudio();
  }

  function maybeLockSound() {
    if (soundLocked) return;
    if (maxU < LOCK_U) return;
    soundLocked = true;
    root.classList.add("is-locked");
    if (hasGesture) armAudio();
  }

  function bgT(v) {
    if (v < 0.16) return v / 0.16 * 0.04;
    if (v < 0.32) return 0.04 + (v - 0.16) / 0.16 * 0.12;
    if (v < 0.48) return 0.16 + (v - 0.32) / 0.16 * 0.22;
    if (v < 0.64) return 0.38 + (v - 0.48) / 0.16 * 0.42;
    return 0.80 + (v - 0.64) / 0.36 * 0.20;
  }

  function inkT(v) {
    return clamp((v - 0.46) / 0.12, 0, 1);
  }

  var lastNote = "";
  var lastNoteAt = 0;
  function showNote(msg, minGap) {
    if (!msg) return;
    minGap = minGap == null ? 2800 : minGap;
    var now = performance.now();
    if (msg === lastNote && now - lastNoteAt < 9000) return;
    if (now - lastNoteAt < minGap) return;
    lastNote = msg;
    lastNoteAt = now;
    var box = document.getElementById("sys-note");
    if (!box) return;
    var line = box.querySelector(".sys-msg");
    if (line) setText(line, msg);
    box.hidden = false;
    box.classList.add("is-on");
    clearTimeout(showNote._t);
    showNote._t = setTimeout(function () {
      box.classList.remove("is-on");
      setTimeout(function () {
        if (!box.classList.contains("is-on")) box.hidden = true;
      }, 480);
    }, 4300);
  }

  function maybeNotes() {
    if (maxU >= POLLUTE_U && !pollutedOnce) {
      pollutedOnce = true;
      showNote("今晚的节律，我们已为你记下。", 0);
    }
    if (deepReached && !deepReturnNoted && window.scrollY < window.innerHeight * 0.85) {
      deepReturnNoted = true;
      showNote("回来也可以。只是路已经改过了。", 0);
    }
  }

  function applyDeep() {
    if (maxU >= DEEP_U) deepReached = true;
    root.classList.toggle("is-deep", deepReached);
    root.classList.toggle("is-polluted", maxU >= POLLUTE_U);
    if (deepReached) applyFavicon(true);
  }

  var faviconDirty = false;
  function applyFavicon(dark) {
    if (!dark || faviconDirty) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    try {
      var c = document.createElement("canvas");
      c.width = 48; c.height = 48;
      var g = c.getContext("2d");
      g.fillStyle = "#141210";
      g.fillRect(0, 0, 48, 48);
      g.strokeStyle = "#e8b56a";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(24, 26, 11, 13, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#e8b56a";
      g.fillRect(16, 24, 16, 2);
      link.href = c.toDataURL("image/png");
      faviconDirty = true;
    } catch (err) {}
  }

  function taintModules() {
    document.querySelectorAll("[data-module]").forEach(function (el) {
      if (!el.classList.contains("is-seen")) return;
      var need = parseFloat(el.getAttribute("data-taint-at") || "0.18");
      if (maxU >= need) el.classList.add("is-tainted");
    });
  }

  function bindModules() {
    document.querySelectorAll("[data-module]").forEach(function (el) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          el.classList.add("is-seen");
          setTimeout(function () { taintModules(); }, 700);
        });
      }, { threshold: 0.22, rootMargin: "0px 0px -6% 0px" });
      io.observe(el);
    });
  }

  function bindBaits() {
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-bait], .js-plan-cta") : null;
      if (!t) return;
      markGesture();
      var kind = t.getAttribute("data-bait") || "";
      var always = kind === "reset" || kind === "day" || t.classList.contains("hero-cta-deep");
      if (!always && maxU < 0.18) return;
      e.preventDefault();
      if (kind === "reset") {
        showNote("刚才的光还在这一页上。只是已经不朝你开了。", 0);
      } else if (kind === "day") {
        showNote("白天还没有回来。请留在夜里。", 0);
      } else if (kind === "stay") {
        showNote("这条路径无法取消。灯还亮着。", 0);
      } else {
        showNote("请继续往下看。这一步，我们替你记下了。", 0);
        var dest = document.getElementById(deepReached ? "finale" : "traces") || document.getElementById("finale");
        if (dest) dest.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function bindLamp() {
    function move(x, y) {
      root.style.setProperty("--lx", Math.round(x) + "px");
      root.style.setProperty("--ly", Math.round(y) + "px");
      mx = x; my = y;
    }
    window.addEventListener("pointermove", function (e) { move(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  function startCanvas() {
    var c = document.getElementById("fx-canvas");
    if (!c || !c.getContext) return;
    var ctx = c.getContext("2d", { alpha: true });
    var lastFlash = 0;
    function resize() {
      var dpr = Math.min(1.25, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      c.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);
    function frame(t) {
      var w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      var vu = maxU;
      if (vu > 0.08) {
        var n = Math.floor(w * h * (0.00007 + vu * 0.00022));
        var i;
        for (i = 0; i < n; i++) {
          var x = Math.random() * w;
          var y = Math.random() * h;
          var a = 0.07 + Math.random() * 0.2 * vu;
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255," + a + ")" : "rgba(10,8,6," + a + ")";
          ctx.fillRect(x, y, 1.15, 1.15);
        }
        ctx.fillStyle = "rgba(0,0,0," + (0.035 + vu * 0.07) + ")";
        var step = Math.max(2, 3 * (window.devicePixelRatio || 1));
        for (var sy = 0; sy < h; sy += step) ctx.fillRect(0, sy, w, 1);
        if (vu > 0.34) {
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = "rgba(170,50,36," + (vu * 0.028) + ")";
          ctx.fillRect(1.2, 0, w, h);
          ctx.fillStyle = "rgba(36,78,120," + (vu * 0.028) + ")";
          ctx.fillRect(-1.2, 0, w, h);
          ctx.globalCompositeOperation = "source-over";
        }
        if (maxStage >= 3 && t - lastFlash > 5200) {
          if (Math.random() < 0.1) {
            lastFlash = t;
            ctx.fillStyle = "rgba(232,224,210,0.08)";
            ctx.fillRect(0, 0, w, h);
          } else if (t - lastFlash > 9000) {
            lastFlash = t;
          }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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
    maybeLockSound();
    applyDeep();
    updateNav(stage);
    applyLiveMorphs(u);
    applyFinale(Math.max(fpNow, maxFp));
    maybeFlash(stage);
    maybeShake(stage);
    checkWatch();
    setMix(u, stage);
    applyParallax();
    taintModules();
    maybeNotes();
  }

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
    if (audioWanted()) {
      var music = getStem("a-music");
      if (music) music.volume = 0;
      playSting();
    }
    setMix(maxU, maxStage);
    applyNavVoice();
    if (document.title !== currentTitle()) document.title = currentTitle();
    showNote("请不必转身。你已经在这一页里了。", 0);
    var tog = document.getElementById("sound-toggle");
    if (tog && soundLocked) showSoundRemark("它比开关更早知道你会伸手。");
  }

  function applyParallax() {
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
    if (maxStage < 3) return;
    if (e.deltaY >= 0) return;
    e.preventDefault();
    window.scrollBy(0, e.deltaY * 0.48);
  }

  var lastTouchY = null;
  function onTouchStart(e) {
    markGesture();
    if (e.touches && e.touches[0]) {
      lastTouchY = e.touches[0].clientY;
      root.style.setProperty("--lx", Math.round(e.touches[0].clientX) + "px");
      root.style.setProperty("--ly", Math.round(e.touches[0].clientY) + "px");
    }
  }
  function onTouchMove(e) {
    if (maxStage < 3 || lastTouchY == null) return;
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
    if (maxStage >= 4 && maxStage < 5) {
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
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      markGesture();
      setSound(!soundOn);
    });
  }

  function bindForms() {
    ["wait-form", "show-form"].forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        markGesture();
        var wrap = form.closest(".form-wrap") || form.parentElement;
        var thanks = wrap ? wrap.querySelector(".thanks") : null;
        if (thanks) {
          var clean = thanks.getAttribute("data-clean") || thanks.textContent;
          var tainted = thanks.getAttribute("data-taint") || clean;
          var named = form.querySelector("[name='field-a']");
          if (maxU >= 0.2) {
            if (named && named.value && named.value.trim()) {
              tainted = "已记下，" + named.value.trim() + "。夜还很长，我们会再写信。请不必回头。";
            }
            setText(thanks, tainted);
          } else {
            setText(thanks, clean);
          }
        }
        if (wrap) wrap.classList.add("is-done");
        if (maxU >= 0.2) showNote("已记下。请继续往下看。", 0);
      });
    });
  }

  function bindNav() {
    var btn = document.getElementById("nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      markGesture();
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
      "main > section, .feature, .review, .plan, .split, .scene, .story-feature, .pair, .form-wrap, .editorial-body, .spec-wrap, .letter, .log li, .status-board"
    );
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

  function bindGestures() {
    ["pointerdown", "click", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, markGesture, { passive: true, capture: true });
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
    if (token === "1" || token === "hero") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else if (token === "mid" || token === "story") {
      jumpTo(document.getElementById("story"), null);
    } else if (token === "scenes") {
      jumpTo(document.getElementById("scenes"), null);
    } else if (token === "stories") {
      jumpTo(document.getElementById("stories"), null);
    } else if (token === "status") {
      jumpTo(document.getElementById("status"), null);
    } else if (token === "plans") {
      jumpTo(document.getElementById("plans"), null);
    } else if (token === "plans-tainted") {
      jumpTo(document.getElementById("notice"), 0.2);
      tick();
      setTimeout(function () {
        jumpTo(document.getElementById("plans"), null);
        tick();
      }, 80);
      return;
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
    } else if (token === "blocked" || token === "deep-back") {
      jumpTo(document.getElementById("break"), 0.2);
      tick();
      setTimeout(function () {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        tick();
      }, 100);
      return;
    } else if (token === "hold" || token === "back-a-little") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
      tick();
      window.scrollTo({ top: Math.max(0, maxScrollY() - window.innerHeight * 0.40), left: 0, behavior: "instant" });
    } else if (token === "watch" || token === "scare") {
      window.scrollTo({ top: maxScrollY(), left: 0, behavior: "instant" });
      tick();
      window.scrollTo({ top: Math.max(0, maxScrollY() - window.innerHeight * 1.10), left: 0, behavior: "instant" });
    } else if (token === "menu") {
      jumpTo(document.getElementById("notice"), 0.2);
      tick();
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
    bindGestures();
    bindSound();
    bindForms();
    bindNav();
    bindReveals();
    bindModules();
    bindBaits();
    bindLamp();
    startCanvas();
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
