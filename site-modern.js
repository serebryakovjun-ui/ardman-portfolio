'use strict';
// Keep the map/catalog switch next to the portfolio, below the introduction.
const geographySection=document.getElementById('geography');
document.getElementById('featured').before(controls);
const setModeBeforeDesign=setMode;
setMode=function(next){setModeBeforeDesign(next);if(mode==='catalog')catalog.before(controls);else document.getElementById('featured').before(controls);};
const editorialProjects=[
  {id:'manual-20260922-122235-j4ob',title:'Двор, в котором хочется играть',place:'Нижний Новгород'},
  {id:'workshop-base-4',title:'Спортивные площадки в ЖК «Зенит»',place:'Нижний Новгород'},
  {id:'workshop-base-5',title:'Беговая дорожка стадиона «Олимп»',place:'Лебяжье, Кировская область'}
];
let featuredReady=false;
function renderFeaturedProjects(){
  if(featuredReady||!objects.length)return;
  featuredReady=true;
  const grid=document.getElementById('featured-grid');grid.replaceChildren();
  for(const entry of editorialProjects){
    const project=objects.find(o=>o.id===entry.id||o.aliases?.includes(entry.id));
    if(!project)continue;
    const photo=photos(project)[0],card=document.createElement('button');
    card.className='featured-card';card.type='button';
    card.setAttribute('aria-label','Открыть проект: '+entry.title);
    card.innerHTML='<div class="featured-image">'+(photo?photoMarkup(project,photo,0):'<div class="photo-empty">Фото пока нет</div>')+'<span class="featured-arrow" aria-hidden="true">↗</span></div><div class="featured-meta"><span>'+escapeHTML(entry.place)+'</span><span>'+escapeHTML(project.completedAt?.slice(0,4)||'Без даты')+'</span></div><h3>'+escapeHTML(entry.title)+'</h3><p class="featured-coating">'+escapeHTML(project.coating||'Покрытие уточняется')+'</p>';
    card.onclick=()=>showDetail(project);grid.append(card);
  }
  document.getElementById('featured').hidden=mode==='catalog'||!grid.childElementCount;
}
const setupCatalogBeforeDesign=setupCatalog;
setupCatalog=function(){setupCatalogBeforeDesign();renderFeaturedProjects();};
function navigatePortfolio(sectionId,catalogMode=false){
  if(document.getElementById('detail').open)document.getElementById('detail').close();
  setMode(catalogMode?'catalog':'map');
  history.replaceState(null,'',location.pathname+location.search+'#'+sectionId);
  route();
  requestAnimationFrame(()=>document.getElementById(sectionId)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
}
document.querySelectorAll('[data-home-section]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigatePortfolio(link.dataset.homeSection);}));
document.querySelectorAll('[data-open-catalog]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigatePortfolio('catalog',true);}));
// Section links should remain reliable even after previously visiting the catalog.
if(['#home','#featured','#geography','#about','#contacts'].includes(location.hash))mode='map';
if(location.hash==='#catalog')mode='catalog';

// Mobile geography keeps a single panel visible, without losing search or selection.
document.querySelectorAll('.geography-toggle button').forEach(button=>{
  button.addEventListener('click',()=>{
    document.getElementById('workspace').dataset.geographyView=button.dataset.geographyView;
    document.querySelectorAll('.geography-toggle button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  });
});

document.getElementById('region-search').addEventListener('input',()=>{
  if(matchMedia('(max-width:900px)').matches&&document.getElementById('region-search').value.trim())document.querySelector('.geography-toggle [data-geography-view="list"]').click();
});
new MutationObserver(()=>{document.getElementById('headline-regions').textContent=document.getElementById('company-regions').textContent;}).observe(document.getElementById('company-regions'),{childList:true});

// Keep region discovery on the map; project navigation stays in the existing preview.
document.getElementById('regions').addEventListener('click',event=>{
 const button=event.target.closest('.region-btn');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 document.querySelector('.geography-toggle [data-geography-view="map"]').click();
 requestAnimationFrame(()=>{window.focusMapRegion?.(button.dataset.regionId);if(matchMedia('(max-width:900px)').matches)document.getElementById('workspace').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
},true);
document.getElementById('region-search').addEventListener('keydown',event=>{
 if(event.key!=='Enter')return;
 const matches=[...document.querySelectorAll('#regions .region-btn')].filter(b=>!b.hidden&&getComputedStyle(b).display!=='none');
 if(matches.length===1){event.preventDefault();matches[0].click();}
});
