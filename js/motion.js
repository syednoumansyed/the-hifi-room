/**
 * THE HIFI ROOM — Motion System
 * Powered by Motion One (motionone.dev) — framework-free, Web Animations API wrapper.
 * Tokens aligned with the motion-ui skill: duration, easing, distance.
 *
 * Rule from skill: "If motion does not improve UX → remove it."
 * Everything here guides attention or communicates state. Nothing is decorative noise.
 */

import { animate, inView, stagger } from
  'https://cdn.jsdelivr.net/npm/motion@11.11.9/+esm';

// ─── Motion Tokens (from motion-ui skill) ────────────────────────────────────
export const tokens = {
  duration: { fast: 0.18, normal: 0.35, slow: 0.55 },
  easing: {
    smooth: [0.22, 1, 0.36, 1],   // decelerate — enter
    sharp:  [0.4, 0, 0.2, 1],     // standard  — state change
    exit:   [0.4, 0, 1, 1],       // accelerate — leave (shorter)
  },
  distance: { sm: 8, md: 16, lg: 24 },
};

// ─── Accessibility + Device Guard ─────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isLowEnd =
  (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2) ||
  (navigator.deviceMemory === undefined && navigator.hardwareConcurrency <= 4);

// When reduced motion is requested, collapse all durations to near-zero.
// When on a low-end device, halve durations to keep responsiveness > smoothness.
function dur(base) {
  if (prefersReduced) return 0.01;
  if (isLowEnd) return base * 0.5;
  return base;
}

function dist(base) {
  return prefersReduced ? 0 : base;
}

// ─── Reusable Animation Helpers ───────────────────────────────────────────────

/**
 * fadeUp — fade in + translateY, triggered when element enters viewport.
 * @param {string|Element|NodeList} selector
 * @param {object} opts — override delay, duration, distance
 */
export function fadeUp(selector, opts = {}) {
  const {
    delay      = 0,
    duration   = tokens.duration.normal,
    distance   = tokens.distance.md,
    threshold  = 0.15,
  } = opts;

  inView(selector, ({ target }) => {
    animate(
      target,
      { opacity: [0, 1], transform: [`translateY(${dist(distance)}px)`, 'translateY(0px)'] },
      { duration: dur(duration), easing: tokens.easing.smooth, delay }
    );
    // inView callback returning undefined means "fire once"
  }, { amount: threshold });
}

/**
 * staggerFadeUp — stagger fadeUp for a group of children.
 * @param {string} parentSelector — the container
 * @param {string} childSelector  — children to stagger
 * @param {object} opts
 */
export function staggerFadeUp(parentSelector, childSelector, opts = {}) {
  const {
    staggerDelay = 0.07,   // ≤ 0.1s per skill anti-patterns
    duration     = tokens.duration.normal,
    distance     = tokens.distance.md,
    threshold    = 0.1,
  } = opts;

  const parents = document.querySelectorAll(parentSelector);
  parents.forEach(parent => {
    const children = parent.querySelectorAll(childSelector);
    if (!children.length) return;

    inView(parent, () => {
      animate(
        children,
        { opacity: [0, 1], transform: [`translateY(${dist(distance)}px)`, 'translateY(0px)'] },
        {
          duration: dur(duration),
          easing:   tokens.easing.smooth,
          delay:    stagger(prefersReduced ? 0 : staggerDelay),
        }
      );
    }, { amount: threshold });
  });
}

/**
 * countUp — animates a number element from 0 to its text value.
 * Communicates state (stats loaded) on the admin page.
 * @param {string|Element} selector
 */
export function countUp(selector) {
  const els = typeof selector === 'string'
    ? document.querySelectorAll(selector)
    : [selector];

  els.forEach(el => {
    const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
    if (isNaN(target) || prefersReduced) return;

    const d = dur(tokens.duration.slow);
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / (d * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }

    requestAnimationFrame(tick);
  });
}

/**
 * heroEntrance — page-load entrance for the hero block.
 * Staggers: tag → headline → desc → CTA row.
 * Runs immediately (no inView needed — it's above the fold).
 */
export function heroEntrance(selectors = {}) {
  const {
    tag     = '.hero-tag',
    headline = '.hero-headline',
    desc    = '.hero-desc',
    cta     = '.hero-cta-row',
    visual  = '.hero-visual',
  } = selectors;

  const seq = [
    [tag,      { opacity: [0, 1], transform: [`translateY(${dist(12)}px)`, 'translateY(0)'] }, { duration: dur(0.3), easing: tokens.easing.smooth }],
    [headline, { opacity: [0, 1], transform: [`translateY(${dist(tokens.distance.lg)}px)`, 'translateY(0)'] }, { duration: dur(tokens.duration.normal), easing: tokens.easing.smooth, delay: prefersReduced ? 0 : 0.06 }],
    [desc,     { opacity: [0, 1], transform: [`translateY(${dist(tokens.distance.md)}px)`, 'translateY(0)'] }, { duration: dur(tokens.duration.normal), easing: tokens.easing.smooth, delay: prefersReduced ? 0 : 0.12 }],
    [cta,      { opacity: [0, 1], transform: [`translateY(${dist(tokens.distance.sm)}px)`, 'translateY(0)'] }, { duration: dur(tokens.duration.normal), easing: tokens.easing.smooth, delay: prefersReduced ? 0 : 0.18 }],
    [visual,   { opacity: [0, 1], transform: [`translateY(${dist(tokens.distance.sm)}px)`, 'translateY(0)'] }, { duration: dur(tokens.duration.slow),   easing: tokens.easing.smooth, delay: prefersReduced ? 0 : 0.08 }],
  ];

  seq.forEach(([sel, keyframes, options]) => {
    const el = document.querySelector(sel);
    if (el) animate(el, keyframes, options);
  });
}

/**
 * navEntrance — subtle fade-in for the sticky nav on load.
 */
export function navEntrance(selector = '.main-nav') {
  const el = document.querySelector(selector);
  if (el) animate(el, { opacity: [0, 1] }, { duration: dur(0.25), easing: tokens.easing.smooth });
}
