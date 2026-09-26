/* Resume shell — vanilla port of DineshS36/portfolio (Apache-2.0): Layout,
 * Navbar, CustomCursor, Preloader, useAudio, useLenis, usePageTransitions and
 * useTextScramble, plus the wormhole arrival/return. Exposes window.ResumeCore
 * for the page scripts (they must not import each other; see the plan). */
(() => {
    'use strict';

    const doc = document.documentElement;
    const body = document.body;
    const page = body.dataset.page;
    const isHero = page === 'hero';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrapper = document.querySelector('.page-transition-wrapper');
    const store = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
    const hasGsap = typeof window.gsap !== 'undefined';

    if (hasGsap) {
        if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        if (window.Observer) gsap.registerPlugin(Observer);
    }

    // ---------------------------------------------------------------- audio
    // Procedural Web Audio blips; muted until the sound button is pressed.
    const audio = (() => {
        let ctx = null;
        let master = null;
        let muted = true;

        const init = () => {
            if (ctx) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0;
            master.connect(ctx.destination);
        };
        const firstGesture = () => {
            init();
            if (ctx && ctx.state === 'suspended') ctx.resume();
            window.removeEventListener('click', firstGesture);
            window.removeEventListener('keydown', firstGesture);
        };
        window.addEventListener('click', firstGesture);
        window.addEventListener('keydown', firstGesture);

        const blip = (type, f0, f1, sweep, peak, length) => {
            if (!ctx || muted || !master) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime;
            osc.type = type;
            osc.frequency.setValueAtTime(f0, t);
            osc.frequency.exponentialRampToValueAtTime(f1, t + sweep);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(peak, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + length);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t);
            osc.stop(t + length);
        };

        return {
            get muted() { return muted; },
            toggle() {
                init();
                if (!ctx) return muted;
                if (ctx.state === 'suspended') ctx.resume();
                muted = !muted;
                master.gain.setTargetAtTime(muted ? 0 : 0.3, ctx.currentTime, 0.05);
                return muted;
            },
            hover: () => blip('sine', 400, 800, 0.05, 0.1, 0.1),
            click: () => blip('triangle', 150, 50, 0.1, 0.2, 0.2),
        };
    })();

    let lastHovered = null;
    document.addEventListener('mouseover', (e) => {
        const el = e.target.closest && e.target.closest('.hoverable');
        if (el && el !== lastHovered) audio.hover();
        lastHovered = el || null;
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('a, button, [role="button"]')) audio.click();
    }, true);

    const ICON_MUTED = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
    const ICON_SOUND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const muted = audio.toggle();
            btn.innerHTML = muted ? ICON_MUTED : ICON_SOUND;
            btn.setAttribute('aria-label', muted ? 'Unmute Audio' : 'Mute Audio');
            audio.click();
        });
    });

    // --------------------------------------------------------------- cursor
    // Moon-phase cursor that follows the pointer (fine pointers only).
    (() => {
        const el = document.getElementById('cursor');
        if (!el || !hasGsap || !window.matchMedia('(pointer: fine)').matches) return;
        gsap.set(el, { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 });
        const xTo = gsap.quickTo(el, 'x', { duration: 0.12, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.12, ease: 'power3.out' });

        const moon = () => {
            const lunarCycle = 2551443;
            const newMoon = new Date('2000-01-06T12:24:01').getTime() / 1000;
            const phase = ((Date.now() / 1000 - newMoon) % lunarCycle) / lunarCycle;
            const shadow = phase < 0.5 ? `inset ${phase * 40}px 0 0 #fff` : `inset -${(1 - phase) * 40}px 0 0 #fff`;
            el.style.setProperty('--moon-shadow', shadow);
            el.style.boxShadow = 'var(--moon-shadow, none)';
        };
        moon();
        setInterval(moon, 3600000);

        let visible = false;
        window.addEventListener('mousemove', (e) => {
            if (!visible) { gsap.set(el, { opacity: 1 }); visible = true; }
            xTo(e.clientX);
            yTo(e.clientY);
            el.classList.toggle('hovered', !!(e.target.closest && e.target.closest('.hoverable')));
        }, { passive: true });
        doc.addEventListener('mouseleave', () => { gsap.to(el, { opacity: 0, duration: 0.2 }); visible = false; });
        doc.addEventListener('mouseenter', () => { gsap.to(el, { opacity: 1, duration: 0.2 }); visible = true; });
    })();

    // ---------------------------------------------------------------- lenis
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    let lenis = null;
    if (window.Lenis && hasGsap && !reduceMotion) {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            touchMultiplier: 2,
        });
        window.__lenis = lenis;
        if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }
    const stopLenis = () => { if (lenis) lenis.stop(); };
    const startLenis = () => { if (lenis) lenis.start(); };
    const resetLenis = () => {
        if (!lenis) return;
        lenis.stop();
        lenis.scrollTo(0, { immediate: true, force: true });
        lenis.start();
    };

    // --------------------------------------------------------------- navbar
    const dock = document.querySelector('[data-dock]');
    if (isHero && dock) {
        const updateDock = () => {
            const scrolled = window.scrollY > 120;
            dock.classList.toggle('nav-hidden', scrolled);
            dock.classList.toggle('nav-visible', !scrolled);
        };
        window.addEventListener('scroll', updateDock, { passive: true });
        window.addEventListener('resize', updateDock);
        updateDock();
    }

    const drawer = document.querySelector('[data-drawer]');
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const setDrawer = (open) => {
        drawer.classList.toggle('open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close Navigation Menu' : 'Open Navigation Menu');
        const [top, bot] = menuToggle.querySelectorAll('.hamburger-bar');
        top.classList.toggle('open', open);
        top.classList.toggle('top', open);
        bot.classList.toggle('open', open);
        bot.classList.toggle('bot', open);
        body.style.overflow = open ? 'hidden' : '';
        if (open) stopLenis(); else startLenis();
    };
    if (drawer && menuToggle) {
        menuToggle.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
        drawer.querySelector('[data-drawer-close]').addEventListener('click', () => setDrawer(false));
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false);
        });
    }

    // -------------------------------------------------------- text scramble
    const SCRAMBLE = '01XYZ_#$+-*[]{}/\\';
    const scramble = (el) => {
        const original = el.dataset.text || el.textContent;
        el.dataset.text = original;
        let iteration = 0;
        clearInterval(el._scramble);
        el._scramble = setInterval(() => {
            el.textContent = original.split('').map((ch, i) => {
                if (ch === ' ' || ch === '.') return ch;
                if (i < iteration) return original[i];
                return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
            }).join('');
            if (iteration >= original.length) clearInterval(el._scramble);
            iteration += 0.5;
        }, 30);
    };
    document.querySelectorAll('[data-scramble]').forEach((el) => {
        el.addEventListener('mouseenter', () => scramble(el));
        el.addEventListener('mouseleave', () => {
            clearInterval(el._scramble);
            if (el.dataset.text) el.textContent = el.dataset.text;
        });
    });

    // ----------------------------------------------------- page transitions
    // Wheel/touch intent at the bottom moves to the next section, at the top to
    // the previous one; on the hero any downward intent moves on.
    const prevUrl = body.dataset.prev;
    const nextUrl = body.dataset.next;
    const COOLDOWN_MS = 850;
    let navigating = false;
    let observer = null;

    const isBusy = () => !!(
        document.querySelector('.project-modal-overlay') ||
        (drawer && drawer.classList.contains('open')) ||
        body.style.overflow === 'hidden'
    );

    const transitionTo = (direction) => {
        if (navigating || isBusy()) return;
        const url = direction === 'next' ? nextUrl : prevUrl;
        if (!url) return;
        navigating = true;
        if (observer) observer.disable();
        stopLenis();
        const go = () => { window.location.href = url; };
        if (!hasGsap || reduceMotion) { go(); return; }
        gsap.to(wrapper, { opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: go });
    };

    const startObserver = () => {
        if (!window.Observer) return;
        observer = Observer.create({
            type: 'wheel,touch,pointer',
            wheelSpeed: -1,
            tolerance: 45,
            preventDefault: false,
            onUp: () => {
                if (navigating || isBusy()) return;
                if (isHero) { transitionTo('next'); return; }
                const atBottom = window.innerHeight + Math.round(window.scrollY) >= doc.scrollHeight - 15;
                if (atBottom) transitionTo('next');
            },
            onDown: () => {
                if (navigating || isBusy() || isHero) return;
                if (window.scrollY <= 8) transitionTo('prev');
            },
        });
        observer.disable();
        setTimeout(() => { if (!navigating) observer.enable(); }, COOLDOWN_MS);
    };

    document.querySelectorAll('[data-next-hint]').forEach((btn) => {
        btn.addEventListener('click', () => transitionTo('next'));
    });

    // --------------------------------------------------------- page reveals
    const reveal = () => {
        if (!hasGsap || reduceMotion) return;
        gsap.fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });

        requestAnimationFrame(() => {
            if (window.ScrollTrigger) ScrollTrigger.refresh();

            if (isHero) {
                gsap.fromTo('.hero-elem',
                    { y: 50, opacity: 0, scale: 0.95 },
                    { y: 0, opacity: 1, scale: 1, duration: 1.2, stagger: 0.2, ease: 'power4.out', delay: 0.2 });
            }

            gsap.utils.toArray('.gsap-reveal').forEach((elem) => {
                const words = elem.querySelectorAll('.word-inner');
                const divider = elem.querySelector('.divider');

                if (words.length || divider) {
                    const tl = gsap.timeline({ scrollTrigger: { trigger: elem, start: 'top 92%', once: true } });
                    if (words.length) {
                        tl.fromTo(words, { yPercent: 105, opacity: 0 },
                            { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
                    }
                    if (divider) {
                        const centered = divider.classList.contains('centered');
                        tl.fromTo(divider,
                            { scaleX: 0, opacity: 0, transformOrigin: centered ? 'center center' : 'left center' },
                            { scaleX: 1, opacity: 1, duration: 0.75, ease: 'power2.out', clearProps: 'all' },
                            words.length ? '-=0.4' : 0);
                    }
                    const trailing = elem.querySelectorAll('.about-text, .skill-list, .contact-lead, .beacon-eyebrow');
                    if (trailing.length) {
                        tl.fromTo(trailing, { y: 25, opacity: 0 },
                            { y: 0, opacity: 1, duration: 0.75, stagger: 0.07, ease: 'power3.out', clearProps: 'all' },
                            '-=0.35');
                    }
                } else {
                    gsap.fromTo(elem, { y: 35, opacity: 0 }, {
                        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'all',
                        scrollTrigger: { trigger: elem, start: 'top 90%', once: true },
                    });
                }
            });

            if (document.querySelector('#work')) {
                gsap.fromTo('.gsap-work-card', { y: 100, opacity: 0 }, {
                    y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'power3.out',
                    scrollTrigger: { trigger: '#work', start: 'top 60%' },
                });
            }
        });
    };

    // ------------------------------------------------------------ preloader
    const runPreloader = (done) => {
        const pre = document.getElementById('preloader');
        if (!pre || doc.classList.contains('no-preloader')) {
            if (pre) pre.remove();
            done();
            return;
        }
        body.style.overflow = 'hidden';
        const bar = pre.querySelector('.loader-bar');
        const pct = pre.querySelector('.preloader-pct');
        const start = performance.now();
        const duration = 2500;

        const step = (now) => {
            const t = Math.min(Math.max((now - start) / duration, 0), 1);
            const progress = Math.min(100, Math.floor(t * 100));
            bar.style.width = `${progress}%`;
            pct.textContent = `${String(progress).padStart(3, '0')}%`;
            if (t < 1) { requestAnimationFrame(step); return; }
            setTimeout(() => {
                pre.style.opacity = '0';
                pre.style.pointerEvents = 'none';
                setTimeout(() => {
                    try { if (store) store.setItem('preloaderDone', 'true'); } catch (e) { /* storage blocked */ }
                    pre.remove();
                    body.style.overflow = '';
                    body.style.overflowX = 'hidden';
                    done();
                }, 600);
            }, 200);
        };
        requestAnimationFrame(step);
    };

    // ------------------------------------------------------------- wormhole
    const safePath = (value) => (typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/');
    const sketchbook = safePath(store && store.getItem('wormhole-from'));

    if (doc.classList.contains('wormhole-arriving')) {
        try { if (store) store.removeItem('wormhole-entering'); } catch (e) { /* storage blocked */ }
        // Two frames so the curtain paints once before fading out.
        requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.remove('wormhole-arriving')));
    }

    document.querySelectorAll('[data-wormhole-back]').forEach((link) => {
        link.setAttribute('href', sketchbook);
        link.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            try { if (store) store.setItem('wormhole-returning', '1'); } catch (err) { /* storage blocked */ }
            stopLenis();
            doc.classList.add('wormhole-closing');
            setTimeout(() => { window.location.href = sketchbook; }, reduceMotion ? 0 : 520);
        });
    });

    // Back/forward cache: undo "leaving" states when a page is restored.
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        navigating = false;
        doc.classList.remove('wormhole-closing');
        if (wrapper) wrapper.style.opacity = '1';
        startLenis();
        if (observer) observer.enable();
    });

    window.ResumeCore = { audio, stopLenis, startLenis, resetLenis, transitionTo, reduceMotion, page };

    runPreloader(() => {
        reveal();
        startObserver();
    });
})();
