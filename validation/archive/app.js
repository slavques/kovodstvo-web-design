const records = [
  {id:1,title:'Лес после дождя',place:'Карелия',type:'лес',duration:'04:18',art:'forest'},
  {id:2,title:'Ночной причал',place:'Владивосток',type:'вода',duration:'03:42',art:'pier'},
  {id:3,title:'Ветер на перевале',place:'Алтай',type:'горы',duration:'06:05',art:'mountain'},
  {id:4,title:'Трамвайное кольцо',place:'Екатеринбург',type:'город',duration:'02:51',art:'tram'},
  {id:5,title:'Двор в полдень',place:'Тбилиси',type:'город',duration:'05:20',art:'yard'},
  {id:6,title:'Камыши',place:'Астрахань',type:'вода',duration:'07:10',art:'reeds'}
];
// Original vector field vignettes. These are illustrations, not audio waveforms.
const art = {
  forest:'<rect width="200" height="150" fill="#c6d1b1"/><path d="M0 127 200 106v44H0" fill="#8aab83"/><g stroke="#315c43" stroke-width="3" fill="#315c43"><path d="M24 121V17m0 5L7 69h34Zm43 96V36m0 5L49 87h35Zm49 36V7m0 11L93 83h45Zm48 34V28m0 5-20 62h42Z"/></g><g stroke="#e9eddb" stroke-width="2"><path d="m15 15-4 12m43-13-4 12m43-13-4 12m43-13-4 12m43-13-4 12M42 100l-4 12m54-4-4 12m56-18-4 12"/></g>',
  pier:'<rect width="200" height="150" fill="#194e48"/><circle cx="146" cy="30" r="12" fill="#dad8ab"/><path d="M0 93h200M0 105h200M0 117h200M0 129h200M0 141h200" stroke="#668e79" fill="none"/><path d="M0 78h107v8H0M28 83v43m63-43v37" stroke="#b0bd93" stroke-width="5"/><path d="M158 53v30m-10-15h20m-17 24h14m-18 12h22m-24 12h27" stroke="#b0bd93" stroke-width="2"/>',
  mountain:'<rect width="200" height="150" fill="#b9cab8"/><path d="M-20 150 68 23l31 45 28-51 98 133" fill="#476d59"/><path d="m40 65 28-42 31 45-17-9-10 8-9-14Z" fill="#e8ecdb"/><path d="m105 52 22-35 32 45-22-13-8 7-9-15Z" fill="#e8ecdb"/><path d="M0 107c55-12 82 18 132 0s55-5 85-5M-4 123c55-12 82 18 132 0s55-5 85-5" fill="none" stroke="#9bb89c" stroke-width="2"/>',
  tram:'<rect width="200" height="150" fill="#d4cfb1"/><g fill="none" stroke="#567764" stroke-width="2"><path d="M-8 141c131 0 179-28 179-70s-73-51-73-2 41 48 97 48M-8 131c121 0 169-24 169-60S108 29 108 69s31 38 87 38M0 20h200M38 0v150m95-150v150"/></g><path d="M72 59h51v39H72Z" fill="#ac4129"/><path d="M77 65h17v15H77Zm22 0h18v15H99Z" fill="#e9eddb"/><path d="M82 98v8m31-8v8M98 59V40l16-10" stroke="#254c40" stroke-width="3"/>',
  yard:'<rect width="200" height="150" fill="#d3b98a"/><path d="M0 0h58v150H0M142 0h58v150h-58" fill="#a45d3b"/><path d="M16 18h21v28H16Zm0 51h21v28H16Zm146-51h21v28h-21Zm0 51h21v28h-21Z" fill="#365d44"/><path d="M0 124 200 99v51H0" fill="#c4c39b"/><path d="M42 45q60 31 120 0" stroke="#365d44" fill="none" stroke-width="2"/><path d="m72 56 15 3-2 24-16-3m28-19h16v22H97m25-25 14-3 5 23-15 3" fill="#e9eddb"/><circle cx="100" cy="28" r="13" fill="#e8d85d"/>',
  reeds:'<rect width="200" height="150" fill="#b0c4ae"/><path d="M0 95h200v55H0" fill="#648f7e"/><g stroke="#e2dfba" stroke-width="1.3" fill="none"><path d="M0 110h200M0 126h200M0 142h200"/></g><g stroke="#365e3c" stroke-width="3" fill="none"><path d="M31 150 24 25m33 125L63 15m31 135L86 40m37 110 9-121m31 121-7-102M30 128 9 88m48 28 18-47m19 65 13-45m16 34-18-58m60 65 18-50"/></g><g stroke="#6b522e" stroke-width="7" stroke-linecap="round"><path d="m24 25-1-14m40 4 1-10m22 35-1-18m47 7 1-15m23 34-1-15"/></g>'
};
function drawing(key){return `<svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${art[key]}</svg>`;}
const list=document.querySelector('#record-list');
const search=document.querySelector('#search');
const counter=document.querySelector('#results-count');
const empty=document.querySelector('#empty');
const dialog=document.querySelector('#details');
const clearSearch=document.querySelector('#clear-search');
let selected='all';
let opener=null;
const normalize=value=>value.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
function countLabel(n){return n===1?'1 запись':n>1&&n<5?`${n} записи`:`${n} записей`;}
function render(){
  const words=normalize(search.value).split(/\s+/).filter(Boolean);
  const found=records.filter(record=>(selected==='all'||selected===record.type)&&words.every(word=>normalize(`${record.title} ${record.place} ${record.type}`).includes(word)));
  list.innerHTML=found.map(record=>`<article class="record"><span class="record-number">${String(record.id).padStart(2,'0')}</span><div class="record-art" aria-hidden="true">${drawing(record.art)}</div><h3 class="record-title"><button type="button" data-record="${record.id}" aria-label="Сведения о записи «${record.title}»">${record.title}</button></h3><span class="record-place" data-type="${record.type}">${record.place}</span><span class="record-type"><i class="type-mark" aria-hidden="true"></i>${record.type}</span><span class="record-duration" aria-label="Длительность ${record.duration}">${record.duration}</span><span class="record-arrow" aria-hidden="true">↗</span></article>`).join('');
  counter.textContent=countLabel(found.length)+(selected==='all'?'':` · ${selected}`);
  empty.hidden=found.length>0;
  clearSearch.hidden=search.value.length===0;
}
search.addEventListener('input',render);
clearSearch.addEventListener('click',()=>{search.value='';render();search.focus();});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  selected=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
  render();
}));
document.querySelector('#reset').addEventListener('click',()=>{search.value='';document.querySelector('[data-filter="all"]').click();search.focus();});
list.addEventListener('click',event=>{
  const button=event.target.closest('[data-record]');if(!button)return;
  const record=records.find(item=>item.id===Number(button.dataset.record));
  opener=button;
  document.querySelector('#detail-title').textContent=record.title;
  document.querySelector('#detail-number').textContent=`ЗАПИСЬ / ${String(record.id).padStart(2,'0')}`;
  document.querySelector('#detail-art').innerHTML=drawing(record.art);
  document.querySelector('#detail-fields').innerHTML=`<div><dt>Место</dt><dd>${record.place}</dd></div><div><dt>Среда</dt><dd>${record.type}</dd></div><div><dt>Длительность</dt><dd>${record.duration}</dd></div>`;
  dialog.showModal();
  document.body.style.overflow='hidden';
});
const close=()=>dialog.close();
document.querySelector('#close-details').addEventListener('click',close);
document.querySelector('#return').addEventListener('click',close);
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}});
dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus();});
render();
