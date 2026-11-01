/* Payment controls for catalog carts; preserves their existing desktop order flow. */
(()=>{
'use strict';
const payments=['網銀','ipass','Line好友轉帳'];
let payment='',delivery='',busy=false;
const mobile=()=>/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const deliveryText=value=>value==='undecided'?'到貨再決定怎麼取！感ㄣ(੭•̀ᵕ•̀)੭':({shipping:'賣貨便',pickup:'自取'}[value]||'');
const allStock=()=>cart.length>0&&cart.every(item=>['現貨','最後一個'].includes(String(item.currentStatus||'').trim()));
function validate(){if(!allStock()&&!payments.includes(payment)){alert('請選擇付款方式');return false;}if(!delivery){alert('請選擇取貨方式');return false;}return true;}
function sync(){document.querySelectorAll('[data-choice]').forEach(input=>input.checked=input.value===(input.dataset.choice==='payment'?payment:delivery));}
function controls(place){
 const root=document.createElement('div');root.className='jiwu-checkout-choices';
 for(const [kind,title,values]of [['payment','付款方式：',payments.map(p=>[p,p])],['delivery','取貨方式：',[['shipping','賣貨便'],['pickup','自取'],['undecided','還沒想好']]]]){
  const row=document.createElement('div');row.className='jiwu-choice-row';row.setAttribute('role','group');row.setAttribute('aria-label',title.replace('：',''));
  const label=document.createElement('span');label.className='jiwu-choice-title';label.textContent=title;row.append(label);
  const options=document.createElement('div');options.className='jiwu-choice-options';
  for(const [value,text]of values){const wrap=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='jiwu-'+place+'-'+kind;input.value=value;input.dataset.choice=kind;
   input.onchange=()=>{if(kind==='payment')payment=value;else{delivery=value;selectDelivery({checked:true,value});}sync();};wrap.append(input,document.createTextNode(text));options.append(wrap);}
  row.append(options);root.append(row);
 }
 return root;
}
for(const id of ['delivery-cart','delivery-modal'])document.getElementById(id)?.remove();
const cartChoices=controls('cart');cartChoices.hidden=!mobile();cartChoices.classList.add('jiwu-mobile-choices');
document.querySelector('#cart-panel .btn-checkout').before(cartChoices);
document.getElementById('cart-total').parentElement.classList.add('jiwu-review-total');
const modalChoices=controls('modal');document.getElementById('user-line').before(modalChoices);
const originalFinal=window.handleFinalCheckout;
window.handleCheckoutEntry=async function(){
 if(busy)return;
 try{
  if(typeof window.jiwuEnsureCartCurrent!=='function')throw Error('購物車更新功能尚未載入，請重新整理後再試');
  if(!await window.jiwuEnsureCartCurrent())return;
  if(!cart.length)return alert('購物車是空的唷！');
  if(!mobile()){openCheckoutModal();sync();return;}
  if(!validate())return;
  const message=generateLineMessage()+'\n'+[payment,deliveryText(delivery)].filter(Boolean).join('/');
  window.location.href=CONFIG.LINE_MSG_URL+encodeURIComponent(message);
  setTimeout(()=>{cart=[];saveCart();updateCartUI();toggleCart(false);},1500);
 }catch(error){alert(error.message);}
};
window.handleFinalCheckout=async function(){
 if(busy)return;
 if(!validate())return;
 busy=true;try{await originalFinal();}finally{busy=false;}
};
const originalSubmit=window.jiwuSubmitOrder;
window.jiwuSubmitOrder=async function(payload){
 // The legacy checkout refreshes the cart before submitting. Recheck after that refresh.
 if(!validate())throw Error('請選擇付款及取貨方式');
 const note=[payload.note,payment?'付款方式：'+payment:''].filter(Boolean).join('｜');
 return originalSubmit({...payload,paymentMethod:payment,note});
};
})();
