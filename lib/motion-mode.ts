/**
 * Motion has two modes, held on <html data-motion>:
 *
 *   full  every animation runs (the default for everyone)
 *   calm  animations are collapsed
 *
 * The site does NOT follow the operating system's reduced-motion flag, because
 * Windows "adjust for best performance" and every gaming tweak tool turn it on
 * (MinAnimate=0), Chrome reports prefers-reduced-motion, and a normal visitor
 * would land on a page that looks broken with no idea why. Anyone who actually
 * wants stillness switches it off in the footer, and that choice is remembered.
 */
// v2: the first build asked visitors whether to keep the OS setting, and anyone
// who answered "Palikti" had 'calm' stored forever. Animations are the default
// now, so that old answer is ignored and only the footer switch writes this key.
export const MOTION_KEY = 'kr-motion-v2'

export type MotionMode = 'full' | 'calm'

/** Runs before paint, so the first frame already has the right mode. */
export const MOTION_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{
d.dataset.motion=localStorage.getItem('${MOTION_KEY}')==='calm'?'calm':'full';
}catch(e){d.dataset.motion='full'}})()`
