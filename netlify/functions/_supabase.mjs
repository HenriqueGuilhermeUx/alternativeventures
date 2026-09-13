const env = name => globalThis.Netlify?.env?.get?.(name) ?? process.env[name];
const url = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
const key = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
export const configured = Boolean(url && key);
export async function sb(path, init={}){
  if(!configured) return {ok:false,status:503,json:async()=>({})};
  const auth = key.startsWith('eyJ') ? {Authorization:`Bearer ${key}`} : {};
  return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,...auth,'Content-Type':'application/json',Prefer:'return=representation',...(init.headers||{})}});
}
