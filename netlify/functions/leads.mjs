import {verifySession} from './_auth.mjs';
import {configured,sb} from './_supabase.mjs';
import {actorEnabled,startActorCampaign,collectActorCampaign} from './_prospecting-actor.mjs';
const known=new Set(['nexa','ecotracker','nexjud','docwallet','mindcompliance','sindcopilot','health-wallet','mydatamed','f-insight','nextgen','modo','smartbots','staff','mindsteps','taxagent','connexio']);
const stages=new Set(['lead','qualified','meeting','proposal','won','lost']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const sessionFrom=req=>{const auth=req.headers.get('authorization')||'';return verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():'')};
export default async(req)=>{
 const session=sessionFrom(req);if(!session)return json({error:'unauthorized'},401);
 if(req.method==='GET'){
  const url=new URL(req.url),venture=url.searchParams.get('venture'),stage=url.searchParams.get('stage');
  if(venture&&!known.has(venture))return json({error:'invalid_venture'},400);if(stage&&!stages.has(stage))return json({error:'invalid_stage'},400);if(!configured)return json([]);
  let path='av_deals?select=*';if(venture)path+=`&venture_slug=eq.${encodeURIComponent(venture)}`;if(stage)path+=`&stage=eq.${encodeURIComponent(stage)}`;path+='&order=updated_at.desc';
  const r=await sb(path);if(!r.ok)return json({error:'supabase_error',details:await r.text()},500);return json(await r.json());
 }
 if(req.method==='POST'){
  let body;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}const venture=String(body?.venture||'').trim();
  if(body?.action==='prospect'){if(!actorEnabled(venture))return json({error:'prospecting_not_enabled_for_venture'},400);try{return json({ok:true,...await startActorCampaign(venture)},202)}catch(error){const message=String(error?.message||error);return json({error:message},message.includes('not_configured')?409:500)}}
  if(body?.action==='collect'){if(!actorEnabled(venture))return json({error:'prospecting_not_enabled_for_venture'},400);try{return json({ok:true,...await collectActorCampaign(venture)})}catch(error){return json({error:String(error?.message||error)},500)}}
  const company=String(body?.company||'').trim();if(!known.has(venture)||!company)return json({error:'invalid_lead'},400);if(!configured)return json({error:'supabase_not_configured'},503);
  const contactName=String(body?.contactName||'').trim()||null,contactEmail=String(body?.contactEmail||'').trim()||null,phone=String(body?.phone||'').trim(),source=String(body?.source||'manual').trim()||'manual',numericValue=Number(body?.value||0);
  const existingR=await sb(`av_deals?venture_slug=eq.${encodeURIComponent(venture)}&company=eq.${encodeURIComponent(company)}&select=id,stage,updated_at&limit=1`);if(existingR.ok){const existing=await existingR.json();if(existing.length)return json({created:false,duplicate:true,deal:existing[0]})}
  const metadata={...(body?.metadata&&typeof body.metadata==='object'?body.metadata:{}),...(phone?{phone}:{}),manual:true};
  const payload={venture_slug:venture,company,contact_name:contactName,contact_email:contactEmail,stage:'lead',value_brl:Number.isFinite(numericValue)?numericValue:0,source,metadata,next_action:'Fazer primeiro contato'};
  const r=await sb('av_deals',{method:'POST',body:JSON.stringify(payload)});if(!r.ok)return json({error:'supabase_error',details:await r.text()},500);const rows=await r.json().catch(()=>[]);return json({created:true,deal:rows[0]||null},201);
 }
 return json({error:'method_not_allowed'},405);
};
