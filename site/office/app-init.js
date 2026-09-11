document.addEventListener('click',e=>{
 const add=e.target.closest('[data-add]');if(add){openRecordForm(add.dataset.add);return}
 const ed=e.target.closest('[data-edit]');if(ed){openRecordForm(ed.dataset.edit,ed.dataset.id);return}
 const del=e.target.closest('[data-delete]');if(del){deleteRecord(del.dataset.delete,del.dataset.id);return}
});
const views={overview:renderOverview,ventures:renderVentures,control:renderControl,capabilities:renderCapabilities,implementations:renderImplementations,roadmap:renderRoadmap,technology:renderTechnology,finance:renderFinance,growth:renderGrowth,contracts:renderContracts,founder:renderFounder,connectors:renderConnectors};
async function go(view){state.view=view;document.querySelectorAll('#main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));location.hash=view==='overview'?'':view;await views[view]();}
nav.addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)go(b.dataset.view)});
window.addEventListener('hashchange',()=>{const v=location.hash.slice(1)||'overview';if(views[v])go(v)});
go(location.hash.slice(1)||'overview');
