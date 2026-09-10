import { verifySession } from './_auth.mjs';
const ventures = [
 ['nexa','Nexa',['HenriqueGuilhermeUx/nexa-site','HenriqueGuilhermeUx/nexa-mobile','HenriqueGuilhermeUx/nexa-backend1']],
 ['ecotracker','EcoTracker',['HenriqueGuilhermeUx/ecotracker']],
 ['nexjud','NexJud',['HenriqueGuilhermeUx/nexjud']],
 ['docwallet','DocWallet',['HenriqueGuilhermeUx/docwallet','HenriqueGuilhermeUx/docwallet-backend']],
 ['mindcompliance','MindCompliance / NR1Check',['HenriqueGuilhermeUx/nr1check']],
 ['sindcopilot','SindCopilot',['HenriqueGuilhermeUx/sindcopilot']],
 ['health-wallet','Health Wallet',['HenriqueGuilhermeUx/healthwallet','HenriqueGuilhermeUx/healthwallet-ocr-api']],
 ['mydatamed','MyDataMed',['HenriqueGuilhermeUx/mydatamed']],
 ['f-insight','F-Insight',['HenriqueGuilhermeUx/f-insight','HenriqueGuilhermeUx/f-insight-api']],
 ['nextgen','NextGen Assets',['HenriqueGuilhermeUx/nextgenassets']],
 ['modo','MODO',['HenriqueGuilhermeUx/modo']],
 ['staff','Staff',['HenriqueGuilhermeUx/smart-bot-staff']],
 ['mindsteps','MindSteps',['HenriqueGuilhermeUx/mindsteps-tutoria','HenriqueGuilhermeUx/mindsteps-backend']],
 ['taxagent','TaxAgent',['HenriqueGuilhermeUx/TaxAgent']],
 ['connexio','Connexio',['HenriqueGuilhermeUx/connexio']]
];
function headers(){const h={Accept:'application/vnd.github+json','User-Agent':'alternative-ventures-os','X-GitHub-Api-Version':'2022-11-28'};if(process.env.GITHUB_TOKEN)h.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;return h}
async function commits(repo){
 try{
  const r=await fetch(`https://api.github.com/repos/${repo}/commits?per_page=3`,{headers:headers()});
  if(!r.ok)return [];
  const rows=await r.json();
  return rows.map(x=>({repo,sha:x.sha?.slice(0,7),fullSha:x.sha,message:(x.commit?.message||'').split('\n')[0],date:x.commit?.committer?.date||x.commit?.author?.date,author:x.commit?.author?.name||x.author?.login||'',url:x.html_url}));
 }catch{return []}
}
export default async (req)=>{
 const auth=req.headers.get('authorization')||''; const session=verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():''); if(!session) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
 const items=[];
 for(const [slug,venture,repos] of ventures){
   const batches=await Promise.all(repos.map(commits));
   for(const row of batches.flat()) items.push({...row,slug,venture});
 }
 items.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
 return new Response(JSON.stringify({items:items.slice(0,80),checkedAt:new Date().toISOString()}),{headers:{'content-type':'application/json','cache-control':'no-store'}})
}
