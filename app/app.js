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
let routeFilter;
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
  if (routeFilter && !routeFilter(t)) return false;
  if (kind === 'Missable' ? !t.missable : kind !== 'All' && t.kind !== kind) return false;
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
  if (t.missable) {
    guide.append(el('h3', '', 'Potential missable'), el('p', '', t.missable_note));
  }
  guide.append(el('p', 'source', t.source));
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
  if (t.missable) heading.append(el('span', 'risk', 'Missable'));
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
  $("missableNote").hidden = kind !== "Missable";
  const active = found.find(t => t.id === selected) ?? found[0];
  selected = active?.id;
  const rows = $('rows');
  const scroll = rows.scrollTop;
  rows.replaceChildren(...found.map(makeRow));
  rows.scrollTop = resetScroll ? 0 : scroll;
  if (!found.length) rows.append(el('p', 'empty', 'No matches. Try another filter or search.'));
  $('results').textContent = found.length + ' of ' + trophies.length + ' trophies' + (routeFilter ? ' · Route step' : '');
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

function openCategory(category, filter) {
  routeFilter = filter;
  kind = category;
  for (const button of $('kinds').children) button.setAttribute('aria-pressed', button.textContent === kind);
  $('grade').value = $('state').value = $('search').value = '';
  showRoadmap(false);
  render(true);
}

function renderRoadmap() {
  const stages = [
    {
      title: '1. Story first',
      includes: t => t.kind === 'Story' || t.missable,
      notes: 'Finish the opening, Chapters 1–4 and the finale. Complete named missions when they appear. Check available stranger finales and partner objectives before advancing.'
    },
    {
      title: '2. Cleanup',
      includes: t => !t.missable && !['Story', 'Platinum', 'Completion'].includes(t.kind),
      notes: 'Track 18 meditation spots, 3 card sets and 100 WAiNK locations. Clear 42 range golds, 14 drone race sites and 20 different race wins, then finish the remaining side goals.'
    },
    {
      title: '3. Platinum',
      includes: t => ['Completion', 'Platinum'].includes(t.kind),
      notes: 'Check the in-game list for 100% completion. Verify all 54 prerequisites on PS5 and sync the trophy list before marking the platinum.'
    }
  ];
  $('stages').replaceChildren(...stages.map(({title, includes, notes}) => {
    const group = trophies.filter(includes);
    const done = group.filter(t => earned.has(t.id)).length;
    const card = el('article', 'stage');
    const action = el('button', '', 'View step trophies →');
    action.type = 'button';
    action.addEventListener('click', () => openCategory('All', includes));
    card.append(el('h3', '', title), el('p', 'eyebrow step', done + ' / ' + group.length + ' earned'), el('p', '', notes), action);
    return card;
  }));
}

for (const category of kinds) {
  const button = el('button', '', category);
  button.type = 'button';
  button.setAttribute('aria-pressed', category === kind);
  button.addEventListener('click', () => {
    routeFilter = undefined;
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
