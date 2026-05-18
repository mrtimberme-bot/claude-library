var $ = function(id) { return document.getElementById(id); };

var STATUS_LABEL = { active:'Actief', wip:'In progress', draft:'Draft', deprecated:'Offline' };
var STATUS_CLASS = { active:'st-active', wip:'st-wip', draft:'st-draft', deprecated:'st-deprecated' };
var DOT_CLASS    = { active:'dot-active', wip:'dot-wip', draft:'dot-draft', deprecated:'dot-deprecated' };
var TYPE_LABEL   = { skill:'Skill', plugin:'Plugin', agent:'Agent', memory:'Memory', mcp:'MCP', api:'API', arch:'Arch', infra:'Infra', orch:'Orch', snippet:'Snippet' };

var COMPONENTS = [];
var OUTDATED_IDS = new Set();

var currentMode = 'library';
var cockpitInit = false;

var AUTH_UNLOCKED = !!localStorage.getItem('libraryToken');

function requireAuth(fn) {
  if (AUTH_UNLOCKED) { fn(); return; }
  showAuthModal(fn);
}

function showAuthModal(onSuccess) {
  var overlay = $('auth-modal-overlay');
  var input = $('auth-modal-input');
  input.value = '';
  overlay.classList.remove('hidden');
  input.focus();

  var confirmBtn = $('auth-modal-confirm');
  var cancelBtn = $('auth-modal-cancel');
  var errorEl = $('auth-modal-error');
  errorEl.style.display = 'none';

  function cleanup() {
    overlay.classList.add('hidden');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    input.onkeydown = null;
  }

  function tryUnlock() {
    var token = input.value.trim();
    if (!token) { errorEl.textContent = 'Voer een token in.'; errorEl.style.display = 'block'; return; }
    CK.token = token;
    localStorage.setItem('libraryToken', token);
    AUTH_UNLOCKED = true;
    updateLockUI();
    cleanup();
    if (onSuccess) onSuccess();
  }

  confirmBtn.onclick = tryUnlock;
  cancelBtn.onclick = cleanup;
  input.onkeydown = function(e) { if (e.key === 'Enter') tryUnlock(); if (e.key === 'Escape') cleanup(); };
}

function updateLockUI() {
  var btn = $('topbar-lock-btn');
  if (!btn) return;
  btn.textContent = AUTH_UNLOCKED ? '🔓' : '🔒';
  btn.title = AUTH_UNLOCKED ? 'Admin actief — klik om te vergrendelen' : 'Vergrendeld — klik om in te loggen';
  btn.classList.toggle('unlocked', AUTH_UNLOCKED);
  var adminEls = document.querySelectorAll('.admin-only');
  adminEls.forEach(function(el) {
    el.classList.toggle('hidden-locked', !AUTH_UNLOCKED);
  });
}

var WORKER_URL_DEFAULT = 'https://claude-library-worker.mrtimberme.workers.dev';
var CK = {
  url:   localStorage.getItem('workerUrl') || WORKER_URL_DEFAULT,
  token: localStorage.getItem('libraryToken') || ''
};

if (window.location.hash === '#cockpit') { switchMode('cockpit'); }

function switchMode(mode) {
  currentMode = mode;
  ['library','cockpit'].forEach(function(m) {
    $('view-'+m).classList.toggle('active', m===mode);
    $('nav-'+m).classList.toggle('active', m===mode);
  });
  var right = $('topbar-right');
  if (mode === 'cockpit') {
    right.innerHTML = '';
    var span = document.createElement('span');
    span.id = 'ck-worker-url-display';
    span.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--text4)';
    if (CK.url) { try { span.textContent = new URL(CK.url).hostname; } catch(e){} }
    var btn = document.createElement('button');
    btn.className = 'cockpit-settings-btn';
    btn.textContent = 'Settings';
    btn.onclick = function() {
      $('ck-cfg-url').value = CK.url;
      $('ck-cfg-token').value = CK.token;
      $('ck-settings-overlay').classList.remove('hidden');
    };
    right.appendChild(span);
    right.appendChild(btn);
    if (!cockpitInit) { cockpitInit = true; ckInitConfig(); }
  } else {
    right.textContent = '';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s ease-in-out infinite';
    right.appendChild(dot);
    var lockBtn = document.createElement('button');
    lockBtn.id = 'topbar-lock-btn';
    lockBtn.className = 'topbar-lock-btn' + (AUTH_UNLOCKED ? ' unlocked' : '');
    lockBtn.textContent = AUTH_UNLOCKED ? '🔓' : '🔒';
    lockBtn.title = AUTH_UNLOCKED ? 'Admin actief — klik om te vergrendelen' : 'Vergrendeld — klik om in te loggen';
    lockBtn.onclick = function() {
      if (AUTH_UNLOCKED) {
        AUTH_UNLOCKED = false;
        CK.token = '';
        localStorage.removeItem('libraryToken');
        updateLockUI();
      } else {
        showAuthModal(null);
      }
    };
    right.appendChild(lockBtn);
  }
}

$('nav-library').addEventListener('click', function(){ switchMode('library'); });
$('nav-cockpit').addEventListener('click', function(){ switchMode('cockpit'); });


var RAW_BASE = 'https://raw.githubusercontent.com/mrtimberme-bot/claude-library/main/';

/* ── LIBRARY ── */
var libFilter = 'all', libSearch = '', libSort = 'name', libSortDir = 1, libSelected = null;
var libTagFilter = '', libOwnerFilter = '';
var libChecked = new Set();

function mkEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function libFiltered() {
  return COMPONENTS
    .filter(function(c){ return libFilter==='all' || c.type===libFilter; })
    .filter(function(c){
      if (!libSearch) return true;
      var q = libSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
          || (c.tags||[]).some(function(t){ return t.includes(q); });
    })
    .filter(function(c){
      if (!libTagFilter) return true;
      return (c.tags||[]).indexOf(libTagFilter) !== -1;
    })
    .filter(function(c){
      if (!libOwnerFilter) return true;
      return (c.author||'') === libOwnerFilter;
    })
    .sort(function(a,b){
      var av=(a[libSort]||'').toLowerCase(), bv=(b[libSort]||'').toLowerCase();
      return av<bv?-libSortDir:av>bv?libSortDir:0;
    });
}

var TYPE_ORDER = ['skill','agent','mcp','memory','plugin','api','arch','infra','orch','snippet'];

function hlNode(text, q) {
  var frag = document.createDocumentFragment();
  if (!q) { frag.appendChild(document.createTextNode(text)); return frag; }
  var safe = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  var parts = text.split(new RegExp(safe,'gi'));
  var hits  = text.match(new RegExp(safe,'gi')) || [];
  parts.forEach(function(p,i){
    if (p) frag.appendChild(document.createTextNode(p));
    if (i < hits.length) {
      var m = document.createElement('mark'); m.className='hl'; m.textContent=hits[i];
      frag.appendChild(m);
    }
  });
  return frag;
}

function renderSidebarNav() {
  var nav = $('type-nav'); nav.textContent = '';
  var types = ['all'].concat(TYPE_ORDER.filter(function(t){
    return COMPONENTS.some(function(c){ return c.type===t; });
  }));
  types.forEach(function(t){
    var n = t==='all' ? COMPONENTS.length : COMPONENTS.filter(function(c){ return c.type===t; }).length;
    var item = document.createElement('div');
    item.className = 'nav-item' + (libFilter===t ? ' active' : '');
    item.dataset.type = t;
    var label = document.createTextNode(t==='all' ? 'Alle' : (TYPE_LABEL[t]||t));
    var count = document.createElement('span'); count.className='ni-count'; count.textContent=String(n);
    item.appendChild(label); item.appendChild(count);
    item.addEventListener('click', function(){
      libFilter = t;
      document.querySelectorAll('#type-nav .nav-item').forEach(function(i){ i.classList.remove('active'); });
      item.classList.add('active');
      renderLib();
    });
    nav.appendChild(item);
  });
}

var TYPE_COLOR = {
  skill:'#22c55e', agent:'#fb923c', mcp:'#60a5fa', memory:'#c084fc',
  plugin:'#f472b6', api:'#06b6d4', arch:'#f43f5e', infra:'#a8a29e',
  orch:'#84cc16', snippet:'#f472b6'
};

function renderLib() {
  var items = libFiltered();
  $('lib-empty').style.display = items.length ? 'none' : 'block';

  var tbody = $('lib-tbody');
  tbody.textContent = '';

  items.forEach(function(c) {
    var tr = document.createElement('tr');
    tr.dataset.id = c.id;
    if (c.id === libSelected) tr.classList.add('selected');
    if (libChecked.has(c.id)) tr.classList.add('checked');

    // Checkbox
    var tdCheck = document.createElement('td');
    tdCheck.className = 'tt-check';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = libChecked.has(c.id);
    cb.addEventListener('click', function(e) {
      e.stopPropagation();
      if (cb.checked) libChecked.add(c.id); else libChecked.delete(c.id);
      tr.classList.toggle('checked', cb.checked);
      updateSelBar();
    });
    tdCheck.appendChild(cb);

    var color = TYPE_COLOR[c.type] || '#888';

    var tdType = document.createElement('td');
    tdType.className = 'tt-type';
    var dot = document.createElement('span');
    dot.className = 'tt-dot';
    dot.style.background = color;
    var lbl = document.createElement('span');
    lbl.className = 'tt-type-lbl';
    lbl.style.color = color;
    lbl.textContent = (TYPE_LABEL[c.type] || c.type).toUpperCase();
    tdType.appendChild(dot);
    tdType.appendChild(lbl);

    var tdName = document.createElement('td');
    tdName.className = 'tt-name';
    tdName.appendChild(hlNode(c.name, libSearch));
    if (OUTDATED_IDS.has(c.id)) {
      var upd = document.createElement('span'); upd.className = 'tt-update-dot'; upd.title = 'Update beschikbaar';
      tdName.appendChild(upd);
    }

    var tdDesc = document.createElement('td');
    tdDesc.className = 'tt-desc';
    tdDesc.appendChild(hlNode(c.desc, libSearch));

    var tdTags = document.createElement('td');
    tdTags.className = 'tt-tags';
    (c.tags || []).slice(0, 3).forEach(function(t) {
      var chip = document.createElement('span');
      chip.className = 'tt-tag' + (t === 'imported' ? ' tt-tag-imported' : '');
      chip.textContent = t;
      tdTags.appendChild(chip);
    });

    var tdStatus = document.createElement('td');
    var st = document.createElement('span');
    st.className = 'tt-status ' + (c.status || 'draft');
    st.textContent = c.status || 'draft';
    tdStatus.appendChild(st);

    var tdDate = document.createElement('td');
    tdDate.className = 'tt-date';
    tdDate.textContent = c.updated || c.imported_at || '—';

    tr.appendChild(tdCheck);
    tr.appendChild(tdType);
    tr.appendChild(tdName);
    tr.appendChild(tdDesc);
    tr.appendChild(tdTags);
    tr.appendChild(tdStatus);
    tr.appendChild(tdDate);

    tr.addEventListener('click', function() { libSelectRow(c.id); });
    tbody.appendChild(tr);
  });

  // Sync select-all checkbox
  var checkAll = $('check-all');
  if (checkAll) {
    checkAll.checked = items.length > 0 && items.every(function(c){ return libChecked.has(c.id); });
    checkAll.indeterminate = !checkAll.checked && items.some(function(c){ return libChecked.has(c.id); });
  }

  $('lib-count').textContent = items.length + ' componenten';
  $('last-sync').textContent = new Date().toLocaleDateString('nl-NL');
  updateSortHeaders();
}

function libSelectRow(id) {
  if (libSelected===id) { libSelected=null; drawerClose(); return; }
  libSelected=id;
  var c=COMPONENTS.find(function(x){ return x.id===id; });
  if (!c) return;

  $('drawer-name').textContent=c.name;
  var db=$('drawer-badge'); db.textContent='';
  var dbBadge=document.createElement('span'); dbBadge.className='type-badge';
  dbBadge.textContent=TYPE_LABEL[c.type]||c.type; db.appendChild(dbBadge);

  $('drawer-desc').textContent=c.desc;
  $('drawer-usage').textContent=c.usage||'—';

  var meta=$('drawer-meta'); meta.textContent='';
  [['auteur',c.author||'—'],['versie',c.version||'—'],['bijgewerkt',c.updated||'—'],['status',STATUS_LABEL[c.status]||c.status]]
    .forEach(function(kv){
      var kvel=document.createElement('div'); kvel.className='dr-kv';
      var k=document.createElement('div'); k.className='k'; k.textContent=kv[0];
      var v=document.createElement('div'); v.className='v'; v.textContent=kv[1];
      kvel.appendChild(k); kvel.appendChild(v); meta.appendChild(kvel);
    });

  var dt=$('drawer-tags'); dt.textContent='';
  (c.tags||[]).forEach(function(t){
    var chip=document.createElement('span'); chip.className='tag-chip'; chip.textContent=t; dt.appendChild(chip);
  });
  $('drawer-path').textContent=c.path;

  // Inhoud laden voor skill, agent, memory (tekstbestanden)
  var contentTypes = ['skill','agent','memory'];
  var contentSection = $('drawer-content-section');
  var contentEl = $('drawer-file-content');
  if (c.path && contentTypes.indexOf(c.type) !== -1) {
    contentSection.style.display = 'flex';
    contentEl.textContent = 'Laden…';
    fetch(RAW_BASE + c.path)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function(txt) { contentEl.textContent = txt; })
      .catch(function(e) { contentEl.textContent = '(kon bestand niet laden: ' + e.message + ')'; });
  } else {
    contentSection.style.display = 'none';
    contentEl.textContent = '';
  }

  var isSnippet = c.type==='snippet';
  var isImported = Array.isArray(c.tags) && c.tags.indexOf('imported') !== -1;
  var isOutdated = OUTDATED_IDS.has(c.id);
  $('drawer-rescan-actions').style.display = (isImported && AUTH_UNLOCKED) ? 'flex' : 'none';
  $('btn-update-skill').style.display = (isImported && isOutdated && AUTH_UNLOCKED) ? 'inline-block' : 'none';
  $('drawer-update-badge').style.display = isOutdated ? 'block' : 'none';
  $('rescan-result').style.display = 'none';

  var snippetPanel = $('drawer-snippet-panel');
  if (isSnippet && c.files) {
    snippetPanel.style.display = 'block';
    drawerRenderSnippet(c);
  } else {
    snippetPanel.style.display = 'none';
  }

  drawerCurrentId = c.id;
  $('lib-drawer').classList.add('open');
  renderLib();
}

function drawerClose() {
  libSelected=null; drawerCurrentId=null;
  $('lib-drawer').classList.remove('open');
  var sp=$('snip-iframe'); if(sp) sp.src='';
  renderLib();
}

function drawerRenderSnippet(c) {
  $('snip-iframe').src = c.files.preview || '';

  var tabs = ['html','css','js'];
  tabs.forEach(function(t) { $('snip-code-'+t).textContent = 'Laden…'; });

  tabs.forEach(function(t) {
    var url = c.files[t];
    if (!url) { $('snip-code-'+t).textContent = '(geen bestand)'; return; }
    fetch(url)
      .then(function(r){ return r.text(); })
      .then(function(txt){ $('snip-code-'+t).textContent = txt; })
      .catch(function(){ $('snip-code-'+t).textContent = '(kon bestand niet laden)'; });
  });

  // reset to preview tab
  document.querySelectorAll('.snippet-tab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.snippet-tab-content').forEach(function(p){ p.classList.remove('active'); });
  document.querySelector('.snippet-tab[data-tab="preview"]').classList.add('active');
  $('snip-tab-preview').classList.add('active');
}

// snippet tab clicks — eenmalig opgezet
document.querySelectorAll('.snippet-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.snippet-tab').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.snippet-tab-content').forEach(function(p){ p.classList.remove('active'); });
    btn.classList.add('active');
    $('snip-tab-'+btn.dataset.tab).classList.add('active');
  });
});

$('drawer-close').addEventListener('click', drawerClose);

$('search').addEventListener('input', function(e){ libSearch=e.target.value; updateClearBtn(); renderLib(); });
$('sort-select').addEventListener('change', function(e){ libSort=e.target.value; libSortDir=1; renderLib(); });

document.querySelectorAll('thead th[data-col]').forEach(function(th){
  th.addEventListener('click', function(){
    var col=th.dataset.col;
    if (libSort===col) libSortDir*=-1; else { libSort=col; libSortDir=1; }
    $('sort-select').value=libSort; renderLib();
  });
});

function updateSortHeaders() {
  document.querySelectorAll('#view-library thead th[data-col]').forEach(function(th){
    var si=th.querySelector('.si');
    if (si) si.textContent=th.dataset.col===libSort?(libSortDir===1?'↑':'↓'):'↕';
  });
}

$('filter-tag').addEventListener('change', function(e){ libTagFilter=e.target.value; updateClearBtn(); renderLib(); });
$('filter-owner').addEventListener('change', function(e){ libOwnerFilter=e.target.value; updateClearBtn(); renderLib(); });

function updateClearBtn() {
  var active = libTagFilter || libOwnerFilter || libSearch;
  $('filter-clear').style.display = active ? 'inline-block' : 'none';
}

$('filter-clear').addEventListener('click', function(){
  libTagFilter=''; libOwnerFilter=''; libSearch='';
  $('search').value='';
  $('filter-tag').value='';
  $('filter-owner').value='';
  updateClearBtn(); renderLib();
});

/* ── MULTI-SELECT & ZIP ── */
function updateSelBar() {
  var n = libChecked.size;
  $('sel-bar').style.display = n > 0 ? 'flex' : 'none';
  $('sel-count').textContent = n + ' geselecteerd';
}

$('check-all').addEventListener('click', function(e) {
  var items = libFiltered();
  if (this.checked) {
    items.forEach(function(c){ libChecked.add(c.id); });
  } else {
    items.forEach(function(c){ libChecked.delete(c.id); });
  }
  updateSelBar(); renderLib();
});

$('sel-clear').addEventListener('click', function() {
  libChecked.clear(); updateSelBar(); renderLib();
});

$('sel-download').addEventListener('click', function() {
  requireAuth(startDownload);
});

function startDownload() {
  var btn = $('sel-download');
  btn.textContent = '⏳ Laden…';
  btn.disabled = true;

  var items = COMPONENTS.filter(function(c){ return libChecked.has(c.id); });
  var zip = new JSZip();
  var fetches = items.map(function(c) {
    if (c.path) {
      return fetch(RAW_BASE + c.path)
        .then(function(r){ return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function(txt){ zip.file(c.path, txt); })
        .catch(function(){ zip.file(c.id + '-meta.json', JSON.stringify(c, null, 2)); });
    } else {
      zip.file(c.id + '-meta.json', JSON.stringify(c, null, 2));
      return Promise.resolve();
    }
  });

  Promise.all(fetches).then(function() {
    return zip.generateAsync({ type: 'blob' });
  }).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'claude-library-export.zip';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btn.textContent = '⬇ Download ZIP';
    btn.disabled = false;
  }).catch(function() {
    btn.textContent = '⬇ Download ZIP';
    btn.disabled = false;
  });
}

function populateFilterDropdowns() {
  var tags = {}, owners = {};
  COMPONENTS.forEach(function(c){
    (c.tags||[]).forEach(function(t){ tags[t]=(tags[t]||0)+1; });
    if (c.author) owners[c.author]=(owners[c.author]||0)+1;
  });

  var tagSel = $('filter-tag');
  var tagVal = tagSel.value;
  tagSel.textContent='';
  var opt=document.createElement('option'); opt.value=''; opt.textContent='Alle tags'; tagSel.appendChild(opt);
  Object.keys(tags).sort().forEach(function(t){
    var o=document.createElement('option'); o.value=t; o.textContent=t+' ('+tags[t]+')'; tagSel.appendChild(o);
  });
  tagSel.value = tagVal;

  var ownerSel = $('filter-owner');
  var ownerVal = ownerSel.value;
  ownerSel.textContent='';
  var opt2=document.createElement('option'); opt2.value=''; opt2.textContent='Alle owners'; ownerSel.appendChild(opt2);
  Object.keys(owners).sort().forEach(function(o){
    var el=document.createElement('option'); el.value=o; el.textContent=o+' ('+owners[o]+')'; ownerSel.appendChild(el);
  });
  ownerSel.value = ownerVal;
}

/* ── DATA ── */
fetch('components.json')
  .then(function(r){ return r.json(); })
  .then(function(data){
    COMPONENTS=data; renderSidebarNav(); renderLib(); populateFilterDropdowns();
    fetchOutdatedSkills();
  })
  .catch(function(){ renderSidebarNav(); renderLib(); });

function fetchOutdatedSkills() {
  fetch(CK.url + '/check-updates')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data.updates || !data.updates.length) return;
      data.updates.forEach(function(u){ OUTDATED_IDS.add(u.id); });
      renderLib();
    })
    .catch(function(){});
}

/* ── COCKPIT ── */

function ckSave() {
  localStorage.setItem('workerUrl', CK.url);
  localStorage.setItem('libraryToken', CK.token);
}

function ckInitConfig() {
  if (!CK.url||!CK.token) {
    $('ck-cfg-url').value=CK.url;
    $('ck-cfg-token').value=CK.token;
    $('ck-settings-overlay').classList.remove('hidden');
  } else {
    $('ck-settings-overlay').classList.add('hidden');
    var d=$('ck-worker-url-display');
    if (d) { try { d.textContent=new URL(CK.url).hostname; } catch(e){} }
    ckLoadComponents();
  }
}

$('ck-cfg-save').addEventListener('click', function(){
  var url=$('ck-cfg-url').value.trim().replace(/\/$/,'');
  var token=$('ck-cfg-token').value.trim();
  if (!url||!token){ alert('Vul beide velden in.'); return; }
  try { new URL(url); } catch(e){ alert('Ongeldige URL.'); return; }
  CK={url,token};
  AUTH_UNLOCKED = !!token;
  ckSave();
  $('ck-settings-overlay').classList.add('hidden');
  var d=$('ck-worker-url-display');
  if (d){ try{ d.textContent=new URL(url).hostname; } catch(e){} }
  ckLoadComponents();
});

function ckApiFetch(path, opts) {
  opts=opts||{};
  var headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
  if (opts.auth!==false) headers['Authorization']='Bearer '+CK.token;
  return fetch(CK.url+path,Object.assign({},opts,{headers}))
    .then(function(resp){
      return resp.json().catch(function(){ return {error:'Ongeldige server response'}; })
        .then(function(data){ if (!resp.ok) throw new Error(data.error||'HTTP '+resp.status); return data; });
    });
}

var ckComponents=[];

function ckLoadComponents() {
  var list=$('ck-component-list');
  list.innerHTML='<div class="ck-empty"><span class="ck-spinner"></span></div>';
  ckApiFetch('/components',{auth:false})
    .then(function(data){ ckComponents=data; ckRenderComponents(); })
    .catch(function(e){
      list.innerHTML='<div class="ck-empty" style="color:var(--red)">Fout: '+e.message+'</div>';
    });
}

function ckRenderComponents() {
  var list=$('ck-component-list');
  list.innerHTML='';
  if (!ckComponents.length){ list.innerHTML='<div class="ck-empty">Geen modules gevonden.</div>'; return; }
  ckComponents.forEach(function(c,i){
    var card=document.createElement('div');
    card.className='ck-card';
    var dot=c.status==='active'?'ck-dot-active':'ck-dot-inactive';
    card.innerHTML=
      '<div class="ck-card-top">'+
        '<span class="ck-card-name"><span class="ck-dot '+dot+'"></span>'+c.name+'</span>'+
        '<span class="type-badge">'+(TYPE_LABEL[c.type]||c.type)+'</span>'+
      '</div>'+
      '<div class="ck-card-desc">'+c.desc+'</div>';
    card.addEventListener('click',(function(idx){ return function(){ ckSelectComponent(idx); }; })(i));
    list.appendChild(card);
  });
}

function ckSelectComponent(i) {
  var c=ckComponents[i];
  document.querySelectorAll('.ck-card').forEach(function(card,idx){ card.classList.toggle('selected',idx===i); });
  $('ck-detail-empty').style.display='none';
  var dv=$('ck-detail-view');
  dv.style.cssText='display:flex;flex-direction:column;gap:16px';
  $('ck-detail-name').textContent=c.name;
  var grid=$('ck-detail-grid');
  grid.innerHTML='';
  [['id',c.id],['type',c.type],['versie',c.version||'—'],['auteur',c.author||'—'],['status',STATUS_LABEL[c.status]||c.status],['bijgewerkt',c.updated||'—'],['pad',c.path]]
    .forEach(function(row){
      var l=document.createElement('div'); l.className='ck-detail-label'; l.textContent=row[0];
      var v=document.createElement('div'); v.className='ck-detail-value'; v.textContent=String(row[1]);
      grid.appendChild(l); grid.appendChild(v);
    });
  var tagsEl=$('ck-detail-tags');
  tagsEl.innerHTML='';
  (c.tags||[]).forEach(function(t){
    var span=document.createElement('span'); span.className='tag-chip'; span.textContent=t;
    tagsEl.appendChild(span);
  });
  ckSwitchTab('detail');
}

$('ck-btn-refresh').addEventListener('click', ckLoadComponents);

function ckSwitchTab(name) {
  document.querySelectorAll('.ck-tab').forEach(function(t){ t.classList.toggle('active',t.dataset.tab===name); });
  document.querySelectorAll('.ck-tab-content').forEach(function(t){ t.classList.toggle('active',t.id==='ck-tab-'+name); });
}
document.querySelectorAll('.ck-tab').forEach(function(tab){
  tab.addEventListener('click', function(){ ckSwitchTab(tab.dataset.tab); });
});

$('ck-import-btn').addEventListener('click', function(){
  var repo=$('ck-import-input').value.trim();
  if (!repo) return;
  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)){
    ckShowImportResult(false,'Ongeldig formaat. Gebruik "owner/repo".');
    return;
  }
  $('ck-import-btn').disabled=true;
  $('ck-import-btn').textContent='Bezig...';
  $('ck-import-result').style.display='none';
  ckApiFetch('/import-repo',{method:'POST',body:JSON.stringify({repo})})
    .then(function(r){
      var result=$('ck-import-result');
      result.innerHTML='';
      result.style.display='block';
      result.className='ck-result success';
      result.textContent=r.components_imported+' module(s) geïmporteerd, '+r.files_committed+' bestanden gecommit.';
      if (r.pr_url&&r.pr_url.startsWith('https://')){
        var link=document.createElement('a'); link.href=r.pr_url; link.target='_blank'; link.rel='noopener noreferrer';
        link.textContent='\nPR #'+r.pr_number+' bekijken →';
        result.appendChild(link);
      }
      $('ck-import-input').value='';
      ckLoadComponents();
    })
    .catch(function(e){ ckShowImportResult(false,e.message); })
    .finally(function(){ $('ck-import-btn').disabled=false; $('ck-import-btn').textContent='Importeer'; });
});

$('ck-import-input').addEventListener('keydown', function(e){ if (e.key==='Enter') $('ck-import-btn').click(); });

function ckShowImportResult(ok,text) {
  var el=$('ck-import-result');
  el.style.display='block';
  el.className='ck-result '+(ok?'success':'error');
  el.textContent=text;
}

var ckHistory=[];

function ckSendChat() {
  var text=$('ck-chat-input').value.trim();
  if (!text) return;
  $('ck-chat-input').value='';
  $('ck-chat-send').disabled=true;
  ckHistory.push({role:'user',content:text});
  ckRenderChat();
  ckApiFetch('/chat',{method:'POST',body:JSON.stringify({messages:ckHistory})})
    .then(function(r){ ckHistory.push({role:'assistant',content:(r.content&&r.content[0]&&r.content[0].text)||'(geen antwoord)'}); })
    .catch(function(e){ ckHistory.push({role:'assistant',content:'Fout: '+e.message}); })
    .finally(function(){ ckRenderChat(); $('ck-chat-send').disabled=false; $('ck-chat-input').focus(); });
}

function ckRenderChat() {
  var el=$('ck-chat-messages');
  el.innerHTML='';
  if (!ckHistory.length){ el.innerHTML='<div class="ck-empty">Stel een vraag over je library...</div>'; return; }
  ckHistory.forEach(function(m){
    var div=document.createElement('div');
    div.className='ck-message '+m.role;
    div.textContent=m.content;
    el.appendChild(div);
  });
  el.scrollTop=el.scrollHeight;
}

$('ck-chat-send').addEventListener('click', ckSendChat);
$('ck-chat-input').addEventListener('keydown', function(e){
  if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); ckSendChat(); }
});

$('ck-upload-btn').addEventListener('click', function(){
  var name=$('ck-upload-name').value.trim();
  var desc=$('ck-upload-desc').value.trim();
  var content=$('ck-upload-content').value.trim();
  var version=$('ck-upload-version').value.trim()||'1.0.0';
  var status=$('ck-upload-status').value;
  var tagsRaw=$('ck-upload-tags').value.trim();
  var tags=tagsRaw?tagsRaw.split(',').map(function(t){return t.trim();}).filter(Boolean):[];

  if (!name){ ckShowUploadResult(false,'Skill naam is verplicht.'); return; }
  if (!/^[a-z0-9-]+$/.test(name)){ ckShowUploadResult(false,'Naam mag alleen a-z, 0-9 en hyphens bevatten.'); return; }
  if (!desc){ ckShowUploadResult(false,'Beschrijving is verplicht.'); return; }
  if (!content){ ckShowUploadResult(false,'Inhoud is verplicht.'); return; }

  var btn=$('ck-upload-btn');
  btn.disabled=true;
  btn.textContent='Uploaden...';
  $('ck-upload-result').style.display='none';

  ckApiFetch('/upload-skill',{method:'POST',body:JSON.stringify({name,desc,content,tags,version,status})})
    .then(function(r){
      ckShowUploadResult(true,'Skill opgeslagen: '+r.path);
      $('ck-upload-name').value=''; $('ck-upload-desc').value='';
      $('ck-upload-content').value=''; $('ck-upload-tags').value='';
      $('ck-upload-version').value='1.0.0'; $('ck-upload-status').value='active';
      ckLoadComponents();
    })
    .catch(function(e){ ckShowUploadResult(false,e.message); })
    .finally(function(){ btn.disabled=false; btn.textContent='Upload'; });
});

function ckShowUploadResult(ok,text){
  var el=$('ck-upload-result');
  el.style.display='block';
  el.className='ck-result '+(ok?'success':'error');
  el.textContent=text;
}

/* ── SKILL ANALYSER ── */
var drawerCurrentId = null;

var drawerCurrentId = null;

$('btn-rescan-imported').addEventListener('click', function(){
  requireAuth(function() {
  var c = COMPONENTS.find(function(x){ return x.id === drawerCurrentId; });
  if (!c || !c.path) return;
  var parts = c.path.split('/'); // ['imported', 'owner_repo', ...]
  if (parts.length < 2) return;
  var repo = parts[1].replace('_', '/');
  var btn = $('btn-rescan-imported');
  var result = $('rescan-result');
  btn.disabled = true; btn.textContent = 'Bezig…';
  result.style.display = 'none';
  ckApiFetch('/import-repo', {method:'POST', body: JSON.stringify({repo: repo})})
    .then(function(r){
      result.className = 'rescan-result success';
      result.style.display = 'block';
      result.textContent = 'Opnieuw geïmporteerd — PR: ' + r.pr_url;
    })
    .catch(function(e){
      result.className = 'rescan-result error';
      result.style.display = 'block';
      result.textContent = 'Fout: ' + e.message;
    })
    .finally(function(){ btn.disabled = false; btn.textContent = '↻ Rescan bron'; });
  }); // requireAuth
});

$('btn-update-skill').addEventListener('click', function(){
  requireAuth(function() {
    var c = COMPONENTS.find(function(x){ return x.id === drawerCurrentId; });
    if (!c) return;
    var btn = $('btn-update-skill');
    var result = $('rescan-result');
    btn.disabled = true; btn.textContent = 'Bijwerken…';
    result.style.display = 'none';
    ckApiFetch('/update-skill', {method:'POST', body: JSON.stringify({id: c.id})})
      .then(function(r){
        if (r.up_to_date) {
          result.className = 'rescan-result success';
          result.textContent = 'Al up-to-date.';
        } else {
          OUTDATED_IDS.delete(c.id);
          $('drawer-update-badge').style.display = 'none';
          btn.style.display = 'none';
          result.className = 'rescan-result success';
          result.textContent = 'Bijgewerkt naar ' + r.new_sha.slice(0,8) + (r.diff_url ? ' — ' + r.diff_url : '');
          renderLib();
        }
        result.style.display = 'block';
      })
      .catch(function(e){
        result.className = 'rescan-result error';
        result.textContent = 'Fout: ' + e.message;
        result.style.display = 'block';
      })
      .finally(function(){ btn.disabled = false; btn.textContent = '↑ Update'; });
  }); // requireAuth
});


/* ── TOAST ── */
function showToast(msg, isError) {
  var toast=document.getElementById('lib-toast');
  if (!toast){
    toast=document.createElement('div');
    toast.id='lib-toast';
    toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--text2);font-family:"Inter",sans-serif;font-size:12px;padding:8px 16px;z-index:999;transition:opacity .3s;box-shadow:0 4px 12px rgba(0,0,0,0.4)';
    document.body.appendChild(toast);
  }
  toast.style.borderColor=isError?'var(--red)':'var(--green)';
  toast.style.color=isError?'var(--red)':'var(--text)';
  toast.textContent=msg;
  toast.style.opacity='1';
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){ toast.style.opacity='0'; },3000);
}
