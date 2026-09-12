import {configured,sb} from './_supabase.mjs';
const known=new Set(['nexa','ecotracker','nexjud','docwallet','mindcompliance','sindcopilot','health-wallet','mydatamed','f-insight','nextgen','modo','smartbots','staff','mindsteps','taxagent','connexio']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
export default async (req)=>{
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  const secret=process.env.AVOS_INGEST_KEY; if(secret&&req.headers.get('x-av-os-key')!==secret) return json({error:'unauthorized'},401);
  let body; try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  if(!body?.venture||!known.has(body.venture)||!String(body?.company||'').trim()) return json({error:'invalid_lead'},400);
  if(!configured) return json({accepted:true,persisted:false,reason:'supabase_not_configured'},202);
  const company=String(body.company).trim();
  const existingR=await sb(`av_deals?venture_slug=eq.${encodeURIComponent(body.venture)}&company=eq.${encodeURIComponent(company)}&select=id,stage,updated_at&limit=1`);
  if(existingR.ok){const existing=await existingR.json();if(existing.length)return json({accepted:true,persisted:false,duplicate:true,deal:existing[0]},200)}
  const numericValue=Number(body.value||0);
  const payload={venture_slug:body.venture,company,contact_name:body.contactName||null,contact_email:body.contactEmail||null,stage:'lead',value_brl:Number.isFinite(numericValue)?numericValue:0,source:body.source||null,metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{}};
  const r=await sb('av_deals',{method:'POST',body:JSON.stringify(payload)}); if(!r.ok)return new Response(await r.text(),{status:500});
  const rows=await r.json().catch(()=>[]);
  return json({accepted:true,persisted:true,deal:rows[0]||null},201)
}
