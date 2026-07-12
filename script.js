const root = document.documentElement;

/* ---------- Lucide icons ---------- */
if (window.lucide) lucide.createIcons();

/* ---------- GSAP + ScrollTrigger setup ---------- */
gsap.registerPlugin(ScrollTrigger);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Force-desktop layout on phone (same alignment as laptop) ----------
   #scaleWrap holds nav + every section. Below REF_WIDTH we fix its layout
   width at REF_WIDTH and shrink it with CSS `zoom` rather than `transform`:
   zoom actually resizes the real layout box (so native/Lenis scroll length
   and ScrollTrigger positions stay correct automatically) and, unlike
   transform, it does not create a new containing block — so nav's
   position:fixed still anchors to the true viewport instead of to
   #scaleWrap. Runs before ScrollTrigger/Lenis init so they measure the
   already-corrected layout. */
const REF_WIDTH = 1280;
const scaleWrap = document.getElementById('scaleWrap');
function applyScaleWrap() {
  if (!scaleWrap) return;
  const vw = window.innerWidth;
  if (vw < REF_WIDTH) {
    const scale = vw / REF_WIDTH;
    scaleWrap.style.width = `${REF_WIDTH}px`;
    scaleWrap.style.zoom = scale;
    document.body.classList.add('reduce-fx');
  } else {
    scaleWrap.style.width = '';
    scaleWrap.style.zoom = '';
    document.body.classList.remove('reduce-fx');
  }
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}
applyScaleWrap();
window.addEventListener('resize', applyScaleWrap);
if (document.fonts) document.fonts.ready.then(applyScaleWrap);
/* icons/images can still shift layout height slightly after first paint */
setTimeout(applyScaleWrap, 400);
setTimeout(applyScaleWrap, 1200);

/* ---------- Lenis smooth scroll, wired into GSAP's ticker ---------- */
let lenis;
if (!prefersReducedMotion && window.Lenis) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        lenis.scrollTo(id, { offset: -70 });
      }
    });
  });
}

/* ---------- Cursor spotlight ---------- */
window.addEventListener('pointermove', (event) => {
  root.style.setProperty('--spot-x', `${(event.clientX / window.innerWidth) * 100}%`);
  root.style.setProperty('--spot-y', `${(event.clientY / window.innerHeight) * 100}%`);
  root.style.setProperty('--mouse-x', `${((event.clientX - window.innerWidth / 2) / window.innerWidth) * 16}px`);
  root.style.setProperty('--mouse-y', `${((event.clientY - window.innerHeight / 2) / window.innerHeight) * 16}px`);
}, { passive: true });

/* ---------- Magnetic buttons (GSAP quickTo for smoothness) ---------- */
const magneticTargets = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta');
magneticTargets.forEach((target) => {
  const setX = gsap.quickTo(target, '--mag-x', { duration: 0.4, ease: 'power3' });
  const setY = gsap.quickTo(target, '--mag-y', { duration: 0.4, ease: 'power3' });
  target.addEventListener('pointermove', (event) => {
    const bounds = target.getBoundingClientRect();
    const offsetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
    const offsetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 16;
    setX(offsetX);
    setY(offsetY);
  });
  target.addEventListener('pointerleave', () => { setX(0); setY(0); });
});

/* ---------- Click ripple (visual emphasis on click, any button) ---------- */
magneticTargets.forEach((target) => {
  target.addEventListener('click', (event) => {
    const bounds = target.getBoundingClientRect();
    const size = Math.max(bounds.width, bounds.height) * 1.6;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - bounds.left - size / 2}px`;
    ripple.style.top = `${event.clientY - bounds.top - size / 2}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

/* ---------- Custom cursor (pointer devices only) ---------- */
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (fine) {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  const ringX = gsap.quickTo(ring, 'left', { duration: 0.35, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'top', { duration: 0.35, ease: 'power3' });

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    ringX(e.clientX);
    ringY(e.clientY);
  });

  const interactive = 'a, button, input, textarea, .skill-card, .project-card, .value-card, .ach-card, .pill';
  document.querySelectorAll(interactive).forEach((el) => {
    el.addEventListener('mouseenter', () => { cursor.classList.add('hovering'); ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', () => { cursor.classList.remove('hovering'); ring.classList.remove('hovering'); });
  });
} else {
  document.getElementById('cursor').style.display = 'none';
  document.getElementById('cursorRing').style.display = 'none';
}

/* ---------- Sticky navbar background on scroll ---------- */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 30,
  onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 30),
});

/* ---------- Back-to-top button ---------- */
const backToTop = document.getElementById('backToTop');
ScrollTrigger.create({
  start: 500,
  onUpdate: (self) => backToTop.classList.toggle('show', self.scroll() > 500),
});
backToTop.addEventListener('click', () => {
  if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- Scroll-linked parallax for blobs & geo shapes (GSAP) ---------- */
document.querySelectorAll('.blob-bg').forEach((layer, index) => {
  gsap.to(layer, {
    y: () => window.innerHeight * (0.05 + index * 0.01),
    ease: 'none',
    scrollTrigger: { trigger: layer.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 0.6 },
  });
});

const geoMotion = Array.from(document.querySelectorAll('.geo-shape')).map((shape, index) => ({ shape, index }));
if (!prefersReducedMotion) {
  geoMotion.forEach(({ shape, index }) => {
    gsap.to(shape, {
      '--parallax-y': `${140 + index * 30}px`,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    });
    const phaseOffset = index * 1.4;
    gsap.to(shape, {
      '--float-y': `${10 + index * 2.2}px`,
      '--float-rot': `${4 + index * 0.7}deg`,
      duration: 2.4 + index * 0.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: phaseOffset * 0.3,
    });
    /* Continuous 3D tumble — these shapes already sit in 3D (each has a
       fixed rotateX/rotateY "base" pose), this gently rocks them around
       that pose over time so the background actually reads as animating
       in 3D, not just drifting/spinning flat on the Z axis. */
    gsap.to(shape, {
      '--float-rx': `${8 + index * 1.6}deg`,
      duration: 5 + index * 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: phaseOffset * 0.2,
    });
    gsap.to(shape, {
      '--float-ry': `${-10 - index * 1.4}deg`,
      duration: 6.5 + index * 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: phaseOffset * 0.4,
    });
  });
}

/* ---------- Soft particle field (canvas) ----------
   Perf note: the previous version called createRadialGradient() +
   addColorStop() per particle, per frame — that's the single most
   expensive thing this page did every frame. Each particle's glow is
   now pre-rendered once onto a small offscreen sprite canvas, and the
   main loop just drawImage()s it, which is dramatically cheaper. */
const particleCanvas = document.getElementById('particleCanvas');
const particleCtx = particleCanvas.getContext('2d', { alpha: true });
const particles = [];
const lowPower = window.innerWidth < REF_WIDTH || window.matchMedia('(pointer: coarse)').matches;
const particleCount = prefersReducedMotion ? 8 : (lowPower ? 12 : 24);
const spriteSize = 64;
const sprites = {
  '111, 152, 184': makeGlowSprite('111, 152, 184'),
  '126, 157, 143': makeGlowSprite('126, 157, 143'),
};

function makeGlowSprite(hue) {
  const c = document.createElement('canvas');
  c.width = spriteSize;
  c.height = spriteSize;
  const ctx = c.getContext('2d');
  const glow = ctx.createRadialGradient(spriteSize / 2, spriteSize / 2, 0, spriteSize / 2, spriteSize / 2, spriteSize / 2);
  glow.addColorStop(0, `rgba(${hue}, 1)`);
  glow.addColorStop(0.4, `rgba(${hue}, 0.45)`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, spriteSize, spriteSize);
  return c;
}

const resizeParticles = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
  particleCanvas.width = Math.floor(window.innerWidth * dpr);
  particleCanvas.height = Math.floor(window.innerHeight * dpr);
  particleCanvas.style.width = window.innerWidth + 'px';
  particleCanvas.style.height = window.innerHeight + 'px';
  particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
const makeParticle = () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: 0.8 + Math.random() * 1.8,
  vx: (Math.random() - 0.5) * 0.14,
  vy: -0.08 - Math.random() * 0.22,
  alpha: 0.08 + Math.random() * 0.22,
  drift: Math.random() * Math.PI * 2,
  sprite: Math.random() > 0.5 ? sprites['111, 152, 184'] : sprites['126, 157, 143'],
});
const initParticles = () => {
  particles.length = 0;
  for (let i = 0; i < particleCount; i += 1) particles.push(makeParticle());
};
const drawParticles = (time) => {
  particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const elapsed = time * 0.001;
  particles.forEach((p, index) => {
    p.drift += 0.003 + index * 0.00008;
    p.x += p.vx + Math.sin(elapsed * 0.5 + p.drift) * 0.05;
    p.y += p.vy;
    if (p.x < -40) p.x = window.innerWidth + 40;
    if (p.x > window.innerWidth + 40) p.x = -40;
    if (p.y < -40) p.y = window.innerHeight + 40;
    const size = p.r * 8 * 2 * (1 + Math.sin(elapsed + p.drift) * 0.2);
    particleCtx.globalAlpha = p.alpha;
    particleCtx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
  });
  particleCtx.globalAlpha = 1;
  requestAnimationFrame(drawParticles);
};
resizeParticles();
initParticles();
requestAnimationFrame(drawParticles);
window.addEventListener('resize', () => { resizeParticles(); initParticles(); }, { passive: true });

/* ---------- Meteors (Magic UI-style) ---------- */
const meteorField = document.getElementById('meteorField');
if (meteorField && !prefersReducedMotion) {
  const meteorCount = 26;
  for (let i = 0; i < meteorCount; i += 1) {
    const m = document.createElement('span');
    m.className = 'meteor';
    const scale = 0.6 + Math.random() * 0.9;
    m.style.left = `${Math.random() * 100}%`;
    m.style.animationDelay = `${Math.random() * 5}s`;
    m.style.animationDuration = `${3.5 + Math.random() * 3.5}s`;
    m.style.setProperty('--meteor-scale', scale.toFixed(2));
    m.style.setProperty('--meteor-peak', (0.4 + Math.random() * 0.5).toFixed(2));
    meteorField.appendChild(m);
  }
}

/* ---------- Spotlight cards: track cursor position per card ---------- */
document.querySelectorAll('.value-card, .skill-card, .project-card, .tl-card, .ach-card, .edu-card, .profile-card, .contact-form')
  .forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - bounds.left}px`);
      card.style.setProperty('--my', `${e.clientY - bounds.top}px`);
    });
  });

/* ---------- Mouse-driven 3D tilt (Aceternity-card style) ----------
   Plain CSS custom-property + transition, deliberately NOT run through GSAP:
   these cards already get a separate GSAP opacity tween for scroll-reveal,
   and GSAP's transform cache doesn't compose cleanly with a second GSAP
   tween on the same element's transform. A CSS transition sidesteps that
   entirely and is just as smooth. */
if (!prefersReducedMotion) {
  const wireTilt = (el, strength) => {
    el.addEventListener('pointermove', (e) => {
      const bounds = el.getBoundingClientRect();
      const px = (e.clientX - bounds.left) / bounds.width - 0.5;
      const py = (e.clientY - bounds.top) / bounds.height - 0.5;
      el.style.setProperty('--trx', `${(py * -strength).toFixed(2)}deg`);
      el.style.setProperty('--try', `${(px * strength).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--trx', '0deg');
      el.style.setProperty('--try', '0deg');
    });
  };

  document.querySelectorAll('[data-tilt]').forEach((card) => wireTilt(card, 9));

  const photoTilt = document.getElementById('photoTilt');
  if (photoTilt) wireTilt(photoTilt, 14);

  /* Defensive fix: on first paint, some browsers cache a stale computed
     style for elements whose "transform"/"opacity" depend on a CSS custom
     property (--trx/--try here) and were already opacity:0 at that very
     first paint — the custom property updates correctly afterward, but
     "transform"/"opacity" silently stop recomputing from it. A display
     toggle forces the element's style to be thrown away and recomputed
     from scratch, which reliably clears it. It's cheap and idempotent, so
     it's fired through several redundant schedulers (rAF alone isn't
     reliable — it can be throttled before the first paint) rather than
     just once. */
  const unstickTiltCards = () => {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const prevDisplay = card.style.display;
      card.style.display = 'none';
      void card.offsetHeight;
      card.style.display = prevDisplay;
    });
  };
  unstickTiltCards();
  requestAnimationFrame(unstickTiltCards);
  setTimeout(unstickTiltCards, 0);
  setTimeout(unstickTiltCards, 300);
  window.addEventListener('load', unstickTiltCards, { once: true });
  /* Belt-and-suspenders: also re-run on scroll (throttled), since a card
     further down the page only needs unsticking once IT is about to be
     revealed — a single one-off listener could fire too early (on the
     first pixel of scroll) and not help a card revealed much later. */
  let unstickThrottle = false;
  window.addEventListener('scroll', () => {
    if (unstickThrottle) return;
    unstickThrottle = true;
    setTimeout(() => { unstickTiltCards(); unstickThrottle = false; }, 250);
  }, { passive: true });
  ['pointermove', 'touchstart'].forEach((evt) =>
    window.addEventListener(evt, unstickTiltCards, { once: true, passive: true })
  );
}

/* ---------- Hero heading word-split reveal (GSAP, Framer-Motion-esque stagger) ---------- */
(function splitHeroWords() {
  const heading = document.getElementById('heroName');
  if (!heading) return;
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  textNodes.forEach((textNode) => {
    const words = textNode.textContent.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    words.forEach((word) => {
      if (word.trim() === '') {
        frag.appendChild(document.createTextNode(word));
      } else {
        const wrap = document.createElement('span');
        wrap.className = 'word-split';
        const inner = document.createElement('span');
        inner.textContent = word;
        wrap.appendChild(inner);
        frag.appendChild(wrap);
      }
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });

  const words = heading.querySelectorAll('.word-split > span');
  gsap.from(words, {
    yPercent: 120,
    opacity: 0,
    duration: 0.9,
    ease: 'power4.out',
    stagger: 0.045,
    delay: 0.2,
  });
})();

/* ---------- Stat count-up ---------- */
document.querySelectorAll('.stat-num[data-count]').forEach((el) => {
  const target = parseFloat(el.getAttribute('data-count'));
  const suffix = el.getAttribute('data-suffix') || '';
  const isDecimal = !Number.isInteger(target);
  const counter = { val: 0 };
  const tweenVars = {
    val: target,
    duration: 1.4,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = (isDecimal ? counter.val.toFixed(1) : Math.round(counter.val)) + suffix;
    },
  };
  /* Hero stats sit in the initial viewport, so animate on load rather than
     scroll-trigger them — anything further down the page still gets a
     scroll-triggered count-up. */
  const inInitialView = el.getBoundingClientRect().top < window.innerHeight;
  if (inInitialView) {
    gsap.to(counter, { ...tweenVars, delay: 0.6 });
  } else {
    gsap.to(counter, { ...tweenVars, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  }
});

/* ---------- Reveal on scroll (GSAP ScrollTrigger, replaces IntersectionObserver) ----------
   Plays both directions: fades/slides in scrolling down into view, fades
   back out scrolling past it (either direction), and replays fading back
   in on the way back up — the repeatable "scroll up / scroll down" effect. */
document.querySelectorAll('.reveal').forEach((el, i) => {
  if (prefersReducedMotion) {
    el.classList.add('in');
    return;
  }
  /* Elements that have [data-tilt] on themselves stay 100% hands-off from
     GSAP entirely — not even an opacity tween. GSAP attaches its own
     tracking data to any element it tweens (even for just "opacity"), and
     in combination with this element's `will-change: transform` that's
     enough to make some browsers stop recomputing "transform" when only a
     CSS custom property (--trx/--try) changes — which silently breaks the
     hover-tilt for good. So these get a plain ScrollTrigger.create() with
     toggleClass instead: it flips the .in class on enter/leave (both
     directions), and a CSS transition (see [data-tilt].reveal in
     style.css) handles the actual opacity fade — GSAP's CSSPlugin never
     touches the node at all.
     Some reveal elements (.about-photo, .values-row, .edu-item) are only a
     *wrapper* around a [data-tilt] card rather than the card itself. They
     have no competing CSS transform of their own, so they can safely keep
     GSAP's y-slide — they just skip rotateX (otherwise the wrapper's GSAP
     rotation would visually carry its card children along with it, making
     the "flat" cards look tilted during the entrance anyway).
     Everything else (headings, text, list items) gets the full 3D
     tilt-up-into-place entrance via GSAP — visible on scroll alone, no
     hover/pointer needed. */
  const ownsTilt = el.hasAttribute('data-tilt');
  const wrapsTilt = !ownsTilt && !!el.querySelector('[data-tilt]');

  if (ownsTilt) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      end: 'bottom 8%',
      toggleClass: 'in',
    });
    return;
  }

  const fromVars = { opacity: 0, y: 36 };
  const toVars = {
    opacity: 1,
    y: 0,
    duration: 0.85,
    ease: 'power3.out',
    delay: (i % 4) * 0.06,
    scrollTrigger: {
      trigger: el,
      start: 'top 88%',
      end: 'bottom 8%',
      toggleActions: 'play reverse play reverse',
    },
    onStart: () => el.classList.add('in'),
    onReverseComplete: () => el.classList.remove('in'),
  };

  if (!wrapsTilt) {
    fromVars.rotateX = -14;
    fromVars.transformPerspective = 600;
    fromVars.transformOrigin = '50% 100%';
    toVars.rotateX = 0;
  }

  gsap.fromTo(el, fromVars, toVars);
});

/* ---------- Mobile menu toggle ---------- */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const closeMenu = () => {
  navLinks.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
};
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

/* ---------- Scroll reset on load ---------- */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const resetScroll = () => {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
};
window.addEventListener('load', resetScroll, { once: true });
window.addEventListener('pageshow', (event) => { if (event.persisted) resetScroll(); });

/* ---------- Contact form -> mailto ---------- */
const form = document.getElementById('contactForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const message = document.getElementById('cf-msg').value.trim();
  const subject = `Portfolio message from ${name}`;
  const body = `Hi Antra,\n\n${message}\n\n— ${name} (${email})`;
  window.location.href = `mailto:antrap2004@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

/* Re-render any lucide icons injected after initial createIcons() call */
if (window.lucide) lucide.createIcons();
ScrollTrigger.refresh();
