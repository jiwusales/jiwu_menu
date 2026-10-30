// Shared public-cart rules. This module never reads customer or order data.
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFKC');
const restock=v=>['S☹LD OUT','SOLD OUT','補貨登記','補登'].includes(text(v).toUpperCase());
export function catalogProducts(table,sheet){
 const labels=table.cols.map(c=>text(c.label));let group='';
 return table.rows.flatMap(row=>{
  const get=name=>{const i=labels.indexOf(name);return i<0?'':text(row.c?.[i]?.v??row.c?.[i]?.f)};
  group=get('團名')||group;const name=get('名稱');if(!name)return [];
  let config={};try{config=JSON.parse(get('開團設定')||'{}')}catch{}
  return [{sheet,group:sheet==='商品庫存'?get('IP'):group,name,role:get('角色'),sn:get('貨號'),id:get('商品ID'),format:get('格式'),price:get('售價'),stock:get('庫存'),shop:get('店面'),non:get('非現'),status:get('狀態'),listing:get('目錄狀態'),hidden:config.draftHidden===true||(Number(config.visibilityVersion)>=2&&config.visible===false),paused:/^(true|1|是)$/i.test(get('暫停收單'))}];
 });
}
export function quoteItems(items,products){
 return items.map(item=>{
  const source=text(item.groupName||item.group||item.ipName||item.ip),id=text(item.launchItemId),sheet=text(item.catalogSheet);
  let matches=products.filter(p=>(!sheet||sheet===p.sheet)&&(id?p.id===id:source===p.group&&text(item.name)===p.name&&text(item.role)===p.role));
  if(id&&source)matches=matches.filter(p=>p.group===source);
  if(text(item.sn))matches=matches.filter(p=>p.sn===text(item.sn));
  if(text(item.format))matches=matches.filter(p=>norm(p.format)===norm(item.format));
  if(matches.length>1&&text(item.selectedSize))matches=matches.filter(p=>p.format.split(/[\/／、,，;；\s]+/).includes(text(item.selectedSize)));
  const priorIntent=typeof item._cartRestockIntent==='boolean'?item._cartRestockIntent:restock(item.currentStatus);
  if(matches.length!==1)return {...item,_cartRestockIntent:priorIntent,_cartBlocked:true,_cartIssue:matches.length?'商品有多筆相同資料，請移除後重新加入':'商品已下架或無法確認，請移除後重新加入'};
  const p=matches[0],stock=norm(p.stock).toLowerCase(),listing=p.listing;
  const hidden=p.hidden||listing==='下架'||(stock==='x'&&listing!=='上架');
  const paused=p.paused,disabled=norm(p.price).toLowerCase()==='n'||(p.sheet!=='商品庫存'&&norm(p.price)==='0');
  const soldOut=stock==='-'||/^(?:缺貨|SOLD OUT|S☹LD OUT)$/i.test(p.status);
  let currentStatus,tagBg='#C197D2',tagColor='#fff';
  if(paused){currentStatus='暫停收單';tagBg='#A68C73';}
  else if(hidden||soldOut){currentStatus='補貨登記';tagBg='#3a3a3a';}
  else if(Number(p.stock)===1){currentStatus='最後一個';tagBg='#E24C60';}
  else if(Number(p.stock)>0||Number(p.shop)>0){currentStatus='現貨';tagBg='#FFF4BD';tagColor='#333';}
  else if(p.sheet!=='商品庫存'){currentStatus=['預訂','路上','受注'].includes(p.status)?p.status:'';if(currentStatus==='路上')tagBg='#6C95B0';if(currentStatus==='受注')tagBg='#B1DEC1';}
  else if(parseFloat(p.non)>0&&/v$/i.test(p.non)){currentStatus='受注';tagBg='#B1DEC1';}
  else if(parseFloat(p.non)>0){currentStatus='路上';tagBg='#6C95B0';}
  else currentStatus='預訂';
  const blocked=paused||(disabled&&!hidden&&!soldOut);
  const issue=paused?'商品暫停收單，請先移除':hidden?'商品已下架，已改為補貨登記':soldOut?'商品缺貨，已改為補貨登記':disabled?'商品目前無法訂購，請先移除':'';
  return {...item,catalogSheet:p.sheet,price:p.price,stock:p.stock,colStock:p.stock,colShop:p.shop,colNonStock:p.non,status:p.status,currentStatus,tagBg,tagColor,_cartRestockIntent:hidden||soldOut||priorIntent,_cartBlocked:blocked,_cartIssue:issue};
 });
}
export function cartChanges(before,after){
 return after.flatMap((item,i)=>{
  const old=before[i],changes=[];
  if(text(old.price)!==text(item.price))changes.push('價格 '+text(old.price)+' → '+text(item.price));
  if(text(old.currentStatus)!==text(item.currentStatus))changes.push('貨況 '+text(old.currentStatus)+' → '+text(item.currentStatus));
  if(item._cartIssue&&item._cartIssue!==old._cartIssue)changes.push(item._cartIssue);
  return changes.length?[text(item.name)+'：'+changes.join('；')]:[];
 });
}
export class CartChangedError extends Error{
 constructor(items,changes){super('購物車價格或貨況已變更，請確認後重新送出');this.name='CartChangedError';this.items=items;this.changes=changes;}
}
export function assertCartCurrent(items,products){
 const quoted=quoteItems(items,products),changes=cartChanges(items,quoted);
 if(changes.length||quoted.some(item=>item._cartBlocked))throw new CartChangedError(quoted,changes);
 return quoted;
}
