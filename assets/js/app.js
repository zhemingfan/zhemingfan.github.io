(function() {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Theme toggle
  function initTheme() {
    const toggle = $('.theme-toggle');
    const saved = localStorage.getItem('theme');
    // Default to dark mode if no preference saved
    document.documentElement.dataset.theme = saved || 'dark';

    toggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    });
  }

  // Navigation
  function initNav() {
    const toggle = $('.nav-toggle');
    const nav = $('.nav');
    const links = $$('.nav-link');

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !open);
      nav.classList.toggle('open', !open);
    });

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = link.dataset.section;
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function handleHash() {
    const hash = window.location.hash.slice(1) || 'about';

    showSection(hash);
  }

  function showSection(id) {
    $$('.section').forEach(s => s.classList.remove('active'));
    const section = $(`#${id}`);
    if (section) section.classList.add('active');

    $$('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.section === id);
    });
  }

  // Publications
  async function loadPublications() {
    try {
      const res = await fetch('./content/publications.json');
      if (!res.ok) throw new Error('Failed');
      const pubs = await res.json();
      renderPublications(pubs);
    } catch (e) {
      $('#publications-list').innerHTML = '<p class="muted">No publications yet.</p>';
    }
  }

  function renderPublications(pubs) {
    if (!pubs.length) {
      $('#publications-list').innerHTML = '<p class="muted">No publications yet.</p>';
      return;
    }
    $('#publications-list').innerHTML = pubs.map(p => `
      <article class="pub-item">
        <div class="pub-title">${esc(p.title)}</div>
        <div class="pub-authors">${esc(p.authors).replace(/Fan J/g, '<strong class="author-highlight">Fan J</strong>')}</div>
        <div class="pub-venue">${esc(p.venue)}, ${p.year}</div>
        ${p.links ? `<div class="pub-links">${Object.entries(p.links).map(([k,v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join('')}</div>` : ''}
      </article>
    `).join('');
  }

  // Projects
  async function loadProjects() {
    try {
      const res = await fetch('./content/projects.json');
      if (!res.ok) throw new Error('Failed');
      const projs = await res.json();
      renderProjects(projs);
    } catch (e) {
      $('#projects-list').innerHTML = '<p class="muted">No projects yet.</p>';
    }
  }

  function renderProjects(projs) {
    if (!projs.length) {
      $('#projects-list').innerHTML = '<p class="muted">No projects yet.</p>';
      return;
    }
    $('#projects-list').innerHTML = projs.map(p => `
      <article class="project-item">
        <div class="project-title">
          ${esc(p.title)}
          ${p.beta ? `<span class="badge-beta">beta</span>` : ''}
        </div>
        <div class="project-desc">${esc(p.description)}</div>
        ${p.tags ? `<div class="project-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="project-links">
          ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.linkLabel || 'Link')}</a>` : ''}
          ${p.github ? `<a href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
          ${p.demo ? `<a href="${esc(p.demo)}" target="_blank" rel="noopener">Demo</a>` : ''}
        </div>
      </article>
    `).join('');
  }

  // Readings
  let allReadings = [];
  let activeTagFilter = null;

  async function loadReadings() {
    try {
      const res = await fetch('./content/readings.json');
      if (!res.ok) throw new Error('Failed');
      allReadings = (await res.json()).sort((a, b) => new Date(b.added) - new Date(a.added));
      renderReadings(allReadings);
    } catch (e) {
      $('#readings-list').innerHTML = '<p class="muted">More to come.</p>';
    }
  }

  function renderReadings(readings) {
    if (!allReadings.length) {
      $('#readings-list').innerHTML = '<p class="muted">More to come.</p>';
      return;
    }

    const filterHtml = activeTagFilter
      ? `<div class="reading-filter">Filtered by: <span class="tag active">${esc(activeTagFilter)}</span> <button class="clear-filter">Clear</button></div>`
      : '';

    const readingsHtml = readings.map(r => `
      <article class="reading-item">
        <a href="${esc(r.url)}" target="_blank" rel="noopener" class="reading-title">${esc(r.title)}</a>
        <div class="reading-meta">by ${esc(r.author)}</div>
        ${r.tags ? `<div class="reading-tags">${r.tags.map(t => `<span class="tag${activeTagFilter === t ? ' active' : ''}" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}</div>` : ''}
        ${r.note ? `<div class="reading-note">${esc(r.note)}</div>` : ''}
        <div class="reading-added">Added ${formatDate(r.added)}</div>
      </article>
    `).join('');

    $('#readings-list').innerHTML = filterHtml + readingsHtml;

    // Bind tag click events
    $$('#readings-list .tag[data-tag]').forEach(tag => {
      tag.addEventListener('click', () => filterByTag(tag.dataset.tag));
    });

    // Bind clear filter
    const clearBtn = $('#readings-list .clear-filter');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearTagFilter);
    }
  }

  function filterByTag(tag) {
    activeTagFilter = tag;
    const filtered = allReadings.filter(r => r.tags && r.tags.includes(tag));
    renderReadings(filtered);
  }

  function clearTagFilter() {
    activeTagFilter = null;
    renderReadings(allReadings);
  }

  // Utilities
  function parseFrontmatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { meta: {}, content: text };
    const meta = {};
    match[1].split('\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) {
        let val = line.slice(i + 1).trim();
        if ((val[0] === '"' && val.slice(-1) === '"') || (val[0] === "'" && val.slice(-1) === "'")) {
          val = val.slice(1, -1);
        }
        meta[line.slice(0, i).trim()] = val;
      }
    });
    return { meta, content: match[2] };
  }

  function formatDate(str) {
    if (!str) return '';
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function esc(str) {
    if (!str) return '';
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
  }

  // GitHub Contribution Graph
  async function loadContribGraph() {
    const container = $('#contrib-graph');
    if (!container) return;
    try {
      const res = await fetch('https://github-contributions-api.jogruber.de/v4/zhemingfan');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      renderContribGraph(data.contributions);
    } catch (e) {
      container.style.display = 'none';
    }
  }

  function renderContribGraph(contributions) {
    const container = $('#contrib-graph');
    const CELL = 10, GAP = 2, WEEK_W = CELL + GAP;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dataMap = {};
    contributions.forEach(c => { dataMap[c.date] = c; });

    // Align start to the Sunday 52 weeks back
    const start = new Date(today);
    start.setDate(start.getDate() - today.getDay() - 52 * 7);

    const weeks = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const inRange = cursor <= today;
        week.push({
          date: dateStr,
          count: dataMap[dateStr]?.count ?? 0,
          level: inRange ? (dataMap[dateStr]?.level ?? 0) : 0,
          inRange,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const year = today.getFullYear();
    const total = contributions
      .filter(c => c.date.startsWith(year))
      .reduce((sum, c) => sum + c.count, 0);

    const monthLabels = weeks.map((week, i) => {
      const d = new Date(week[0].date);
      const isNew = i === 0 || new Date(weeks[i - 1][0].date).getMonth() !== d.getMonth();
      return `<span class="contrib-month" style="min-width:${WEEK_W}px">${isNew ? d.toLocaleString('default', { month: 'short' }) : ''}</span>`;
    }).join('');

    const cells = weeks.map(week =>
      week.map(day =>
        `<div class="contrib-cell" data-level="${day.level}" data-date="${day.date}" data-count="${day.count}"></div>`
      ).join('')
    ).join('');

    container.innerHTML = `
      <div class="contrib-header">
        <span class="contrib-label">Activity</span>
        <span class="contrib-total">${total.toLocaleString()} contributions in ${year}</span>
      </div>
      <div class="contrib-scroll">
        <div class="contrib-body">
          <div class="contrib-day-labels">
            <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
          </div>
          <div class="contrib-right">
            <div class="contrib-months-row">${monthLabels}</div>
            <div class="contrib-grid">${cells}</div>
          </div>
        </div>
      </div>
      <div class="contrib-legend">
        <span class="contrib-legend-label">Less</span>
        <div class="contrib-cell" data-level="0"></div>
        <div class="contrib-cell" data-level="1"></div>
        <div class="contrib-cell" data-level="2"></div>
        <div class="contrib-cell" data-level="3"></div>
        <div class="contrib-cell" data-level="4"></div>
        <span class="contrib-legend-label">More</span>
      </div>
    `;

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'contrib-tooltip';
    document.body.appendChild(tooltipEl);

    $$('#contrib-graph .contrib-cell[data-date]').forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        const n = cell.dataset.count;
        tooltipEl.textContent = `${n === '0' ? 'No contributions' : n + ' contribution' + (n === '1' ? '' : 's')} · ${cell.dataset.date}`;
        tooltipEl.style.display = 'block';
      });
      cell.addEventListener('mousemove', e => {
        tooltipEl.style.left = `${e.clientX + 12}px`;
        tooltipEl.style.top = `${e.clientY - 32}px`;
      });
      cell.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none';
      });
    });
  }

  // Init
  function init() {
    initTheme();
    initNav();
    loadContribGraph();
    loadPublications();
    loadProjects();
    loadReadings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
