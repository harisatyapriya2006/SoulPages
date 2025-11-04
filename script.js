// 🌸 SoulPages – Pastel Diary Full JavaScript
'use strict';

/* ===== Utility Functions ===== */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

/* ===== Wallpapers (10 pastel paper images) ===== */
const wallpapers = [
  'wallpapers/paper1.jpg', 'wallpapers/paper2.jpg', 'wallpapers/paper3.jpg',
  'wallpapers/paper4.jpg', 'wallpapers/paper5.jpg', 'wallpapers/paper6.jpg',
  'wallpapers/paper7.jpg', 'wallpapers/paper8.jpg', 'wallpapers/paper9.jpg',
  'wallpapers/paper10.jpg'
];

function setWallpaperByDate(dateStr){
  const d = new Date(dateStr);
  const index = (d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate()) % wallpapers.length;
  document.body.style.backgroundImage = `url('${wallpapers[index]}')`;
}

/* ===== Local Storage & Password ===== */
const STORE_KEY = 'soulpages_data_v3';
const PASS_KEY = 'soulpages_pass_v3';

const settings = {
  get data(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch{ return {}; } },
  set data(obj){ localStorage.setItem(STORE_KEY, JSON.stringify(obj)); },
  async setPass(p){ const h = await sha256Hex(p); localStorage.setItem(PASS_KEY,h); },
  async checkPass(p){ const s=localStorage.getItem(PASS_KEY); if(!s) return false; const h=await sha256Hex(p); return s===h; },
  hasPass(){ return !!localStorage.getItem(PASS_KEY); },
  reset(){ localStorage.clear(); }
};

async function sha256Hex(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ===== Diary Data ===== */
function getEntry(dateStr){
  const db = settings.data;
  return db[dateStr] || { text:'', imgs:[], audios:[], createdAt: Date.now() };
}
function saveEntry(dateStr, entry){
  const db = settings.data;
  db[dateStr] = entry;
  settings.data = db;
}
function deleteEntry(dateStr){
  const db = settings.data;
  delete db[dateStr];
  settings.data = db;
}
function listDates(){
  const db = settings.data;
  return Object.keys(db).sort((a,b)=> a<b ? 1 : -1);
}

/* ===== DOM Elements ===== */
const datePicker = $('#datePicker');
const editor = $('#editor');
const attachments = $('#attachments');
const btnSave = $('#btnSave');
const btnDelete = $('#btnDelete');
const btnToday = $('#btnToday');
const btnExport = $('#btnExport');
const importFile = $('#importFile');
const btnLock = $('#btnLock');
const quoteText = $('#quoteText');
const quoteAuthor = $('#quoteAuthor');
const timeline = $('#timeline');
const autosaveMsg = $('#autosaveMsg');
const imgInput = $('#imgInput');
const recBtn = $('#recBtn');

let currentDate = todayStr();
let autoSaveTimer = null;
let recorder = null;
let chunks = [];

/* ===== Daily Quotes ===== */
const QUOTES = [
  ["Be gentle with yourself; you’re doing the best you can.","Unknown"],
  ["Let today be the start of something soft and brave.","Unknown"],
  ["In the silence, your heart knows the words.","Unknown"],
  ["Small steps still move you forward.","Unknown"],
  ["You are a whole sky of feelings. Write them.","Unknown"],
  ["Healing is not a line; it’s a garden.","Unknown"],
  ["The act of writing is the act of discovering.","Flannery O’Connor"],
  ["No feeling is final.","Rainer Maria Rilke"],
  ["What is not expressed gets heavier.","Unknown"],
  ["Your story matters—especially to you.","Unknown"]
];
function quoteForDate(dateStr){
  const idx = dateStr.split('-').reduce((a,b)=>a+parseInt(b),0) % QUOTES.length;
  return QUOTES[idx];
}

/* ===== Rendering Functions ===== */
function renderEntry(dateStr){
  currentDate = dateStr;
  const ent = getEntry(dateStr);
  editor.value = ent.text || '';
  renderAttachments(ent);
  setWallpaperByDate(dateStr);
  const [q, a] = quoteForDate(dateStr);
  quoteText.textContent = q;
  quoteAuthor.textContent = a ? `— ${a}` : '';
  autosaveMsg.textContent = 'Auto-saved.';
  datePicker.value = dateStr;
  renderTimeline();
}

function renderTimeline(){
  const dates = listDates();
  timeline.innerHTML = '';
  if(!dates.length){
    timeline.innerHTML = '<p class="help">No entries yet. Start writing your first story today 💕</p>';
    return;
  }
  dates.forEach(dt=>{
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = dt;
    chip.onclick = () => renderEntry(dt);
    timeline.appendChild(chip);
  });
}

function renderAttachments(ent){
  attachments.innerHTML = '';
  (ent.imgs||[]).forEach((src, i)=>{
    const t = document.createElement('div'); t.className='thumb';
    const img = document.createElement('img'); img.src = src;
    const x = document.createElement('button'); x.className='x'; x.textContent='×';
    x.onclick = ()=>{
      const e = getEntry(currentDate);
      e.imgs.splice(i,1); saveEntry(currentDate, e); renderAttachments(e);
    };
    t.appendChild(img); t.appendChild(x); attachments.appendChild(t);
  });
  (ent.audios||[]).forEach((src, i)=>{
    const t = document.createElement('div'); t.className='thumb';
    const aud = document.createElement('audio'); aud.src = src; aud.controls = true;
    const x = document.createElement('button'); x.className='x'; x.textContent='×';
    x.onclick = ()=>{
      const e = getEntry(currentDate);
      e.audios.splice(i,1); saveEntry(currentDate, e); renderAttachments(e);
    };
    t.appendChild(aud); t.appendChild(x); attachments.appendChild(t);
  });
}

/* ===== Auto-Save ===== */
editor.addEventListener('input', ()=>{
  clearTimeout(autoSaveTimer);
  autosaveMsg.textContent = 'Typing…';
  autoSaveTimer = setTimeout(()=>{
    const e = getEntry(currentDate);
    e.text = editor.value;
    saveEntry(currentDate, e);
    autosaveMsg.textContent = 'Auto-saved.';
  }, 500);
});

/* ===== Buttons ===== */
datePicker.addEventListener('change', ()=> renderEntry(datePicker.value || todayStr()));
btnToday.addEventListener('click', ()=> renderEntry(todayStr()));
btnSave.addEventListener('click', ()=>{
  const e = getEntry(currentDate);
  e.text = editor.value;
  saveEntry(currentDate, e);
  autosaveMsg.textContent = 'Saved.';
  renderTimeline();
});
btnDelete.addEventListener('click', ()=>{
  if(confirm(`Delete entry for ${currentDate}?`)){
    deleteEntry(currentDate);
    renderEntry(todayStr());
  }
});

/* ===== Image Upload ===== */
imgInput.addEventListener('change', async (ev)=>{
  const files = [...ev.target.files].slice(0, 8);
  for(const f of files){
    if(!f.type.startsWith('image/')) continue;
    const b64 = await fileToDataURL(f);
    const e = getEntry(currentDate);
    e.imgs = e.imgs || [];
    e.imgs.push(b64);
    saveEntry(currentDate, e);
  }
  imgInput.value = '';
  renderAttachments(getEntry(currentDate));
});
function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* ===== Voice Recording ===== */
recBtn.addEventListener('click', async ()=>{
  if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined'){
    alert('Voice recording not supported in this browser.');
    return;
  }
  if(recorder && recorder.state === 'recording'){
    recorder.stop();
    recBtn.textContent = '🎙️ Voice';
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recorder = new MediaRecorder(stream);
    chunks = [];
    recorder.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };
    recorder.onstop = async ()=>{
      const blob = new Blob(chunks, {type:'audio/webm'});
      const dataUrl = await blobToDataURL(blob);
      const e = getEntry(currentDate);
      e.audios = e.audios || [];
      e.audios.push(dataUrl);
      saveEntry(currentDate, e);
      renderAttachments(e);
      stream.getTracks().forEach(t=>t.stop());
    };
    recorder.start();
    recBtn.textContent = '■ Stop';
  }catch(err){
    console.error(err);
    alert('Could not start recording.');
  }
});
function blobToDataURL(blob){
  return new Promise((res)=>{
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.readAsDataURL(blob);
  });
}

/* ===== Export / Import ===== */
btnExport.addEventListener('click', ()=>{
  const data = settings.data;
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `soulpages-${Date.now()}.json`;
  a.click();
});

importFile.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  try{
    const obj = JSON.parse(text);
    if(typeof obj === 'object'){
      const merged = {...settings.data, ...obj};
      settings.data = merged;
      alert('Import complete.');
      renderTimeline();
      renderEntry(currentDate);
    } else alert('Invalid file format.');
  }catch{ alert('Could not parse JSON.'); }
  importFile.value = '';
});

/* ===== Lock / Unlock ===== */
btnLock.addEventListener('click', ()=>{
  $('#app').classList.add('hidden');
  $('#lockScreens').classList.remove('hidden');
  $('#enterLock').classList.toggle('hidden', !settings.hasPass());
  $('#setupLock').classList.toggle('hidden', settings.hasPass());
});

const savePassBtn = $('#savePass');
const newPass = $('#newPass');
const newPass2 = $('#newPass2');
const unlockBtn = $('#unlock');
const enterPass = $('#enterPass');
const resetAll = $('#resetAll');

savePassBtn.addEventListener('click', async ()=>{
  const p1 = (newPass.value || '').trim();
  const p2 = (newPass2.value || '').trim();
  if(p1.length < 4 || p1.length>8) return alert('Passcode must be 4–8 digits.');
  if(p1 !== p2) return alert('Passcodes do not match.');
  await settings.setPass(p1);
  newPass.value = newPass2.value = '';
  openApp();
});

unlockBtn.addEventListener('click', async ()=>{
  const ok = await settings.checkPass((enterPass.value || '').trim());
  if(!ok) return alert('Incorrect passcode.');
  enterPass.value = '';
  openApp();
});

resetAll.addEventListener('click', ()=>{
  if(confirm('Reset will clear ALL entries and passcode. Continue?')){
    settings.reset();
    location.reload();
  }
});

/* ===== App Launch ===== */
function openApp(){
  $('#lockScreens').classList.add('hidden');
  $('#app').classList.remove('hidden');
  const ts = todayStr();
  datePicker.value = ts;
  renderEntry(ts);
}

/* ===== Init ===== */
(function init(){
  if(settings.hasPass()){
    $('#setupLock').classList.add('hidden');
    $('#enterLock').classList.remove('hidden');
  } else {
    $('#setupLock').classList.remove('hidden');
    $('#enterLock').classList.add('hidden');
  }
})();
