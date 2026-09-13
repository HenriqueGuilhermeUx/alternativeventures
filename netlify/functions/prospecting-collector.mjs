import {campaignStatus,syncCampaign} from './_prospecting.mjs';

export const config={schedule:'0 15 * * *'};

export default async ()=>{
  const enabled=campaignStatus().filter(c=>c.automatic);
  const results=[];
  for(const item of enabled){
    try{results.push(await syncCampaign(item.venture))}
    catch(error){results.push({venture:item.venture,error:String(error?.message||error)})}
  }
  return new Response(JSON.stringify({ok:true,scheduled:true,checked:results.length,results}),{headers:{'content-type':'application/json'}});
};
