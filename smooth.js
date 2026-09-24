'use strict';
// A fixed SVG viewport with a single composited camera layer.
setupMapMotion = function () {
  const map=$('map'), stage=$('map-scroll');
  const home=map.getAttribute('viewBox').split(/\s+/).map(Number);
  let current={x:0,y:0,k:1}, target={...current}, raf=0, previous=0, tap=null, tapTimer=0;
  let gesture=null, pointers=new Map(), geometry=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  map.style.setProperty('transform-origin','0 0');
  const measure=()=>{const r=stage.getBoundingClientRect();const s=Math.min(r.width/home[2],r.height/home[3]);geometry={r,s,ox:(r.width-home[2]*s)/2,oy:(r.height-home[3]*s)/2};};
  measure();
  const bound=v=>{const r=geometry.r;return {k:Math.max(1,Math.min(8,v.k)),x:Math.min(0,Math.max(r.width*(1-v.k),v.x)),y:Math.min(0,Math.max(r.height*(1-v.k),v.y))};};
  const paint=()=>{map.style.setProperty('transform',`translate3d(${current.x}px,${current.y}px,0) scale(${current.k})`,'important');$('zoom-value').textContent=Math.round(current.k*100)+'%';$('zoom-out').disabled=current.k<=1.001;$('zoom-in').disabled=current.k>=7.999;};
  const moving=on=>stage.classList.toggle('camera-moving',on);
  const frame=now=>{const dt=Math.min(40,now-(previous||now-16));previous=now;const a=reduced?1:1-Math.exp(-dt/45);for(const key of ['x','y','k'])current[key]+=(target[key]-current[key])*a;const done=Math.abs(current.x-target.x)<.08&&Math.abs(current.y-target.y)<.08&&Math.abs(current.k-target.k)<.0002;if(done)current={...target};paint();if(done){raf=0;previous=0;moving(false);}else raf=requestAnimationFrame(frame);};
  const move=(v,smooth=true)=>{target=bound(v);if(!smooth){cancelAnimationFrame(raf);raf=0;previous=0;current={...target};paint();return;}moving(true);if(!raf)raf=requestAnimationFrame(frame);};
  const stop=()=>{cancelAnimationFrame(raf);raf=0;previous=0;target={...current};moving(false);};
  const zoom=(k,px,py)=>{const b=target,n=Math.max(1,Math.min(8,k)),ratio=n/b.k;move({k:n,x:px-(px-b.x)*ratio,y:py-(py-b.y)*ratio});};
  const clearTap=()=>{clearTimeout(tapTimer);tapTimer=0;tap=null;};
  const focus=(r,path)=>{const b=path.getBBox(),g=geometry;const k=Math.max(current.k,Math.min(8,Math.min(g.r.width/(Math.max(b.width,1)*g.s*1.7),g.r.height/(Math.max(b.height,1)*g.s*1.7))));map.querySelectorAll('.is-selected').forEach(p=>p.classList.remove('is-selected'));path.classList.add('is-selected');$('map-label').textContent=r.name;move({k,x:g.r.width/2-(g.ox+(b.x+b.width/2-home[0])*g.s)*k,y:g.r.height/2-(g.oy+(b.y+b.height/2-home[1])*g.s)*k});};
  const paths=[...map.querySelectorAll('.region-shape')];
  paths.forEach(path=>{const r=regions.find(r=>r.name===path.getAttribute('aria-label'));path._region=r;path.onclick=e=>{e.preventDefault();};path.ondblclick=e=>e.preventDefault();path.onpointermove=null;path.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clearTap();stop();openRegion(r);}};});
  stage.addEventListener('wheel',e=>{e.preventDefault();clearTap();if(pointers.size)return;measure();const d=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?geometry.r.height:1);zoom(target.k*Math.exp(-Math.max(-160,Math.min(160,d))*.0018),e.clientX-geometry.r.left,e.clientY-geometry.r.top);},{passive:false});
  const startGesture=()=>{const a=[...pointers.values()];gesture={base:{...current},points:a.map(p=>({...p})),moved:a.length>1};};
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;measure();stop();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,path:e.target.closest?.('.region-shape')});stage.setPointerCapture(e.pointerId);if(pointers.size>1)clearTap();startGesture();});
  stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});const a=[...pointers.values()],b=gesture.base,p=gesture.points;
    if(a.length===1){const dx=a[0].x-p[0].x,dy=a[0].y-p[0].y;if(Math.hypot(dx,dy)>5)gesture.moved=true;if(!gesture.moved)return;clearTap();move({k:b.k,x:b.x+dx,y:b.y+dy},false);}
    else{gesture.moved=true;const dist=Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),initial=Math.max(1,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)),k=Math.max(1,Math.min(8,b.k*dist/initial));const cx=(p[0].x+p[1].x)/2-geometry.r.left,cy=(p[0].y+p[1].y)/2-geometry.r.top;move({k,x:(a[0].x+a[1].x)/2-geometry.r.left-(cx-b.x)*k/b.k,y:(a[0].y+a[1].y)/2-geometry.r.top-(cy-b.y)*k/b.k},false);}
    moving(true);
  });
  const end=e=>{if(!pointers.has(e.pointerId))return;const p=pointers.get(e.pointerId),moved=gesture.moved;pointers.delete(e.pointerId);if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(pointers.size){startGesture();gesture.moved=true;return;}gesture=null;moving(false);if(e.type==='pointercancel'||moved||!p.path?._region){clearTap();return;}const now=performance.now(),r=p.path._region;if(tap&&tap.id===r.id&&now-tap.time<360){clearTap();stop();openRegion(r);}else{clearTap();tap={id:r.id,time:now};tapTimer=setTimeout(()=>{tap=null;tapTimer=0;focus(r,p.path);},360);}};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  $('zoom-in').onclick=()=>{clearTap();zoom(target.k*1.35,geometry.r.width/2,geometry.r.height/2);};
  $('zoom-out').onclick=()=>{clearTap();zoom(target.k/1.35,geometry.r.width/2,geometry.r.height/2);};
  $('zoom-reset').onclick=()=>{clearTap();move({x:0,y:0,k:1});};
  window.addEventListener('hashchange',()=>{clearTap();stop();});
  new ResizeObserver(()=>{if(!stage.clientWidth)return;const old=geometry;measure();move({k:current.k,x:current.x*geometry.r.width/old.r.width,y:current.y*geometry.r.height/old.r.height},false);}).observe(stage);
  paint();
};

// Full-source viewing: no additional JPEG compression or invented detail.
const originalDetail=showDetail;
new MutationObserver(()=>document.querySelectorAll('.detail-gallery svg.portfolio-photo').forEach(p=>p.setAttribute('preserveAspectRatio','xMidYMid meet'))).observe($('detail-body'),{childList:true,subtree:true});
showDetail=function(o){originalDetail(o);const gallery=document.querySelector('.detail-gallery');gallery.querySelectorAll('img,svg.portfolio-photo').forEach((photo,i)=>{photo.setAttribute('tabindex','0');photo.setAttribute('role','button');photo.setAttribute('aria-label',`Открыть фото ${i+1} целиком`);const open=()=>openPhoto(o,i);photo.onclick=open;photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});};
const photoDialog=document.createElement('dialog');photoDialog.className='photo-viewer';photoDialog.innerHTML='<div class="photo-toolbar"><button data-action="prev" aria-label="Предыдущее фото">←</button><span></span><button data-action="next" aria-label="Следующее фото">→</button><button data-action="zoom">Увеличить</button><button data-action="close">Закрыть ×</button></div><div class="photo-surface"></div>';
document.body.append(photoDialog);
let activePhotoObject=null,activePhotoIndex=0;
function openPhoto(o,i){activePhotoObject=o;activePhotoIndex=i;const list=photos(o),surface=photoDialog.querySelector('.photo-surface');surface.classList.remove('enlarged');surface.innerHTML=photoMarkup(o,list[i],i);const media=surface.firstElementChild;media.setAttribute('preserveAspectRatio','xMidYMid meet');if(media.tagName==='IMG')media.loading='eager';photoDialog.querySelector('span').textContent=`${i+1} / ${list.length}`;photoDialog.querySelector('[data-action="zoom"]').textContent='Увеличить';if(!photoDialog.open)photoDialog.showModal();}
photoDialog.addEventListener('click',e=>{const action=e.target.dataset.action;if(action==='close')photoDialog.close();if(action==='prev'||action==='next'){const n=photos(activePhotoObject).length;openPhoto(activePhotoObject,(activePhotoIndex+(action==='next'?1:-1)+n)%n);}if(action==='zoom'){const on=photoDialog.querySelector('.photo-surface').classList.toggle('enlarged');e.target.textContent=on?'Вписать':'Увеличить';}});
photoDialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();photoDialog.querySelector(`[data-action="${e.key==='ArrowRight'?'next':'prev'}"]`).click();}});
