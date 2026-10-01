'use strict';
// Hydrography uses the same source projection as the region geometry.
(()=>{
const map=document.getElementById('map');
const decorate=()=>{
 if(!map.classList.contains('map-ready'))return;
 observer.disconnect();
 const ns='http://www.w3.org/2000/svg',el=(name,attrs)=>{const n=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
 const shapes=[...map.querySelectorAll('.region-shape')],defs=el('defs',{}),clip=el('clipPath',{id:'land-clip'});
 const coast=el('g',{'class':'atlas-coast','aria-hidden':'true','pointer-events':'none'});
 shapes.forEach(p=>{clip.append(el('path',{d:p.getAttribute('d')}));coast.append(el('path',{d:p.getAttribute('d')}));});
 defs.append(clip);map.prepend(defs);map.insertBefore(coast,shapes[0]);
 fetch('map-rivers.json?v=10').then(r=>{if(!r.ok)throw Error('rivers');return r.json();}).then(paths=>{
 const layer=el('g',{'class':'atlas-rivers','clip-path':'url(#land-clip)','aria-hidden':'true','pointer-events':'none'});
 paths.forEach(d=>layer.append(el('path',{d})));map.insertBefore(layer,map.querySelector('.map-labels'));
 }).catch(()=>{/* Region navigation remains available without the decorative layer. */});
};
const observer=new MutationObserver(decorate);observer.observe(map,{attributes:true,attributeFilter:['class']});decorate();
})();
