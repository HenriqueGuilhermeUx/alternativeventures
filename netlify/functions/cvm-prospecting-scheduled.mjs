import {syncCvmConsultants} from './_cvm-prospecting.mjs';

export const config={schedule:'0 13 * * 5'};

export default async()=>{
  const result=await syncCvmConsultants(50);
  console.log(JSON.stringify({cvmProspecting:true,...result}));
};
