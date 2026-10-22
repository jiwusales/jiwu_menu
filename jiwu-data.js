// Public storefront transport. Credentials stay in the Supabase function.
const JIWU_PUBLIC_API='https://jiwu-mac-relay.jiwusales.workers.dev/functions/v1/jiwu-public';
async function jiwuSubmitOrder(payload){
 const key='jiwu_supabase_pending_web_order_v1',signature=JSON.stringify(payload);
 let pending;try{pending=JSON.parse(sessionStorage.getItem(key)||'null');}catch(_){}
 if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
 try{sessionStorage.setItem(key,JSON.stringify(pending));}catch(_){}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{
  const response=await fetch(JIWU_PUBLIC_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,action:'webOrder',requestId:pending.requestId}),signal:controller.signal});
  const result=await response.json();
  if(!response.ok||result.ok!==true)throw Error(result.error||'訂單儲存失敗，請重試');
  try{sessionStorage.removeItem(key);}catch(_){}
  return result;
 }catch(error){if(error.name==='AbortError')throw Error('訂單傳送逾時，購物車已保留，請重試');throw error;}
 finally{clearTimeout(timer);}
}
