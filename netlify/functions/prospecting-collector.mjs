import {collectActorCampaign} from './_prospecting-actor.mjs';
export const config={schedule:'0 15 * * *'};
export default async()=>{try{return new Response(JSON.stringify(await collectActorCampaign('nexjud')),{headers:{'content-type':'application/json'}})}catch(error){return new Response(JSON.stringify({ok:false,error:String(error?.message||error)}),{headers:{'content-type':'application/json'}})}};
