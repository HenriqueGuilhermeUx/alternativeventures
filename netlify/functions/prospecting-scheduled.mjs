import {actorReady,startActorCampaign} from './_prospecting-actor.mjs';

export const config={schedule:'0 12 * * 1'};

export default async ()=>{
  const ventures=['nexjud'];
  const results=[];
  for(const venture of ventures){
    if(!actorReady(venture)){results.push({venture,status:'not_configured'});continue}
    try{results.push(await startActorCampaign(venture))}
    catch(error){results.push({venture,error:String(error?.message||error)})}
  }
  return new Response(JSON.stringify({ok:true,scheduled:true,results}),{headers:{'content-type':'application/json'}});
};
