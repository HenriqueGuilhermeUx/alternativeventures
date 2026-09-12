document.addEventListener('click',e=>{
 const add=e.target.closest('[data-add]');if(add){openRecordForm(add.dataset.add);return}
 const ed=e.target.closest('[data-edit]');if(ed){openRecordForm(ed.dataset.edit,ed.dataset.id);return}
 const del=e.target.closest('[data-delete]');if(del){deleteRecord(del.dataset.delete,del.dataset.id);return}
});
const views={overview:renderOverview,ventures:renderVentures,control:renderControl,leads:renderLeads,capabilities:renderCapabilities,implementations:renderImplementations,roadmap:renderRoadmap,technology:renderTechnology,finance:renderFinance,growth:renderGrowth,contracts:renderContracts,founder:renderFounder,connectors:renderConnectors};
function currentRoute(){const raw=location.hash.slice(1)||'overview';const [view,param]=raw.split('/');return {view,param:param?decodeURIComponent(param):null}}
async function go(view,param=null){
 if(!views[view]) return;
 state.view=view;
 if(view==='leads') state.leadsFilter=param||'all';
 document.querySelectorAll('#main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const wanted=view==='overview'?'':(view==='leads'&&param?`leads/${encodeURIComponent(param)}`:view);
 if(location.hash.slice(1)!==wanted){location.hash=wanted;return}
 await views[view]();
}
nav.addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)go(b.dataset.view)});
window.addEventListener('hashchange',()=>{const route=currentRoute();go(route.view,route.param)});
{const route=currentRoute();go(route.view,route.param)}
