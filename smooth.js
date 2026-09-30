'use strict';
// A fixed SVG viewport with a single composited camera layer.
setupMapMotion = function () {
  const map=$('map'), stage=$('map-scroll');
  const home=map.getAttribute('viewBox').split(/\s+/).map(Number);
  let current={x:0,y:0,k:1}, target={...current}, raf=0, previous=0;
  let gesture=null, pointers=new Map(), geometry=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  map.style.setProperty('transform-origin','0 0');
  const measure=()=>{const r=stage.getBoundingClientRect();const s=Math.min(r.width/home[2],r.height/home[3]);geometry={r,s,ox:(r.width-home[2]*s)/2,oy:(r.height-home[3]*s)/2};};
  measure();
  const bound=v=>{const r=geometry.r;return {k:Math.max(1,Math.min(8,v.k)),x:Math.min(0,Math.max(r.width*(1-v.k),v.x)),y:Math.min(0,Math.max(r.height*(1-v.k),v.y))};};
  const paint=()=>{map.style.setProperty('--atlas-stroke',1/current.k);map.style.setProperty('transform',`translate3d(${current.x}px,${current.y}px,0) scale(${current.k})`,'important');$('zoom-value').textContent=Math.round(current.k*100)+'%';$('zoom-out').disabled=current.k<=1.001;$('zoom-in').disabled=current.k>=7.999;};
  const moving=on=>{stage.classList.toggle('camera-moving',on);if(!on)layoutLabels();};
  const frame=now=>{const dt=Math.min(40,now-(previous||now-16));previous=now;const a=reduced?1:1-Math.exp(-dt/45);for(const key of ['x','y','k'])current[key]+=(target[key]-current[key])*a;const done=Math.abs(current.x-target.x)<.08&&Math.abs(current.y-target.y)<.08&&Math.abs(current.k-target.k)<.0002;if(done)current={...target};paint();if(done){raf=0;previous=0;moving(false);}else raf=requestAnimationFrame(frame);};
  const move=(v,smooth=true)=>{target=bound(v);if(!smooth){cancelAnimationFrame(raf);raf=0;previous=0;current={...target};paint();moving(false);return;}moving(true);if(!raf)raf=requestAnimationFrame(frame);};
  const stop=()=>{cancelAnimationFrame(raf);raf=0;previous=0;target={...current};moving(false);};
  const zoom=(k,px,py)=>{const b=target,n=Math.max(1,Math.min(8,k)),ratio=n/b.k;move({k:n,x:px-(px-b.x)*ratio,y:py-(py-b.y)*ratio});};

  const focus=(r,path,fit=false)=>{const b=path.getBBox(),g=geometry;const fitted=Math.max(1,Math.min(8,Math.min(g.r.width/(Math.max(b.width,1)*g.s*1.7),g.r.height/(Math.max(b.height,1)*g.s*1.7)))),k=fit?fitted:Math.max(current.k,fitted);map.querySelectorAll('.is-selected').forEach(p=>p.classList.remove('is-selected'));path.classList.add('is-selected');$('map-label').textContent=r.name;move({k,x:g.r.width/2-(g.ox+(b.x+b.width/2-home[0])*g.s)*k,y:g.r.height/2-(g.oy+(b.y+b.height/2-home[1])*g.s)*k});};
  window.fitSelectedRegion=()=>{const path=map.querySelector('.is-selected');if(path?._region){focus(path._region,path,true);}};
  document.querySelectorAll('[data-map-region]').forEach(button=>button.onclick=()=>{const path=[...map.querySelectorAll('.region-shape')].find(p=>p._region?.id===button.dataset.mapRegion);if(path){measure();stop();focus(path._region,path,true);}});
  const paths=[...map.querySelectorAll('.region-shape')];
  paths.forEach(path=>{const r=regions.find(r=>r.name===path.getAttribute('aria-label'));path._region=r;path.onclick=e=>{e.preventDefault();};path.ondblclick=e=>e.preventDefault();path.onfocus=()=>{$('map-label').textContent=r.name;};path.onpointermove=()=>{$('map-label').textContent=r.name;};path.onpointerleave=path.onblur=()=>{$('map-label').textContent=map.querySelector('.is-selected')?._region?.name||'Выберите регион';};path.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stop();focus(r,path);}};});
  stage.addEventListener('wheel',e=>{e.preventDefault();if(pointers.size)return;measure();const d=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?geometry.r.height:1);zoom(target.k*Math.exp(-Math.max(-160,Math.min(160,d))*.0018),e.clientX-geometry.r.left,e.clientY-geometry.r.top);},{passive:false});
  const startGesture=()=>{const a=[...pointers.values()];gesture={base:{...current},points:a.map(p=>({...p})),moved:a.length>1};};
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;measure();stop();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,path:e.target.closest?.('.region-shape')});stage.setPointerCapture(e.pointerId);startGesture();});
  stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});const a=[...pointers.values()],b=gesture.base,p=gesture.points;
    if(a.length===1){const dx=a[0].x-p[0].x,dy=a[0].y-p[0].y;if(Math.hypot(dx,dy)>5)gesture.moved=true;if(!gesture.moved)return;move({k:b.k,x:b.x+dx,y:b.y+dy},false);}
    else{gesture.moved=true;const dist=Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),initial=Math.max(1,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)),k=Math.max(1,Math.min(8,b.k*dist/initial));const cx=(p[0].x+p[1].x)/2-geometry.r.left,cy=(p[0].y+p[1].y)/2-geometry.r.top;move({k,x:(a[0].x+a[1].x)/2-geometry.r.left-(cx-b.x)*k/b.k,y:(a[0].y+a[1].y)/2-geometry.r.top-(cy-b.y)*k/b.k},false);}
    moving(true);
  });
  const end=e=>{if(!pointers.has(e.pointerId))return;const p=pointers.get(e.pointerId),moved=gesture.moved;pointers.delete(e.pointerId);if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(pointers.size){startGesture();gesture.moved=true;return;}gesture=null;moving(false);if(e.type==='pointercancel'||moved||!p.path?._region){return;}focus(p.path._region,p.path);};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  $('zoom-in').onclick=()=>{zoom(target.k*1.35,geometry.r.width/2,geometry.r.height/2);};
  $('zoom-out').onclick=()=>{zoom(target.k/1.35,geometry.r.width/2,geometry.r.height/2);};
  $('zoom-reset').onclick=()=>{map.querySelectorAll('.is-selected').forEach(p=>p.classList.remove('is-selected'));$('map-label').textContent='Выберите регион';move({x:0,y:0,k:1});};
  window.addEventListener('hashchange',()=>{stop();});
  new ResizeObserver(()=>{if(!stage.clientWidth)return;const old=geometry;measure();move({k:current.k,x:current.x*geometry.r.width/old.r.width,y:current.y*geometry.r.height/old.r.height},false);}).observe(stage);
  // Lay out labels in screen pixels after camera movement, prioritizing large regions.
  const labelRegions=regions.filter(r=>r.label);
  const labels=[...map.querySelectorAll('.map-labels text')].map((label,i)=>{label.dataset.regionId=labelRegions[i].id;return label;}).sort((a,b)=>Number(b.dataset.area)-Number(a.dataset.area));
  layoutLabels=()=>{
    if(!stage.clientWidth)return;
    const scale=geometry.s*current.k,used=[];
    const limit=Math.round((stage.clientWidth<500?5:12)*current.k);
    let shown=0;
    const selectedId=map.querySelector('.is-selected')?._region?.id;
    const ordered=[...labels].sort((a,b)=>Number(b.dataset.regionId===selectedId)-Number(a.dataset.regionId===selectedId));
    for(const label of ordered){
      label.style.display='';label.style.fontSize=(11/scale)+'px';
      const q=label.getBBox(),x=(q.x-home[0])*scale+geometry.ox*current.k+current.x,y=(q.y-home[1])*scale+geometry.oy*current.k+current.y;
      const b={x:x-7,y:y-5,w:q.width*scale+14,h:q.height*scale+10};
      const visible=b.x>=0&&b.y>=0&&b.x+b.w<=geometry.r.width&&b.y+b.h<=geometry.r.height;
      if(!visible||shown>=limit||used.some(a=>b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y))label.style.display='none';
      else{used.push(b);shown++;}
    }
  };
  paint();layoutLabels();
};

// Full-source viewing: no additional JPEG compression or invented detail.
const originalDetail=showDetail;
new MutationObserver(()=>document.querySelectorAll('.detail-gallery svg.portfolio-photo').forEach(p=>p.setAttribute('preserveAspectRatio','xMidYMid meet'))).observe($('detail-body'),{childList:true,subtree:true});
showDetail=function(o){originalDetail(o);const gallery=document.querySelector('.detail-gallery');gallery.querySelectorAll('img,svg.portfolio-photo').forEach((photo,i)=>{photo.setAttribute('tabindex','0');photo.setAttribute('role','button');photo.setAttribute('aria-label',`Открыть фото ${i+1} целиком`);const open=()=>openPhoto(o,i);photo.onclick=open;photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});};
const photoDialog=document.createElement('dialog');photoDialog.className='photo-viewer';photoDialog.innerHTML='<div class="photo-toolbar"><button data-action="prev" aria-label="Предыдущее фото">←</button><span></span><button data-action="next" aria-label="Следующее фото">→</button><button data-action="zoom">Увеличить</button><button data-action="close">Закрыть ×</button></div><div class="photo-surface"></div>';
document.body.append(photoDialog);
let activePhotoObject=null,activePhotoIndex=0;
function openPhoto(o,i){activePhotoObject=o;activePhotoIndex=i;const list=photos(o),surface=photoDialog.querySelector('.photo-surface');surface.classList.remove('enlarged');surface.innerHTML=photoMarkup(o,list[i],i,true);const media=surface.firstElementChild;media.setAttribute('preserveAspectRatio','xMidYMid meet');if(media.tagName==='IMG')media.loading='eager';photoDialog.querySelector('span').textContent=`${i+1} / ${list.length}`;photoDialog.querySelector('[data-action="zoom"]').textContent='Увеличить';if(!photoDialog.open)photoDialog.showModal();}
photoDialog.addEventListener('click',e=>{const action=e.target.dataset.action;if(action==='close')photoDialog.close();if(action==='prev'||action==='next'){const n=photos(activePhotoObject).length;openPhoto(activePhotoObject,(activePhotoIndex+(action==='next'?1:-1)+n)%n);}if(action==='zoom'){const on=photoDialog.querySelector('.photo-surface').classList.toggle('enlarged');e.target.textContent=on?'Вписать':'Увеличить';}});
photoDialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();photoDialog.querySelector(`[data-action="${e.key==='ArrowRight'?'next':'prev'}"]`).click();}});
