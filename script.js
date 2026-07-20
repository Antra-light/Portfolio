/* ---------- Lucide icons ---------- */
if (window.lucide) lucide.createIcons();

/* ---------- GSAP + ScrollTrigger setup ---------- */
gsap.registerPlugin(ScrollTrigger);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Reduce decorative effects on narrow / touch devices (perf) ----------
   Plain viewport-width + pointer-type check, no layout manipulation at all —
   this replaces an earlier "zoom the whole desktop layout down to fit phones"
   approach that was reverted (it made phone text unreadably small and its
   recalculations were implicated in scroll/perf issues on real devices). */
function applyReduceFx() {
  const shouldReduce = window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('reduce-fx', shouldReduce);
}
applyReduceFx();
window.addEventListener('resize', applyReduceFx);

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

/* ---------- Cursor spotlight ----------
   Perf fix, round 2: throttling the writes to once-per-frame (done
   earlier) wasn't the whole story. These 4 custom properties were being
   written onto <html> — the ancestor of literally every element on the
   page. Custom properties inherit down the tree, and a lot of browser
   engines can't always tell in advance which descendants actually use a
   given var(), so changing one on a very high-level ancestor can force a
   style recheck across large swaths of the document, not just the small
   number of elements that actually read it. A Performance-tab recording
   confirmed "Rendering" (style recalc + layout) was the dominant cost on
   this page, well ahead of Scripting — this is exactly the kind of thing
   that causes that. --spot-x/--spot-y are only ever read by .spotlight
   (one element) and --mouse-x/--mouse-y only by the 6 shapes inside
   .geo-field — so now they're written directly onto those two elements
   instead of <html>, shrinking the invalidation blast radius from "the
   whole page" to "the 7 elements that actually care." */
const spotlightEl = document.querySelector('.spotlight');
const geoFieldEl = document.querySelector('.geo-field');
let pointerX = 0;
let pointerY = 0;
let spotlightQueued = false;
function flushSpotlight() {
  spotlightQueued = false;
  const spotXPct = `${(pointerX / window.innerWidth) * 100}%`;
  const spotYPct = `${(pointerY / window.innerHeight) * 100}%`;
  const mouseXPx = `${((pointerX - window.innerWidth / 2) / window.innerWidth) * 16}px`;
  const mouseYPx = `${((pointerY - window.innerHeight / 2) / window.innerHeight) * 16}px`;
  if (spotlightEl) {
    spotlightEl.style.setProperty('--spot-x', spotXPct);
    spotlightEl.style.setProperty('--spot-y', spotYPct);
  }
  if (geoFieldEl) {
    geoFieldEl.style.setProperty('--mouse-x', mouseXPx);
    geoFieldEl.style.setProperty('--mouse-y', mouseYPx);
  }
}
window.addEventListener('pointermove', (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!spotlightQueued) {
    spotlightQueued = true;
    requestAnimationFrame(flushSpotlight);
  }
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
/* ---------- Scroll indicators (hero hint + fixed side badge) ---------- */
const scrollHint = document.getElementById('scrollHint');
if (scrollHint) {
  scrollHint.addEventListener('click', () => {
    const target = document.getElementById('about');
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Scroll badge: draggable progress dot + click-to-advance ----------
   The dot tracks real scroll position (0 = top, 1 = bottom) whenever it's
   not being dragged. Press-and-hold the dot itself and drag up/down to
   scroll the page directly — the page follows your hand 1:1, like an
   actual scrollbar thumb. A plain click anywhere else on the badge (no
   drag) just jumps to the next section. */
const scrollBadge = document.getElementById('scrollBadge');
const scrollProgressDot = document.getElementById('scrollProgressDot');
const scrollTrackEl = scrollBadge ? scrollBadge.querySelector('.scroll-track') : null;

if (scrollBadge && scrollProgressDot && scrollTrackEl) {
  const sectionIds = ['home', 'about', 'education', 'skills', 'projects', 'experience', 'achievements', 'contact'];
  const sectionEls = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  let dragging = false;
  let dragMoved = false;

  const setDot = (progress) => {
    scrollProgressDot.style.top = `${progress * 100}%`;
  };

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      if (!dragging) setDot(self.progress);
    },
  });

  const progressFromClientY = (clientY) => {
    const rect = scrollTrackEl.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  };

  const scrollToProgress = (progress) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const y = progress * maxScroll;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  };

  scrollProgressDot.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = false;
    scrollProgressDot.classList.add('dragging');
    scrollProgressDot.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });

  scrollProgressDot.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragMoved = true;
    const progress = progressFromClientY(e.clientY);
    setDot(progress);
    scrollToProgress(progress);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    scrollProgressDot.classList.remove('dragging');
    if (scrollProgressDot.hasPointerCapture(e.pointerId)) {
      scrollProgressDot.releasePointerCapture(e.pointerId);
    }
  };
  scrollProgressDot.addEventListener('pointerup', endDrag);
  scrollProgressDot.addEventListener('pointercancel', endDrag);

  scrollBadge.addEventListener('click', () => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    const scrollY = window.scrollY + 80;
    let next = sectionEls[0];
    for (const el of sectionEls) {
      if (el.offsetTop > scrollY) { next = el; break; }
    }
    if (lenis) lenis.scrollTo(next, { offset: -70 });
    else next.scrollIntoView({ behavior: 'smooth' });
  });
}
/* The per-section background-blob scroll parallax (9 separate scroll-linked
   tweens, one per section) was removed here. A Performance-tab recording
   showed "Rendering" (style recalc + layout) as by far the dominant cost —
   nearly 4x Scripting — meaning the actual bottleneck was style/layout
   work triggered continuously during scroll, not JS execution time. This
   was one of two sources of that (see the geo-shape note below for the
   other): 9 more elements recalculating "transform" on every scroll tick,
   for an effect subtle enough not to be worth that cost. */

/* These 6 shapes are position:fixed — they sit on top of the ENTIRE page,
   always, at every scroll position. They used to also have
   backdrop-filter: blur() (removed in style.css) *and* run a "float"
   animation forever via repeat:-1/yoyo:true, with no pause, ever — not
   tied to scroll, not tied to mouse activity, not tied to whether the tab
   even had focus. A blurred layer that never stops moving, covering the
   whole page, forces the browser to re-blur whatever's behind it on
   every single frame, forever. That combination (fixed + always-blurred
   + always-animating) was almost certainly the single biggest cause of
   the lag. Now they only move in response to actual scrolling (the
   scrub tween below), so they're completely idle — zero ongoing cost —
   whenever the page isn't being scrolled. */
const geoMotion = Array.from(document.querySelectorAll('.geo-shape')).map((shape, index) => ({ shape, index }));
if (!prefersReducedMotion) {
  geoMotion.forEach(({ shape, index }) => {
    gsap.to(shape, {
      '--parallax-y': `${140 + index * 30}px`,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
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
const lowPower = window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches;
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
  const meteorCount = 14;
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

/* ---------- Spotlight glow + 3D tilt: ONE handler per card ----------
   These used to be two completely separate pointermove listeners on the
   same card (one for the spotlight glow, one for the tilt), each calling
   getBoundingClientRect() independently and writing styles immediately,
   on every single raw mouse-move event. getBoundingClientRect() is a
   layout-measuring call — doing it twice, unthrottled, for every pixel
   of mouse movement over a card is exactly the kind of thing that causes
   hover stutter. Now there's one listener per card: it reads bounds
   once, and (like the global spotlight fix above) only actually writes
   to the DOM once per animation frame, no matter how many raw events
   fired in between. */
const tiltStrengthByEl = new WeakMap();
document.querySelectorAll('[data-tilt]').forEach((card) => tiltStrengthByEl.set(card, 9));
const photoTiltEl = document.getElementById('photoTilt');
if (photoTiltEl) tiltStrengthByEl.set(photoTiltEl, 14);

const spotlightCardSelector = '.value-card, .skill-card, .project-card, .tl-card, .ach-card, .edu-card, .profile-card, .contact-form';
const interactiveCards = new Set([
  ...document.querySelectorAll(spotlightCardSelector),
  ...document.querySelectorAll('[data-tilt]'),
]);
if (photoTiltEl) interactiveCards.add(photoTiltEl);

interactiveCards.forEach((card) => {
  const doSpotlight = card.matches(spotlightCardSelector);
  const tiltStrength = tiltStrengthByEl.get(card);
  let pendingEvent = null;
  let queued = false;

  const flush = () => {
    queued = false;
    if (!pendingEvent) return;
    const bounds = card.getBoundingClientRect();
    if (doSpotlight) {
      card.style.setProperty('--mx', `${pendingEvent.clientX - bounds.left}px`);
      card.style.setProperty('--my', `${pendingEvent.clientY - bounds.top}px`);
    }
    if (tiltStrength && !prefersReducedMotion) {
      const px = (pendingEvent.clientX - bounds.left) / bounds.width - 0.5;
      const py = (pendingEvent.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty('--trx', `${(py * -tiltStrength).toFixed(2)}deg`);
      card.style.setProperty('--try', `${(px * tiltStrength).toFixed(2)}deg`);
    }
  };

  card.addEventListener('pointermove', (e) => {
    pendingEvent = e;
    if (!queued) {
      queued = true;
      requestAnimationFrame(flush);
    }
  });
  if (tiltStrength && !prefersReducedMotion) {
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--trx', '0deg');
      card.style.setProperty('--try', '0deg');
    });
  }
});

if (!prefersReducedMotion) {

  /* Defensive fix: on first paint, some browsers cache a stale computed
     style for elements whose "transform"/"opacity" depend on a CSS custom
     property (--trx/--try here) and were already opacity:0 at that very
     first paint — the custom property updates correctly afterward, but
     "transform"/"opacity" silently stop recomputing from it. A display
     toggle forces the element's style to be thrown away and recomputed
     from scratch, which clears it. This is a forced synchronous reflow
     though (expensive), so it runs exactly once, shortly after first
     paint — NOT repeatedly on scroll/pointer, which was costly enough on
     real devices to be a likely cause of jank. */
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const prevDisplay = card.style.display;
      card.style.display = 'none';
      void card.offsetHeight;
      card.style.display = prevDisplay;
    });
  });
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

/* ---------- Scroll reset on load ----------
   Always land on the hero, never mid-page. Covers: the browser's own
   scroll-position memory (back/forward, bfcache), and a URL that happens
   to carry a leftover #section hash (which would otherwise make the
   browser auto-jump straight to that section before any of our JS runs). */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
const resetScroll = () => {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
};
resetScroll();
requestAnimationFrame(resetScroll);
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