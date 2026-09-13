import {configured,sb} from './_supabase.mjs';

const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const clean=v=>typeof v==='string'?v.trim():'';
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const first=(...values)=>values.map(v=>clean(v)).find(Boolean)||null;
const companyKey=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const asEmail=value=>{if(Array.isArray(value))return asEmail(value[0]);if(value&&typeof value==='object')return first(value.email,value.address);return clean(value)||null};

export const CAMPAIGNS={
  nexjud:{taskEnv:'APIFY_TASK_NEXJUD',source:'apify-google-maps',maxItems:60},
  sindcopilot:{taskEnv:'APIFY_TASK_SINDCOPILOT',source:'apify-google-maps',maxItems:60},
  mindsteps:{taskEnv:'APIFY_TASK_MINDSTEPS',source:'apify-google-maps',maxItems:60},
  'health-wallet':{taskEnv:'APIFY_TASK_HEALTH_WALLET',source:'apify-google-maps',maxItems:50},
  mydatamed:{taskEnv:'APIFY_TASK_MYDATAMED',source:'apify-google-maps',maxItems:50},
  mindcompliance:{taskEnv:'APIFY_TASK_MINDCOMPLIANCE',source:'apify-google-maps',maxItems:60},
  'f-insight':{taskEnv:'APIFY_TASK_F_INSIGHT',source:'apify',maxItems:50},
  smartbots:{taskEnv:'APIFY_TASK_SMARTBOTS',source:'apify-google-maps',maxItems:80},
  modo:{taskEnv:'APIFY_TASK_MODO',source:'apify-google-maps',maxItems:80},
  nextgen:{taskEnv:'APIFY_TASK_NEXTGEN',source:'apify',maxItems:60},
  docwallet:{taskEnv:'APIFY_TASK_DOCWALLET',source:'apify',maxItems:50},
  taxagent:{taskEnv:'APIFY_TASK_TAXAGENT',source:'apify',maxItems:50}
};

export const apifyConfigured=()=>Boolean(clean(env('APIFY_TOKEN')));
export const campaign=venture=>CAMPAIGNS[venture]||null;
export const campaignStatus=()=>Object.entries(CAMPAIGNS).map(([venture,c])=>({venture,provider:'apify',providerConfigured:apifyConfigured(),taskConfigured:Boolean(clean(env(c.taskEnv))),automatic:Boolean(apifyConfigured()&&clean(env(c.taskEnv))),source:c.source}));

const fitScore=({phone,email,website,rating,reviewsCount,sourceId})=>{
  let score=30;
  if(phone)score+=20;
  if(email)score+=20;
  if(website)score+=10;
  if(Number(rating)>=4)score+=10;
  if(Number(reviewsCount)>=20)score+=5;
  if(sourceId)score+=5;
  return Math.min(score,100);
};

export function normalizeProspect(item={},venture,source='apify',context={}){
  const company=first(item.company,item.companyName,item.title,item.name,item.organizationName,item.placeName);
  if(!company)return null;
  const email=asEmail(item.contactEmail)||asEmail(item.email)||asEmail(item.emails);
  const phone=first(item.phone,item.phoneNumber,item.phoneUnformatted,item.telephone,item.whatsapp);
  const website=first(item.website,item.websiteUrl,item.urlWebsite,item.domain);
  const address=first(item.address,item.fullAddress,item.streetAddress);
  const city=first(item.city,item.locality);
  const state=first(item.state,item.region,item.stateName);
  const region=first(item.regionLabel,[city,state].filter(Boolean).join(', '));
  const category=first(item.categoryName,item.category,item.industry,item.type);
  const rating=num(item.totalScore??item.rating??item.score);
  const reviewsCount=num(item.reviewsCount??item.reviewCount??item.reviews);
  const sourceId=first(item.placeId,item.googlePlaceId,item.cid,item.sourceId,item.externalId,item.id);
  const mapsUrl=first(item.googleMapsUrl,item.mapsUrl,item.url);
  const keyword=first(item.searchString,item.keyword,item.query,context.keyword);
  const contactName=first(item.contactName,item.ownerName,item.personName,item.decisionMaker);
  const score=fitScore({phone,email,website,rating,reviewsCount,sourceId});
  return {
    venture_slug:venture,
    company,
    contact_name:contactName,
    contact_email:email,
    stage:'lead',
    value_brl:0,
    source:source||'apify',
    next_action:'Fazer primeiro contato',
    metadata:{
      ...(phone?{phone}:{}),
      ...(website?{website}:{}),
      ...(address?{address}:{}),
      ...(region?{region}:{}),
      ...(category?{category}:{}),
      ...(rating!==null?{rating}:{}),
      ...(reviewsCount!==null?{reviewsCount}:{}),
      ...(keyword?{keyword}:{}),
      ...(sourceId?{sourceId}:{}),
      ...(mapsUrl?{sourceUrl:mapsUrl}:{}),
      fitScore:score,
      prospecting:{provider:context.provider||'apify',...(context.runId?{runId:context.runId}:{})}
    }
  };
}

async function recordEvent(venture,eventName,numericValue=null,metadata={}){
  if(!configured)return;
  await sb('av_events',{method:'POST',body:JSON.stringify({venture_slug:venture,event_name:eventName,numeric_value:numericValue,unit:numericValue===null?null:'count',metadata})}).catch(()=>null);
}

export async function ingestProspects({venture,items=[],source='apify',runId=null,keyword=null,provider='apify'}={}){
  if(!CAMPAIGNS[venture]&&!['nexa','ecotracker','connexio','staff'].includes(venture))throw new Error('invalid_venture');
  if(!Array.isArray(items))throw new Error('invalid_items');
  if(!configured)return {received:items.length,inserted:0,duplicates:0,persisted:false,reason:'supabase_not_configured'};
  const capped=items.slice(0,250);
  const normalized=capped.map(item=>normalizeProspect(item,venture,source,{runId,keyword,provider})).filter(Boolean);
  const existingR=await sb(`av_deals?venture_slug=eq.${encodeURIComponent(venture)}&select=company,metadata&limit=5000`);
  const existing=existingR.ok?await existingR.json().catch(()=>[]):[];
  const companyKeys=new Set(existing.map(row=>companyKey(row.company)).filter(Boolean));
  const sourceIds=new Set(existing.map(row=>row?.metadata?.sourceId).filter(Boolean).map(String));
  const fresh=[];
  for(const row of normalized){
    const key=companyKey(row.company),sourceId=row?.metadata?.sourceId?String(row.metadata.sourceId):null;
    if(!key||companyKeys.has(key)||(sourceId&&sourceIds.has(sourceId)))continue;
    companyKeys.add(key);if(sourceId)sourceIds.add(sourceId);fresh.push(row);
  }
  let inserted=[];
  if(fresh.length){
    const r=await sb('av_deals',{method:'POST',body:JSON.stringify(fresh)});
    if(!r.ok)throw new Error(`supabase_insert_failed:${await r.text()}`);
    inserted=await r.json().catch(()=>[]);
  }
  const result={received:capped.length,normalized:normalized.length,inserted:inserted.length,duplicates:normalized.length-inserted.length,persisted:true};
  await recordEvent(venture,'prospecting.batch.ingested',inserted.length,{...result,source,provider,...(runId?{runId}:{})});
  return result;
}

async function apifyFetch(path,init={}){
  const token=clean(env('APIFY_TOKEN'));
  if(!token)throw new Error('apify_not_configured');
  const r=await fetch(`https://api.apify.com/v2/${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'content-type':'application/json',...(init.headers||{})}});
  if(!r.ok)throw new Error(`apify_${r.status}:${await r.text()}`);
  return r;
}

export async function startCampaign(venture){
  const c=campaign(venture);if(!c)throw new Error('campaign_not_found');
  const taskId=clean(env(c.taskEnv));if(!taskId)throw new Error('apify_task_not_configured');
  const r=await apifyFetch(`actor-tasks/${encodeURIComponent(taskId)}/runs`,{method:'POST',body:'{}'});
  const payload=await r.json();const run=payload?.data||payload;
  await recordEvent(venture,'prospecting.run.started',null,{provider:'apify',runId:run?.id||null,status:run?.status||null});
  return {venture,provider:'apify',runId:run?.id||null,status:run?.status||'READY',datasetId:run?.defaultDatasetId||null};
}

export async function latestSuccessfulRun(venture){
  const c=campaign(venture);if(!c)throw new Error('campaign_not_found');
  const taskId=clean(env(c.taskEnv));if(!taskId)throw new Error('apify_task_not_configured');
  const r=await apifyFetch(`actor-tasks/${encodeURIComponent(taskId)}/runs?status=SUCCEEDED&desc=1&limit=1`);
  const payload=await r.json();return payload?.data?.items?.[0]||null;
}

async function runById(runId){
  const r=await apifyFetch(`actor-runs/${encodeURIComponent(runId)}`);const payload=await r.json();return payload?.data||payload;
}

async function wasSynced(venture,runId){
  if(!configured||!runId)return false;
  const r=await sb(`av_events?venture_slug=eq.${encodeURIComponent(venture)}&event_name=eq.prospecting.run.synced&select=metadata&order=occurred_at.desc&limit=25`);
  if(!r.ok)return false;
  const rows=await r.json().catch(()=>[]);return rows.some(row=>String(row?.metadata?.runId||'')===String(runId));
}

export async function syncCampaign(venture,requestedRunId=null){
  const c=campaign(venture);if(!c)throw new Error('campaign_not_found');
  let run=requestedRunId?await runById(requestedRunId):await latestSuccessfulRun(venture);
  if(!run)return {venture,status:'no_successful_run',inserted:0};
  if(run.status!=='SUCCEEDED')return {venture,runId:run.id,status:String(run.status||'UNKNOWN').toLowerCase(),inserted:0};
  if(await wasSynced(venture,run.id))return {venture,runId:run.id,status:'already_synced',inserted:0};
  const datasetId=run.defaultDatasetId;if(!datasetId)throw new Error('dataset_not_found');
  const limit=Math.max(1,Math.min(Number(env('AV_PROSPECTING_MAX_ITEMS')||c.maxItems||50),250));
  const r=await apifyFetch(`datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=${limit}`);
  const items=await r.json();
  const result=await ingestProspects({venture,items,source:c.source,runId:run.id,provider:'apify'});
  await recordEvent(venture,'prospecting.run.synced',result.inserted,{provider:'apify',runId:run.id,datasetId,received:result.received,inserted:result.inserted,duplicates:result.duplicates});
  return {venture,runId:run.id,status:'synced',...result};
}
