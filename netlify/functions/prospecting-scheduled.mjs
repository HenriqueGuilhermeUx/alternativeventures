import {CAMPAIGNS,campaignStatus,startCampaign} from './_prospecting.mjs';

export const config={schedule:'0 12 * * 1'};

export default async ()=>{
  const enabled=campaignStatus().filter(c=>c.automatic&&CAMPAIGNS[c.venture]);
  const results=[];
  for(const item of enabled){
    try{results.push(await startCampaign(item.venture))}
    catch(error){results.push({venture:item.venture,error:String(error?.message||error)})}
  }
  return new Response(JSON.stringify({ok:true,scheduled:true,started:results.length,results}),{headers:{'content-type':'application/json'}});
};
