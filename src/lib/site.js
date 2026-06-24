// ============================================================
// FORTA — site interactions
// nav scroll state, mobile menu, scroll reveals, marquee dup, magnetic.
// Imported as a side-effect module from the Base layout.
// ============================================================
const header = document.querySelector('.site-header');
let lastY = window.scrollY;

// Header: shrink on scroll, hide on scroll-down / show on scroll-up
function onScroll() {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('scrolled', y > 40);
    if (y > 400 && y > lastY + 4) { header.classList.add('hidden'); }
    else if (y < lastY - 4 || y < 200) { header.classList.remove('hidden'); }
  }
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.mobile-menu');
if (toggle && menu) {
  const close = () => {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
}

// Scroll reveals — manual rect check (robust even when fonts/layout settle late)
let reveals = Array.from(document.querySelectorAll('[data-reveal]'));
let ticking = false;
function checkReveals() {
  ticking = false;
  const h = window.innerHeight || document.documentElement.clientHeight;
  reveals = reveals.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < h * 0.92 && r.bottom > 0) { el.classList.add('in'); return false; }
    return true;
  });
}
function requestReveal() {
  if (!ticking) { ticking = true; requestAnimationFrame(checkReveals); }
}
window.addEventListener('scroll', requestReveal, { passive: true });
window.addEventListener('resize', requestReveal, { passive: true });
checkReveals();
[120, 400, 900].forEach((t) => setTimeout(checkReveals, t));
window.addEventListener('load', checkReveals);
// last-resort safety: never leave content hidden
setTimeout(() => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => el.classList.add('in')), 3000);

// Duplicate marquee content for seamless loop
document.querySelectorAll('.marquee-track').forEach((track) => {
  track.innerHTML += track.innerHTML;
});

// Magnetic buttons (subtle)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.28}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}
