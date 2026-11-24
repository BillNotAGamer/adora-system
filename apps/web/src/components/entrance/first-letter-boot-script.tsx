/**
 * Route-scoped first-paint initializer for the ADORA CXP-05A homepage entrance.
 *
 * Rendered ONLY on `/` right before <CinematicJourneyExperience />:
 * - Establishes the deep atmospheric obsidian entrance state before the first browser paint
 *   on JS-enabled fresh navigations so the finished homepage never flashes underneath.
 * - Never executes when JavaScript is disabled, preserving the approved no-JS homepage fallback.
 * - Skips immediately on restored scroll positions, anchor links, back/forward cache navigations,
 *   or repeat SPA visits within the same document session.
 * - Includes an automatic 4.8s fail-open watchdog so the homepage can never remain hidden if
 *   client hydration or bundle loading fails.
 */
const FIRST_LETTER_BOOT_CODE = `(function(){try{
if(window.location.pathname!=="/")return;
if(window.__ADORA_CXP05_PLAYED__)return;
if(window.location.hash&&window.location.hash.length>0)return;
if((window.scrollY||window.pageYOffset||0)>16)return;
var nav=performance&&performance.getEntriesByType?performance.getEntriesByType("navigation")[0]:null;
if(nav&&nav.type==="back_forward")return;
var root=document.documentElement;
var motionOff=root.getAttribute("data-motion")==="off";
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
root.dataset.cxp05Entrance=(motionOff||reduce)?"reduced":"pending";
window.setTimeout(function(){
  if(!window.__ADORA_CXP05_OWNED__&&root.dataset.cxp05Entrance&&(root.dataset.cxp05Entrance==="pending"||root.dataset.cxp05Entrance==="reduced")){
    delete root.dataset.cxp05Entrance;
  }
},4800);
}catch(e){}})();`;

export function FirstLetterBootScript() {
  return (
    <script
      id="adora-cxp05-boot"
      dangerouslySetInnerHTML={{ __html: FIRST_LETTER_BOOT_CODE }}
    />
  );
}
