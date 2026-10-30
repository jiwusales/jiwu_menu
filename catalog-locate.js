// Highlight a catalog item without changing the cart or product data.
(()=>{
 const params=new URLSearchParams(location.search),id=params.get('item'),sku=params.get('sku');
 if(!id&&!sku)return;
 const style=document.createElement('style');style.textContent='.card.catalog-jump-target{position:relative;z-index:20;transform:scale(1.5);transition:transform .2s ease}';document.head.append(style);
 const container=document.getElementById('items-wrapper');if(!container)return;
 let observer,expiry;
 function locate(){
  const card=[...container.querySelectorAll('.card[data-catalog-skus]')].find(card=>{try{return id?JSON.parse(card.dataset.catalogIds).includes(id):JSON.parse(card.dataset.catalogSkus).includes(sku);}catch{return false;}});
  if(!card)return false;
  const rect=card.getBoundingClientRect(),width=document.documentElement.clientWidth,extra=rect.width*.5;
  const low=extra?Math.max(0,(rect.right+extra-(width-8))/extra):.5,high=extra?Math.min(1,(rect.left-8)/extra):.5;
  card.style.transformOrigin=(Math.max(0,Math.min(1,Math.max(low,Math.min(.5,high))))*100)+'% center';
  const align=()=>{const rect=card.getBoundingClientRect();const offset=card.classList.contains('catalog-jump-target')?card.offsetHeight*.25:0;window.scrollTo({top:Math.max(0,rect.top+window.scrollY+offset-Math.max(110,window.innerHeight*.27)),behavior:'instant'});};
  align();card.classList.add('catalog-jump-target');
  let frame;const realign=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(align);};
  const layout=new ResizeObserver(realign);layout.observe(container);document.addEventListener('load',realign,true);
  function stop(){layout.disconnect();document.removeEventListener('load',realign,true);cancelAnimationFrame(frame);window.removeEventListener('touchstart',stop);window.removeEventListener('wheel',stop);}
  window.addEventListener('touchstart',stop,{passive:true});window.addEventListener('wheel',stop,{passive:true});
  setTimeout(()=>{card.classList.remove('catalog-jump-target');card.style.removeProperty('transform-origin');},2000);
  setTimeout(stop,5000);return true;
 }
 if(!locate()){observer=new MutationObserver(()=>{if(locate()){observer.disconnect();clearTimeout(expiry);}});observer.observe(container,{childList:true,subtree:true});expiry=setTimeout(()=>observer.disconnect(),30000);}
})();
