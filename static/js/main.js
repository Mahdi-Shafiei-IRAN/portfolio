// Nav: add background when scrolled past hero
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('bg-slate-900/95', 'backdrop-blur-sm', 'shadow-lg');
        } else {
            navbar.classList.remove('bg-slate-900/95', 'backdrop-blur-sm', 'shadow-lg');
        }
    });
}

// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
    // Close when any link is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
}

// Pause hero video on mobile to save data
const heroVideo = document.querySelector('#hero video');
if (heroVideo && window.innerWidth < 640) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
}
