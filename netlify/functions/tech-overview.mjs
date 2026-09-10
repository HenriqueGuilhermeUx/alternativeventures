import { verifySession } from './_auth.mjs';
const ventures=[
 ['nexa','Nexa','HenriqueGuilhermeUx/nexa-site','https://trynexa.com.br'],
 ['ecotracker','EcoTracker','HenriqueGuilhermeUx/ecotracker','https://ecotracker-api-cik7.onrender.com/api/health'],
 ['nexjud','NexJud','HenriqueGuilhermeUx/nexjud','https://nexjudsolucoes.com.br'],
 ['docwallet','DocWallet','HenriqueGuilhermeUx/docwallet','https://docwallet.netlify.app'],
 ['mindcompliance','MindCompliance / NR1Check','HenriqueGuilhermeUx/nr1check','https://nr1check-hx9wyw7b.manus.space/'],
 ['sindcopilot','SindCopilot','HenriqueGuilhermeUx/sindcopilot','https://sindcopilot-smupztac.manus.space/'],
 ['health-wallet','Health Wallet','HenriqueGuilhermeUx/healthwallet','https://healthwallet1.netlify.app'],
 ['mydatamed','MyDataMed','HenriqueGuilhermeUx/mydatamed','https://mydatamed.com'],
 ['f-insight','F-Insight','HenriqueGuilhermeUx/f-insight','https://f-insight.netlify.app'],
 ['nextgen','NextGen Assets','HenriqueGuilhermeUx/nextgenassets','https://nextgenassets.com.br'],
 ['modo','MODO','HenriqueGuilhermeUx/modo','https://modo-api-3m10.onrender.com/health'],
 ['smartbots','SmartBots',null,'https://smartbots.club'],
 ['staff','Staff','HenriqueGuilhermeUx/smart-bot-staff',null],
 ['mindsteps','MindSteps','HenriqueGuilhermeUx/mindsteps-tutoria',null],
 ['taxagent','TaxAgent','HenriqueGuilhermeUx/TaxAgent',null],
 ['connexio','Connexio','HenriqueGuilhermeUx/connexio',null]
];
function env(name){try{return globalThis.Netlify?.env?.get?.(name)||process.env[name]||''}catch{return process.env[name]||''}}
async function repoData(repo){if(!repo)return null;try{const headers={Accept:'application/vnd.github+json','User-Agent':'alternative-ventures-os'};const token=env('GITHUB_TOKEN');if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch(`https://api.github.com/repos/${repo}`,{headers});return r.ok?await r.json():null}catch{return null}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function probeOnce(url){
 const c=new AbortController();const t=setTimeout(()=>c.abort(),7000);const s=Date.now();
 try{const r=await fetch(url,{redirect:'follow',signal:c.signal,headers:{'user-agent':'AV-OS-Health/1.0','cache-control':'no-cache'}});return {ok:r.ok,status:r.status,latencyMs:Date.now()-s,error:null}}
 catch(e){return {ok:false,status:null,latencyMs:null,error:e?.name||'fetch_error'}}finally{clearTimeout(t)}
}
async function probe(url){
 if(!url)return {health:'unknown',latencyMs:null,httpStatus:null,attempts:0,recovered:false};
 const first=await probeOnce(url);
 if(first.ok)return {health:first.latencyMs>2500?'degraded':'healthy',latencyMs:first.latencyMs,httpStatus:first.status,attempts:1,recovered:false};
 await sleep(900);
 const second=await probeOnce(url);
 if(second.ok)return {health:'degraded',latencyMs:second.latencyMs,httpStatus:second.status,attempts:2,recovered:true};
 const status=second.status??first.status;
 const latency=second.latencyMs??first.latencyMs;
 return {health:status&&status<500?'degraded':'down',latencyMs:latency,httpStatus:status,attempts:2,recovered:false};
}
export default async (req)=>{
 const auth=req.headers.get('authorization')||''; const session=verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():''); if(!session) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
 const items=await Promise.all(ventures.map(async([slug,name,repo,url])=>{const [g,h]=await Promise.all([repoData(repo),probe(url)]);return {slug,venture:name,repo,branch:g?.default_branch||null,repoUpdatedAt:g?.pushed_at||g?.updated_at||null,health:h.health,latencyMs:h.latencyMs,httpStatus:h.httpStatus,attempts:h.attempts,recovered:h.recovered}}));
 return new Response(JSON.stringify({items,checkedAt:new Date().toISOString()}),{headers:{'content-type':'application/json','cache-control':'no-store'}})
}
