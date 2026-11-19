// Sunset Platinum — boot, routing and the toolbar. The guide is static files:
// trophies.json holds the 55 official trophies with our own guides, store.js
// keeps progress in localStorage, views.js renders each page, planner.js ranks
// what to do next. No network request is made at run time beyond this app's
// own files.
import { TrophyStore } from './store.js';
import {
  renderChecklist,
  renderRoadmap,
  renderMissables,
  renderPlanner,
  renderSave,
  renderDetail,
} from './views.js';

const store = new TrophyStore();
const viewEl = document.getElementById('view');
const detailEl = document.getElementById('detail');
const searchInput = document.getElementById('search');
const kindFilter = document.getElementById('kindFilter');
const gradeFilter = document.getElementById('gradeFilter');
const earnedFilter = document.getElementById('earnedFilter');
const spoilerToggle = document.getElementById('spoilerToggle');
const themeToggle = document.getElementById('themeToggle');

let doc = null;
let selectedId = null;

const ctx = {
  get selectedId() {
    return selectedId;
  },
  select(id) {
    selectedId = id;
    render();
    if (id !== null) detailEl.scrollIntoView({ block: 'nearest' });
  },
  rerender() {
    render();
  },
};

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return ['checklist', 'roadmap', 'missables', 'planner', 'save'].includes(hash) ? hash : 'checklist';
}

function applyTheme() {
  const theme = store.settings.theme || 'night';
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'night' ? '☀ Paper look' : '☾ Night look';
}

function renderProgress() {
  const earned = doc.trophies.filter((t) => store.isEarned(t.id));
  const pct = Math.round((earned.length / doc.trophies.length) * 100);
  document.getElementById('earnedCount').textContent = earned.length;
  document.getElementById('earnedPct').textContent = `${pct}%`;
  const fill = document.getElementById('progressFill');
  fill.style.width = `${pct}%`;
  const bar = document.getElementById('progressBar');
  bar.setAttribute('aria-valuenow', String(earned.length));
  const counts = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const total = doc.trophies.filter((t) => t.grade === g).length;
      const done = earned.filter((t) => t.grade === g).length;
      return `${done}/${total} ${g}`;
    })
    .join(' · ');
  document.getElementById('gradeCounts').textContent = counts;
  document.getElementById('missableBadge').textContent = String(
    doc.trophies.filter((t) => (t.missable || t.watch) && !store.isEarned(t.id)).length,
  );
}

function render() {
  if (!doc) return;
  applyTheme();
  renderProgress();
  const route = currentRoute();
  for (const link of document.querySelectorAll('.tabs a')) {
    link.classList.toggle('active', link.dataset.route === route);
  }
  const toolbar = document.getElementById('toolbar');
  toolbar.style.display = route === 'checklist' ? '' : 'none';
  if (route === 'roadmap') renderRoadmap(viewEl, doc, store, ctx);
  else if (route === 'missables') renderMissables(viewEl, doc, store, ctx);
  else if (route === 'planner') renderPlanner(viewEl, doc, store, ctx);
  else if (route === 'save') renderSave(viewEl, doc, store, ctx);
  else renderChecklist(viewEl, doc, store, ctx);
  renderDetail(detailEl, doc, store, ctx);
}

function syncToolbar() {
  searchInput.value = store.settings.query || '';
  kindFilter.value = store.settings.kind || 'all';
  gradeFilter.value = store.settings.grade || 'all';
  earnedFilter.value = store.settings.earnedFilter || 'all';
  spoilerToggle.checked = Boolean(store.settings.spoilers);
}

searchInput.addEventListener('input', () => {
  store.setSetting('query', searchInput.value);
  render();
});
kindFilter.addEventListener('change', () => {
  store.setSetting('kind', kindFilter.value);
  render();
});
gradeFilter.addEventListener('change', () => {
  store.setSetting('grade', gradeFilter.value);
  render();
});
earnedFilter.addEventListener('change', () => {
  store.setSetting('earnedFilter', earnedFilter.value);
  render();
});
spoilerToggle.addEventListener('change', () => {
  store.setSetting('spoilers', spoilerToggle.checked);
  render();
});
themeToggle.addEventListener('click', () => {
  store.setSetting('theme', store.settings.theme === 'night' ? 'paper' : 'night');
  render();
});
document.getElementById('exportTop').addEventListener('click', () => store.exportFile());

window.addEventListener('hashchange', render);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchInput && document.activeElement?.tagName !== 'TEXTAREA') {
    event.preventDefault();
    searchInput.focus();
  } else if (event.key === 'Escape' && selectedId !== null) {
    ctx.select(null);
  } else if ((event.key === 'e' || event.key === 'E') && selectedId !== null
    && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
    store.toggleEarned(selectedId);
    render();
  }
});

store.onChange(render);

doc = await (await fetch('data/trophies.json')).json();
syncToolbar();
render();
