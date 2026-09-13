import {ingestProspects,CAMPAIGNS} from './_prospecting.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];

export default async req=>{
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const secret=env('AVOS_INGEST_KEY');
  if(!secret||req.headers.get('x-av-os-key')!==secret)return json({error:'unauthorized'},401);
  let body;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  const venture=String(body?.venture||'').trim();
  if(!venture||(!CAMPAIGNS[venture]&&!['nexa','ecotracker','connexio','staff'].includes(venture)))return json({error:'invalid_venture'},400);
  const items=Array.isArray(body?.items)?body.items:(body?.item?[body.item]:[]);
  if(!items.length)return json({error:'items_required'},400);
  try{
    const result=await ingestProspects({venture,items,source:String(body?.source||'apify').trim()||'apify',runId:body?.runId||null,keyword:body?.keyword||null,provider:body?.provider||'external'});
    return json({ok:true,venture,...result},201);
  }catch(error){return json({error:String(error?.message||error)},500)}
};
