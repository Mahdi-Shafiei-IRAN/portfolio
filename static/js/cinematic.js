/* ============================================================
   Mahdi — Cinematic Portfolio
   Scroll position scrubs the background video frame-by-frame:
   scroll down = play forward, scroll up = reverse, still = paused.
   ============================================================ */
(() => {
  "use strict";

  const body = document.body;
  const FRAMES_BASE = body.dataset.framesBase;
  const FRAME_COUNT = parseInt(body.dataset.frameCount, 10) || 0;
  const FRAME_SPEED = 1.0; // video spans the full scroll (background, not a product shot)

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const canvasWrap = document.querySelector(".canvas-wrap");
  const heroSection = document.getElementById("hero");
  const scrollContainer = document.getElementById("scroll-container");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPct = document.getElementById("loader-percent");

  const framePath = (i) =>
    `${FRAMES_BASE}frame_${String(i).padStart(4, "0")}.webp`;

  const frames = new Array(FRAME_COUNT);
  let currentFrame = -1;
  let bgColor = "#07070a";
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- Canvas sizing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    if (currentFrame >= 0) drawFrame(currentFrame);
  }
  window.addEventListener("resize", resize);

  /* ---------- Padded cover renderer ---------- */
  const IMAGE_SCALE = 1.0; // full-bleed background — fill the viewport
  function sampleBgColor(img) {
    try {
      const s = document.createElement("canvas");
      s.width = s.height = 1;
      const sc = s.getContext("2d");
      sc.drawImage(img, 0, 0, 1, 1);
      const d = sc.getData ? null : sc.getImageData(0, 0, 1, 1).data;
      if (d) bgColor = `rgb(${d[0]},${d[1]},${d[2]})`;
    } catch (e) { /* CORS-safe local files; ignore */ }
  }
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    if (index % 20 === 0) sampleBgColor(img);
  }

  /* ---------- Preloader: first 10 fast, rest in background ---------- */
  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { frames[i] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = framePath(i + 1); // frames are 1-indexed on disk
    });
  }

  async function preload() {
    if (FRAME_COUNT === 0) { finishLoading(); return; }
    let loaded = 0;
    const bump = () => {
      loaded++;
      const pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + "%";
      loaderPct.textContent = pct + "%";
    };
    const firstN = Math.min(10, FRAME_COUNT);
    for (let i = 0; i < firstN; i++) { await loadFrame(i); bump(); }
    resize();
    drawFrame(0);
    // Remaining frames in the background
    const rest = [];
    for (let i = firstN; i < FRAME_COUNT; i++) rest.push(loadFrame(i).then(bump));
    await Promise.all(rest);
    finishLoading();
  }

  function finishLoading() {
    loader.classList.add("done");
    initScroll();
  }

  /* ---------- Scroll experience (Lenis + GSAP) ---------- */
  function initScroll() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduce,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    /* Frame-to-scroll binding — THE scroll-driven video */
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const accel = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(Math.floor(accel * FRAME_COUNT), FRAME_COUNT - 1);
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      },
    });

    /* Position + animate each scroll section */
    document.querySelectorAll(".scroll-section").forEach((section) => {
      const enter = parseFloat(section.dataset.enter) / 100;
      const leave = parseFloat(section.dataset.leave) / 100;
      const mid = (enter + leave) / 2;
      section.style.top = (mid * 100) + "vh"; // anchor within 820vh container (~scaled)
      section.style.transform = "translateY(-50%)";
      // Re-anchor precisely against the real container height
      const h = scrollContainer.offsetHeight;
      section.style.top = (mid * h) + "px";
      setupSectionAnimation(section, enter, leave, reduce);
    });

    initMarquees();
    initDarkOverlay();
    init3DTilt(reduce);

    /* Intro reveals (name + about live in normal flow, over the video) */
    const introReveals = gsap.utils.toArray(".intro .reveal");
    if (introReveals.length) {
      if (reduce) gsap.set(introReveals, { opacity: 1, y: 0 });
      else gsap.to(introReveals, { opacity: 1, y: 0, stagger: 0.1, duration: 0.9, delay: 0.2, ease: "power3.out" });
    }

    ScrollTrigger.refresh();
  }

  /* ---------- Section entrance animations (varied) ---------- */
  function setupSectionAnimation(section, enter, leave, reduce) {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === "true";
    const children = section.querySelectorAll(
      ".section-inner > .section-label, .section-inner > .section-heading, .section-body," +
      " .cta-button, .cta-socials, .projects-head, .project-card," +
      " .skills-card > .section-label, .skills-card > .section-heading, .skill-col"
    );
    if (reduce) { gsap.set(children, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: "none" }); return; }

    const tl = gsap.timeline({ paused: true });
    switch (type) {
      case "fade-up":
        tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" }); break;
      case "slide-left":
        tl.from(children, { x: -90, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
      case "slide-right":
        tl.from(children, { x: 90, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
      case "scale-up":
        tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" }); break;
      case "stagger-up":
        tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" }); break;
      case "clip-reveal":
        tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.1, ease: "power4.inOut" }); break;
      default:
        tl.from(children, { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
    }

    let played = false;
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        const visible = p >= enter - 0.02 && p <= leave + 0.02;
        section.style.opacity = visible ? 1 : (persist && p > leave ? 1 : 0);
        section.style.pointerEvents = visible ? "auto" : "none";
        if (p >= enter - 0.02 && !played) { tl.play(); played = true; }
        else if (p < enter - 0.05 && played && !persist) { tl.reverse(); played = false; }
      },
    });
    gsap.set(section, { opacity: 0 });
    if (persist) gsap.set(section, { opacity: 0 });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      gsap.fromTo(el, { textContent: 0 }, {
        textContent: target, duration: 2, ease: "power1.out",
        snap: { textContent: decimals === 0 ? 1 : 0.01 },
        scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom",
          onEnter: () => {}, },
        onUpdate: function () {
          el.textContent = decimals === 0
            ? Math.round(el.textContent)
            : parseFloat(el.textContent).toFixed(decimals);
        },
      });
    });
  }

  /* ---------- Marquee ---------- */
  function initMarquees() {
    document.querySelectorAll(".marquee-wrap").forEach((wrap) => {
      const speed = parseFloat(wrap.dataset.scrollSpeed) || -25;
      gsap.to(wrap.querySelector(".marquee-text"), {
        xPercent: speed, ease: "none",
        scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true },
      });
      ScrollTrigger.create({
        trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          wrap.style.opacity = (p > 0.12 && p < 0.92) ? 1 : 0;
        },
      });
    });
  }

  /* ---------- Dark overlay (stats legibility) ---------- */
  function initDarkOverlay() {
    const overlay = document.getElementById("dark-overlay");
    const stats = document.querySelector(".section-stats");
    if (!overlay || !stats) return;
    const enter = parseFloat(stats.dataset.enter) / 100;
    const leave = parseFloat(stats.dataset.leave) / 100;
    const fade = 0.04;
    ScrollTrigger.create({
      trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let o = 0;
        if (p >= enter - fade && p <= enter) o = ((p - (enter - fade)) / fade) * 0.9;
        else if (p > enter && p < leave) o = 0.9;
        else if (p >= leave && p <= leave + fade) o = 0.9 * (1 - (p - leave) / fade);
        overlay.style.opacity = o;
      },
    });
  }

  /* ---------- 3D tilt on glass cards (pointer parallax) ---------- */
  function init3DTilt(reduce) {
    if (reduce) return;
    document.querySelectorAll(".tilt").forEach((card) => {
      const parent = card.closest(".scroll-section");
      parent.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const rx = ((e.clientY - cy) / r.height) * -8;
        const ry = ((e.clientX - cx) / r.width) * 8;
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      parent.addEventListener("mouseleave", () => {
        card.style.transform = "rotateX(0) rotateY(0)";
      });
    });
  }

  /* ---------- Glass-ball cursor (small, very smooth, with trail) ---------- */
  function initCursor() {
    if (window.matchMedia("(hover: none)").matches) return;
    const orb = document.querySelector(".cursor-orb");
    const dot = document.querySelector(".cursor-dot");
    if (!orb || !dot) return;

    const TRAIL = 6;
    const trails = [];
    for (let i = 0; i < TRAIL; i++) {
      const t = document.createElement("div");
      t.className = "cursor-trail";
      document.body.appendChild(t);
      trails.push({ el: t, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let ox = mx, oy = my;
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    // Grow the orb over interactive / glassy elements
    const interactive = "a, button, .glass-card, .cta-button, .project-card, input, textarea";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactive)) orb.classList.add("active");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactive) && !e.relatedTarget?.closest?.(interactive)) orb.classList.remove("active");
    });

    const place = (el, x, y) => { el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; };
    function loop() {
      ox += (mx - ox) * 0.18;
      oy += (my - oy) * 0.18;
      place(orb, ox, oy);
      place(dot, mx, my);              // precise center, no lag
      let px = ox, py = oy;
      trails.forEach((t, i) => {
        t.x += (px - t.x) * 0.32;
        t.y += (py - t.y) * 0.32;
        const f = 1 - i / TRAIL;
        const s = 9 * f;
        t.el.style.width = t.el.style.height = s + "px";
        t.el.style.opacity = 0.5 * f;
        place(t.el, t.x, t.y);
        px = t.x; py = t.y;
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------- Boot ---------- */
  initCursor();
  initCounters();
  preload();
})();
