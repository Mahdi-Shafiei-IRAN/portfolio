/* Contact monolith — vanilla port of Contact.jsx from DineshS36/portfolio
 * (Apache-2.0, commit 35c3989): signal meter, rim glow, copy email, and the
 * 3.4 s rocket flight while the message is sent. Messages go to the Django
 * endpoint (stored for the admin) instead of the upstream Resend API. */
(() => {
    'use strict';

    const card = document.querySelector('[data-monolith]');
    if (!card) return;

    const form = card.querySelector('[data-contact-form]');
    const fields = {
        name: form.querySelector('[name="name"]'),
        email: form.querySelector('[name="email"]'),
        message: form.querySelector('[name="message"]'),
    };
    const states = {
        idle: card.querySelector('[data-state="idle"]'),
        launching: card.querySelector('[data-state="launching"]'),
        sent: card.querySelector('[data-state="sent"]'),
    };
    const pill = card.querySelector('[data-pill]');
    const title = card.querySelector('[data-title]');
    const statusEl = form.querySelector('[data-status]');
    const signalLabel = card.querySelector('[data-signal-label]');
    const signalValue = card.querySelector('[data-signal-value]');
    const signalFill = card.querySelector('[data-signal-fill]');
    const launchValue = card.querySelector('[data-launch-value]');
    const launchText = card.querySelector('[data-launch-text]');
    const launchFill = card.querySelector('[data-launch-fill]');
    const rocket = card.querySelector('[data-rocket]');
    const senderName = card.querySelector('[data-sender-name]');
    const audio = window.ResumeCore && window.ResumeCore.audio;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const LABELS = {
        idle: ['Quick Mail', 'Direct Message'],
        launching: ['Transmitting', 'Signal In Flight'],
        sent: ['Delivered', 'Transmission Complete'],
    };
    const setState = (name) => {
        Object.entries(states).forEach(([key, el]) => { el.hidden = key !== name; });
        [pill.textContent, title.textContent] = LABELS[name];
    };
    const setStatus = (text) => {
        statusEl.textContent = text || '';
        statusEl.hidden = !text;
    };

    // Signal meter: 35 + 35 + 30 as the fields fill in.
    const updateSignal = () => {
        let score = 0;
        if (fields.name.value.trim().length > 1) score += 35;
        const email = fields.email.value.trim();
        if (email.length > 3 && email.includes('@')) score += 35;
        if (fields.message.value.trim().length > 4) score += 30;
        signalValue.textContent = `${score}%`;
        signalFill.style.width = `${score}%`;
        signalLabel.textContent = score === 0 ? 'Awaiting your details'
            : score < 70 ? 'In progress' : score < 100 ? 'Almost ready' : 'Ready to send';
    };
    form.addEventListener('input', updateSignal);
    Object.values(fields).forEach((f) => f.addEventListener('focus', () => audio && audio.hover()));

    // Starlight rim glow follows the pointer.
    card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
    });

    const send = async () => {
        const res = await fetch(card.dataset.sendUrl, {
            method: 'POST',
            body: new FormData(form),   // includes csrfmiddlewaretoken and the honeypot
            headers: { 'X-Requested-With': 'fetch' },
            credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || 'Transmission failed. Please try again or use Copy Email.');
        return data;
    };

    const flightText = (p) => (p < 30 ? 'Preparing flight trajectory...'
        : p < 75 ? 'Gliding across communications channel...'
            : p < 100 ? 'Approaching destination...' : 'Transmission Delivered!');

    const paintFlight = (p) => {
        launchValue.textContent = `${p}%`;
        launchText.textContent = flightText(p);
        launchFill.style.width = `${p}%`;
        const t = p / 100;
        rocket.style.transform = `translate(${t * 440 - 220}px, ${Math.sin(t * Math.PI * 3) * 25}px) `
            + `rotate(${Math.cos(t * Math.PI * 3) * 11 - 2}deg)`;
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!fields.name.value.trim() || !fields.message.value.trim()) {
            setStatus('Please enter your name and message.');
            return;
        }
        setStatus('');
        setState('launching');
        paintFlight(0);
        const sending = send();
        sending.catch(() => {}); // handled when the rocket lands

        const start = performance.now();
        const duration = reduceMotion ? 300 : 3400;
        const step = (now) => {
            const p = Math.min(100, Math.round(((now - start) / duration) * 100));
            paintFlight(p);
            if (p < 100) { requestAnimationFrame(step); return; }
            sending
                .then(() => setTimeout(() => {
                    senderName.textContent = fields.name.value.trim();
                    setState('sent');
                    if (audio) audio.click();
                }, 300))
                .catch((err) => setTimeout(() => {
                    setState('idle');
                    // fetch() itself rejects with a TypeError when the network is down.
                    setStatus(err instanceof TypeError
                        ? 'Network error — please try again or use Copy Email.'
                        : err.message);
                }, 500));
        };
        requestAnimationFrame(step);
    });

    card.querySelector('[data-reset]').addEventListener('click', () => {
        form.reset();
        updateSignal();
        setStatus('');
        setState('idle');
    });

    // Copy email (with a fallback for browsers without the async clipboard API).
    const copyBtn = document.querySelector('[data-copy-email]');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const email = copyBtn.dataset.copyEmail;
            try {
                await navigator.clipboard.writeText(email);
            } catch (err) {
                const tmp = document.createElement('textarea');
                tmp.value = email;
                tmp.setAttribute('readonly', '');
                tmp.style.position = 'absolute';
                tmp.style.left = '-9999px';
                document.body.append(tmp);
                tmp.select();
                document.execCommand('copy');
                tmp.remove();
            }
            copyBtn.textContent = '✓ Copied';
            setTimeout(() => { copyBtn.textContent = 'Copy Email'; }, 2400);
        });
    }

    updateSignal();
})();
