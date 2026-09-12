import {verifySession} from './_auth.mjs';
import {configured,sb} from './_supabase.mjs';
const stages=new Set(['lead','qualified','meeting','proposal','won','lost']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async (req)=>{
  if(req.method!=='PATCH') return json({error:'method_not_allowed'},405);
  const auth=req.headers.get('authorization')||''; const session=verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():''); if(!session) return json({error:'unauthorized'},401);
  let body; try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  if(!body?.id) return json({error:'missing_id'},400);
  if(body.stage!==undefined&&!stages.has(body.stage)) return json({error:'invalid_stage'},400);
  const patch={updated_at:new Date().toISOString()};
  if(body.stage!==undefined) patch.stage=body.stage;
  if(Object.hasOwn(body,'nextAction')) patch.next_action=body.nextAction||null;
  if(Object.hasOwn(body,'owner')) patch.owner=body.owner||null;
  if(Object.keys(patch).length===1) return json({error:'no_changes'},400);
  if(!configured) return json({updated:false,reason:'supabase_not_configured'},503);
  const r=await sb(`av_deals?id=eq.${encodeURIComponent(body.id)}`,{method:'PATCH',body:JSON.stringify(patch)}); if(!r.ok) return json({error:'supabase_error',details:await r.text()},500);
  const rows=await r.json().catch(()=>[]); if(!rows.length) return json({error:'lead_not_found'},404);
  return json({updated:true,deal:rows[0]});
}
