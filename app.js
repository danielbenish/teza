'use strict';
const KEY='ma arag-corpus-v1'.replace(' ','');
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sources=['אבות גאים בפונדקאות','פונדקאות - הקבוצה הפתוחה'];
const statuses=['טרם קודד','קידוד ראשוני','נבדק ואושר'];
let cloud=null,cloudLocked=false,saving=false;
let data={version:1,posts:[],codes:[]},view='posts',editing=null,editingCode=null,draft=[];
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3500)}
function valid(d){return d&&d.version===1&&Array.isArray(d.posts)&&Array.isArray(d.codes)&&d.codes.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&typeof c.definition==='string')&&new Set(d.codes.map(c=>c.id)).size===d.codes.length&&new Set(d.posts.map(p=>p.id)).size===d.posts.length&&d.posts.every(p=>typeof p.id==='string'&&typeof p.couple==='string'&&typeof p.text==='string'&&typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&typeof p.notes==='string'&&typeof p.url==='string'&&typeof p.visual==='boolean'&&sources.includes(p.source)&&statuses.includes(p.status)&&Array.isArray(p.coding)&&p.coding.every(c=>d.codes.some(t=>t.id===c.codeId)&&typeof c.quote==='string'&&(!c.quote||p.text.includes(c.quote))))}
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);if(!valid(parsed))throw Error();data=parsed}}catch{toast('לא ניתן לקרוא את השמירה הקודמת. אפשר לטעון גיבוי; אל תסגרו את הדפדפן לפני בדיקה.')}
async function persist(next){
 if(saving){toast('השמירה הקודמת עדיין מתבצעת');return false}
 if(cloudLocked){toast('יש להתחבר לקורפוס לפני עריכה');return false}
 saving=true;
 try{
  if(cloud){$('syncStatus').textContent='שומר בענן…';await cloud.save(next);$('syncStatus').textContent='נשמר בענן';}
  else localStorage.setItem(KEY,JSON.stringify(next));
  data=next;render();return true;
 }catch(error){
  $('syncStatus').textContent=cloud?'השמירה בענן נכשלה':'שמירה מקומית נכשלה';
  if(error.code==='conflict'){cloudLocked=true;$('retryCloud').hidden=false;alert('הקורפוס השתנה במכשיר אחר. השינויים בטופס נשארו פתוחים. העתיקו אותם לפני חיבור מחדש כדי שלא יאבדו.');}
  else alert('השמירה נכשלה. השינויים בטופס נשארו פתוחים. בדקו את החיבור ונסו שוב. '+(error.message||''));
  return false;
 }finally{saving=false}
}
function safeUrl(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function codeName(id){return data.codes.find(c=>c.id===id)?.name||''}
function render(){
 $('total').textContent=data.posts.length;$('approved').textContent=data.posts.filter(p=>p.status===statuses[2]).length;$('themesCount').textContent=data.codes.length;$('quotesCount').textContent=data.posts.reduce((a,p)=>a+p.coding.filter(c=>c.quote).length,0);
 const filter=$('themeFilter').value;$('themeFilter').innerHTML='<option value="">כל התמות</option>'+data.codes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('themeFilter').value=filter;
 $('allView').classList.toggle('active',view==='posts');$('codesView').classList.toggle('active',view==='codes');$('heading').textContent=view==='posts'?'הקורפוס שלי':'ספר התמות';$('subtitle').textContent=view==='posts'?'כל הסיפורים, התמות והציטוטים — במקום אחד.':'הגדרות משותפות לקידוד עקבי לאורך המחקר.';
 const query=$('search').value.trim().toLocaleLowerCase();
 if(view==='codes'){
 const codes=data.codes.filter(c=>(c.name+' '+c.definition).toLocaleLowerCase().includes(query));$('results').textContent=`${codes.length} תמות`;
 $('content').innerHTML=`<article class="card"><div class="eyebrow">ספר קודים מתפתח</div><h2>לתת שם למשמעות</h2><p class="hint">הוסיפו תמות והגדירו מתי להשתמש בכל אחת.</p><button data-action="new-code">＋ הוספת תמה</button></article>`+codes.map(c=>`<article class="card"><h2>${esc(c.name)}</h2><div class="definition">${esc(c.definition)}</div><div class="meta">${data.posts.filter(p=>p.coding.some(x=>x.codeId===c.id)).length} פוסטים משויכים</div><div class="code-actions"><button data-action="filter-code" data-id="${esc(c.id)}">הצגת פוסטים</button><button data-action="edit-code" data-id="${esc(c.id)}">עריכה</button><button data-action="delete-code" data-id="${esc(c.id)}">מחיקה</button></div></article>`).join('');return;
 }
 const posts=data.posts.filter(p=>(!$('sourceFilter').value||p.source===$('sourceFilter').value)&&(!$('statusFilter').value||p.status===$('statusFilter').value)&&(!$('themeFilter').value||p.coding.some(c=>c.codeId===$('themeFilter').value))&&[p.couple,p.text,p.notes,...p.coding.map(c=>codeName(c.codeId)+' '+c.quote)].join(' ').toLocaleLowerCase().includes(query)).sort((a,b)=>b.date.localeCompare(a.date));
 $('results').textContent=`${posts.length} פוסטים מוצגים`;
 $('content').innerHTML=posts.length?posts.map(p=>`<article class="card"><div class="card-top"><span class="source">${esc(p.source)}</span><span class="badge ${p.status===statuses[0]?'pending':''}">${esc(p.status)}</span></div><div><h2>${esc(p.couple)}</h2><div class="meta">${esc(p.date.split('-').reverse().join('.'))} · ${p.visual?'כולל אמצעים ויזואליים':'ללא אמצעים ויזואליים'}</div></div><p class="excerpt">${esc(p.text.slice(0,240))}${p.text.length>240?'…':''}</p><div class="tags">${[...new Set(p.coding.map(c=>c.codeId))].map(id=>`<button class="tag" data-action="filter-code" data-id="${esc(id)}">${esc(codeName(id))}</button>`).join('')}</div>${p.coding.filter(c=>c.quote&&(!$('themeFilter').value||c.codeId===$('themeFilter').value)).slice(0,2).map(c=>`<blockquote><strong>${esc(codeName(c.codeId))}</strong><br>${esc(c.quote)}</blockquote>`).join('')}<div class="card-bottom"><button data-action="edit" data-id="${esc(p.id)}">פתיחה וקידוד ←</button>${safeUrl(p.url)?`<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener noreferrer">למקור ↗</a>`:''}</div></article>`).join(''):`<div class="empty"><div class="symbol">◈</div><h2>${data.posts.length?'לא נמצאו פוסטים מתאימים':'המחקר מתחיל בפוסט הראשון'}</h2><p>${data.posts.length?'אפשר לשנות את החיפוש או את המסננים.':'הוסיפו טקסט, סמנו ציטוטים והתחילו לבנות את הקורפוס שלכם.'}</p><button class="primary" data-action="new-post">＋ הוספת פוסט</button></div>`;
}
function fillCodes(){const old=$('codeSelect').value;$('codeSelect').innerHTML='<option value="">בחירת תמה…</option>'+data.codes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('codeSelect').value=old}
function showDraft(){$('codingList').innerHTML=draft.map((c,i)=>`<div class="coding-item"><strong>${esc(codeName(c.codeId))}</strong>${c.quote?`<blockquote>${esc(c.quote)}</blockquote>`:'<p class="hint">ללא ציטוט</p>'}<button type="button" data-remove="${i}">הסרת שיוך</button></div>`).join('')}
function openPost(id){if(cloudLocked){toast('הקורפוס בענן עדיין לא מחובר');return}const p=data.posts.find(p=>p.id===id);editing=p?.id||null;draft=p?structuredClone(p.coding):[];$('postForm').reset();for(const key of ['source','couple','date','url','text','notes','status'])if(p)$('postForm').elements[key].value=p[key];$('postForm').elements.visual.checked=p?.visual||false;$('editorTitle').textContent=p?'קריאה וקידוד פוסט':'הוספת פוסט';$('deletePost').hidden=!p;$('formError').textContent='';$('quoteInput').value='';fillCodes();showDraft();$('editor').showModal()}
function openCode(id){if(cloudLocked){toast('הקורפוס בענן עדיין לא מחובר');return}editingCode=id||null;$('codeForm').reset();const c=data.codes.find(c=>c.id===id);if(c){$('codeForm').elements.name.value=c.name;$('codeForm').elements.definition.value=c.definition}$('codeTitle').textContent=c?'עריכת תמה':'תמה חדשה';$('codeDialog').showModal()}
$('newPost').onclick=()=>openPost();$('closeEditor').onclick=()=>{if(confirm('לסגור את הפוסט? שינויים שלא נשמרו יאבדו.'))$('editor').close()};$('editor').addEventListener('cancel',e=>{e.preventDefault();$('closeEditor').click()});
$('allView').onclick=()=>{view='posts';render()};$('codesView').onclick=()=>{view='codes';render()};for(const id of ['search','sourceFilter','statusFilter','themeFilter'])$(id).addEventListener(id==='search'?'input':'change',render);
$('content').onclick=async e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id;switch(b.dataset.action){case 'edit':openPost(id);break;case 'new-post':openPost();break;case 'new-code':openCode();break;case 'edit-code':openCode(id);break;case 'filter-code':view='posts';$('search').value='';$('sourceFilter').value='';$('statusFilter').value='';$('themeFilter').value=id;render();break;case 'delete-code':if(data.posts.some(p=>p.coding.some(c=>c.codeId===id))){toast('התמה בשימוש. הסירו תחילה את שיוכיה מהפוסטים.');return}if(confirm('למחוק את התמה?'))await persist({...data,codes:data.codes.filter(c=>c.id!==id)});break}};
$('addCode').onclick=()=>openCode();$('cancelCode').onclick=()=>$('codeDialog').close();$('codeForm').onsubmit=async e=>{e.preventDefault();const name=e.target.elements.name.value.trim(),definition=e.target.elements.definition.value.trim();if(!name||!definition)return;if(data.codes.some(c=>c.id!==editingCode&&c.name===name)){toast('כבר קיימת תמה בשם זה');return}const code={id:editingCode||crypto.randomUUID(),name,definition};if(await persist({...data,codes:[...data.codes.filter(c=>c.id!==editingCode),code]})){fillCodes();$('codeSelect').value=code.id;showDraft();$('codeDialog').close()}};
$('selection').onclick=()=>{const t=$('postText');const q=t.value.slice(t.selectionStart,t.selectionEnd);if(!q){toast('סמנו תחילה קטע בתוכן הפוסט');return}$('quoteInput').value=q};
$('attach').onclick=()=>{const codeId=$('codeSelect').value,quote=$('quoteInput').value.trim();if(!codeId){toast('בחרו תמה לשיוך');return}if(quote&&!$('postText').value.includes(quote)){toast('הציטוט חייב להופיע בדיוק בטקסט המקורי');return}if(draft.some(c=>c.codeId===codeId&&c.quote===quote)){toast('השיוך הזה כבר קיים');return}draft.push({codeId,quote});$('quoteInput').value='';showDraft()};$('codingList').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){draft.splice(Number(b.dataset.remove),1);showDraft()}};
$('postForm').onsubmit=async e=>{e.preventDefault();const f=e.target.elements;const p={id:editing||crypto.randomUUID(),source:f.source.value,couple:f.couple.value.trim(),date:f.date.value,url:f.url.value.trim(),text:f.text.value,visual:f.visual.checked,notes:f.notes.value,status:f.status.value,coding:structuredClone(draft)};if(!p.couple||!p.text.trim()){$('formError').textContent='יש למלא שם זוג ותוכן פוסט.';return}if(p.url&&!safeUrl(p.url)){$('formError').textContent='יש להזין קישור HTTP או HTTPS תקין.';return}if(draft.some(c=>c.quote&&!p.text.includes(c.quote))){$('formError').textContent='חלק מהציטוטים אינם מופיעים בטקסט. תקנו את השיוכים לפני השמירה.';return}if(await persist({...data,posts:[...data.posts.filter(x=>x.id!==editing),p]})){$('editor').close();toast('הפוסט נשמר')}};
$('deletePost').onclick=async()=>{if(confirm('למחוק את הפוסט ואת כל הקידודים שלו?'))if(await persist({...data,posts:data.posts.filter(p=>p.id!==editing)}))$('editor').close()};
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('backup').onclick=()=>download(JSON.stringify(data,null,2),'application/json',`thema-backup-${new Date().toISOString().slice(0,10)}.json`);
$('restore').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!valid(parsed))throw Error();if(confirm(`הגיבוי מכיל ${parsed.posts.length} פוסטים ו־${parsed.codes.length} תמות. הטעינה תחליף את כל המידע הנוכחי. להמשיך?`)){if(await persist(parsed))toast('הגיבוי נטען בהצלחה')}}catch{alert('קובץ הגיבוי אינו תקין או אינו בפורמט תמה. המידע הקיים נשמר.')}e.target.value=''};
$('csv').onclick=()=>{const rows=[['מזהה פוסט','מקור','שם הזוג','תאריך','קישור','תוכן','אמצעים ויזואליים','מצב','תמה','ציטוט','הערות']];for(const p of data.posts)for(const c of p.coding.length?p.coding:[{codeId:'',quote:''}])rows.push([p.id,p.source,p.couple,p.date,p.url,p.text,p.visual?1:0,p.status,codeName(c.codeId),c.quote,p.notes]);const cell=x=>'"'+String(x??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';download('\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8','thema-corpus.csv')};
render();

const localAtStartup=structuredClone(data);
async function startCloud(){
 const configured=Boolean(window.THEMA_FIREBASE_CONFIG?.projectId);
 if(!configured)return;
 cloudLocked=true;$('cloudPanel').hidden=false;$('syncStatus').textContent='מתחבר…';
 $('cloudMessage').textContent='מתחבר לקורפוס בענן…';
 $('retryCloud').hidden=true;$('uploadLocal').hidden=true;
 data={version:1,posts:[],codes:[]};render();
 const token=location.hash.slice(1);
 if(!/^[a-f0-9]{64}$/.test(token)){
  $('cloudMessage').textContent='לפתיחת קורפוס קיים השתמשו בקישור הסודי המלא. ליצירת קורפוס חדש לחצו כאן.';
  $('syncStatus').textContent='ממתין לקישור גישה';$('createWorkspace').hidden=false;return;
 }
 $('createWorkspace').hidden=true;
 try{
  cloud=await window.connectThemaCloud(token,valid);
  data=await cloud.load();render();cloudLocked=false;
  $('syncStatus').textContent='מחובר לענן';
  $('cloudMessage').textContent='הגישה לקורפוס היא באמצעות הקישור הסודי. שמרו אותו במקום פרטי. יש לרענן כדי לקבל שינויים ממכשיר אחר.';
  $('copyLink').hidden=false;
  $('uploadLocal').hidden=!(localAtStartup.posts.length||localAtStartup.codes.length);
 }catch(error){$('syncStatus').textContent='אין חיבור לענן';$('cloudMessage').textContent='החיבור נכשל. בדקו את הגדרות Firebase, החיבור לרשת וכללי הגישה. '+error.message;$('retryCloud').hidden=false;}
}
$('createWorkspace').onclick=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));location.hash=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
$('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('קישור הגישה הועתק')}catch{prompt('העתיקו את הקישור ושמרו אותו באופן פרטי:',location.href)}};
$('retryCloud').onclick=()=>{if($('editor').open||$('codeDialog').open){alert('סגרו את הטפסים לאחר שמירת עותק של השינויים לפני חיבור מחדש.');return}startCloud()};
$('uploadLocal').onclick=async()=>{if(confirm('להחליף את הקורפוס בענן בנתונים המקומיים? הורידו גיבוי קודם.'))if(await persist(structuredClone(localAtStartup))){$('uploadLocal').hidden=true;toast('הקורפוס המקומי הועבר לענן')}};
window.addEventListener('hashchange',()=>location.reload());
startCloud();
