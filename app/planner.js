// Next-up planner: ranks the trophies you have not earned yet, so the next thing
// to do is always one glance away. The order is deliberate, and each pick says why:
// the one missable trophy first, then the story in order, then timing-sensitive
// strands and partner trophies while they are offered, then whatever is closest
// to done, then the quick single-action trophies, then the long grinds last.
export const STAGES = [
  { n: 1, title: 'Story — Chapters 1–4 & the finale', about: 'Play the story in order. Chapters unlock one after another, and the finale closes the story. Do the Chapter 1 meditation before that chapter ends — it is the only missable moment in the game.' },
  { n: 2, title: 'Story missions & stranger strands', about: 'Named story missions, then the stranger strands — Andy, Kenton, Billy, Randy, Tyrone, Bret and Cal. Strands stay available in free-roam after the story, but take them as their markers appear.' },
  { n: 3, title: 'Activities & challenges', about: 'The 9 activity types, the shooting range, races, drone races, fishing, the arcade, meditation and the challenge count. Most of these build up while you play.' },
  { n: 4, title: 'Collectibles & exploration', about: 'Cards, WAiNK locations, vehicles and the whole map of Leonida. Best done while travelling for other trophies, not as a separate grind.' },
  { n: 5, title: 'Heists, wanted & combat', about: 'Shop and vault robberies, armored trucks, gang operations, Combat Focus and the airport. Plan the partner robberies — they need your partner with you.' },
  { n: 6, title: 'Money & property', about: 'Launder marked bills, spend across shops, buy the garages and register vehicles. Money trophies add up over the whole game.' },
  { n: 7, title: 'Secrets, side moments & 100%', about: 'The cryptic one-offs, then A Long Road — 100% completion, the hardest trophy — and the platinum itself, which unlocks last.' },
];

export const KIND_LABELS = {
  story: 'Story',
  mission: 'Story mission',
  strand: 'Stranger strand',
  activity: 'Activity',
  challenge: 'Challenge',
  collectible: 'Collectible',
  exploration: 'Exploration',
  combat: 'Combat & heists',
  money: 'Money & property',
  secret: 'Secret',
};

export function planNext(trophies, store, limit = 8) {
  const remaining = trophies.filter((t) => !store.isEarned(t.id));
  const scored = remaining.map((t) => {
    let score = 0;
    let why = '';
    if (t.missable) {
      score = 1000;
      why = 'The one missable trophy — do it before Chapter 1 ends.';
    } else if (t.kind === 'story' || t.kind === 'mission') {
      score = 900 - t.stage * 10 - t.id;
      why = 'Next in the story — play it when it appears.';
    } else if (t.watch) {
      score = 800 - t.id;
      why = 'Timing-sensitive: take it when it is offered.';
    } else if (t.counter) {
      const done = store.counter(t.id);
      const frac = Math.min(done / t.counter.target, 1);
      score = 500 + Math.round(frac * 300);
      why = done > 0
        ? `Already ${done} of ${t.counter.target} ${t.counter.unit} — closest to done.`
        : `A counter trophy: ${t.counter.target} ${t.counter.unit} in total.`;
    } else if (t.kind === 'secret') {
      score = 300 - t.id;
      why = 'A quick one-off — grab it when you are nearby.';
    } else {
      score = 200 - t.id;
      why = 'Cleanup: work it in while travelling for other trophies.';
    }
    if (t.id === 14) { score = 50; why = 'The 100% checklist — it finishes itself as the other trophies do.'; }
    if (t.id === 1) { score = 0; why = 'Unlocks last, when every other trophy is earned.'; }
    return { trophy: t, score, why };
  });
  scored.sort((a, b) => b.score - a.score || a.trophy.id - b.trophy.id);
  return scored.slice(0, limit);
}

export function stageProgress(trophies, store, stage) {
  const inStage = trophies.filter((t) => t.stage === stage);
  const done = inStage.filter((t) => store.isEarned(t.id)).length;
  return { total: inStage.length, done };
}
