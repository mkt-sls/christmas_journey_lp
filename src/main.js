import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { CAMPAIGN } from './config.js';
import { campaignDay, parseNow } from './date.js';
import { loadMarketData } from './i18n.js';
import { getMarket, htmlLangFor, resolveMarket, saveMarket } from './market.js';
import { renderCard } from './render/card.js';
import { bindMarketMenu, renderHeader } from './render/header.js';
import { renderHowItWorks } from './render/howItWorks.js';
import { renderIntro } from './render/intro.js';
import { renderLegal } from './render/legal.js';
import { closeOverlay, openOverlay } from './render/overlay.js';
import { drawGarlands, renderRoute, stageSpec, tickCountdown } from './render/route.js';
import { track } from './track.js';

const app = document.getElementById('app');
const search = window.location.search;
const mq = window.matchMedia('(min-width: 1024px)');

// QA clock: ?date= replaces "now" but keeps ticking, so the midnight rollover can be watched.
const base = parseNow(search);
const clockOffset = base.getTime() - Date.now();
const hasOverride = new URLSearchParams(search).has('date') && base.getTime() !== Date.now();
const now = () => new Date(hasOverride ? Date.now() + clockOffset : Date.now());

const state = { market: null, ui: null, cards: null, today: null };

const layout = () => (mq.matches ? 'desktop' : 'mobile');

async function setMarket(id, { persist = true } = {}) {
  const market = getMarket(id);
  const data = await loadMarketData(market);
  state.market = market;
  state.ui = data.ui.strings;
  state.cards = data.cards;
  state.uiLang = market.uiLang;
  if (persist) saveMarket(id);
  document.documentElement.lang = htmlLangFor(market);
  render();
}

function fitStage() {
  const page = app.querySelector('.page');
  if (!page) return;
  const l = layout();
  const spec = stageSpec(l);
  const s = l === 'desktop' ? Math.max(0.72, Math.min(1, window.innerWidth / 1920)) : 1;
  page.style.setProperty('--s', s);
  page.style.setProperty('--stage-h', `${spec.height * s}px`);
}

function render() {
  const l = layout();
  const n = now();
  state.today = campaignDay(n);
  const over = state.today > CAMPAIGN.days;
  const ctx = {
    layout: l,
    ui: state.ui,
    uiLang: state.uiLang,
    market: state.market,
    marketId: state.market.id,
    cards: state.cards,
    today: state.today,
    now: n,
    over,
  };
  app.innerHTML = `
  <div class="page" data-layout="${l}">
    ${renderHeader(ctx)}
    <main>
      <div class="hero">
        ${renderIntro(ctx)}
        ${renderRoute(ctx)}
      </div>
      ${renderHowItWorks(ctx)}
    </main>
    ${renderLegal(ctx)}
  </div>`;
  fitStage();
  drawGarlands(app);
  bindMarketMenu(app, (id) => {
    if (id === state.market.id) return;
    const from = state.market.id;
    track('market_change', { from, to: id });
    const url = new URL(window.location.href);
    if (url.searchParams.has('market')) {
      url.searchParams.set('market', id);
      window.history.replaceState(null, '', url);
    }
    setMarket(id).then(() => app.querySelector('.market__btn')?.focus());
  });
}

function openCard(day) {
  const l = layout();
  const card = state.cards.days[day - 1];
  if (!card) return;
  const { html, kind } = renderCard({ card, day, today: state.today, ui: state.ui, marketId: state.market.id });
  track('open_gift', { day, state: kind, market: state.market.id });
  openOverlay({
    html,
    layout: l,
    returnFocus: () => app.querySelector(`.gift[data-open="${day}"]`),
  });
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-open]');
  if (t) {
    e.preventDefault();
    openCard(Number(t.dataset.open));
  }
});

// Card links live in the overlay (outside #app)
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-track]');
  if (!a) return;
  const data = { day: Number(a.dataset.day), market: state.market?.id };
  if (a.dataset.track === 'deposit_click') track('deposit_click', data);
  if (a.dataset.track === 'terms_click') track('terms_click', data);
});

window.addEventListener('resize', fitStage);
mq.addEventListener('change', () => {
  closeOverlay(false);
  render();
});

// every second: tick the countdown; at local midnight the whole page re-renders for the new day
setInterval(() => {
  if (!state.market) return;
  const n = now();
  if (campaignDay(n) !== state.today) {
    render();
    return;
  }
  tickCountdown(app, state.ui, n);
}, 1000);

const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
setMarket(resolveMarket({ search, languages }), { persist: false });
