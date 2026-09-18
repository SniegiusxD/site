/**
 * Motion has two modes, held on <html data-motion>:
 *
 *   full  every animation runs
 *   calm  animations are collapsed (the old prefers-reduced-motion behaviour)
 *
 * The OS preference picks the default, but a visitor can override it and the
 * choice sticks. That override matters here: Windows "adjust for best
 * performance" (and every gaming tweak tool that sets MinAnimate=0) turns off
 * client-area animation, Chrome reports prefers-reduced-motion: reduce, and the
 * whole site goes still with no way back. `data-motion-os="calm"` marks that
 * case so the site can offer the switch instead of just looking dead.
 */
export const MOTION_KEY = 'kr-motion'

export type MotionMode = 'full' | 'calm'

/** Runs before paint, so the first frame already has the right mode. */
export const MOTION_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{
var o=localStorage.getItem('${MOTION_KEY}');
var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
d.dataset.motion=(o==='full'||o==='calm')?o:(r?'calm':'full');
if(r&&!o)d.dataset.motionOs='calm';
}catch(e){d.dataset.motion='full'}})()`
