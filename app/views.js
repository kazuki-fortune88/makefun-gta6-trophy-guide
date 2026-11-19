// Views: the checklist, roadmap, missables, planner and save pages, and the
// trophy guide pane. Every guide pane names its sources beside the guide, and
// says plainly where a step is our own advice rather than a checked fact.
import { STAGES, KIND_LABELS, planNext, stageProgress } from './planner.js';

export const SOURCES = {
  exophase: {
    label: 'Exophase — the official trophy list',
    detail: 'name, description and grade',
    url: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/',
  },
  psnprofiles: {
    label: 'PSNProfiles — the PSN trophy list',
    detail: 'names, descriptions, grades and PSN progress counts',
    url: 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi',
  },
  powerpyx: {
    label: 'PowerPyx — GTA 6 trophy guide & roadmap',
    detail: 'difficulty and time, the missable trophy, the 100% checklist, challenge and meditation counts',
    url: 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/',
  },
};

const STORY_KINDS = new Set(['story', 'mission', 'strand']);

export function isHiddenBySpoilers(trophy, store) {
  return store.settings.spoilers && STORY_KINDS.has(trophy.kind) && !store.isEarned(trophy.id);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function medalDot(grade) {
  return `<span class="medal ${grade}" aria-hidden="true"></span>`;
}

function tagHtml(trophy) {
  const tags = [`<span class="tag">${KIND_LABELS[trophy.kind] || trophy.kind}</span>`];
  if (trophy.missable) tags.push('<span class="tag missable">Missable</span>');
  else if (trophy.watch) tags.push('<span class="tag watch">Timing-sensitive</span>');
  return tags.join('');
}

function counterLine(trophy, store) {
  if (!trophy.counter) return '';
  const done = store.counter(trophy.id);
  const pct = Math.min(100, Math.round((done / trophy.counter.target) * 100));
  return `<span class="counter">${done} / ${trophy.counter.target.toLocaleString('en-US')} ${escapeHtml(trophy.counter.unit)}</span>
    <span class="mini-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
}

function trophyRowHtml(trophy, store, selectedId) {
  const hidden = isHiddenBySpoilers(trophy, store);
  const name = hidden ? 'Hidden story trophy' : trophy.name;
  const desc = hidden
    ? 'Earn it to reveal its name and description.'
    : trophy.description;
  const nameClass = hidden ? 'trophy-name spoiler-name' : 'trophy-name';
  const earned = store.isEarned(trophy.id);
  return `<li><button type="button" class="trophy-row${earned ? ' earned' : ''}${selectedId === trophy.id ? ' selected' : ''}" data-trophy="${trophy.id}">
    <input type="checkbox" ${earned ? 'checked' : ''} data-check="${trophy.id}" aria-label="Mark ${escapeHtml(name)} earned" tabindex="-1">
    ${medalDot(trophy.grade)}
    <span><span class="${nameClass}">${escapeHtml(name)}</span>
    <span class="trophy-desc">${escapeHtml(desc)}</span>
    <span class="trophy-tags">${tagHtml(trophy)}</span></span>
    <span class="trophy-side">${counterLine(trophy, store)}<span>${trophy.grade}</span></span>
  </button></li>`;
}

function bindRows(viewEl, store, ctx) {
  for (const row of viewEl.querySelectorAll('[data-trophy]')) {
    row.addEventListener('click', (event) => {
      if (event.target.matches('input[data-check]')) return;
      ctx.select(Number(row.dataset.trophy));
    });
  }
  for (const box of viewEl.querySelectorAll('input[data-check]')) {
    box.addEventListener('change', () => {
      store.toggleEarned(Number(box.dataset.check));
      ctx.rerender();
    });
  }
}

function filterTrophies(doc, store) {
  const q = (store.settings.query || '').trim().toLowerCase();
  return doc.trophies.filter((t) => {
    const kind = store.settings.kind;
    if (kind === 'missable') {
      if (!t.missable && !t.watch) return false;
    } else if (kind !== 'all' && t.kind !== kind) {
      return false;
    }
    if (store.settings.grade !== 'all' && t.grade !== store.settings.grade) return false;
    if (store.settings.earnedFilter === 'earned' && !store.isEarned(t.id)) return false;
    if (store.settings.earnedFilter === 'unearned' && store.isEarned(t.id)) return false;
    if (q) {
      const hidden = isHiddenBySpoilers(t, store);
      const hay = hidden ? t.kind : `${t.name} ${t.description} ${t.guide}`;
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function renderChecklist(viewEl, doc, store, ctx) {
  const list = filterTrophies(doc, store);
  const earned = doc.trophies.filter((t) => store.isEarned(t.id)).length;
  viewEl.innerHTML = `
    <h2>Checklist</h2>
    <p class="lede"><b>${earned} of ${doc.trophies.length} earned.</b> Tick a trophy off and it stays ticked in this browser.
    Click any row to open its guide, with its sources, beside the list. Story trophies hide behind the
    spoiler switch until you earn them — 28 of the 55 are hidden on PSN until earned.</p>
    ${list.length === 0
      ? '<p class="empty">No trophies match these filters. Clear the search or widen the filters.</p>'
      : `<ul class="trophy-list">${list.map((t) => trophyRowHtml(t, store, ctx.selectedId)).join('')}</ul>`}`;
  bindRows(viewEl, store, ctx);
}

export function renderRoadmap(viewEl, doc, store, ctx) {
  const stages = STAGES.map((stage) => {
    const { total, done } = stageProgress(doc.trophies, store, stage.n);
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const chips = doc.trophies
      .filter((t) => t.stage === stage.n)
      .map((t) => {
        const hidden = isHiddenBySpoilers(t, store);
        const label = hidden ? 'Hidden story trophy' : t.name;
        return `<li><button type="button" data-trophy="${t.id}" class="${store.isEarned(t.id) ? 'done' : ''}">
          <span class="chip-medal" style="background:var(--${t.grade}-medal)"></span>${escapeHtml(label)}</button></li>`;
      })
      .join('');
    return `<section class="stage">
      <div class="stage-head"><h3>Stage ${stage.n} — ${escapeHtml(stage.title)}</h3>
      <span class="stage-count">${done} of ${total} earned</span></div>
      <p>${escapeHtml(stage.about)}</p>
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width:${pct}%"></span></div>
      <ul class="chips">${chips}</ul>
    </section>`;
  }).join('');
  viewEl.innerHTML = `
    <h2>Roadmap to the platinum</h2>
    <p class="lede">PlayStation's list, in the order to earn it. <b>PowerPyx rates the platinum 4/10 at about 200 hours</b>,
    one playthrough, no online trophies — and the hardest trophy is A Long Road, the gold for 100% completion.
    Work the stages in order; most of stages 3–6 build up while you play stages 1–2.</p>
    ${stages}`;
  for (const chip of viewEl.querySelectorAll('[data-trophy]')) {
    chip.addEventListener('click', () => ctx.select(Number(chip.dataset.trophy)));
  }
}

export function renderMissables(viewEl, doc, store, ctx) {
  const missable = doc.trophies.find((t) => t.missable);
  const watch = doc.trophies.filter((t) => t.watch && !t.missable);
  viewEl.innerHTML = `
    <h2>Missables</h2>
    <p class="lede">Built from the official descriptions and checked against PowerPyx's guide, which flags
    <b>one trophy, and only as a maybe</b>. There is no mission replay, but free-roam continues after the
    credits — so almost everything can still be done after the story.</p>
    <section class="warn-card">
      <h3>⚠ The one missable trophy: ${escapeHtml(missable.name)}</h3>
      <p>${escapeHtml(missable.guide)}</p>
      <button type="button" class="btn" data-trophy="${missable.id}">Open its guide</button>
    </section>
    <p class="method"><b>How we flag missables.</b> A trophy is flagged missable only when a guide we checked
    (PowerPyx, 18 Nov 2026) says its moment can pass — the first meditation at Jason's house in Chapter 1.
    The trophies below are <b>timing-sensitive, not missable</b>: their moments are tied to a person or a
    partner, so take them when they are offered, but they stay available in free-roam after the story.</p>
    <h2 style="font-size:19px">Do them when offered</h2>
    <ul class="trophy-list">${watch.map((t) => trophyRowHtml(t, store, ctx.selectedId)).join('')}</ul>
    <p class="lede" style="margin-top:14px">Everything else — chapters, missions, collectibles, challenges,
    money and secrets — can be finished after the credits. Cheats disable trophies and saving (PowerPyx and
    GTABase), so keep cheats off during a trophy run.</p>`;
  bindRows(viewEl, store, ctx);
  const open = viewEl.querySelector('[data-trophy]');
  if (open) open.addEventListener('click', () => ctx.select(missable.id));
}

export function renderPlanner(viewEl, doc, store, ctx) {
  const plan = planNext(doc.trophies, store, 8);
  const remaining = doc.trophies.filter((t) => !store.isEarned(t.id)).length;
  viewEl.innerHTML = `
    <h2>Next up</h2>
    <p class="lede"><b>${remaining} trophies left.</b> The next thing to do, in order: the missable trophy first,
    then the story in order, then timing-sensitive strands while they are offered, then whatever is closest
    to done. Each pick says why it is next.</p>
    ${plan.length === 0
      ? '<p class="empty">Everything is earned — the platinum is yours. Congratulations, Leonida Legend.</p>'
      : `<ol class="plan-list">${plan.map((pick, i) => {
        const t = pick.trophy;
        const hidden = isHiddenBySpoilers(t, store);
        return `<li class="plan-item"><span class="plan-rank">${i + 1}</span>
          <span><button type="button" data-trophy="${t.id}">${escapeHtml(hidden ? 'Hidden story trophy' : t.name)}</button>
          <span class="why">${escapeHtml(pick.why)}${t.counter ? ` ${store.counter(t.id)} of ${t.counter.target.toLocaleString('en-US')} ${escapeHtml(t.counter.unit)} so far.` : ''}</span></span>
          <span class="trophy-side"><span>${t.grade}</span><br><span>Stage ${t.stage}</span></span>
        </li>`;
      }).join('')}</ol>`}`;
  for (const button of viewEl.querySelectorAll('[data-trophy]')) {
    button.addEventListener('click', () => ctx.select(Number(button.dataset.trophy)));
  }
}

export function renderSave(viewEl, doc, store, ctx) {
  const earned = doc.trophies.filter((t) => store.isEarned(t.id));
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const total = doc.trophies.filter((t) => t.grade === g).length;
    const done = earned.filter((t) => t.grade === g).length;
    return `<div class="stat-line"><span>${g[0].toUpperCase() + g.slice(1)}</span><span>${done} of ${total}</span></div>`;
  }).join('');
  const counters = doc.trophies.filter((t) => t.counter && store.counter(t.id) > 0).length;
  const notes = Object.keys(store.notes).length;
  viewEl.innerHTML = `
    <h2>Save &amp; settings</h2>
    <p class="lede">Your progress lives in this browser's localStorage — nothing is uploaded anywhere.
    Export it to a file before clearing browser data, and import it back on any machine.</p>
    <div class="save-grid">
      <section class="save-card">
        <h3>Export &amp; import</h3>
        <p>Export downloads your earned ticks, counters and notes as one JSON file. Import reads such a file back.</p>
        <div class="row">
          <button type="button" class="btn" id="exportBtn">Export progress</button>
          <label>Import <input id="importFile" type="file" accept="application/json"></label>
        </div>
        <p id="importMsg" style="margin-top:8px"></p>
      </section>
      <section class="save-card">
        <h3>Your stats</h3>
        ${byGrade}
        <div class="stat-line"><span>Counters in progress</span><span>${counters}</span></div>
        <div class="stat-line"><span>Notes written</span><span>${notes}</span></div>
        <div class="stat-line"><span>Spoilers</span><span>${store.settings.spoilers ? 'Off — story trophies hidden until earned' : 'On — everything shown'}</span></div>
        <div class="stat-line"><span>Look</span><span>${store.settings.theme === 'night' ? 'Night (sunset)' : 'Paper (light)'}</span></div>
      </section>
      <section class="save-card">
        <h3>Start over</h3>
        <p>Clears every tick, counter and note in this browser. Export first if you want a copy.</p>
        <button type="button" class="btn ghost" id="resetBtn">Reset all progress</button>
      </section>
      <section class="save-card">
        <h3>About this guide</h3>
        <p>Names, descriptions and grades are PlayStation's own, via Exophase and PSNProfiles. Roadmap,
        missable and timing notes cite PowerPyx's guide where they use it. Every guide is written for this
        entry, in its own words — a source is cited, never copied. No Rockstar logo or artwork is shown.</p>
        <p>Keys: <kbd>/</kbd> search · <kbd>e</kbd> toggle earned on the open trophy · <kbd>Esc</kbd> close the guide pane.</p>
      </section>
    </div>`;
  viewEl.querySelector('#exportBtn').addEventListener('click', () => store.exportFile());
  viewEl.querySelector('#importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const msg = viewEl.querySelector('#importMsg');
    if (!file) return;
    try {
      await store.importFile(file);
      msg.textContent = 'Imported — your progress is restored.';
      ctx.rerender();
    } catch {
      msg.textContent = 'That file is not a Sunset Platinum progress export.';
    }
  });
  viewEl.querySelector('#resetBtn').addEventListener('click', () => {
    if (window.confirm('Reset all progress in this browser?')) {
      store.resetAll();
      ctx.rerender();
    }
  });
}

export function renderDetail(detailEl, doc, store, ctx) {
  const trophy = doc.trophies.find((t) => t.id === ctx.selectedId);
  if (!trophy) {
    detailEl.innerHTML = `<h2>Pick a trophy</h2>
      <p>Click any trophy in the list to open its guide here — what to do, where and how, when it can be
      missed, and the sources each fact comes from.</p>
      <p class="honest">A guide that repeats the trophy's description adds nothing, so each guide here is
      written from the description and says where its facts come from. Where a step is our own advice from
      the official description, it says so — we have not played the game to check it.</p>`;
    return;
  }
  const hidden = isHiddenBySpoilers(trophy, store);
  const earned = store.isEarned(trophy.id);
  const sources = trophy.sources.map((key) => {
    const s = SOURCES[key];
    return `<li><a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a> — ${escapeHtml(s.detail)}.</li>`;
  }).join('');
  let body = '';
  if (hidden) {
    body = `<p class="honest">This is a story trophy, and spoilers are off — its name, description and guide
      stay hidden until you earn it. Turn spoilers off in the toolbar above to peek, or mark it earned to reveal it.</p>`;
  } else {
    body = `<p>${escapeHtml(trophy.guide)}</p>
      <h3>Steps</h3>
      <ol>${trophy.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      ${trophy.counter ? `<h3>Your progress</h3>
        <div class="counter-box"><input id="counterInput" type="number" min="0" max="${trophy.counter.target}" value="${store.counter(trophy.id)}" aria-label="Progress toward ${trophy.counter.target} ${escapeHtml(trophy.counter.unit)}">
        <span>of ${trophy.counter.target.toLocaleString('en-US')} ${escapeHtml(trophy.counter.unit)}</span></div>` : ''}
      <h3>Sources</h3>
      <ul class="sources">${sources}</ul>
      <p class="honest">Our own advice from the official description, not yet checked in the game — except
      where a source above says otherwise. A specific fact with no source beside it earns no credit; this
      guide cites what it claims.</p>`;
  }
  detailEl.innerHTML = `
    <button type="button" class="close" id="detailClose" aria-label="Close the guide pane">✕</button>
    <h2>${escapeHtml(hidden ? 'Hidden story trophy' : trophy.name)}</h2>
    <p class="official">${escapeHtml(hidden ? 'A story trophy — hidden until earned.' : trophy.description)}</p>
    <p class="grade-line"><b>${trophy.grade}</b> · ${KIND_LABELS[trophy.kind] || trophy.kind} · Stage ${trophy.stage}
      ${trophy.missable ? ' · <span style="color:var(--danger);font-weight:700">Missable</span>' : ''}
      ${!trophy.missable && trophy.watch ? ' · <span style="color:var(--warn);font-weight:700">Timing-sensitive</span>' : ''}</p>
    ${body}
    <h3>Your note</h3>
    <textarea id="noteInput" placeholder="Your own note for this trophy — saved in this browser." aria-label="Your note for this trophy"></textarea>
    <div class="detail-actions">
      <button type="button" class="btn" id="earnedToggle">${earned ? 'Mark unearned' : 'Mark earned'}</button>
      <button type="button" class="btn ghost" id="nextUpBtn">Next up</button>
    </div>`;
  detailEl.querySelector('#detailClose').addEventListener('click', () => ctx.select(null));
  detailEl.querySelector('#earnedToggle').addEventListener('click', () => {
    store.toggleEarned(trophy.id);
    ctx.rerender();
  });
  detailEl.querySelector('#nextUpBtn').addEventListener('click', () => {
    window.location.hash = '#/planner';
  });
  const noteInput = detailEl.querySelector('#noteInput');
  noteInput.value = store.note(trophy.id);
  noteInput.addEventListener('change', () => store.setNote(trophy.id, noteInput.value));
  const counterInput = detailEl.querySelector('#counterInput');
  if (counterInput) {
    counterInput.addEventListener('change', () => {
      store.setCounter(trophy.id, counterInput.value);
      ctx.rerender();
    });
  }
}
