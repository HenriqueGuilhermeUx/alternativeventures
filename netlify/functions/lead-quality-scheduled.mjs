import {enrichPortfolio} from './_lead-quality.mjs';

export const config={schedule:'30 15 * * 1-5'};

export default async()=>{
  const result=await enrichPortfolio(2);
  console.log(JSON.stringify({leadQuality:true,...result}));
};
