/* The wormhole: any [data-wormhole] link swallows the doodle page into a black
 * hole at the click point, then opens the resume (which fades in from black).
 * Coming back through the resume's "Back to the sketchbook" spirals the page
 * back out. Modified clicks (new tab/window) are left to the browser. */
(() => {
    'use strict';

    const doc = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const store = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
    const SWALLOW_MS = 1150;
    const targets = () => document.querySelectorAll('main, .site-header, .site-footer');

    const remember = (key, value) => { try { if (store) store.setItem(key, value); } catch (e) { /* blocked */ } };
    const forget = (key) => { try { if (store) store.removeItem(key); } catch (e) { /* blocked */ } };

    const swallow = (link, x, y) => {
        remember('wormhole-from', window.location.pathname + window.location.search);
        remember('wormhole-entering', '1');
        const go = () => { window.location.href = link.href; };

        if (reduceMotion) {
            doc.classList.add('wormhole-fade');
            setTimeout(go, 250);
            return;
        }
        // Each element spins around the click point, measured in its own box.
        targets().forEach((el) => {
            const r = el.getBoundingClientRect();
            el.style.transformOrigin = `${x - r.left}px ${y - r.top}px`;
        });
        const disc = document.createElement('div');
        disc.className = 'wormhole-disc';
        disc.style.left = `${x}px`;
        disc.style.top = `${y}px`;
        document.body.append(disc);
        requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('wormhole-leaving')));
        setTimeout(go, SWALLOW_MS);
    };

    document.addEventListener('click', (e) => {
        const link = e.target.closest && e.target.closest('[data-wormhole]');
        if (!link || e.defaultPrevented) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        // Keyboard activation has no pointer position: use the link's centre.
        let x = e.clientX;
        let y = e.clientY;
        if (!x && !y) {
            const r = link.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
        }
        swallow(link, x, y);
    });

    const spiralOut = () => {
        if (!store || !store.getItem('wormhole-returning')) return;
        forget('wormhole-returning');
        if (reduceMotion) { doc.classList.remove('wormhole-returning'); return; }
        doc.classList.add('wormhole-returning');
        requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('wormhole-returning-go')));
        setTimeout(() => doc.classList.remove('wormhole-returning', 'wormhole-returning-go'), 1300);
    };

    // Restored from the back/forward cache still swallowed: put the page back.
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        doc.classList.remove('wormhole-leaving', 'wormhole-fade');
        document.querySelectorAll('.wormhole-disc').forEach((d) => d.remove());
        targets().forEach((el) => { el.style.transformOrigin = ''; });
        spiralOut();
    });

    spiralOut();
})();
