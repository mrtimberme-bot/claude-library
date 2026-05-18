var $ = function(id) { return document.getElementById(id); };

var STATUS_LABEL = { active:'Actief', wip:'In progress', draft:'Draft', deprecated:'Offline' };
var STATUS_CLASS = { active:'st-active', wip:'st-wip', draft:'st-draft', deprecated:'st-deprecated' };
var DOT_CLASS    = { active:'dot-active', wip:'dot-wip', draft:'dot-draft', deprecated:'dot-deprecated' };
var TYPE_LABEL   = { skill:'Skill', plugin:'Plugin', agent:'Agent', memory:'Memory', mcp:'MCP', api:'API', arch:'Arch', infra:'Infra', orch:'Orch', snippet:'Snippet' };

var COMPONENTS = [];

var currentMode = 'library';
var cockpitInit = false;

var WORKER_URL_DEFAULT = 'https://claude-library-worker.mrtimberme.workers.dev';
var CK = {
  url:   localStorage.getItem('workerUrl') || WORKER_URL_DEFAULT,
  token: localStorage.getItem('libraryToken') || ''
};

if (window.location.hash === '#cockpit') { switchMode('cockpit'); }

function switchMode(mode) {
  currentMode = mode;
  ['library','skills','cockpit'].forEach(function(m) {
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
    right.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s ease-in-out infinite"></span>';
  }
}

$('nav-library').addEventListener('click', function(){ switchMode('library'); });
$('nav-skills').addEventListener('click',  function(){ switchMode('skills'); });
$('nav-cockpit').addEventListener('click', function(){ switchMode('cockpit'); });


/* ── LIBRARY ── */
var libFilter = 'all', libSearch = '', libSort = 'name', libSortDir = 1, libSelected = null;

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

function renderLib() {
  var items = libFiltered();
  var container = $('lib-cards'); container.textContent='';
  $('lib-empty').style.display = items.length?'none':'block';

  function makeGrid(list) {
    var g = document.createElement('div'); g.className='card-grid';
    list.forEach(function(c){ g.appendChild(buildCard(c)); });
    return g;
  }

  if (libFilter==='all' && !libSearch) {
    var byType={};
    items.forEach(function(c){ (byType[c.type]=byType[c.type]||[]).push(c); });
    TYPE_ORDER.filter(function(t){ return byType[t]&&byType[t].length; }).forEach(function(t){
      var lbl=document.createElement('div'); lbl.className='type-group-label';
      lbl.textContent=(TYPE_LABEL[t]||t)+' ('+byType[t].length+')';
      container.appendChild(lbl); container.appendChild(makeGrid(byType[t]));
    });
  } else {
    container.appendChild(makeGrid(items));
  }

  $('last-sync').textContent = new Date().toLocaleDateString('nl-NL');
}

function buildCard(c) {
  var card = document.createElement('div');
  card.className = 'lib-card bl-'+(c.type||'');
  if (c.id===libSelected) card.classList.add('selected');

  var top = document.createElement('div'); top.className='lib-card-top';
  var nameEl = document.createElement('div'); nameEl.className='lib-card-name';
  nameEl.appendChild(hlNode(c.name, libSearch));
  var badge = document.createElement('span'); badge.className='type-badge';
  badge.textContent=TYPE_LABEL[c.type]||c.type;
  top.appendChild(nameEl); top.appendChild(badge);

  var desc = document.createElement('div'); desc.className='lib-card-desc';
  desc.appendChild(hlNode(c.desc, libSearch));

  var footer = document.createElement('div'); footer.className='lib-card-footer';
  var tagsEl = document.createElement('div'); tagsEl.className='lib-card-tags';
  (c.tags||[]).slice(0,3).forEach(function(t){
    var chip=document.createElement('span'); chip.className='tag-chip'; chip.textContent=t; tagsEl.appendChild(chip);
  });
  var right=document.createElement('div'); right.style.cssText='display:flex;align-items:center;gap:6px;flex-shrink:0';
  var dot=document.createElement('span'); dot.className='status-dot '+(DOT_CLASS[c.status]||'dot-draft');
  var copyBtn=document.createElement('button'); copyBtn.className='lib-card-copy';
  copyBtn.title='Pad kopiëren'; copyBtn.textContent='⎘ PAD';
  right.appendChild(dot); right.appendChild(copyBtn);
  footer.appendChild(tagsEl); footer.appendChild(right);
  card.appendChild(top); card.appendChild(desc); card.appendChild(footer);

  card.addEventListener('click', function(e){ if (!e.target.closest('.lib-card-copy')) libSelectRow(c.id); });
  copyBtn.addEventListener('click', function(e){
    e.stopPropagation();
    navigator.clipboard.writeText(c.path).catch(function(){});
    var orig=copyBtn.textContent; copyBtn.textContent='✓ Gekopieerd';
    copyBtn.style.color='var(--green)'; copyBtn.style.borderColor='var(--green)';
    setTimeout(function(){ copyBtn.textContent=orig; copyBtn.style.color=''; copyBtn.style.borderColor=''; },1500);
  });
  return card;
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
    fetch(c.path)
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

  var isSkill = c.type==='skill';
  var isSnippet = c.type==='snippet';
  var isImported = Array.isArray(c.tags) && c.tags.indexOf('imported') !== -1;
  $('drawer-skill-actions').style.display = isSkill ? 'flex' : 'none';
  $('drawer-rescan-actions').style.display = isImported ? 'flex' : 'none';
  $('rescan-result').style.display = 'none';
  $('score-panel').classList.remove('visible');
  $('enrich-panel').classList.remove('visible');

  var snippetPanel = $('drawer-snippet-panel');
  if (isSnippet && c.files) {
    snippetPanel.style.display = 'block';
    drawerRenderSnippet(c);
  } else {
    snippetPanel.style.display = 'none';
  }

  drawerCurrentId = c.id;
  $('lib-drawer').classList.add('open');
  renderLib(); renderSkills();
}

function drawerClose() {
  libSelected=null; drawerCurrentId=null;
  $('lib-drawer').classList.remove('open');
  $('score-panel').classList.remove('visible');
  $('enrich-panel').classList.remove('visible');
  var sp=$('snip-iframe'); if(sp) sp.src='';
  renderLib(); renderSkills();
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

$('search').addEventListener('input', function(e){ libSearch=e.target.value; renderLib(); });
$('sort-select').addEventListener('change', function(e){ libSort=e.target.value; libSortDir=1; renderLib(); });

document.querySelectorAll('thead th[data-col]').forEach(function(th){
  th.addEventListener('click', function(){
    var col=th.dataset.col, view=th.dataset.view;
    if (view==='skills') {
      if (skillsSort===col) skillsSortDir*=-1; else { skillsSort=col; skillsSortDir=1; }
      $('skills-sort').value=skillsSort; renderSkills();
    } else {
      if (libSort===col) libSortDir*=-1; else { libSort=col; libSortDir=1; }
      $('sort-select').value=libSort; renderLib();
    }
  });
});

function updateSortHeaders(view) {
  var col=view==='skills'?skillsSort:libSort, dir=view==='skills'?skillsSortDir:libSortDir;
  document.querySelectorAll('thead th[data-view="skills"]').forEach(function(th){
    th.classList.toggle('sorted', th.dataset.col===col);
    var si=th.querySelector('.si');
    if (si) si.textContent=th.dataset.col===col?(dir===1?'↑':'↓'):'↕';
  });
}

/* ── SKILLS ── */
var skillsSearch='', skillsSort='name', skillsSortDir=1;

function skillsFiltered() {
  return COMPONENTS
    .filter(function(c){ return c.type==='skill'; })
    .filter(function(c){
      if (!skillsSearch) return true;
      var q=skillsSearch.toLowerCase();
      return c.name.toLowerCase().includes(q)||(c.tags||[]).some(function(t){ return t.includes(q); });
    })
    .sort(function(a,b){
      var av=(a[skillsSort]||'').toLowerCase(),bv=(b[skillsSort]||'').toLowerCase();
      return av<bv?-skillsSortDir:av>bv?skillsSortDir:0;
    });
}

function buildSkillsRow(c) {
  var tr = document.createElement('tr');
  if (c.id===libSelected) tr.classList.add('selected');

  var nameCell = document.createElement('td');
  var nameDiv = document.createElement('div'); nameDiv.className='td-name'; nameDiv.textContent=c.name;
  var pathDiv = document.createElement('div'); pathDiv.className='td-path'; pathDiv.textContent=c.path;
  nameCell.appendChild(nameDiv); nameCell.appendChild(pathDiv);

  var verCell = document.createElement('td'); verCell.className='version-cell'; verCell.textContent=c.version;

  var statusCell = document.createElement('td');
  var wrap = document.createElement('div'); wrap.className='status-wrap';
  var dot = document.createElement('span'); dot.className='status-dot '+(DOT_CLASS[c.status]||'dot-draft');
  var txt = document.createElement('span'); txt.className='status-text '+(STATUS_CLASS[c.status]||'st-draft');
  txt.textContent=STATUS_LABEL[c.status]||c.status;
  wrap.appendChild(dot); wrap.appendChild(txt); statusCell.appendChild(wrap);

  var updCell = document.createElement('td'); updCell.className='updated-cell'; updCell.textContent=c.updated;
  var tagsCell = document.createElement('td');
  (c.tags||[]).slice(0,3).forEach(function(t){
    var chip=document.createElement('span'); chip.className='tag-chip'; chip.textContent=t; tagsCell.appendChild(chip);
  });

  tr.appendChild(nameCell); tr.appendChild(verCell); tr.appendChild(statusCell);
  tr.appendChild(updCell); tr.appendChild(tagsCell);
  tr.addEventListener('click', function(){ libSelectRow(c.id); });
  return tr;
}

function renderSkills() {
  var rows = skillsFiltered();
  var tbody = $('skills-tbody');
  tbody.textContent = '';
  $('skills-empty').style.display = rows.length?'none':'block';
  rows.forEach(function(c){ tbody.appendChild(buildSkillsRow(c)); });
  $('skills-count').textContent = rows.length;
  $('skills-active').textContent = rows.filter(function(c){ return c.status==='active'; }).length;
  updateSortHeaders('skills');
}

$('skills-search').addEventListener('input', function(e){ skillsSearch=e.target.value; renderSkills(); });
$('skills-sort').addEventListener('change', function(e){ skillsSort=e.target.value; skillsSortDir=1; renderSkills(); });

/* ── DATA ── */
fetch('components.json')
  .then(function(r){ return r.json(); })
  .then(function(data){ COMPONENTS=data; renderSidebarNav(); renderLib(); renderSkills(); })
  .catch(function(){ renderSidebarNav(); renderLib(); renderSkills(); });

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
var enrichPending = null;

function scoreColor(s) {
  return s >= 80 ? '' : s >= 60 ? 'amber' : 'red';
}

function renderScoreBar(label, score) {
  var row = document.createElement('div'); row.className='score-row';
  var lbl = document.createElement('div'); lbl.className='score-label';
  var lt = document.createTextNode(label);
  var sv = document.createElement('span'); sv.textContent=score+'/100';
  lbl.appendChild(lt); lbl.appendChild(sv);
  var track = document.createElement('div'); track.className='score-bar-track';
  var fill = document.createElement('div');
  var sc=scoreColor(score); fill.className=('score-bar-fill'+(sc?' '+sc:''));
  fill.style.width=score+'%';
  track.appendChild(fill);
  row.appendChild(lbl); row.appendChild(track);
  return row;
}

function drawerAnalyzeSkill() {
  var id = drawerCurrentId;
  if (!id) return;
  var btn = $('btn-analyze-skill');
  btn.disabled=true; btn.textContent='Bezig...';
  $('score-panel').classList.remove('visible');
  $('enrich-panel').classList.remove('visible');

  ckApiFetch('/analyze-skill',{method:'POST',body:JSON.stringify({id})})
    .then(function(r){
      var panel=$('score-panel'); panel.textContent='';

      var labels={volledigheid:'Volledigheid',triggers:'Triggers',overlap:'Overlap',kwaliteit:'Kwaliteit'};
      Object.keys(labels).forEach(function(k){
        panel.appendChild(renderScoreBar(labels[k], r.scores[k]||0));
      });

      if (r.issues&&r.issues.length){
        var issuesWrap=document.createElement('div'); issuesWrap.className='score-issues';
        r.issues.forEach(function(issue){
          var li=document.createElement('div'); li.className='issue-item';
          var txt=document.createElement('span'); txt.className='issue-item-text'; txt.textContent=issue;
          var applyBtn=document.createElement('button'); applyBtn.className='issue-apply-btn'; applyBtn.textContent='Toepassen';
          applyBtn.addEventListener('click', function(){
            applyBtn.disabled=true; applyBtn.textContent='…';
            drawerEnrichUsage();
          });
          li.appendChild(txt); li.appendChild(applyBtn);
          issuesWrap.appendChild(li);
        });
        panel.appendChild(issuesWrap);
      }

      if (r.summary){
        var sum=document.createElement('div'); sum.className='score-summary'; sum.textContent=r.summary;
        panel.appendChild(sum);
      }

      panel.classList.add('visible');
    })
    .catch(function(e){
      var panel=$('score-panel'); panel.textContent='';
      var errEl=document.createElement('div');
      errEl.style.cssText='font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--red);padding:4px 0';
      errEl.textContent='Fout: '+e.message;
      panel.appendChild(errEl); panel.classList.add('visible');
    })
    .finally(function(){ btn.disabled=false; btn.textContent='Analyseer'; });
}

function drawerEnrichUsage() {
  var id = drawerCurrentId;
  if (!id) return;
  var btn = $('btn-enrich-skill');
  btn.disabled=true; btn.textContent='Bezig...';
  $('enrich-panel').classList.remove('visible');

  ckApiFetch('/enrich-usage',{method:'POST',body:JSON.stringify({id})})
    .then(function(r){
      enrichPending = { id, usage: r.proposed_usage };

      var row=$('enrich-row'); row.textContent='';
      var colCur=document.createElement('div');
      var lCur=document.createElement('div'); lCur.className='enrich-col-label'; lCur.textContent='Huidig';
      var vCur=document.createElement('div'); vCur.className='enrich-col-current'; vCur.textContent=r.current_usage||'(leeg)';
      colCur.appendChild(lCur); colCur.appendChild(vCur);

      var colNew=document.createElement('div');
      var lNew=document.createElement('div'); lNew.className='enrich-col-label'; lNew.textContent='Voorstel';
      var vNew=document.createElement('div'); vNew.className='enrich-col-proposed'; vNew.textContent=r.proposed_usage||'';
      colNew.appendChild(lNew); colNew.appendChild(vNew);
      row.appendChild(colCur); row.appendChild(colNew);

      var trigsEl=$('enrich-triggers'); trigsEl.textContent='';
      (r.triggers||[]).forEach(function(t){
        var div=document.createElement('div'); div.className='enrich-trigger'; div.textContent=t;
        trigsEl.appendChild(div);
      });

      $('enrich-panel').classList.add('visible');
      renderVerrijkingPreview(id, r);
    })
    .catch(function(e){
      var panel=$('enrich-panel'); panel.textContent='';
      var errEl=document.createElement('div');
      errEl.style.cssText='font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--red);padding:4px 0';
      errEl.textContent='Fout: '+e.message;
      panel.appendChild(errEl); panel.classList.add('visible');
    })
    .finally(function(){ btn.disabled=false; btn.textContent='Verrijk gebruik'; });
}

function drawerSaveEnrichment() {
  if (!enrichPending) return;
  var saveBtn=$('enrich-save-btn');
  saveBtn.disabled=true; saveBtn.textContent='Opslaan...';

  ckApiFetch('/save-enrichment',{method:'POST',body:JSON.stringify(enrichPending)})
    .then(function(){
      enrichPending=null;
      $('enrich-panel').classList.remove('visible');
      $('ck-verrijking-preview').style.display='none';
      $('ck-verrijking-empty').style.display='block';
      var savedId=drawerCurrentId;
      fetch('components.json').then(function(r){return r.json();}).then(function(d){
        COMPONENTS=d; renderLib(); renderSkills();
        var updated=COMPONENTS.find(function(c){ return c.id===savedId; });
        if (updated) $('drawer-usage').textContent=updated.usage||'—';
      }).catch(function(){});
      showToast('Verrijking opgeslagen.');
    })
    .catch(function(e){ showToast('Fout: '+e.message, true); })
    .finally(function(){ saveBtn.disabled=false; saveBtn.textContent='Opslaan'; });
}

function renderVerrijkingPreview(id, r) {
  $('ck-verrijking-empty').style.display='none';
  var prev=$('ck-verrijking-preview');
  prev.textContent='';
  prev.style.cssText='display:flex;flex-direction:column;gap:14px';

  var comp=COMPONENTS.find(function(c){ return c.id===id; });
  var title=document.createElement('div'); title.className='ck-section-title';
  title.textContent=comp?comp.name:id;
  prev.appendChild(title);

  var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px';
  var colCur=document.createElement('div');
  var lCur=document.createElement('div'); lCur.className='enrich-col-label'; lCur.textContent='Huidig';
  var vCur=document.createElement('div'); vCur.className='enrich-col-current'; vCur.textContent=r.current_usage||'(leeg)';
  colCur.appendChild(lCur); colCur.appendChild(vCur);
  var colNew=document.createElement('div');
  var lNew=document.createElement('div'); lNew.className='enrich-col-label'; lNew.textContent='Voorstel';
  var vNew=document.createElement('div'); vNew.className='enrich-col-proposed'; vNew.textContent=r.proposed_usage||'';
  colNew.appendChild(lNew); colNew.appendChild(vNew);
  grid.appendChild(colCur); grid.appendChild(colNew);
  prev.appendChild(grid);

  if (r.triggers&&r.triggers.length){
    var tl=document.createElement('div'); tl.className='enrich-col-label'; tl.textContent='Trigger-zinnen';
    prev.appendChild(tl);
    var trigsEl=document.createElement('div'); trigsEl.className='enrich-triggers';
    r.triggers.forEach(function(t){ var d=document.createElement('div'); d.className='enrich-trigger'; d.textContent=t; trigsEl.appendChild(d); });
    prev.appendChild(trigsEl);
  }

  var saveRow=document.createElement('div'); saveRow.className='enrich-save-row';
  var saveBtn=document.createElement('button'); saveBtn.className='enrich-save-btn'; saveBtn.textContent='Opslaan';
  var cancelBtn=document.createElement('button'); cancelBtn.className='enrich-cancel-btn'; cancelBtn.textContent='Annuleren';
  saveBtn.addEventListener('click', function(){
    if (!enrichPending) return;
    saveBtn.disabled=true; saveBtn.textContent='Opslaan...';
    ckApiFetch('/save-enrichment',{method:'POST',body:JSON.stringify(enrichPending)})
      .then(function(){
        enrichPending=null;
        prev.style.display='none';
        $('ck-verrijking-empty').style.display='block';
        $('enrich-panel').classList.remove('visible');
        fetch('components.json').then(function(r2){return r2.json();}).then(function(d){ COMPONENTS=d; renderLib(); renderSkills(); }).catch(function(){});
        showToast('Verrijking opgeslagen.');
      })
      .catch(function(e){ showToast('Fout: '+e.message, true); })
      .finally(function(){ saveBtn.disabled=false; saveBtn.textContent='Opslaan'; });
  });
  cancelBtn.addEventListener('click', function(){
    enrichPending=null; prev.style.display='none';
    $('ck-verrijking-empty').style.display='block';
    $('enrich-panel').classList.remove('visible');
  });
  saveRow.appendChild(saveBtn); saveRow.appendChild(cancelBtn);
  prev.appendChild(saveRow);
}

$('btn-rescan-imported').addEventListener('click', function(){
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
      result.style.display = 'block';
      result.style.color = 'var(--green)';
      result.textContent = 'Opnieuw geïmporteerd — PR: ' + r.pr_url;
    })
    .catch(function(e){
      result.style.display = 'block';
      result.style.color = 'var(--red)';
      result.textContent = 'Fout: ' + e.message;
    })
    .finally(function(){ btn.disabled = false; btn.textContent = '↻ Rescan bron'; });
});

$('btn-analyze-skill').addEventListener('click', drawerAnalyzeSkill);
$('btn-enrich-skill').addEventListener('click', drawerEnrichUsage);
$('enrich-save-btn').addEventListener('click', drawerSaveEnrichment);
$('enrich-cancel-btn').addEventListener('click', function(){
  enrichPending=null;
  $('enrich-panel').classList.remove('visible');
  $('ck-verrijking-empty').style.display='block';
  $('ck-verrijking-preview').style.display='none';
});

/* ── BULK ANALYSE ── */
$('ck-analyze-all-btn').addEventListener('click', function(){
  var btn=$('ck-analyze-all-btn');
  btn.disabled=true; btn.textContent='Bezig...';
  $('ck-analyse-result').style.display='none';
  $('ck-analyse-error').style.display='none';
  $('ck-overall-score').style.display='none';

  ckApiFetch('/analyze-all',{method:'POST',body:JSON.stringify({})})
    .then(function(r){
      var tbody=$('ck-analyse-tbody'); tbody.textContent='';
      var sorted=r.skills.slice().sort(function(a,b){ return a.avg-b.avg; });
      sorted.forEach(function(s){
        var cls=s.avg>=80?'row-green':s.avg>=60?'row-amber':'row-red';
        var scoreCls=s.avg>=80?'bulk-score-green':s.avg>=60?'bulk-score-amber':'bulk-score-red';
        var tr=document.createElement('tr'); tr.className=cls;
        [s.name,'',s.scores.volledigheid||0,s.scores.triggers||0,s.scores.overlap||0,s.scores.kwaliteit||0,''].forEach(function(val,i){
          var td=document.createElement('td');
          if (i===1){ td.className=scoreCls; td.textContent=s.avg; }
          else if (i===6){ td.className='bulk-issue'; td.textContent=s.top_issue||'—'; }
          else { td.textContent=String(val); }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      var os=$('ck-overall-score');
      os.textContent='Gemiddelde score: '+r.overall+'/100 · '+r.skills.length+' skills geanalyseerd';
      os.style.display='block';
      $('ck-analyse-result').style.display='block';
    })
    .catch(function(e){
      var el=$('ck-analyse-error');
      el.textContent='Fout: '+e.message;
      el.style.display='block';
    })
    .finally(function(){ btn.disabled=false; btn.textContent='Analyseer alle skills'; });
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
