import {verifySession} from './_auth.mjs';
import {configured,sb} from './_supabase.mjs';
const known=new Set(['nexa','ecotracker','nexjud','docwallet','mindcompliance','sindcopilot','health-wallet','mydatamed','f-insight','nextgen','modo','smartbots','staff','mindsteps','taxagent','connexio']);
const stages=new Set(['lead','qualified','meeting','proposal','won','lost']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async (req)=>{
  if(req.method!=='GET') return json({error:'method_not_allowed'},405);
  const auth=req.headers.get('authorization')||''; const session=verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():''); if(!session) return json({error:'unauthorized'},401);
  const url=new URL(req.url); const venture=url.searchParams.get('venture'); const stage=url.searchParams.get('stage');
  if(venture&&!known.has(venture)) return json({error:'invalid_venture'},400);
  if(stage&&!stages.has(stage)) return json({error:'invalid_stage'},400);
  if(!configured) return json([]);
  let path='av_deals?select=*';
  if(venture) path+=`&venture_slug=eq.${encodeURIComponent(venture)}`;
  if(stage) path+=`&stage=eq.${encodeURIComponent(stage)}`;
  path+='&order=updated_at.desc';
  const r=await sb(path); if(!r.ok) return json({error:'supabase_error',details:await r.text()},500);
  return json(await r.json());
}
