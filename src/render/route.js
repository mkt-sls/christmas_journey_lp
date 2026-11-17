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

const r = (n) => Math.round(n * 100) / 100;

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
      style="left:${r(cx - 60 * k)}px;top:${r(py - 80 * k)}px;--k:${k}">
      <img class="gift__img" src="${asset(img)}" alt="" draggable="false">
      ${state === 'active' ? `<span class="today-pill" aria-hidden="true">${esc(ui.today)}</span>` : ''}
    </button>`;

  // label position
  let pos;
  if (layout === 'desktop') {
    const dy = state === 'active' ? 53 : Math.abs(slot - 2) === 1 ? 56 : 51;
    pos = `left:${cx}px;top:${r(py + dy)}px;transform:translateX(-50%)`;
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
    const first = santaSlot === 0;
    const sx = first ? 95 : spec.x[santaSlot] - 185;
    const sy = spec.py[santaSlot] - (first ? 167 : 147);
    scenery = `
      <img class="landscape" src="${asset('landscape-desktop@2x.webp')}" alt="" aria-hidden="true">
      <div class="fade fade--top"></div><div class="fade fade--bottom"></div><div class="fade fade--left"></div><div class="fade fade--right"></div>
      <img class="route route--base" src="${asset('route-desktop.svg')}" alt="" aria-hidden="true">
      <div class="route route--gold" style="width:${goldSize}px"><img src="${asset('route-desktop-gold.svg')}" alt="" aria-hidden="true"></div>
      <div class="santa" style="left:${sx}px;top:${sy}px">
        <span class="santa__glow"></span>
        <img src="${asset('hero-santa-desktop@2x.webp')}" alt="" aria-hidden="true">
      </div>`;
  } else {
    const sx = spec.x[santaSlot] - 22;
    const sy = spec.py[santaSlot] - 123;
    scenery = `
      <img class="route route--base" src="${asset('route-mobile.svg')}" alt="" aria-hidden="true">
      <div class="route route--gold" style="height:${goldSize}px"><img src="${asset('route-mobile-gold.svg')}" alt="" aria-hidden="true"></div>
      <div class="santa" style="left:${r(sx)}px;top:${r(sy)}px">
        <span class="santa__glow"></span>
        <img src="${asset('hero-santa-mobile@2x.webp')}" alt="" aria-hidden="true">
      </div>`;
  }

  return `
  <section class="route-wrap" aria-label="${esc(ui.campaign_title)}">
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
