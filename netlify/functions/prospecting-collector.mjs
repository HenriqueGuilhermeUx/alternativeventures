import {ACTOR_VENTURES,actorReady,collectActorCampaign} from './_prospecting-actor.mjs';

export const config={schedule:'0 15 * * *'};

export default async()=>{
  const results=[];
  for(const venture of ACTOR_VENTURES){
    if(!actorReady(venture)){results.push({venture,status:'not_configured'});continue}
    try{results.push(await collectActorCampaign(venture))}
    catch(error){results.push({venture,error:String(error?.message||error)})}
  }
  console.log(JSON.stringify({collector:true,results}));
};
