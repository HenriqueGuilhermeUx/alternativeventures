import {configured,sb} from './_supabase.mjs';
const known=new Set(['nexa','ecotracker','nexjud','docwallet','mindcompliance','sindcopilot','health-wallet','mydatamed','f-insight','nextgen','modo','smartbots','staff','mindsteps','taxagent','connexio']);
export default async (req)=>{
  if(req.method!=='POST') return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405});
  const secret=process.env.AVOS_INGEST_KEY; if(secret&&req.headers.get('x-av-os-key')!==secret) return new Response(JSON.stringify({error:'unauthorized'}),{status:401});
  let body; try{body=await req.json()}catch{return new Response(JSON.stringify({error:'invalid_json'}),{status:400})}
  if(!body?.venture||!known.has(body.venture)||!body?.event) return new Response(JSON.stringify({error:'invalid_event'}),{status:400});
  if(!configured) return new Response(JSON.stringify({accepted:true,persisted:false,reason:'supabase_not_configured'}),{status:202,headers:{'content-type':'application/json'}});
  const payload={venture_slug:body.venture,event_name:body.event,occurred_at:body.occurredAt||new Date().toISOString(),numeric_value:typeof body.value==='number'?body.value:null,unit:body.unit||null,metadata:body.metadata||{}};
  const r=await sb('av_events',{method:'POST',body:JSON.stringify(payload)}); if(!r.ok)return new Response(await r.text(),{status:500});
  return new Response(JSON.stringify({accepted:true,persisted:true}),{status:201,headers:{'content-type':'application/json'}})
}
