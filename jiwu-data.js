/* Manual Discord backup. No credentials and no network requests. */
(()=>{
if(window.JiwuManualBackup)return;
const CHANNEL='https://discord.com/channels/1535638748002394164/1564210932618362890';
function clean(kind,p){
 const fields=kind==='store'?['requestId','checkoutAt','items','total','received','change','payment','note','salesperson']:['requestId','source','lineName','igAccount','cartItems','deliveryMethod','note'];
 const params={};for(const k of fields)if(p[k]!==undefined)params[k]=structuredClone(p[k]);
 return {format:'jiwu-manual-backup-v1',kind,createdAt:new Date().toISOString(),params};
}
function file(record){return new File([JSON.stringify(record,null,2)],'jiwu-backup-'+record.params.requestId+'.json',{type:'application/json'});}
function summary(record){const p=record.params,items=record.kind==='store'?(typeof p.items==='string'?JSON.parse(p.items):p.items):p.cartItems;return [record.kind==='store'?'店面結帳備援':'線上訂單備援','編號：'+p.requestId,record.kind==='store'?'時間：'+new Date(p.checkoutAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})+'\n店員：'+p.salesperson+'\n付款：'+p.payment+'\n總額：$'+p.total:'客人：'+p.lineName+'\n取貨：'+(p.deliveryMethod||''),...items.map((x,i)=>(i+1)+'. '+x.name+' '+[x.role,x.selectedSize,x.selectedColor].filter(Boolean).join(' / ')+' ×'+(x.qty||1)+'　$'+x.price),p.note?'備註：'+p.note:''].filter(Boolean).join('\n');}
function download(record){const url=URL.createObjectURL(file(record)),a=document.createElement('a');a.href=url;a.download=file(record).name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function open(record,{confirm=false}={}){return new Promise((resolve,reject)=>{
 const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Discord 備援明細');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:#0006;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
 const card=document.createElement('section');card.style.cssText='width:100%;max-width:500px;max-height:90dvh;overflow:auto;background:white;color:#555;border-radius:18px;padding:22px;box-sizing:border-box;font:15px/1.6 -apple-system,sans-serif;display:grid;gap:14px';
 const title=document.createElement('strong');title.textContent='分享到 Discord，等待本機補登';title.style.fontSize='19px';
 const hint=document.createElement('div');hint.textContent='先分享備援檔，在 Discord 選擇目前的訂單頻道並按傳送。產生檔案或開啟分享選單，都還不代表 Discord 已收到。';
 const preview=document.createElement('pre');preview.textContent=summary(record);preview.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0;padding:14px;background:#f5f4f2;border-radius:12px;max-height:30dvh;overflow:auto';
 const status=document.createElement('div');status.setAttribute('role','status');status.textContent='備援編號會保留；重分享同一筆不會新增交易編號。';
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:46px;padding:11px 14px;border:0;border-radius:11px;background:#eee;color:#555;font:inherit;cursor:pointer';b.onclick=fn;return b;}
 const share=button('分享備援檔案到 Discord',async()=>{try{const f=file(record);if(!navigator.canShare?.({files:[f]})||!navigator.share){download(record);status.textContent='已交給瀏覽器下載，請從「檔案」分享此 JSON 檔到 Discord。';return;}await navigator.share({files:[f],title:'吉物備援明細'});status.textContent='請確認 Discord 頻道內已出現這份備援檔。';}catch(e){status.textContent=e.name==='AbortError'?'分享已取消，資料仍保留。':'無法分享，請改用下載備援檔。';}});share.style.background='#A68C73';share.style.color='white';
 const dl=button('下載備援檔',()=>download(record));
 const link=document.createElement('a');link.href=CHANNEL;link.target='_blank';link.rel='noopener';link.textContent='開啟 Discord 訂單頻道';link.style.cssText='text-align:center;padding:10px;color:#85705d';
 const close=()=>overlay.remove();
 card.append(title,hint,preview,share,dl,link,status);
 if(confirm)card.append(button('我已在 Discord 按傳送，保留待補登',()=>{close();resolve({ok:true,manualBackup:true,storeQueued:true});}));
 card.append(button(confirm?'返回，保留購物車':'關閉',()=>{close();if(confirm)reject(Error('備援尚未確認傳送，購物車已保留'));else resolve();}));overlay.append(card);document.body.append(overlay);share.focus();
 });}
window.JiwuManualBackup={clean,file,summary,open};
})();


const JIWU_PUBLIC_API='https://jiwu-mac-relay.jiwusales.workers.dev/functions/v1/jiwu-public?__manual_backup=1';
let jiwuManualNext=false;
async function jiwuSubmitOrder(payload){
 const key='jiwu_supabase_pending_web_order_v1',signature=JSON.stringify(payload);
 let pending;try{pending=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null');}catch{}
 if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
 let durable=false;try{localStorage.setItem(key,JSON.stringify(pending));durable=true;}catch{}try{sessionStorage.setItem(key,JSON.stringify(pending));}catch{}
 const params={...payload,requestId:pending.requestId};
 const submittedCartSignature=typeof cart!=='undefined'?JSON.stringify(cart):'';
 async function manual(){if(!durable)throw Error('裝置無法保留備援編號，請勿關閉購物車');const result=await window.JiwuManualBackup.open(window.JiwuManualBackup.clean('web',params),{confirm:true});const records=JSON.parse(localStorage.getItem('jiwu-manual-web-receipts-v1')||'[]');records.push(window.JiwuManualBackup.clean('web',params));localStorage.setItem('jiwu-manual-web-receipts-v1',JSON.stringify(records));localStorage.removeItem(key);sessionStorage.removeItem(key);return result;}
 if(jiwuManualNext){jiwuManualNext=false;return manual();}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(JIWU_PUBLIC_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...params,action:'webOrder'}),signal:controller.signal});let result;try{result=await response.json();}catch{throw Error('伺服器回覆無法確認');}
 if(response.status===409&&result.cartChanged){window.jiwuApplyCartQuote?.(result.items,submittedCartSignature);throw Error((result.error||'購物車價格或貨況已變更，請確認後重新送出')+(Array.isArray(result.changes)&&result.changes.length?'\n'+result.changes.join('\n'):''));}
 if(!response.ok||result.ok!==true){const e=Error(result.error||'訂單儲存失敗');if(response.status>=500)e.connection=true;throw e;}
 try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}return result;
 }catch(e){if(e.connection||e.name==='AbortError'||/fetch|network|load failed|伺服器回覆無法確認/i.test(e.message))return manual();throw e;}finally{clearTimeout(timer);}
}
function jiwuInstallManualOrderButton(){const send=document.getElementById('send-btn');if(!send||document.getElementById('jiwu-manual-web'))return;const b=document.createElement('button');b.id='jiwu-manual-web';b.type='button';b.textContent='主機斷線？產生 Discord 備援';b.style.cssText='display:block;width:100%;margin-top:14px;padding:13px;border:1px solid #ddd;border-radius:12px;background:white;color:#777;font:inherit';b.onclick=()=>{if(send.disabled)return;jiwuManualNext=true;Promise.resolve(handleFinalCheckout()).finally(()=>{jiwuManualNext=false;});};send.after(b);const history=document.createElement('button');history.type='button';history.textContent='重新分享已保留的備援';history.style.cssText=b.style.cssText;history.onclick=()=>{let records;try{records=JSON.parse(localStorage.getItem('jiwu-manual-web-receipts-v1')||'[]');}catch{records=[];}if(!records.length){alert('尚無已保留的備援。');return;}const rows=document.createElement('div');rows.style.cssText='position:fixed;inset:16px;z-index:99999;overflow:auto;background:white;padding:20px;border:1px solid #ddd;border-radius:16px;display:flex;flex-direction:column;gap:14px';for(const r of records){const rb=document.createElement('button');rb.style.cssText='padding:14px;border:0;border-radius:12px';rb.textContent=new Date(r.createdAt).toLocaleString('zh-TW')+'　'+r.params.lineName;rb.onclick=()=>window.JiwuManualBackup.open(r);rows.append(rb);}const close=document.createElement('button');close.textContent='關閉';close.style.padding='14px';close.onclick=()=>rows.remove();rows.append(close);document.body.append(rows);};b.after(history);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',jiwuInstallManualOrderButton);else jiwuInstallManualOrderButton();
