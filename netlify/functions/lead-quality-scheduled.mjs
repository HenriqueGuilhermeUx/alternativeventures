import {enrichVenture} from './_lead-quality.mjs';

export const config={schedule:'30 15 * * 1-5'};

const byDay={
  1:['nexjud','sindcopilot'],
  2:['mindsteps','mindcompliance'],
  3:['health-wallet','mydatamed'],
  4:['smartbots','modo'],
  5:['mindcompliance','nexjud']
};

export default async()=>{
  const ventures=byDay[new Date().getUTCDay()]||[];
  const results=await Promise.all(ventures.map(v=>enrichVenture(v,4)));
  console.log(JSON.stringify({leadQuality:true,ventures,results}));
};
