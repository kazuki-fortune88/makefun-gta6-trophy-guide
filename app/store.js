// Progress store: earned ticks, per-trophy counters, notes and settings, all in
// localStorage under one key, with export and import as a JSON file.
export const STORE_KEY = 'sunset-platinum-v1';

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: [], counters: {}, notes: {}, settings: {} };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    };
  } catch {
    return { earned: [], counters: {}, notes: {}, settings: {} };
  }
}

export class TrophyStore {
  constructor() {
    const data = readStore();
    this.earned = new Set(data.earned);
    this.counters = data.counters;
    this.notes = data.notes;
    this.settings = {
      theme: 'night',
      spoilers: false,
      kind: 'all',
      grade: 'all',
      earnedFilter: 'all',
      query: '',
      ...data.settings,
    };
    this.listeners = new Set();
  }

  save() {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      earned: [...this.earned],
      counters: this.counters,
      notes: this.notes,
      settings: this.settings,
    }));
    for (const fn of this.listeners) fn();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  isEarned(id) {
    return this.earned.has(id);
  }

  toggleEarned(id) {
    if (this.earned.has(id)) this.earned.delete(id);
    else this.earned.add(id);
    this.save();
  }

  setCounter(id, value) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (n === 0) delete this.counters[id];
    else this.counters[id] = n;
    this.save();
  }

  counter(id) {
    return this.counters[id] || 0;
  }

  setNote(id, text) {
    const trimmed = String(text || '').trim();
    if (trimmed) this.notes[id] = trimmed;
    else delete this.notes[id];
    this.save();
  }

  note(id) {
    return this.notes[id] || '';
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.save();
  }

  exportFile() {
    const blob = new Blob([JSON.stringify({
      app: 'Sunset Platinum — GTA VI trophy guide',
      exportedAt: new Date().toISOString(),
      earned: [...this.earned],
      counters: this.counters,
      notes: this.notes,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sunset-platinum-progress.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async importFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const earned = parsed.earned ?? parsed;
    if (!Array.isArray(earned)) throw new Error('not a progress file: no earned list');
    this.earned = new Set(earned.map((n) => Number(n)).filter((n) => Number.isInteger(n)));
    if (parsed.counters && typeof parsed.counters === 'object') this.counters = parsed.counters;
    if (parsed.notes && typeof parsed.notes === 'object') this.notes = parsed.notes;
    this.save();
  }

  resetAll() {
    this.earned = new Set();
    this.counters = {};
    this.notes = {};
    this.save();
  }
}
