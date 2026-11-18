// The route map: a fixed window of days (5 on desktop, 3 on mobile) on a fixed coordinate stage.
// Positions come from the Figma Main frames (desktop 1920 / mobile 390). The state styling follows the
// DAY (missed / active / locked); the position follows the SLOT.
import { CAMPAIGN } from '../config.js';
import { dayDate, dayState, formatCountdown, nextUnlock, relativeKey, secondsUntil, visibleDays } from '../date.js';
import { fill, longDate, shortDate } from '../i18n.js';
import { ARROW_SVG, asset, esc } from './util.js';

const DESKTOP = {
  size: 5,
  width: 1920,
  height: 735,
  x: [220, 590, 960, 1330, 1700],
  py: [454, 375, 447, 375, 454], // centre of each pedestal
  kActive: 1.85,
  kNear: 1,
  kFar: 0.9,
};
const MOBILE = {
  size: 3,
  width: 390,
  height: 559,
  x: [90.2, 250, 100.2],
  py: [108.6, 294, 462.6],
  kActive: 1.05,
  kOther: 0.72,
  // label anchors per slot: [left edge, top offset from pedestal centre, grow to the left?]
  label: [
    { dx: 39, dy: -44.6, left: false },
    { dx: -69, dy: -67, left: true },
    { dx: 39, dy: -57.6, left: false },
  ],
};

export const stageSpec = (layout) => (layout === 'desktop' ? DESKTOP : MOBILE);

// Santa's snowboard must always touch the dotted route, and he must never cover today's gift or its TODAY pill.
// The route is a cubic-bezier path (the same "d" as public/assets/route-*.svg, moved to stage coordinates). BOARD is where the
// board sits relative to the Santa centre. Every position below is a POINT OF THAT PATH (board centre), chosen so that his
// art ends before the active gift's image box (x +-85*k around the stop, k = gift scale) starts.
const BOARD = { desktop: { x: 0, y: 91 }, mobile: { x: -20, y: 15 } };
const ROUTE_POINT = {
  desktop: {
    start: { x: 152, y: 444 }, // before the campaign: left of the (small, locked) day 1; first segment t=0.82
    end: { x: 1774, y: 444 }, // after the campaign: right of day 26; last segment t=0.2
    // today in slot 0..4: just before the active gift (slot 0 has no room on its left: he stands on the line right of it)
    today: [{ x: 518, y: 366 }, { x: 330, y: 429 }, { x: 717, y: 374 }, { x: 1070, y: 412 }, { x: 1440, y: 374 }],
  },
  mobile: {
    start: { x: 161, y: 30 }, // before the campaign; first segment t=0.4 (the dotted line fades in there)
    end: { x: 202, y: 542 }, // after the campaign; last segment t=0.7
    today: [{ x: 183, y: 15 }, { x: 135, y: 168 }, { x: 197, y: 353 }], // segment t=0.25 / 0.35 / 0.4 before each stop
  },
};

/**
 * Centre of Santa (before the desktop --f squeeze).
 * mode 'day' (default): today is in `slot`; 'before': campaign not started; 'end': campaign over.
 */
export function santaPos(layout, slot, mode = 'day') {
  const b = BOARD[layout];
  const R = ROUTE_POINT[layout];
  const p = mode === 'end' ? R.end : mode === 'before' ? R.start : R.today[slot];
  return { x: p.x - b.x, y: p.y - b.y };
}

const r = (n) => Math.round(n * 100) / 100;

/**
 * Desktop fit for a viewport width: stage scale `s` (the 1920 stage shrinks to 0.72, never further, to keep text legible)
 * and `f`, how far the five stops are pulled towards the centre once the viewport is narrower than the stage
 * (below ~1380px the outer stops would be cut off). Stop x = 960 + (x - 960) * f; the route line is squeezed the same way.
 */
export function desktopFit(width) {
  const s = Math.max(0.72, Math.min(1, width / 1920));
  const visible = width / s; // stage units visible across the viewport
  const f = Math.max(0.6, Math.min(1, (visible - 330) / 1480));
  return { s, f };
}
const mid = DESKTOP.width / 2;

function giftScale(layout, state, slot) {
  if (layout === 'desktop') return state === 'active' ? DESKTOP.kActive : Math.abs(slot - 2) === 1 ? DESKTOP.kNear : DESKTOP.kFar;
  return state === 'active' ? MOBILE.kActive : MOBILE.kOther;
}

/** Text for the tag above a location name: "TODAY’S STOP · DEC 7". */
export function dayTag(ui, uiLang, day, today) {
  const key = relativeKey(day, today);
  const date = shortDate(dayDate(day), uiLang);
  if (key === 'locked') return `${ui.locked.toLocaleUpperCase()} · ${date}`;
  const map = { missed: 'missed', yesterday: 'yesterday', today: 'todays_stop', tomorrow: 'tomorrow', in_two_days: 'in_two_days' };
  return fill(ui[map[key]], { date });
}

function ariaLabel(ui, uiLang, card, day, state, today) {
  const dayLabel = card.raw.locked[0];
  const where = card.location;
  let status;
  if (state === 'active') status = dayTag(ui, uiLang, day, today);
  else if (state === 'missed') status = ui.gift_expired;
  else status = `${ui.locked}: ${longDate(dayDate(day), uiLang)}`;
  return `${dayLabel}, ${where}, ${status}`;
}

function stopHtml({ layout, spec, slot, day, today, ui, uiLang, card, chipDay, countdown, marketId }) {
  const state = dayState(day, today);
  const k = giftScale(layout, state, slot);
  const cx = spec.x[slot];
  const py = spec.py[slot];
  const tag = dayTag(ui, uiLang, day, today);
  const label = ariaLabel(ui, uiLang, card, day, state, today);
  const img = state === 'active' ? 'gift-today@2x.webp' : state === 'missed' ? 'gift-expired@2x.webp' : 'gift-locked@2x.webp';

  const gift = `
    <button type="button" class="gift gift--${state}" data-open="${day}" aria-label="${esc(label)}"
      style="left:${layout === 'desktop' ? `calc(${r(mid - 60 * k)}px + var(--f) * ${cx - mid}px)` : `${r(cx - 60 * k)}px`};top:${r(py - 80 * k)}px;--k:${k}">
      <img class="gift__img" src="${asset(img)}" alt="" draggable="false">
      ${state === 'active' ? `<span class="today-pill" aria-hidden="true">${esc(ui.today)}</span>` : ''}
    </button>`;

  // label position
  let pos;
  if (layout === 'desktop') {
    const dy = state === 'active' ? 53 : Math.abs(slot - 2) === 1 ? 56 : 51;
    pos = `left:calc(${mid}px + var(--f) * ${cx - mid}px);top:${r(py + dy)}px;transform:translateX(-50%)`;
  } else {
    const a = MOBILE.label[slot];
    pos = `left:${r(cx + a.dx)}px;top:${r(py + a.dy)}px;${a.left ? 'transform:translateX(-100%)' : ''}`;
  }
  const near = layout === 'desktop' ? Math.abs(slot - 2) === 1 : true;
  const name = esc(card.location);
  let inner;
  if (state === 'active') {
    inner = `
      <span class="label__tag">${esc(tag)}</span>
      <span class="label__name">${name}</span>
      <button type="button" class="open-btn" data-open="${day}"><span>${esc(ui.open_gift)}</span>${ARROW_SVG}</button>
      <span class="garland" data-garland aria-hidden="true"></span>
      <img class="label__cap" src="${asset('snow-cap.svg')}" alt="" aria-hidden="true">
      <img class="label__holly" src="${asset('holly.svg')}" alt="" aria-hidden="true">`;
  } else if (state === 'missed') {
    inner = `
      <span class="label__tag">${esc(tag)}</span>
      <span class="label__name">${name}</span>
      <img class="label__cap" src="${asset('snow-cap.svg')}" alt="" aria-hidden="true">
      <img class="label__holly" src="${asset('holly.svg')}" alt="" aria-hidden="true">`;
  } else {
    inner = `
      <span class="label__tag">${esc(tag)}</span>
      <span class="label__name">${name}</span>
      ${day === chipDay ? `<span class="chip" data-countdown>${esc(fill(ui.unlocks_in, { time: countdown }))}</span>` : ''}`;
  }
  const lab = `<div class="label label--${state}${near ? ' label--near' : ' label--far'}" data-open="${day}" style="${pos}">${inner}</div>`;
  void marketId;
  return gift + lab;
}

/**
 * @param ctx { layout, ui, uiLang, cards, today, now, marketId }
 */
export function renderRoute(ctx) {
  const { layout, ui, uiLang, cards, today, now } = ctx;
  const spec = stageSpec(layout);
  const { days, todayIndex } = visibleDays(today, spec.size, CAMPAIGN.days);
  const total = formatCountdown(secondsUntil(now, nextUnlock(now)));
  const chipDay = today < 1 ? 1 : today + 1;

  // Santa waits at the left before the campaign, stands at the end after it
  const santaSlot = todayIndex >= 0 ? todayIndex : today < 1 ? 0 : spec.size - 1;
  const santaMode = today < 1 ? 'before' : today > CAMPAIGN.days ? 'end' : 'day';

  // gold (travelled) part of the route ends at the Santa slot; nothing before the campaign
  let travelled = 0;
  if (today >= 1) travelled = today > CAMPAIGN.days ? 1 : 0.5;
  const goldEnd = layout === 'desktop' ? spec.x[santaSlot] + 95 : spec.py[santaSlot] + 31.5;
  const goldSize = travelled === 0 ? 0 : today > CAMPAIGN.days ? 99999 : goldEnd;

  const stops = days
    .map((day, slot) =>
      stopHtml({ layout, spec, slot, day, today, ui, uiLang, card: cards.days[day - 1], chipDay, countdown: total, marketId: ctx.marketId }),
    )
    .join('');

  let scenery;
  if (layout === 'desktop') {
    // Santa rides just before today's pedestal; in slot 0 there is no room on the left, so he hovers up-left
    const { x: sx, y: sy } = santaPos('desktop', santaSlot, santaMode);
    const sxCss = `calc(${mid}px + var(--f) * ${sx - mid}px)`;
    scenery = `
      <img class="landscape" src="${asset('landscape-desktop@2x.webp')}" alt="" aria-hidden="true">
      <div class="fade fade--top"></div><div class="fade fade--bottom"></div><div class="fade fade--left"></div><div class="fade fade--right"></div>
      <div class="route-group">
        <img class="route route--base" src="${asset('route-desktop.svg')}" alt="" aria-hidden="true">
        <div class="route route--gold" style="width:${goldSize}px"><img src="${asset('route-desktop-gold.svg')}" alt="" aria-hidden="true"></div>
      </div>
      <div class="santa" style="left:${sxCss};top:${sy}px">
        <span class="santa__glow"></span>
        <img src="${asset('hero-santa-desktop@2x.webp')}" alt="" aria-hidden="true">
      </div>`;
  } else {
    const { x: sx, y: sy } = santaPos('mobile', santaSlot, santaMode);
    scenery = `
      <img class="route route--base" src="${asset('route-mobile.svg')}" alt="" aria-hidden="true">
      <div class="route route--gold" style="height:${goldSize}px"><img src="${asset('route-mobile-gold.svg')}" alt="" aria-hidden="true"></div>
      <div class="santa" style="left:${r(sx)}px;top:${r(sy)}px">
        <span class="santa__glow"></span>
        <img src="${asset('hero-santa-mobile@2x.webp')}" alt="" aria-hidden="true">
      </div>`;
  }

  return `
  <section class="route-wrap"${santaSlot === 0 ? ' data-santa-first' : ''}${today > CAMPAIGN.days ? ' data-santa-end' : ''} aria-label="${esc(ui.campaign_title)}">
    <div class="route-stage" style="width:${spec.width}px;height:${spec.height}px">
      ${scenery}
      ${stops}
    </div>
  </section>`;
}

/** Updates every countdown chip; returns the formatted time. */
export function tickCountdown(root, ui, now) {
  const time = formatCountdown(secondsUntil(now, nextUnlock(now)));
  root.querySelectorAll('[data-countdown]').forEach((el) => {
    el.textContent = fill(ui.unlocks_in, { time });
  });
  return time;
}

const BULBS = ['#FF4D5E', '#FFD66B', '#4ADE80', '#5EC4FF'];

/** Draws the light garland (26 bulbs, red-gold-green-blue) round today's label card. */
export function drawGarlands(root) {
  root.querySelectorAll('[data-garland]').forEach((el) => {
    const card = el.parentElement;
    const pad = card.classList.contains('label--active') ? (card.closest('[data-layout=mobile]') ? 5 : 7) : 7;
    const w = card.offsetWidth + pad * 2;
    const h = card.offsetHeight + pad * 2;
    const rad = 20;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M${rad + 1} 1H${w - rad - 1}A${rad} ${rad} 0 0 1 ${w - 1} ${rad + 1}V${h - rad - 1}A${rad} ${rad} 0 0 1 ${w - rad - 1} ${h - 1}H${rad + 1}A${rad} ${rad} 0 0 1 1 ${h - rad - 1}V${rad + 1}A${rad} ${rad} 0 0 1 ${rad + 1} 1Z`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#14301F');
    path.setAttribute('stroke-width', '1.5');
    svg.appendChild(path);
    const len = path.getTotalLength();
    for (let i = 0; i < 26; i++) {
      const p = path.getPointAtLength((len / 26) * i);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
      c.setAttribute('r', 4.5);
      c.setAttribute('fill', BULBS[i % 4]);
      c.setAttribute('stroke', 'rgba(255,255,255,0.6)');
      c.setAttribute('stroke-width', '1');
      c.setAttribute('class', 'bulb');
      c.style.setProperty('--i', i);
      svg.appendChild(c);
    }
    el.style.setProperty('--gp', `${pad}px`);
    el.replaceChildren(svg);
  });
}

/**
 * Keeps every label inside the viewport: a label that sticks out (long German/Russian names, narrow phones)
 * is nudged back with the independent `translate` property (transform and scale stay free for the animations).
 */
export function fitLabels(root, margin = 8) {
  const vw = document.documentElement.clientWidth;
  const labels = [...root.querySelectorAll('.label')];
  labels.forEach((el) => {
    el.style.translate = '';
  });
  labels.forEach((el) => {
    const box = el.getBoundingClientRect();
    const k = box.width / el.offsetWidth || 1; // stage scale
    let dx = 0;
    if (box.left < margin) dx = margin - box.left;
    else if (box.right > vw - margin) dx = vw - margin - box.right;
    if (dx) el.style.translate = `${r(dx / k)}px 0`;
  });
  // neighbours pushed into each other (a wide active label nudged away from the edge): move the right one on
  const sorted = [...labels].sort((p, q) => p.getBoundingClientRect().left - q.getBoundingClientRect().left);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].getBoundingClientRect();
    const cur = sorted[i].getBoundingClientRect();
    const sameRow = cur.top < prev.bottom && prev.top < cur.bottom;
    if (sameRow && cur.left < prev.right + 6) {
      const k = cur.width / sorted[i].offsetWidth || 1;
      const have = Number.parseFloat(sorted[i].style.translate) || 0;
      sorted[i].style.translate = `${r(have + (prev.right + 6 - cur.left) / k)}px 0`;
    }
  }
}
