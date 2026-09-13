import {actorReady,startActorCampaign} from './_prospecting-actor.mjs';

export const config={schedule:'0 12 * * 1-4'};

const byDay={
  1:['nexjud','sindcopilot'],
  2:['mindsteps','mindcompliance'],
  3:['health-wallet','mydatamed'],
  4:['smartbots','modo']
};

export default async ()=>{
  const ventures=byDay[new Date().getUTCDay()]||[];
  const results=[];
  for(const venture of ventures){
    if(!actorReady(venture)){results.push({venture,status:'not_configured'});continue}
    try{results.push(await startActorCampaign(venture))}
    catch(error){results.push({venture,error:String(error?.message||error)})}
  }
  console.log(JSON.stringify({scheduled:true,ventures,results}));
};
