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

    if (hash.startsWith('blog/')) {
      showSection('blog');
      loadPost(hash.replace('blog/', ''));
      return;
    }

    showSection(hash);
    if (hash === 'blog') showBlogList();
  }

  function showSection(id) {
    $$('.section').forEach(s => s.classList.remove('active'));
    const section = $(`#${id}`);
    if (section) section.classList.add('active');

    $$('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.section === id);
    });
  }

  // Blog
  let posts = [];

  async function loadBlogIndex() {
    try {
      const res = await fetch('./content/blog/index.json');
      if (!res.ok) throw new Error('Failed to fetch');
      posts = await res.json();
      renderBlogList();
    } catch (e) {
      $('#blog-list').innerHTML = '<p class="muted">More to come.</p>';
    }
  }

  function renderBlogList() {
    if (!posts.length) {
      $('#blog-list').innerHTML = '<p class="muted">More to come.</p>';
      return;
    }
    $('#blog-list').innerHTML = posts.map(p => `
      <article class="post-item" tabindex="0" data-slug="${p.slug}">
        <div class="post-title">${esc(p.title)}</div>
        <div class="post-date">${formatDate(p.date)}</div>
        <div class="post-summary">${esc(p.summary)}</div>
      </article>
    `).join('');

    $$('.post-item').forEach(item => {
      item.addEventListener('click', () => window.location.hash = `blog/${item.dataset.slug}`);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter') window.location.hash = `blog/${item.dataset.slug}`;
      });
    });
  }

  async function loadPost(slug) {
    const contentEl = $('#blog-post-content');
    const listEl = $('#blog-list');
    const postEl = $('#blog-post');

    try {
      const url = `./content/blog/${slug}.md`;
      console.log('Fetching:', url);
      const res = await fetch(url);
      console.log('Response:', res.status, res.statusText);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      console.log('Content length:', md.length);
      const { meta, content } = parseFrontmatter(md);

      contentEl.innerHTML = `
        <h1>${esc(meta.title || 'Untitled')}</h1>
        <div class="post-date">${formatDate(meta.date)}</div>
        ${marked.parse(content)}
      `;
      listEl.hidden = true;
      postEl.hidden = false;
    } catch (e) {
      console.error('Load post error:', e);
      contentEl.innerHTML = `<p class="error">Could not load post: ${esc(slug)}<br><small>${esc(e.message)}</small></p>`;
      listEl.hidden = true;
      postEl.hidden = false;
    }
  }

  function showBlogList() {
    $('#blog-list').hidden = false;
    $('#blog-post').hidden = true;
  }

  function initBackBtn() {
    $('.back-btn').addEventListener('click', () => {
      window.location.hash = 'blog';
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
        <div class="project-title">${esc(p.title)}</div>
        <div class="project-desc">${esc(p.description)}</div>
        ${p.tags ? `<div class="project-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="project-links">
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
      allReadings = await res.json();
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

  // Mini Terminal
  function initTerminal() {
    const input = $('#term-input');
    const output = $('#term-output');
    if (!input || !output) return;

    const commands = {
      help: () => `Available commands:
  <span class="term-cmd">help</span>     - show this message
  <span class="term-cmd">skills</span>   - what I work with
  <span class="term-cmd">contact</span>  - how to reach me
  <span class="term-cmd">pubs</span>     - publication highlights
  <span class="term-cmd">coffee</span>   - important info
  <span class="term-cmd">clear</span>    - clear terminal`,

      skills: () => `<span class="term-highlight">Languages:</span> Python, R, Bash, SQL, Java
<span class="term-highlight">Areas:</span> Bioinformatics, Genomics, ML, Data Pipelines
<span class="term-highlight">Tools:</span> Docker, Snakemake, Nextflow, AWS, Git
<span class="term-highlight">Libraries:</span> Pandas, Tidyverse, ggplot2, Scikit-Learn`,

      contact: () => `<span class="term-highlight">LinkedIn:</span> linkedin.com/in/jeremy-f-0a9039a1
<span class="term-muted">For inquiries, reach out via LinkedIn</span>`,

      pubs: () => `<span class="term-highlight">First-author publications:</span>
• Long-read cancer SV analysis
• CHM13-T2T reference genome evaluation
• BugSeq metagenomics platform

<span class="term-muted">See Publications tab for full list</span>`,

      coffee: () => `I take mine black. Good taste.`,

      clear: () => { output.innerHTML = ''; return ''; }
    };

    const processCommand = (cmd) => {
      const trimmed = cmd.trim().toLowerCase();
      if (!trimmed) return '';
      if (commands[trimmed]) return commands[trimmed]();
      return `Command not found: ${esc(trimmed)}. Type <span class="term-cmd">help</span> for options.`;
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value;
        const result = processCommand(cmd);

        if (cmd.trim()) {
          output.innerHTML += `<div class="term-line"><span class="term-prompt">→</span> ${esc(cmd)}</div>`;
        }
        if (result) {
          output.innerHTML += `<div class="term-result">${result}</div>`;
        }

        input.value = '';
        output.scrollTop = output.scrollHeight;
      }
    });

    // Show initial hint
    output.innerHTML = '<div class="term-muted">Type <span class="term-cmd">help</span> to see available commands</div>';
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

  // Init
  function init() {
    initTheme();
    initNav();
    initBackBtn();
    initTerminal();
    loadBlogIndex();
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
