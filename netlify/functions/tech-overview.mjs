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
async function repoData(repo){if(!repo)return null;try{const headers={Accept:'application/vnd.github+json','User-Agent':'alternative-ventures-os'};if(process.env.GITHUB_TOKEN)headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;const r=await fetch(`https://api.github.com/repos/${repo}`,{headers});return r.ok?await r.json():null}catch{return null}}
async function probe(url){if(!url)return {health:'unknown',latencyMs:null};const c=new AbortController();const t=setTimeout(()=>c.abort(),6500);const s=Date.now();try{const r=await fetch(url,{redirect:'follow',signal:c.signal});const ms=Date.now()-s;return {health:r.ok?(ms>2500?'degraded':'healthy'):(r.status>=500?'down':'degraded'),latencyMs:ms}}catch{return {health:'down',latencyMs:null}}finally{clearTimeout(t)}}
export default async ()=>{const items=await Promise.all(ventures.map(async([slug,name,repo,url])=>{const [g,h]=await Promise.all([repoData(repo),probe(url)]);return {slug,venture:name,repo,branch:g?.default_branch||null,repoUpdatedAt:g?.pushed_at||g?.updated_at||null,health:h.health,latencyMs:h.latencyMs}}));return new Response(JSON.stringify({items,checkedAt:new Date().toISOString()}),{headers:{'content-type':'application/json','cache-control':'no-store'}})}
