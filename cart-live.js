import {cartChanges} from './cart-catalog.mjs?v=20261030-cart-source-v2';
let pending=null,lastRead=0,checking=false;
const current=()=>typeof cart!=='undefined'&&Array.isArray(cart)?cart:[];
function paint(items){
 cart=items;saveCart();updateCartUI();
 const modal=document.getElementById('checkout-modal');
 if(modal?.style.display==='flex'&&typeof renderCheckoutSummary==='function')renderCheckoutSummary();

}
async function readQuote(){
 const before=structuredClone(current()),signature=JSON.stringify(before);
 if(!before.length)return {changed:false,blocked:false};
 const quoteFields=['catalogSheet','launchItemId','groupName','group','ipName','ip','name','role','sn','format','selectedSize','selectedColor','productMasterId','catalogRecordId','url','price','currentStatus','_cartRestockIntent','_cartIssue','_cartOriginalGroup','_cartOriginalSheet','_cartOriginalItemId'];
 const compact=before.map(item=>Object.fromEntries(quoteFields.filter(key=>item[key]!==undefined).map(key=>[key,item[key]])));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(CONFIG.DEPLOY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cartQuote',cartItems:compact}),cache:'no-store',signal:controller.signal});
  const result=await response.json();if(!response.ok||!result.ok||!Array.isArray(result.items)||result.items.length!==before.length)throw Error('無法確認最新價格與貨況，購物車已保留，請稍後重試');
  if(JSON.stringify(current())!==signature)return {raced:true};
  result.items=result.items.map((item,index)=>({...before[index],...item}));
  const lines=cartChanges(before,result.items),changed=lines.length>0;
  if(JSON.stringify(before)!==JSON.stringify(result.items))paint(result.items);
  lastRead=Date.now();
  return {changed,blocked:result.items.some(item=>item._cartBlocked)};
 }finally{clearTimeout(timer);}
}
async function sync({checkout=false,force=false}={}){
 if(!current().length)return true;
 if(!checkout&&!force&&Date.now()-lastRead<30000)return true;
 if(checkout&&checking)return false;
 if(checkout)checking=true;
 try{
  if(!pending)pending=readQuote().finally(()=>pending=null);
  let result=await pending;
  if(result.raced){if(!pending)pending=readQuote().finally(()=>pending=null);result=await pending;}
  if(result.raced)throw Error('購物車內容正在變更，請確認後再送出');
  if(checkout&&result.blocked){if(!result.changed)alert('購物車內有無法訂購的商品：\n'+current().filter(item=>item._cartBlocked).map(item=>item.name+'：'+item._cartIssue).join('\n'));return false;}
  return !checkout||!result.changed;
 }catch(error){if(checkout)alert(error.message||'無法確認最新價格與貨況，購物車已保留');return false;}
 finally{if(checkout)checking=false;}
}
window.jiwuEnsureCartCurrent=()=>sync({checkout:true,force:true});
window.jiwuRefreshCart=()=>sync({force:true});
window.jiwuApplyCartQuote=(items,submittedSignature)=>{
 if(Array.isArray(items)&&submittedSignature===JSON.stringify(current())){paint(items);}
};
function paintIssues(){
 for(const selector of ['#cart-list','#modal-summary-list'])document.querySelectorAll(selector+' .cart-item').forEach((row,index)=>{
  row.querySelector('[data-cart-issue]')?.remove();const item=current()[index];if(!item?._cartIssue)return;
  const warning=document.createElement('div');warning.dataset.cartIssue='true';warning.textContent=item._cartIssue;warning.style.cssText='color:#b42318;font-size:13px;overflow-wrap:anywhere';
  (row.querySelector('.cart-item-info')||row).append(warning);
 });
}
const originalCartRender=updateCartUI;updateCartUI=function(...args){const result=originalCartRender(...args);paintIssues();return result;};
if(typeof renderCheckoutSummary==='function'){const originalSummary=renderCheckoutSummary;renderCheckoutSummary=function(...args){const result=originalSummary(...args);paintIssues();return result;};}
window.addEventListener('focus',()=>{void sync()});
window.addEventListener('pageshow',()=>{void sync()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync({force:true})});
window.addEventListener('storage',event=>{
 const storageKey=typeof CART_KEY!=='undefined'?CART_KEY:'jiwu_cart';
 if(event.key!==storageKey)return;
 if(event.newValue===null){cart=[];updateCartUI();return;}
 try{const saved=JSON.parse(event.newValue);if(Array.isArray(saved)){cart=saved;updateCartUI();if(document.getElementById('checkout-modal')?.style.display==='flex'&&typeof renderCheckoutSummary==='function')renderCheckoutSummary();void sync();}}catch{}
});
setInterval(()=>{if(!document.hidden&&navigator.onLine&&current().length)void sync();},30000);
void sync({force:true});
