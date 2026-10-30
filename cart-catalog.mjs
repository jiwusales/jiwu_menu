// Shared public-cart rules. This module never reads customer or order data.
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFKC');
const restock=v=>['S☹LD OUT','SOLD OUT','補貨登記','補登'].includes(text(v).toUpperCase());
export function catalogProducts(table,sheet){
 const labels=table.cols.map(c=>text(c.label));let group='';
 return table.rows.flatMap(row=>{
  const get=name=>{const i=labels.indexOf(name);return i<0?'':text(row.c?.[i]?.v??row.c?.[i]?.f)};
  group=get('團名')||group;const name=get('名稱');if(!name)return sheet!=='商品庫存'&&group?[{sheet,group,_groupOnly:true}]:[];
  let config={};try{config=JSON.parse(get('開團設定')||'{}')}catch{}
  return [{recordId:row.recordId||null,masterId:row.masterId||'',sheet,group:sheet==='商品庫存'?get('IP'):group,name,role:get('角色'),url:get('商品網址'),sn:get('貨號'),id:get('商品ID'),format:get('格式'),price:get('售價'),stock:get('庫存'),shop:get('店面'),non:get('非現'),status:get('狀態'),listing:get('目錄狀態'),hidden:config.draftHidden===true||(Number(config.visibilityVersion)>=2&&config.visible===false),paused:/^(true|1|是)$/i.test(get('暫停收單'))}];
 });
}
const launchSheets=new Set(['最新開團','尚未上架','景品開團']);
const sourceOf=item=>text(item.groupName||item.group||item.ipName||item.ip);
const hiddenProduct=p=>p.hidden||p.listing==='下架'||(norm(p.stock).toLowerCase()==='x'&&p.listing!=='上架');
function inventoryFallbackMatches(item,products){
 const sku=text(item.sn),url=text(item.url),master=text(item.productMasterId);
 if(!master&&!sku&&!url)return [];
 let matches=products.filter(p=>p.sheet==='商品庫存'&&!p._groupOnly&&(master?p.masterId===master:sku?p.sn===sku:p.url===url&&text(item.name)===p.name&&text(item.role)===p.role));
 if(matches.length>1&&text(item.role))matches=matches.filter(p=>p.role===text(item.role));
 if(text(item.format))matches=matches.filter(p=>norm(p.format)===norm(item.format));
 if(matches.length>1&&text(item.selectedSize))matches=matches.filter(p=>p.format.split(/[\/／、,，;；\s]+/).includes(text(item.selectedSize)));
 return matches;
}
function originalSource(item,products){
 if(text(item._cartOriginalGroup))return {group:text(item._cartOriginalGroup),sheet:launchSheets.has(item._cartOriginalSheet)?item._cartOriginalSheet:'最新開團',id:text(item._cartOriginalItemId)};
 const source=sourceOf(item),sheet=text(item.catalogSheet);
 if(launchSheets.has(sheet)||text(item.launchItemId)||(!sheet&&!products.some(p=>p.sheet==='商品庫存'&&p.group===source)))return {group:source,sheet:launchSheets.has(sheet)?sheet:'最新開團',id:text(item.launchItemId)};
 return null;
}
function sourceMetadata(item,origin){return {...item,_cartOriginalGroup:origin.group,_cartOriginalSheet:origin.sheet,_cartOriginalItemId:origin.id};}
function orphanRestock(item,origin,product){
 return {...sourceMetadata(item,origin),catalogSheet:origin.sheet,launchItemId:'',groupName:origin.group,group:origin.group,ipName:origin.group,ip:origin.group,...(product?{price:product.price}:{}),currentStatus:'補貨登記',tagBg:'#3a3a3a',tagColor:'#fff',_cartOrphanRestock:true,_cartRestockIntent:true,_cartBlocked:false,_cartIssue:'原開團已不存在，一般目錄未上架，沿用原團名補貨登記'};
}
export function quoteItems(items,products){
 return items.map(originalItem=>{
  let item=originalItem;
  const source=sourceOf(item),id=text(item.launchItemId),sheet=text(item.catalogSheet);
  let matches=products.filter(p=>(!sheet||sheet===p.sheet)&&(item.productMasterId?p.masterId===text(item.productMasterId)&&source===p.group&&(id?p.id===id:true):id?p.id===id:source===p.group&&text(item.name)===p.name&&text(item.role)===p.role));
  if(id&&source)matches=matches.filter(p=>p.group===source);
  if(text(item.sn))matches=matches.filter(p=>p.sn===text(item.sn));
  if(text(item.format))matches=matches.filter(p=>norm(p.format)===norm(item.format));
  if(matches.length>1&&text(item.selectedSize))matches=matches.filter(p=>p.format.split(/[\/／、,，;；\s]+/).includes(text(item.selectedSize)));
  const origin=originalSource(item,products),groupGone=origin&&!products.some(p=>launchSheets.has(p.sheet)&&p.group===origin.group);
  if(!matches.length&&groupGone){
   const inventory=inventoryFallbackMatches(item,products);
   if(inventory.length>1)return {...item,_cartOrphanRestock:false,_cartBlocked:true,_cartIssue:'一般目錄有多筆相同商品，請重新確認後加入'};
   const next=inventory[0];
   if(!next||hiddenProduct(next)||norm(next.price).toLowerCase()==='n')return orphanRestock(item,origin,next);
   if(!next.group)return {...item,_cartOrphanRestock:false,_cartBlocked:true,_cartIssue:'一般目錄缺少 IP 名稱，請聯絡官方 LINE'};
   item={...sourceMetadata(item,origin),catalogSheet:'商品庫存',launchItemId:'',groupName:next.group,group:next.group,ipName:next.group,ip:next.group};matches=inventory;
  }
  if(matches.length===1&&matches[0].sheet==='商品庫存'&&groupGone&&(hiddenProduct(matches[0])||norm(matches[0].price).toLowerCase()==='n'))return orphanRestock(item,origin,matches[0]);
  const priorIntent=typeof item._cartRestockIntent==='boolean'?item._cartRestockIntent:restock(item.currentStatus);
  if(matches.length!==1)return {...item,_cartRestockIntent:priorIntent,_cartOrphanRestock:false,_cartBlocked:true,_cartIssue:matches.length?'商品有多筆相同資料，請移除後重新加入':'商品已下架或無法確認，請移除後重新加入'};
  const p=matches[0],stock=norm(p.stock).toLowerCase(),listing=p.listing;
  const hidden=hiddenProduct(p);
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
  return {...item,...(p.masterId?{productMasterId:p.masterId,catalogRecordId:p.recordId,name:p.name,role:p.role}:{}),catalogSheet:p.sheet,price:p.price,stock:p.stock,colStock:p.stock,colShop:p.shop,colNonStock:p.non,status:p.status,currentStatus,tagBg,tagColor,_cartRestockIntent:hidden||soldOut||priorIntent,_cartOrphanRestock:false,_cartBlocked:blocked,_cartIssue:issue};
 });
}
export function cartChanges(before,after){
 return after.flatMap((item,i)=>{
  const old=before[i],changes=[];
  if(sourceOf(old)!==sourceOf(item))changes.push('登記來源 '+sourceOf(old)+' → '+sourceOf(item));
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
