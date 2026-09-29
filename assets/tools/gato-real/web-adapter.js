/* Web-only compatibility layer for the portfolio demo.
   The extension's actual UI/core files remain unchanged. */
(() => {
  if (window.chrome && chrome.storage && chrome.storage.local) return;
  const KEY='gdh-portfolio-demo-v1';
  const listeners=[];
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return {}}};
  const write=v=>sessionStorage.setItem(KEY,JSON.stringify(v));
  const local={
    async get(keys){const all=read();if(keys==null)return all;if(typeof keys==='string')return {[keys]:all[keys]};if(Array.isArray(keys))return Object.fromEntries(keys.filter(k=>k in all).map(k=>[k,all[k]]));const out={...keys};for(const k of Object.keys(keys||{}))if(k in all)out[k]=all[k];return out},
    async set(obj){const old=read(),next={...old,...obj};write(next);const changes={};for(const [k,v] of Object.entries(obj))changes[k]={oldValue:old[k],newValue:v};listeners.forEach(fn=>fn(changes,'local'))},
    async remove(keys){keys=Array.isArray(keys)?keys:[keys];const old=read(),next={...old},changes={};for(const k of keys){if(k in next){changes[k]={oldValue:next[k],newValue:undefined};delete next[k]}}write(next);listeners.forEach(fn=>fn(changes,'local'))},
    async clear(){const old=read();sessionStorage.removeItem(KEY);const changes=Object.fromEntries(Object.entries(old).map(([k,v])=>[k,{oldValue:v,newValue:undefined}]));listeners.forEach(fn=>fn(changes,'local'))}
  };
  window.chrome={storage:{local,onChanged:{addListener(fn){listeners.push(fn)}}},tabs:{create({url}){window.open(url,'_blank','noopener')}},runtime:{getURL:p=>new URL(p,location.href).href}};
})();