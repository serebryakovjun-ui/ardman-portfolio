'use strict';
(()=>{
 const map=document.getElementById('map'),list=document.getElementById('regions'),filter=document.getElementById('work-only');let active=null;
 const sync=()=>{
  const id=map.querySelector('.region-shape.is-selected')?._region?.id||null;
  if(id===active)return;active=id;
  list.querySelectorAll('.region-btn').forEach(button=>{const selected=button.dataset.regionId===id;button.classList.toggle('is-current',selected);if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  const button=list.querySelector('.is-current');
  if(button&&!button.hidden&&list.clientHeight){const top=button.offsetTop-list.offsetTop;if(top<list.scrollTop||top+button.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=top-list.clientHeight/2+button.offsetHeight/2;}
 };
 new MutationObserver(sync).observe(map,{subtree:true,attributes:true,attributeFilter:['class']});
 const updateCoverage=()=>{
  map.classList.toggle('only-work',filter.checked);
  document.querySelectorAll('[data-coverage]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.coverage==='work')===filter.checked)));
 };
 document.querySelectorAll('[data-coverage]').forEach(button=>button.addEventListener('click',()=>{filter.checked=button.dataset.coverage==='work';filter.dispatchEvent(new Event('change'));}));
 filter.addEventListener('change',updateCoverage);updateCoverage();
})();
