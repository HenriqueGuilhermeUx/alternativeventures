import {configured,sb} from './_supabase.mjs';
import {ingestProspects} from './_prospecting.mjs';

const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const actor=()=>String(env('APIFY_ACTOR_ID')||'compass~crawler-google-places').trim();
const token=()=>String(env('APIFY_TOKEN')||'').trim();

export const ACTOR_CAMPAIGNS={
  nexjud:{maxItems:50,regions:['Santos, SP','São Paulo, SP'],keywords:['escritório de advocacia','advocacia empresarial','advogado empresarial','advogado tributário']},
  sindcopilot:{maxItems:40,regions:['Santos, SP','São Paulo, SP'],keywords:['administradora de condomínios','administração condominial','síndico profissional']},
  mindsteps:{maxItems:40,regions:['Santos, SP','São Paulo, SP'],keywords:['escola particular','colégio particular','educação infantil particular']},
  mindcompliance:{maxItems:40,regions:['Santos, SP','São Paulo, SP'],keywords:['escritório de contabilidade','medicina do trabalho','consultoria de RH','segurança do trabalho']},
  'health-wallet':{maxItems:35,regions:['Santos, SP','São Paulo, SP'],keywords:['clínica médica','laboratório de análises clínicas','clínica de diagnóstico']},
  mydatamed:{maxItems:35,regions:['Santos, SP','São Paulo, SP'],keywords:['clínica médica','centro médico','consultório médico']},
  smartbots:{maxItems:50,regions:['Santos, SP','São Paulo, SP'],keywords:['clínica odontológica','clínica de estética','imobiliária','pet shop','salão de beleza']},
  modo:{maxItems:50,regions:['Santos, SP','São Paulo, SP'],keywords:['restaurante','academia','clínica de estética','pet shop','salão de beleza']}
};

export const ACTOR_VENTURES=Object.keys(ACTOR_CAMPAIGNS);

const event=async(venture,name,metadata={},value=null)=>{if(configured)await sb('av_events',{method:'POST',body:JSON.stringify({venture_slug:venture,event_name:name,numeric_value:value,unit:value===null?null:'count',metadata})}).catch(()=>null)};
const apify=async(path,init={})=>{
  if(!token())throw new Error('apify_not_configured');
  const r=await fetch(`https://api.apify.com/v2/${path}`,{...init,headers:{Authorization:`Bearer ${token()}`,'content-type':'application/json',...(init.headers||{})}});
  if(!r.ok)throw new Error(`apify_${r.status}:${await r.text()}`);return r;
};

export const actorReady=venture=>Boolean(token()&&ACTOR_CAMPAIGNS[venture]);
export const actorEnabled=venture=>Boolean(ACTOR_CAMPAIGNS[venture]);

export async function startActorCampaign(venture){
  const c=ACTOR_CAMPAIGNS[venture];if(!c)throw new Error('campaign_not_found');
  const searchStringsArray=c.keywords.flatMap(k=>c.regions.map(r=>`${k} em ${r}`));
  const input={searchStringsArray,maxCrawledPlacesPerSearch:Math.max(3,Math.ceil(c.maxItems/searchStringsArray.length)),language:'pt-BR',skipClosedPlaces:true};
  const r=await apify(`acts/${encodeURIComponent(actor())}/runs`,{method:'POST',body:JSON.stringify(input)});
  const payload=await r.json(),run=payload?.data||payload;
  await event(venture,'prospecting.run.started',{provider:'apify',mode:'actor',runId:run?.id||null,status:run?.status||null,keywords:c.keywords,regions:c.regions});
  return {venture,runId:run?.id||null,status:run?.status||'READY',maxItems:c.maxItems};
}

async function latestPendingRunId(venture){
  if(!configured)return null;
  const r=await sb(`av_events?venture_slug=eq.${encodeURIComponent(venture)}&event_name=eq.prospecting.run.started&select=metadata,occurred_at&order=occurred_at.desc&limit=10`);if(!r.ok)return null;
  const started=await r.json().catch(()=>[]);
  const s=await sb(`av_events?venture_slug=eq.${encodeURIComponent(venture)}&event_name=eq.prospecting.run.synced&select=metadata&order=occurred_at.desc&limit=25`);const synced=s.ok?await s.json().catch(()=>[]):[];
  const done=new Set(synced.map(x=>String(x?.metadata?.runId||'')).filter(Boolean));
  return started.map(x=>String(x?.metadata?.runId||'')).find(id=>id&&!done.has(id))||null;
}

export async function collectActorCampaign(venture){
  const c=ACTOR_CAMPAIGNS[venture];if(!c)throw new Error('campaign_not_found');
  const runId=await latestPendingRunId(venture);if(!runId)return {venture,status:'no_pending_run',inserted:0};
  const rr=await apify(`actor-runs/${encodeURIComponent(runId)}`),rp=await rr.json(),run=rp?.data||rp;
  if(run.status!=='SUCCEEDED')return {venture,runId,status:String(run.status||'UNKNOWN').toLowerCase(),inserted:0};
  if(!run.defaultDatasetId)throw new Error('dataset_not_found');
  const limit=Math.max(1,Math.min(Number(env('AV_PROSPECTING_MAX_ITEMS')||c.maxItems),250));
  const dr=await apify(`datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json&limit=${limit}`),items=await dr.json();
  const result=await ingestProspects({venture,items,source:'apify-google-maps',runId,provider:'apify'});
  await event(venture,'prospecting.run.synced',{provider:'apify',mode:'actor',runId,datasetId:run.defaultDatasetId,received:result.received,duplicates:result.duplicates},result.inserted);
  return {venture,runId,status:'synced',...result};
}
