/* Landing page: typewriter greeting, scroll switch, drag-a-role chips.
 * Timings follow dylanchen.me (100 ms/char, 300 px switch, 500 ms fade), but
 * dragging uses Pointer Events so it also works on touch screens. */
(() => {
    'use strict';

    const landing = document.querySelector('.landing');
    if (!landing) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const typeEl = landing.querySelector('.typewriter');
    const slot = landing.querySelector('.drop-slot');
    const hint = landing.querySelector('.scroll-hint');
    const chips = [...landing.querySelectorAll('.chip')];

    const BASE = typeEl.dataset.text;     // "Hi! I'm"
    const SWITCH_AT = 300;                // px scrolled before the sentence becomes "I'm a ..."
    const CHAR_MS = 100;
    const DRAG_START_PX = 6;              // movement before a press counts as a drag (taps still click)
    const SLOT_TOLERANCE = 28;            // px around the slot that still counts as a drop
    const LEAVE_MS = 500;

    let typed = false;
    let leaving = false;

    // 1. Typewriter --------------------------------------------------------
    function finishTyping() {
        typeEl.textContent = BASE;
        typed = true;
        landing.classList.add('typed');
        syncScrollState();
    }

    function typeGreeting() {
        if (reduceMotion) return finishTyping();
        typeEl.textContent = '';
        let i = 0;
        const step = () => {
            i += 1;
            typeEl.textContent = BASE.slice(0, i);
            if (i >= BASE.length) return finishTyping();
            const pause = BASE[i - 1] === ' ' ? 150 + Math.random() * 50 : 0;
            setTimeout(step, CHAR_MS + pause);
        };
        setTimeout(step, CHAR_MS);
    }

    // 2. Scroll switch: "Hi! I'm" <-> "Hi! I'm a [Drop Here]" + chips ---------
    function syncScrollState() {
        if (!typed || leaving) return;
        const scrolled = window.scrollY > SWITCH_AT;
        // Touch the DOM only when the state flips: rewriting the heading on every
        // scroll event forced a re-layout each time and made phones stutter.
        if (scrolled === landing.classList.contains('scrolled')) return;
        landing.classList.toggle('scrolled', scrolled);
        typeEl.textContent = scrolled ? `${BASE} a` : BASE;
    }

    let idleTimer;
    window.addEventListener('scroll', () => {
        hint.classList.add('hidden');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (window.scrollY < 10 && typed) hint.classList.remove('hidden');
        }, 900);
        syncScrollState();
    }, { passive: true });

    // 3. Choosing a role (drop, tap or keyboard) ----------------------------
    function choose(chip) {
        if (leaving) return;
        leaving = true;
        landing.classList.add('scrolled');
        typeEl.textContent = `${BASE} a`;
        slot.textContent = chip.textContent.trim();
        slot.classList.remove('over');
        slot.classList.add('filled');
        chip.classList.add('used');
        chip.style.transform = '';
        const go = () => { window.location.href = chip.href; };
        if (reduceMotion) return go();
        document.body.classList.add('leaving');
        setTimeout(go, LEAVE_MS);
    }

    function overSlot(x, y) {
        const r = slot.getBoundingClientRect();
        return x >= r.left - SLOT_TOLERANCE && x <= r.right + SLOT_TOLERANCE
            && y >= r.top - SLOT_TOLERANCE && y <= r.bottom + SLOT_TOLERANCE;
    }

    // 4. Pointer-driven drag --------------------------------------------------
    chips.forEach((chip) => {
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        let dragging = false;
        let suppressClick = false;

        chip.addEventListener('dragstart', (e) => e.preventDefault());  // no native link drag

        chip.addEventListener('pointerdown', (e) => {
            if (leaving || e.button !== 0) return;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            dragging = false;
            chip.setPointerCapture(pointerId);
        });

        chip.addEventListener('pointermove', (e) => {
            if (e.pointerId !== pointerId) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging) {
                if (Math.hypot(dx, dy) < DRAG_START_PX) return;
                dragging = true;
                chip.classList.remove('returning');
                chip.classList.add('dragging');
            }
            chip.style.transform = `translate(${dx}px, ${dy}px)`;
            slot.classList.toggle('over', overSlot(e.clientX, e.clientY));
        });

        const release = (e, canDrop) => {
            if (e.pointerId !== pointerId) return;
            pointerId = null;
            if (!dragging) return;                 // a plain tap: the click handler takes over
            dragging = false;
            suppressClick = true;                  // the click that follows a drag must not navigate
            setTimeout(() => { suppressClick = false; }, 0);
            chip.classList.remove('dragging');
            if (canDrop && overSlot(e.clientX, e.clientY)) {
                choose(chip);
            } else {
                slot.classList.remove('over');
                chip.classList.add('returning');
                chip.style.transform = '';
            }
        };
        chip.addEventListener('pointerup', (e) => release(e, true));
        chip.addEventListener('pointercancel', (e) => release(e, false));

        chip.addEventListener('click', (e) => {
            if (suppressClick) { e.preventDefault(); return; }             // the click that ends a drag
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;  // new tab/window: browser default
            e.preventDefault();
            choose(chip);                                                  // tap, click or Enter
        });
    });

    // 5. Back/forward cache: undo the "leaving" state when the page is restored.
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        leaving = false;
        document.body.classList.remove('leaving');
        slot.textContent = '[Drop Here]';
        slot.classList.remove('filled', 'over');
        chips.forEach((c) => {
            c.classList.remove('used', 'dragging', 'returning');
            c.style.transform = '';
        });
        syncScrollState();
    });

    typeGreeting();
})();
