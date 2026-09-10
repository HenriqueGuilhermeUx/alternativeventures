import { verifySession } from './_auth.mjs';
import {configured,sb} from './_supabase.mjs';
export default async (req)=>{
 const auth=req.headers.get('authorization')||''; const session=verifySession(auth.startsWith('Bearer ')?auth.slice(7).trim():''); if(!session) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(!configured) return new Response(JSON.stringify({cash:[],deals:[],contracts:[],eventCount:0,configured:false}),{headers:{'content-type':'application/json'}});
  const since=new Date(Date.now()-86400000).toISOString();
  const [cashR,dealsR,contractsR,eventsR]=await Promise.all([
    sb('av_cash_events?select=*&order=occurred_at.desc&limit=250'),
    sb('av_deals?select=*&order=updated_at.desc&limit=250'),
    sb('av_contracts?select=*&order=updated_at.desc&limit=250'),
    sb(`av_events?select=id&occurred_at=gte.${encodeURIComponent(since)}`,{headers:{Prefer:'count=exact'}})
  ]);
  const [cash,deals,contracts]=await Promise.all([cashR.ok?cashR.json():[],dealsR.ok?dealsR.json():[],contractsR.ok?contractsR.json():[]]);
  const countHeader=eventsR.headers.get('content-range')||''; const eventCount=Number(countHeader.split('/')[1]||0);
  return new Response(JSON.stringify({cash,deals,contracts,eventCount,configured:true}),{headers:{'content-type':'application/json','cache-control':'no-store'}})
}
