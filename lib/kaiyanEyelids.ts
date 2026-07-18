// Shared eyelid geometry for the Hero v4 "火种照心" blink transition.
//
// HeroKaiyan owns the eyelid-CLOSE animation (Act One → full black). ActGate
// owns a short-lived transition layer that continues the eyelid-OPEN
// animation over the newly-revealed main site. Both need to draw the exact
// same curved eyelid shape so the handoff between the two components is
// visually seamless (no shape jump at the moment HeroKaiyan unmounts and the
// transition layer mounts in its place).
export const EYELID_TOP_VH = 0.78;
export const EYELID_BOTTOM_VH = 0.34;

export function buildEyelidClipPaths(vw: number, vh: number) {
  const hTop = vh * EYELID_TOP_VH;
  const hBottom = vh * EYELID_BOTTOM_VH;
  const overlapPx = Math.max(0, hTop + hBottom - vh);
  const droopTop = overlapPx * 0.62;
  const bulgeBottom = overlapPx * 0.28;

  const topPath =
    `M0,0 L0,${hTop.toFixed(1)} ` +
    `Q${(vw / 2).toFixed(1)},${(hTop - 2 * droopTop).toFixed(1)} ${vw.toFixed(1)},${hTop.toFixed(1)} ` +
    `L${vw.toFixed(1)},0 Z`;
  const bottomPath =
    `M0,${hBottom.toFixed(1)} L0,0 ` +
    `Q${(vw / 2).toFixed(1)},${(2 * bulgeBottom).toFixed(1)} ${vw.toFixed(1)},0 ` +
    `L${vw.toFixed(1)},${hBottom.toFixed(1)} Z`;

  return { topPath, bottomPath, hTop, hBottom };
}
