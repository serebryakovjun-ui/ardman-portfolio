'use strict';
const cleanTitle=o=>o.title.split('#')[0].replace(/Более подробную информацию[\s\S]*/i,'').replace(/^Закончены работы по /i,'').replace(/^Закончен монтаж/i,'Монтаж').trim();
const dateText=o=>(o.dateBasis==='publication_year'?'Опубликовано: ':'Год работ: ')+(o.completedAt?dateLabel(o.completedAt):'уточняется');
const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е');
const coatGroup=o=>{const c=normalize(o.coating);if(c.includes('epufloor'))return 'EPUFLOOR';if(c.includes('crumb'))return 'CRUMB';if(c.includes('gumbit'))return 'GUMBIT';if(c.includes('линолеум')||c.includes('grabo'))return 'Спортивный линолеум';return c&&!c.includes('уточ')&&!c.includes('не указан')?'Другие покрытия':'Не указан';};
let filters={q:'',region:'',year:'',coating:''},shown=24,mode='map',catalogReady=false,returnHash='',returnScroll=0,detailObject=null,closingRoute=false;
try{Object.assign(filters,JSON.parse(sessionStorage.getItem('ardman-filters')||'{}'));mode=sessionStorage.getItem('ardman-mode')||'map';}catch{}
const controls=document.createElement('nav');controls.className='portfolio-switch';controls.setAttribute('aria-label','Вид портфолио');controls.innerHTML='<button id="view-map">Карта</button><button id="view-catalog">Каталог объектов</button>';
$('home').prepend(controls);
const catalog=document.createElement('section');catalog.id='catalog';catalog.hidden=true;catalog.innerHTML='<div class="catalog-heading"><h2>Наши работы</h2><p>Найдите площадку по городу, названию или покрытию</p></div><div class="catalog-filters"><label>Поиск<input id="cat-q" type="search" placeholder="Например: школа, Саранск"></label><label>Регион<select id="cat-region"></select></label><label>Год<select id="cat-year"></select></label><label>Покрытие<select id="cat-coating"></select></label><button id="cat-reset">Сбросить</button></div><p class="catalog-note">Годы архивных публикаций отмечены отдельно от годов выполнения работ.</p><p id="cat-count" role="status" aria-live="polite"></p><div id="cat-grid"></div><button id="cat-more">Показать ещё</button>';
controls.after(catalog);
function setMode(next){mode=next==='catalog'?'catalog':'map';try{sessionStorage.setItem('ardman-mode',mode);}catch{}catalog.hidden=mode!=='catalog';[...$('home').children].forEach(e=>{if(e!==catalog&&e!==controls)e.hidden=mode==='catalog';});$('view-map').setAttribute('aria-pressed',mode==='map');$('view-catalog').setAttribute('aria-pressed',mode==='catalog');if(catalogReady&&mode==='catalog')renderCatalog();}
$('view-map').onclick=()=>setMode('map');$('view-catalog').onclick=()=>setMode('catalog');
function matchesObject(o){const hay=normalize([o.title,o.city,o.region,o.description,o.coating].join(' '));return normalize(filters.q).split(/\s+/).filter(Boolean).every(w=>hay.includes(w))&&(!filters.region||o.region===filters.region)&&(!filters.year||(o.completedAt?.slice(0,4)||'unknown')===filters.year)&&(!filters.coating||coatGroup(o)===filters.coating);}
function renderCatalog(){const list=objects.filter(matchesObject).sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||''));$('cat-count').textContent=`Найдено: ${list.length}`;$('cat-grid').replaceChildren();for(const o of list.slice(0,shown)){const b=document.createElement('button');b.className='card';const u=photos(o)[0];b.innerHTML=(u?photoMarkup(o,u,0):'<div class="photo-empty">Нет фотографии</div>')+`<div class="card-text"><h2>${escapeHTML(cleanTitle(o))}</h2><p>${escapeHTML(o.region)}</p><p>${escapeHTML(dateText(o))}</p><p>${escapeHTML(o.coating||'Покрытие уточняется')}</p></div>`;b.onclick=()=>showDetail(o);$('cat-grid').append(b);}if(!list.length)$('cat-grid').innerHTML='<p class="empty">Ничего не найдено. Попробуйте изменить запрос или сбросить фильтры.</p>';$('cat-more').hidden=list.length<=shown;}
function setupCatalog(){if(catalogReady)return;catalogReady=true;const options=(id,values,all)=>{const select=$(id);select.replaceChildren(new Option(all,''));values.forEach(v=>select.add(new Option(v==='unknown'?'Год не указан':v,v)));};options('cat-region',[...new Set(objects.map(o=>o.region))].sort((a,b)=>a.localeCompare(b,'ru')),'Все регионы');options('cat-year',[...new Set(objects.map(o=>o.completedAt?.slice(0,4)||'unknown'))].sort().reverse(),'Все годы');options('cat-coating',[...new Set(objects.map(coatGroup))].sort(),'Все покрытия');for(const key of ['q','region','year','coating']){const el=$('cat-'+key);el.value=filters[key];el.addEventListener(key==='q'?'input':'change',()=>{filters[key]=el.value;shown=24;try{sessionStorage.setItem('ardman-filters',JSON.stringify(filters));}catch{}renderCatalog();});}$('cat-reset').onclick=()=>{for(const key of Object.keys(filters)){filters[key]='';$('cat-'+key).value='';}shown=24;try{sessionStorage.removeItem('ardman-filters');}catch{}renderCatalog();};$('cat-more').onclick=()=>{shown+=24;renderCatalog();};setMode(mode);}
const originalRoute=route;window.removeEventListener('hashchange',originalRoute);
route=function(){if(!objects.length)return;setupCatalog();if(location.hash.startsWith('#object/')){let id;try{id=decodeURIComponent(location.hash.slice(8));}catch{id='';}const o=objects.find(o=>o.id===id||o.aliases?.includes(id));if(o){returnHash='';returnScroll=0;openDetailContent(o);return;}originalRoute();setMode('catalog');$('cat-count').textContent='Объект по этой ссылке не найден. Выберите работу в каталоге.';return;}closingRoute=true;originalRoute();closingRoute=false;setMode(mode);};
window.addEventListener('hashchange',route);
const baseRenderObjects=renderObjects;
renderObjects=function(r,y){baseRenderObjects(r,y);const list=inRegion(r).filter(o=>objectYear(o)===y);$('objects').querySelectorAll('.card').forEach((card,i)=>{const o=list[i];card.querySelector('h2').textContent=cleanTitle(o);card.querySelector('p').textContent=dateText(o);});};
const baseRenderYears=renderYears;
renderYears=function(r){baseRenderYears(r);const n=inRegion(r).filter(o=>!o.completedAt).length;if(n){const b=document.createElement('button');b.className='year-card';b.innerHTML=`<strong>Без даты</strong><span>${n} ${objectWord(n)}</span>`;b.onclick=()=>{filters.region=r.name;filters.year='unknown';$('cat-region').value=r.name;$('cat-year').value='unknown';shown=24;mode='catalog';location.hash='';};$('years').append(b);}};
const detailBeforeLinks=showDetail;
function openDetailContent(o){detailObject=o;detailBeforeLinks(o);const h=$('detail-body').querySelector('h2');if(h)h.textContent=cleanTitle(o);const dt=$('detail-body').querySelector('.detail-meta dt');if(dt)dt.textContent=o.dateBasis==='publication_year'?'Год публикации':'Год работ';const share=document.createElement('button');share.className='share-object';share.textContent='Поделиться объектом';share.onclick=async()=>{const url=new URL(location.href);url.hash='object/'+encodeURIComponent(o.id);try{if(navigator.share)await navigator.share({title:cleanTitle(o),url:url.href});else{await navigator.clipboard.writeText(url.href);share.textContent='Ссылка скопирована';}}catch(e){if(e.name==='AbortError')return;const input=document.createElement('input');input.readOnly=true;input.value=url.href;share.after(input);input.select();}};$('detail-body').querySelector('.detail-heading').append(share);}
showDetail=function(o){returnHash=location.hash;returnScroll=window.scrollY;history.replaceState(null,'','#object/'+encodeURIComponent(o.id));openDetailContent(o);};
$('detail').addEventListener('close',()=>{if(closingRoute)return;if(location.hash.startsWith('#object/')){history.replaceState(null,'',location.pathname+location.search+returnHash);route();requestAnimationFrame(()=>window.scrollTo({top:returnScroll,behavior:'instant'}));}});
// A region preview opens on map selection without leaving the map.
const regionPanel=document.createElement('section');
regionPanel.className='selected-region';regionPanel.hidden=true;
regionPanel.setAttribute('aria-label','Выбранный регион');
regionPanel.innerHTML='<div class="region-preview-photo"></div><div class="region-preview-copy"><span class="region-preview-kicker">ВЫБРАННЫЙ РЕГИОН</span><strong></strong><p role="status" aria-live="polite"></p><span class="region-preview-project"></span></div><div class="region-preview-actions"><button>Смотреть проекты →</button></div>';
$('map-scroll').parentElement.append(regionPanel);
const baseSetupMotion=setupMapMotion;
setupMapMotion=function(){
  baseSetupMotion();let active=null;
  const observer=new MutationObserver(()=>{
    const selected=$('map').querySelector('.is-selected'),r=selected?._region;
    if(!r){active=null;regionPanel.hidden=true;return;}
    if(active===r.id)return;active=r.id;
    const list=inRegion(r),project=[...list].sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||'')).find(o=>photos(o).length);
    regionPanel.hidden=false;regionPanel.querySelector('strong').textContent=r.name;
    regionPanel.querySelector('p').textContent=list.length?list.length+' '+objectWord(list.length)+' в портфолио':'Объекты пока не добавлены';
    const photo=regionPanel.querySelector('.region-preview-photo');
    photo.innerHTML=project?photoMarkup(project,photos(project)[0],0):'<span>Фото пока нет</span>';
    photo.querySelector('img')?.addEventListener('error',()=>{photo.textContent='Фото недоступно';},{once:true});
    regionPanel.querySelector('.region-preview-project').textContent=project?cleanTitle(project):'Выберите другой регион, чтобы посмотреть наши работы.';
    const action=regionPanel.querySelector('button');action.hidden=!list.length;action.onclick=()=>openRegion(r);
  });
  observer.observe($('map'),{subtree:true,attributes:true,attributeFilter:['class']});
};
