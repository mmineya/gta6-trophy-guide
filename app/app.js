const trophies = window.trophyCatalog.trophies;
const $ = id => document.getElementById(id);
const KEY = 'gta6-trophy-checklist';
const SPOILERS = 'leonida-hide-story';
const grades = ['platinum', 'gold', 'silver', 'bronze'];
const kinds = ['All', 'Story', 'Missable', 'Collectibles', 'Activities', 'Strangers', 'Freeroam', 'Economy', 'Completion'];
const byName = new Map(trophies.map(t => [t.name, t.id]));
const validIds = new Set(trophies.map(t => t.id));
let earned = new Set();
let kind = 'All';
let selected = 17;
let hideStory = true;

function decodeProgress(data) {
  const items = Array.isArray(data) ? data : data?.version === 1 ? data.earned : null;
  if (!Array.isArray(items)) throw new Error('Choose a Leonida Atlas progress file.');
  const ids = items.map(item => typeof item === 'string' ? byName.get(item) : item);
  if (ids.some(id => !validIds.has(id))) throw new Error('Backup contains an unknown trophy.');
  return new Set(ids);
}

try {
  earned = decodeProgress(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  hideStory = localStorage.getItem(SPOILERS) !== 'false';
} catch {
  $('status').textContent = 'Could not read saved progress on this device';
}
$('spoilers').checked = hideStory;

function saveProgress(message) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...earned]));
    $('status').textContent = message;
  } catch {
    $('status').textContent = 'Browser storage unavailable. Export a backup to keep your progress.';
  }
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function isHidden(t) {
  return hideStory && t.kind === 'Story' && !earned.has(t.id);
}

function visibleName(t) {
  return isHidden(t) ? 'Hidden story trophy' : t.name;
}

function visibleDescription(t) {
  return isHidden(t) ? 'Revealed when earned' : t.description;
}

function matches(t) {
  if (kind === 'Missable' ? !t.risk : kind !== 'All' && t.kind !== kind) return false;
  if ($('grade').value && $('grade').value.toLowerCase() !== t.grade) return false;
  const state = $('state').value;
  if (state && earned.has(t.id) !== (state === 'Earned')) return false;
  const query = $('search').value.trim().toLowerCase();
  return [visibleName(t), visibleDescription(t)].some(text => text.toLowerCase().includes(query));
}

function renderProgress() {
  $('earnedCount').textContent = earned.size;
  $('percent').textContent = Math.floor(earned.size * 100 / trophies.length) + '%';
  $('progress').value = earned.size;
  $('gradeCounts').replaceChildren(...grades.map(grade => {
    const group = trophies.filter(t => t.grade === grade);
    const got = group.filter(t => earned.has(t.id)).length;
    return el('span', 'grade ' + grade, grade + ' ' + got + '/' + group.length);
  }));
}

function renderGuide(t) {
  const guide = $('guide');
  guide.replaceChildren();
  if (!t) {
    guide.append(el('p', 'empty', 'No trophy selected.'));
    return;
  }
  guide.append(el('p', 'grade ' + t.grade, t.grade + ' / ' + t.kind + ' / #' + String(t.id).padStart(2, '0')));
  guide.append(el('h2', '', visibleName(t)), el('p', 'official', visibleDescription(t)));
  if (isHidden(t)) {
    guide.append(el('p', '', 'Turn off Hide story spoilers to read this guide, or check the trophy once it appears on your PS5.'));
    return;
  }
  guide.append(el('h3', '', 'How to unlock'), el('p', '', t.guide));
  if (t.risk) {
    guide.append(el('h3', '', 'Missable watchlist'), el('p', 'risk', t.risk));
  }
  const citation = el('p', 'source', 'SOURCE · ');
  citation.append(document.createTextNode(t.source));
  guide.append(citation);
}

function makeRow(t) {
  const row = el('div', 'row');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.dataset.earned = t.id;
  box.setAttribute('aria-label', 'Earned: ' + visibleName(t));
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    saveProgress('Progress saved on this device');
    render();
    $('rows').querySelector('[data-earned="' + t.id + '"]')?.focus({preventScroll:true});
  });
  const button = el('button');
  button.type = 'button';
  button.setAttribute('aria-current', t.id === selected);
  const heading = el('span', 'rowTop');
  heading.append(el('span', 'name', visibleName(t)));
  if (t.risk && !isHidden(t)) heading.append(el('span', 'risk', 'Watch'));
  heading.append(el('span', 'grade ' + t.grade, t.grade));
  button.append(heading, el('span', 'desc', visibleDescription(t)));
  button.addEventListener('click', () => {
    selected = t.id;
    $('rows').querySelector('[aria-current=true]')?.setAttribute('aria-current', 'false');
    button.setAttribute('aria-current', 'true');
    renderGuide(t);
    if (matchMedia('(max-width: 630px)').matches) $('guide').scrollIntoView({block:'nearest'});
  });
  row.append(box, button);
  return row;
}

function render(resetScroll = false) {
  const found = trophies.filter(matches).sort((a, b) => Number(isHidden(a)) - Number(isHidden(b)));
  const active = found.find(t => t.id === selected) ?? found[0];
  selected = active?.id;
  const rows = $('rows');
  const scroll = rows.scrollTop;
  rows.replaceChildren(...found.map(makeRow));
  rows.scrollTop = resetScroll ? 0 : scroll;
  if (!found.length) rows.append(el('p', 'empty', 'No matches. Try another filter or search.'));
  $('results').textContent = found.length + ' of ' + trophies.length + ' trophies';
  renderProgress();
  renderGuide(active);
  if (!hideStory) $('spoilers').title = 'Story names and descriptions are visible';
  else $('spoilers').removeAttribute('title');
}

function showRoadmap(show) {
  $('tracker').hidden = show;
  $('roadmap').hidden = !show;
  $('trackerTab').setAttribute('aria-pressed', !show);
  $('roadTab').setAttribute('aria-pressed', show);
  if (show) renderRoadmap();
}

function openCategory(category) {
  kind = category;
  for (const button of $('kinds').children) button.setAttribute('aria-pressed', button.textContent === kind);
  $('grade').value = $('state').value = $('search').value = '';
  showRoadmap(false);
  render(true);
}

function renderRoadmap() {
  const stages = [
    ['Protect your run', 'Missable', 'Keep separate saves before chapter transitions and the finale where possible. Prioritize active stranger strands and one-off encounters. The official list does not confirm permanent lockouts.'],
    ['Finish the story', 'Story', 'Opening mission → Chapters 1–4 → finale. Check off six other named missions as they appear. Their chapter positions and replay access are unspecified.'],
    ['Finish the contacts', 'Strangers', 'Complete eight stranger strands. Track the final missions for Andy, Kenton, Billy, Randy and Tyrone, and follow up on Bret’s unique hunt.'],
    ['Survey Leonida', 'Collectibles', 'Log 52 areas, 18 meditation spots, three complete card sets, 100 WAiNK locations and 100 discovered vehicles. Verify that new finds advance their own counters.'],
    ['Clear skill & side goals', 'Activities', 'Gold all 42 range challenges, win at 14 drone sites and 20 different races, then finish 250 stunts, 50 challenges and the remaining activities.'],
    ['Close out the platinum', 'Completion', 'Sweep free-roam and economy trophies. Verify 100% in-game completion separately, then earn the remaining trophies for 54 prerequisites total.']
  ];
  $('stages').replaceChildren(...stages.map(([title, category, notes], i) => {
    const card = el('article', 'stage');
    const action = el('button', '', 'View ' + category.toLowerCase() + ' →');
    action.type = 'button';
    action.addEventListener('click', () => openCategory(category));
    card.append(el('p', 'eyebrow step', 'STEP 0' + (i + 1)), el('h3', '', title), el('p', '', notes), action);
    return card;
  }));
}

for (const category of kinds) {
  const button = el('button', '', category);
  button.type = 'button';
  button.setAttribute('aria-pressed', category === kind);
  button.addEventListener('click', () => {
    kind = category;
    for (const sibling of $('kinds').children) sibling.setAttribute('aria-pressed', sibling === button);
    render(true);
  });
  $('kinds').append(button);
}
$('trackerTab').addEventListener('click', () => showRoadmap(false));
$('roadTab').addEventListener('click', () => showRoadmap(true));
$('watch').addEventListener('click', () => openCategory('Missable'));
$('grade').addEventListener('change', () => render(true));
$('state').addEventListener('change', () => render(true));
$('search').addEventListener('input', () => render(true));
$('spoilers').addEventListener('change', () => {
  hideStory = $('spoilers').checked;
  try {
    localStorage.setItem(SPOILERS, String(hideStory));
  } catch {
    $('status').textContent = 'Spoiler preference could not be saved';
  }
  render();
});
$('export').addEventListener('click', () => {
  const backup = new Blob([JSON.stringify({ version: 1, earned: [...earned].sort((a,b) => a-b) }, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(backup);
  const download = el('a');
  download.href = url;
  download.download = 'leonida-progress.json';
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = 'Progress backup exported';
});
$('importButton').addEventListener('click', () => $('import').click());
$('import').addEventListener('change', async () => {
  const input = $('import');
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('Progress backup is larger than 64 KB.');
    const imported = decodeProgress(JSON.parse(await file.text()));
    earned = new Set([...earned, ...imported]);
    saveProgress('Progress merged from backup');
    render();
  } catch (error) {
    $('status').textContent = error instanceof SyntaxError ? 'Invalid JSON backup. Progress was unchanged.' : error.message;
  }
});
render();
