import { EMPTY, STATUSES, LABELS, validate, rowFor, merge, equal, update, statistics } from './core.mjs';
import { toBase64, fromBase64 } from '../notes/core.mjs';
const REPO = 'bigbigyan/bigbigyan.github.io', BRANCH = 'master', FILE = 'study/progress.json';
const KEY = `yan-study:v1:${REPO}:${BRANCH}`;
const $ = s => document.querySelector(s), copy = v => structuredClone(v);
let plan, state = { base:copy(EMPTY), document:copy(EMPTY) }, snapshot=null, persisted=copy(EMPTY);
let active = new URLSearchParams(location.search).get('week') || 'w01', view='weeks', query='', filter='', token='', busy=false, pendingSave=false, storageError=false, conflictContext=null, timer;
const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined) n.textContent=text; if(cls) n.className=cls; return n; };
function toast(message) { $('#toast').textContent=message; $('#toast').hidden=false; clearTimeout(timer); timer=setTimeout(()=>$('#toast').hidden=true,7000); }
function status(message,error=false) { $('#sync-status').textContent=message; $('#sync-status').classList.toggle('error',error); }
function draftStatus() {
  status(storageError ? '草稿未能保存，请导出备份' : equal(state.base,state.document) ? '与最近读取的云端版本一致' : '草稿已保存到此浏览器',storageError);
  $('#storage-alert').hidden=!storageError;
}
function persist() {
  try {
    const disk=localStorage.getItem(KEY);
    if(disk!==snapshot && disk) {
      const latest=JSON.parse(disk), result=merge(persisted,state.document,validate(latest.document));
      if(result.conflicts.length) throw new Error('另一个标签页修改了同一字段。请导出本页备份，再刷新查看。');
      state.document=result.document;
    }
    const next=JSON.stringify(state); localStorage.setItem(KEY,next); snapshot=next; persisted=copy(state.document); storageError=false; return true;
  } catch(e) { storageError=true; toast(`本地保存未完成：${e.message} 本页内容仍保留，可导出备份。`); return false; }
  finally { draftStatus(); }
}
function download(name,text,type='application/json') {
  const url=URL.createObjectURL(new Blob([text],{type})), a=el('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function backup() { download(`44周学习进度-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state.document,null,2)); }
function link(text,url) { const a=el('a',text); if(/^https:\/\//.test(url)) { a.href=url;a.target='_blank';a.rel='noopener noreferrer'; } return a; }
function shell() {
  $('#app').innerHTML=`<aside class="sidebar study-sidebar" aria-label="学习计划目录">
    <button class="study-mobile-close" aria-label="关闭学习目录">×</button>
    <a class="brand" href="../"><span class="brand-mark">Y</span><div><span class="brand-name">我的学习笔记</span><small>A LITTLE, EVERY DAY</small></div></a>
    <nav class="study-nav" aria-label="空间切换"><a href="../">学习笔记</a><a href="./" aria-current="page">学习计划</a></nav>
    <div class="study-filter"><input id="week-search" type="search" aria-label="搜索学习计划" placeholder="搜索周次、主题、记录…"><select id="status-filter" aria-label="筛选完成状态"><option value="">全部状态</option>${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <nav id="week-list" class="week-list" aria-label="每周计划"></nav>
    <div class="sidebar-bottom"><div class="backup-tools"><button id="backup">导出进度备份</button><button id="restore">导入备份</button><button id="pull">拉取 GitHub 更新</button></div><p>勾选与记录自动保存于此浏览器。<br>同步到 GitHub 后可在其他电脑继续。</p></div>
  </aside><div class="study-workspace"><header class="study-topbar"><button class="study-mobile-menu" aria-label="打开学习目录">☰</button><span>学习计划 / 科研优先</span><div class="study-actions"><span id="sync-status" class="study-status" role="status"></span><button id="connect-button" class="text-button">连接 GitHub</button><button id="save" class="primary">保存到 GitHub</button></div></header>
    <div id="storage-alert" class="storage-alert" role="alert" hidden>草稿未能写入浏览器，请先导出进度备份。</div>
    <main class="study-main"><div class="study-intro"><div><span class="study-kicker">LEARNING, ONE WEEK AT A TIME</span><h1>44 周科研学习计划</h1><p>2028 届视觉控制博士 · 科研优先版 · 2026.10.26—2027.08.29</p></div><div class="study-tabs" role="tablist" aria-label="学习计划视图"><button role="tab" data-view="weeks" aria-selected="true">每周任务</button><button role="tab" data-view="courses" aria-selected="false">课程目录</button><button role="tab" data-view="guide" aria-selected="false">验收与用法</button></div></div>
    <section class="study-stats" aria-label="学习进度"><div class="study-stat"><strong id="stat-passed"></strong><span>已通过周数</span></div><div class="study-stat"><strong id="stat-tasks"></strong><span>已勾选任务</span></div><div class="study-stat"><strong id="stat-hours"></strong><span>实际 / 计划小时</span></div><div class="study-stat"><strong id="stat-review"></strong><span>待复测周数</span></div></section><progress class="plan-progress" id="plan-progress" max="44" value="0" aria-label="已通过周数进度"></progress>
    <div id="view"></div><p class="study-notice"><strong>自动保存到此浏览器</strong> · 点击右上角保存后同步到 GitHub。同步的学习记录会公开展示。<br>资料来自你提供的 Excel；课程和验收说明保留原表内容，原文件未修改。</p>
    </main></div><input id="backup-file" type="file" accept="application/json,.json" hidden>
    <div class="toast study-toast" id="toast" role="status" hidden></div>
    <dialog id="connection-dialog" aria-labelledby="connection-title"><button class="close-dialog" data-close="connection-dialog" aria-label="关闭连接设置">×</button><h2 id="connection-title">连接 GitHub</h2><p>使用已授权此仓库的令牌，Contents 设为 Read and write。令牌只保留在当前页面，刷新或关闭后需要重新输入。</p><div class="repo-label">bigbigyan/bigbigyan.github.io<br>master · study/progress.json</div><form id="connect-form"><label for="github-token">GitHub 访问令牌</label><input id="github-token" type="password" autocomplete="off" spellcheck="false" required><p id="connection-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary" data-close="connection-dialog">取消</button><button id="connect-submit" class="primary">连接</button></div></form></dialog>
    <dialog id="conflict-dialog" aria-labelledby="conflict-title"><button class="close-dialog" data-close="conflict-dialog" aria-label="关闭版本比较">×</button><h2 id="conflict-title">选择要保留的记录</h2><p>同一字段有不同修改，本次尚未覆盖。逐项选择后合并草稿，再点击保存到 GitHub。</p><div id="conflict-list" class="sync-conflicts"></div><p id="conflict-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button class="secondary" id="conflict-backup">导出本页备份</button><button class="primary" id="resolve-conflict">合并选择</button></div></dialog>`;
  $('#week-search').oninput=e=>{query=e.target.value;renderList();}; $('#status-filter').onchange=e=>{filter=e.target.value;renderList();};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;renderView();});
  $('#backup').onclick=backup; $('#restore').onclick=()=>$('#backup-file').click(); $('#backup-file').onchange=importBackup;
  $('#pull').onclick=()=>sync(false); $('#save').onclick=()=>sync(true); $('#connect-button').onclick=()=>openConnect();
  $('#connect-form').onsubmit=connect; $('#conflict-backup').onclick=backup; $('#resolve-conflict').onclick=resolveConflict;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
  $('.study-mobile-menu').onclick=()=>$('.study-sidebar').classList.toggle('open'); $('.study-mobile-close').onclick=()=>$('.study-sidebar').classList.remove('open');
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();sync(true);}if(e.key==='Escape')$('.study-sidebar').classList.remove('open');});
  window.addEventListener('storage',e=>{if(e.key===KEY){toast('另一个标签页更新了进度。下次填写或同步时将比较并合并。');status('其他页面有更新');}});
  window.addEventListener('popstate',()=>{active=new URLSearchParams(location.search).get('week')||'w01';if(!plan.weeks.some(w=>w.id===active))active='w01';view='weeks';renderView();});
}
function stats() {
  const s=statistics(plan,state.document);
  for(const [id,big,small] of [['passed',s.passed,'/ 44'],['tasks',s.tasks,'/ 132'],['hours',Number(s.hours.toFixed(2)),`/ ${s.planned} h`],['review',s.review,'周']]) {const n=$('#stat-'+id);n.replaceChildren(el('span',String(big)));n.firstChild.style.cssText='font-size:inherit;color:inherit';n.append(el('small',small));}
  $('#plan-progress').value=s.passed; $('#plan-progress').setAttribute('aria-valuetext',`${s.passed} 周通过，共 44 周`);
}
function renderList() {
  const host=$('#week-list');host.replaceChildren();const groups=new Map(),q=query.trim().toLocaleLowerCase();
  for(const w of plan.weeks) {
    const r=rowFor(state.document,w.id);
    if(filter&&r.status!==filter)continue;
    if(q&&!`${w.number} w${String(w.number).padStart(2,'0')} 第${w.number}周 ${w.stage} ${w.title} ${w.chapters} ${w.practice} ${w.algorithm} ${w.acceptance} ${r.record}`.toLocaleLowerCase().includes(q))continue;
    if(!groups.has(w.stage))groups.set(w.stage,[]);groups.get(w.stage).push(w);
  }
  if(!groups.size)host.append(el('p','没有符合条件的周计划。','empty-weeks'));
  for(const [stage,weeks] of groups) {
    const d=el('details',undefined,'stage-group');d.open=Boolean(q||filter||weeks.some(w=>w.id===active));d.append(el('summary',`${stage} · ${weeks.length}`));
    for(const w of weeks) {const r=rowFor(state.document,w.id),a=el('a',undefined,'week-link');a.href=`?week=${w.id}`;a.title=`第 ${w.number} 周 · ${w.title} · ${r.status}`;if(w.id===active)a.setAttribute('aria-current','page');a.append(el('span',`W${String(w.number).padStart(2,'0')}`),el('span',w.title),el('small',r.status==='通过'?'✓':r.status==='待复测'?'复测':''));a.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();go(w.id);};d.append(a);}host.append(d);
  }
}
function go(id) { if(busy)return;active=id;view='weeks';history.pushState(null,'',`?week=${id}`);renderView();$('.study-sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'instant'}); }
function onChange(field,value,target) {
  try {
    state.document=update(state.document,active,field,value);persist();stats();renderList();
    const row=rowFor(state.document,active);$('#week-status').value=row.status;
    for(const [id,key] of [['week-record','record'],['week-hours','hours'],['week-review','reviewDate']]) {
      const input=$('#'+id);if(input!==target&&input.value!==row[key])input.value=row[key];
    }
    document.querySelectorAll('.task-row input').forEach((input,i)=>{input.checked=row[['practice','algorithm','acceptance'][i]];});
    $('#field-error').textContent='';
  } catch(e) {$('#field-error').textContent=e.message;if(target.type==='checkbox')target.checked=rowFor(state.document,active)[field];if(target.tagName==='SELECT')target.value=rowFor(state.document,active)[field];}
}
function renderWeek() {
  const w=plan.weeks.find(w=>w.id===active), r=rowFor(state.document,active), host=$('#view');
  host.innerHTML=`<section class="week-card" aria-labelledby="week-title"><div class="week-card-head"><div><span class="week-tag" id="week-tag"></span><h2 id="week-title"></h2><div class="week-dates" id="week-dates"></div></div><label class="week-status-label">完成状态<select id="week-status" data-edit>${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select></label></div><div class="chapter-info"><span>课程与建议章节</span><p id="week-chapters"></p><div id="course-links" class="course-links"></div></div><h3 class="tasks-heading">本周任务 · 完成一项，勾选一项</h3><div id="week-tasks"></div><div class="record-heading"><h3>学习记录与验收证据</h3><span>代码路径、结果、问题与下次计划</span></div><label class="visually-hidden" for="week-record">学习记录与验收证据</label><textarea id="week-record" class="record-text" maxlength="20000" placeholder="今天做了什么？独立完成了哪些步骤？\n留下代码链接、实验结果、遇到的问题和下一步。" data-edit></textarea><div class="record-fields"><label>实际用时（小时）<input id="week-hours" type="number" min="0" max="1000" step="0.01" placeholder="尚未记录" data-edit></label><label>复测日期<input id="week-review" type="date" data-edit></label></div><p id="field-error" class="field-error" role="alert"></p><div class="week-footer"><button class="secondary" id="previous-week">← 上一周</button><span>三项完成并填写证据后，可将状态设为“通过”</span><button class="secondary" id="next-week">下一周 →</button></div></section>`;
  $('#week-status').setAttribute('aria-label','完成状态');
  $('#week-tag').textContent=`第 ${String(w.number).padStart(2,'0')} 周 / ${w.stage}`;$('#week-title').textContent=w.title;$('#week-dates').textContent=`${w.start} — ${w.end}　·　计划 ${w.plannedHours} 小时`;
  $('#week-chapters').textContent=w.chapters;$('#week-status').value=r.status;
  const refs=[...new Set((`${w.chapters} ${w.courseLabel}`.match(/(?:C\d+B?|R\d+)(?!\d)/g)||[]))];
  const links=$('#course-links');if(w.courseURL)links.append(link(w.courseLabel+' ↗',w.courseURL));
  for(const id of refs) {const c=plan.courses.find(c=>c.id===id);if(c&&c.url!==w.courseURL)links.append(link(`${id} ${c.title} ↗`,c.url));}
  for(const [field,label,text] of [['practice','动手任务 / 产出',w.practice],['algorithm','算法练习',w.algorithm],['acceptance','独立验收标准',w.acceptance]]) {
    const row=el('label',undefined,'task-row'), check=el('input');check.type='checkbox';check.checked=r[field];check.dataset.edit='';check.setAttribute('aria-label',label);check.onchange=()=>onChange(field,check.checked,check);
    const content=el('div');content.append(el('strong',label),el('p',text));row.append(check,content);$('#week-tasks').append(row);
  }
  $('#week-record').value=r.record;$('#week-hours').value=r.hours;$('#week-review').value=r.reviewDate;
  $('#week-record').oninput=e=>onChange('record',e.target.value,e.target);
  $('#week-hours').oninput=e=>{try {const v=e.target.value;if(e.target.validity.badInput)throw new Error('请输入有效的实际小时。');onChange('hours',v,e.target);}catch(err){$('#field-error').textContent=err.message;}};
  $('#week-review').oninput=e=>onChange('reviewDate',e.target.value,e.target);
  $('#week-status').onchange=e=>onChange('status',e.target.value,e.target);
  $('#previous-week').disabled=w.number===1;$('#next-week').disabled=w.number===44;
  $('#previous-week').onclick=()=>go(plan.weeks[w.number-2].id);$('#next-week').onclick=()=>go(plan.weeks[w.number].id);
}
function renderResources() {
  const host=el('div',undefined,'resource-list');
  for(const c of plan.courses) {const card=el('article',undefined,'resource-card');card.append(el('h2',`${c.id} · ${c.title}`),el('small',`${c.format} / ${c.language}`),el('p',c.chapters));const links=el('div',undefined,'course-links');links.append(link('打开课程 / 文档 ↗',c.url));if(c.alternate)links.append(link('补充 / 备选入口 ↗',c.alternate));card.append(links,el('p',c.note));host.append(card);}$('#view').replaceChildren(host);
}
function renderGuide() {const host=el('div',undefined,'guide-list');host.append(el('p','先自测，再补课。以下保留原表说明，L / M / N 列分别对应网页的完成状态、实际用时、学习记录；复测日期可单独填写。','study-notice'));for(const g of plan.guide){const card=el('article',undefined,'guide-card');card.append(el('h2',g.title),el('p',g.description),el('p',g.criterion));host.append(card);}$('#view').replaceChildren(host);}
function renderView() {document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view)));if(view==='weeks')renderWeek();else if(view==='courses')renderResources();else renderGuide();stats();renderList();draftStatus();setBusy(busy);document.title=view==='weeks'?`第 ${Number(active.slice(1))} 周 · 学习计划`:'学习计划 · Yan';}
function setBusy(value) {busy=value;document.querySelectorAll('[data-edit], [data-view], #pull, #save, #restore, #connect-button, #previous-week, #next-week').forEach(n=>{n.disabled=value;});if(!value&&view==='weeks'){const i=Number(active.slice(1));$('#previous-week').disabled=i===1;$('#next-week').disabled=i===44;}}
function openConnect(save=false){if(busy)return;pendingSave=save;$('#connection-error').textContent='';$('#connection-dialog').showModal();$('#github-token').focus();}
async function request(path,options={}) {
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...options.headers};if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(`https://api.github.com/repos/${REPO}${path}`,{...options,headers,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(({401:'令牌无效或已过期，请重新连接。',403:'访问被拒绝，请检查 Contents 读写权限或请求额度。',404:'未找到学习进度文件，请检查仓库权限和分支。',409:'云端有新版本，请再次保存以重新比较。',422:'GitHub 未能接受保存，请检查分支保护。'})[response.status]||`GitHub 请求失败（${response.status}）。`);
  return response.json();
}
async function connect(e) {e.preventDefault();const candidate=$('#github-token').value.trim();if(!candidate)return;const previous=token;token=candidate;$('#connect-submit').disabled=true;
  try{await request('');$('#github-token').value='';$('#connection-dialog').close();$('#connect-button').textContent='已连接 GitHub';toast('已连接。令牌仅保留在当前页面。');if(pendingSave){pendingSave=false;await sync(true);}}
  catch(err){token=previous;$('#connection-error').textContent=err.message;}finally{$('#connect-submit').disabled=false;}
}
async function cloud() {const d=await request(`/contents/${FILE}?ref=${BRANCH}`);if(d.encoding!=='base64'||!d.content)throw new Error('云端文件超出读取大小或内容不可用。');return {document:validate(JSON.parse(fromBase64(d.content))),sha:d.sha};}
function showConflicts(result,base) {
  conflictContext={result,base};const host=$('#conflict-list');host.replaceChildren();$('#conflict-error').textContent='';
  for(const [i,c] of result.conflicts.entries()) {const card=el('div',undefined,'conflict-item');card.append(el('strong',`第 ${Number(c.id.slice(1))} 周 · ${LABELS[c.field]}`),el('p',`本页：${String(c.local)}\n另一版本：${String(c.remote)}`));const label=el('label','保留哪一版'),select=el('select');select.id=`choice-${i}`;select.setAttribute('aria-label',`第${Number(c.id.slice(1))}周${LABELS[c.field]}保留版本`);for(const [v,t] of [['','请选择…'],['local','保留本页'],['remote','保留另一版本']]){const o=el('option',t);o.value=v;select.append(o);}label.append(select);card.append(label);host.append(card);}$('#conflict-dialog').showModal();
}
function resolveConflict() {
  const {result,base}=conflictContext,doc=copy(result.document);
  for(const [i,c] of result.conflicts.entries()){const choice=$(`#choice-${i}`).value;if(!choice){$('#conflict-error').textContent='请为每一项选择要保留的版本。';return;}doc.weeks[c.id][c.field]=c[choice];}
  try {for(const r of Object.values(doc.weeks))if(r.status==='通过'&&(!r.practice||!r.algorithm||!r.acceptance||!r.record.trim()))r.status='待复测';state.document=validate(doc);state.base=copy(base);persist();$('#conflict-dialog').close();renderView();toast('已合并为本地草稿，请再次保存到 GitHub。');}catch(e){$('#conflict-error').textContent=e.message;}
}
async function sync(save) {
  if(busy)return;if(!persist())return;if(save&&!token)return openConnect(true);setBusy(true);status(save?'正在比较并保存…':'正在读取 GitHub…');
  try {const remote=await cloud(),result=merge(state.base,state.document,remote.document);if(result.conflicts.length){showConflicts(result,remote.document);status('有不同修改，请选择保留版本',true);return;}
    if(save&&!equal(result.document,remote.document)){const payload=JSON.stringify(result.document,null,2)+'\n';if(new TextEncoder().encode(payload).length>900000)throw new Error('进度文件接近读取上限，请先导出备份并缩短记录。');await request(`/contents/${FILE}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'study: update learning progress',branch:BRANCH,sha:remote.sha,content:toBase64(payload)})});}
    state.document=result.document;state.base=copy(save?result.document:remote.document);persist();renderView();status(save?'已保存到 GitHub':'已读取云端更新',storageError);toast(save?'学习进度已保存到 GitHub。其他电脑可拉取更新。':'已读取云端，本地尚未上传的记录已保留。');
  }catch(e){draftStatus();status('同步未完成，草稿已保留',true);toast(e.name==='TimeoutError'?'GitHub 连接超时，请稍后重试。':e.message);}finally{setBusy(false);}
}
async function importBackup(e) {const f=e.target.files[0];e.target.value='';if(!f||busy)return;try{if(f.size>900000)throw new Error('请选择 900 KB 以内的进度备份。');const imported=validate(JSON.parse(await f.text())),result=merge(EMPTY,state.document,imported);if(result.conflicts.length){showConflicts(result,state.base);return;}state.document=result.document;persist();renderView();toast('进度已导入，已有记录已合并。请保存到 GitHub 同步。');}catch(err){toast(`导入失败：${err.message}`);}}
async function boot() {
  const response=await fetch('./plan.json',{cache:'no-store'});if(!response.ok)throw new Error('无法读取学习计划。');plan=await response.json();
  if(!plan.weeks.some(w=>w.id===active))active='w01';
  let loaded=false,corrupt=false;
  try{snapshot=localStorage.getItem(KEY);if(snapshot){const saved=JSON.parse(snapshot);state={base:validate(saved.base),document:validate(saved.document)};persisted=copy(state.document);loaded=true;}}
  catch{corrupt=true;try{localStorage.setItem(`${KEY}:recovery:${Date.now()}`,snapshot);}catch{/* Preserve the existing entry. */}}
  if(!loaded){const r=await fetch('./progress.json',{cache:'no-store'});if(!r.ok)throw new Error('无法读取学习进度。');const d=validate(await r.json());state={base:copy(d),document:copy(d)};}
  shell();renderView();if(corrupt){storageError=true;draftStatus();toast('旧进度读取异常，原始数据已保留，请先检查备份。');}else persist();
}
boot().catch(e=>{console.error(e);$('#app').replaceChildren(el('p',`页面暂时未能打开：${e.message} 请刷新重试。`,'loading'));});
