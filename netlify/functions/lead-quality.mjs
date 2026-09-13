import {verifySession} from './_auth.mjs';
import {enrichVenture} from './_lead-quality.mjs';
import {syncCvmConsultants} from './_cvm-prospecting.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const sessionFrom=req=>{const auth=req.headers.get('authorization')||'';return verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():'')};

export default async req=>{
  if(!sessionFrom(req))return json({error:'unauthorized'},401);
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  let body;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  const action=String(body?.action||'').trim(),venture=String(body?.venture||'').trim();
  try{
    if(action==='enrich')return json(await enrichVenture(venture,Number(body?.limit||5)));
    if(action==='cvm-sync')return json(await syncCvmConsultants(Number(body?.limit||50)));
    return json({error:'invalid_action'},400);
  }catch(error){return json({error:String(error?.message||error)},500)}
};

export const config={path:'/api/lead-quality'};
