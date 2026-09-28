'use strict';
const filterBox=document.querySelector('.catalog-filters'),filterToggle=document.createElement('button');filterToggle.className='filter-toggle';filterToggle.textContent='Фильтры';filterToggle.setAttribute('aria-controls','catalog-filter-controls');filterBox.id='catalog-filter-controls';filterBox.before(filterToggle);
const mobileQuery=matchMedia('(max-width:600px)');
function syncFilterPanel(){const collapsed=mobileQuery.matches&&filterToggle.getAttribute('aria-expanded')!=='true';filterBox.hidden=collapsed;filterToggle.hidden=!mobileQuery.matches;}
filterToggle.setAttribute('aria-expanded','false');filterToggle.onclick=()=>{filterToggle.setAttribute('aria-expanded',filterToggle.getAttribute('aria-expanded')!=='true');syncFilterPanel();};mobileQuery.addEventListener('change',syncFilterPanel);syncFilterPanel();
const photoSurface=photoDialog.querySelector('.photo-surface');let swipeStart=null;
photoSurface.addEventListener('touchstart',e=>{swipeStart=e.touches.length===1&&!photoSurface.classList.contains('enlarged')?{x:e.touches[0].clientX,y:e.touches[0].clientY,time:performance.now()}:null;},{passive:true});
photoSurface.addEventListener('touchmove',e=>{if(e.touches.length!==1)swipeStart=null;},{passive:true});
photoSurface.addEventListener('touchend',e=>{if(!swipeStart)return;const start=swipeStart;swipeStart=null;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5&&performance.now()-start.time<700)photoDialog.querySelector(`[data-action="${dx<0?'next':'prev'}"]`).click();},{passive:true});
photoSurface.addEventListener('touchcancel',()=>swipeStart=null,{passive:true});
photoDialog.addEventListener('close',()=>{swipeStart=null;photoSurface.replaceChildren();});
// Fetch at most one upcoming original, only while the full-screen viewer is open.
let prefetchTimer=0;const openPhotoBase=openPhoto;
openPhoto=function(o,i){clearTimeout(prefetchTimer);openPhotoBase(o,i);const connection=navigator.connection;if(connection?.saveData||/2g/.test(connection?.effectiveType||''))return;prefetchTimer=setTimeout(()=>{if(!photoDialog.open||photos(o).length<2)return;const img=new Image();img.decoding='async';img.src=photos(o)[(i+1)%photos(o).length];},500);};
photoDialog.addEventListener('close',()=>clearTimeout(prefetchTimer));

const fitRegionButton=document.createElement('button');fitRegionButton.textContent='Показать регион целиком';fitRegionButton.onclick=()=>window.fitSelectedRegion?.();regionPanel.append(fitRegionButton);
