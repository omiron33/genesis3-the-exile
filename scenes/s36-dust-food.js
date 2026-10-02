// 36 · "earth will be your food / through all your days."
// Close at the level of the crust: his dusty head low on the cracked earth, snout in the dust, the
// tongue flicking down into it and coming back grey. Then the camera rises and draws back as he
// slides away across the endless cracked field toward the white horizon, where dust devils turn.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const RS = 0.022;
const SUN = V.nrm([0.45, 0.8, 0.35]);

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const tThrough = (ws.find((w) => /through/i.test(w.w)) ?? { start: P.from + 2.9 }).start;
  const tFood = (ws.find((w) => /food/i.test(w.w)) ?? { start: P.from + 2.4 }).start;
  const D = P.to - P.from;
  // a gently winding line away from the lens toward the horizon (+z)
  const path = pathFn((u) => [0.07 * Math.sin(2 * Math.PI * u / 0.7) + 0.08 * u, RS * 0.5, u], -3, 30, 8000);
  const sOfZ = (z) => { let lo = 0, hi = path.length; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.at(m)[2] < z) lo = m; else hi = m; } return lo; };
  const s0 = sOfZ(0.0);
  // he rests, tasting the dust, then goes, gathering speed
  const tGo = tThrough - 0.6;
  const sAt = (t) => { const x = Math.max(0, t - tGo); return s0 + 0.012 * (t - P.from) + 0.5 * 0.22 * Math.min(x, 1.5) * Math.min(x, 1.5) / 1.5 + 0.22 * Math.max(0, x - 1.5) * 1.0 + (x > 1.5 ? 0.22 * 0.75 : 0) - (x > 1.5 ? 0.22 * 0.75 : 0); };
  const poseT = (t) => {
    const sh = sAt(t);
    const base = path.at(sh);
    // early on the head is pressed down, snout in the dust
    const press = 1 - ease.inOut3(clamp((t - tGo) / 0.8, 0, 1));
    const dir = V.nrm(V.add(path.tan(sh), [0, -0.06 * press, 0]));
    return pose({ path, sHead: sh, L: 1.4, rMax: RS, headDir: dir, neck: press > 0 ? { len: 0.12, k: press, pos: V.add(base, [0, 0.002 * press, 0]), dir } : null });
  };
  const flicks = [P.from + 0.35, tFood - 0.15, tFood + 0.55, P.to - 2.2];
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - tGo + 0.3) / (P.to - tGo + 0.3), 0, 1));
    const ps = poseT(t);
    const h = ps.head.pos;
    const near = V.add(h, [0.16, 0.035, 0.05 - 0.01 * (t - P.from)]);
    const far = [0.4, 0.75, h[2] - 1.6];
    const pos = V.lerp(near, far, k);
    const tgt = V.lerp(V.add(h, [0, 0.0, 0.03]), V.add(h, [0, 0.05, 1.2]), k);
    return { pos, target: tgt, fov: 32 + 6 * k };
  };
  return {
    name: 's36-dust-food', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform float uPuff;
uniform vec3 uSnout;
float envSDF(vec3 p, out float id) { id = 10.0; float far = length(p.xz - uCamPos.xz); return (p.y - crackH(p.xz, 0.0)) * 0.8; }
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  float h = crackH(p.xz, 1.0);
  n = crackBump(p.xz, n);
  alb = crackCol(p.xz, h); rough = 0.9; spec = 0.02;
}
vec3 sky(vec3 rd) {
  vec3 c = heatSky(rd, normalize(uSunDir));
  vec4 dd = dustDevils(rd, uTime);
  return mix(c, dd.rgb / max(dd.a, 1e-3) * (0.9 + 0.3 * rd.y), dd.a);
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) {
  vec3 hz = vec3(0.86, 0.8, 0.7);
  col = mix(col, hz, 1.0 - exp(-t * 0.045));
  // the dust devils stand on the ground far off: draw them over distant ground too
  if (t > 25.0) { vec4 dd = dustDevils(rd, uTime); col = mix(col, dd.rgb / max(dd.a, 1e-3), dd.a); }
  return col;
}
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) { return alb * vec3(0.7, 0.55, 0.38) * sat(-n.y * 0.6 + 0.4) * 0.6; }
// dust stirred at his snout by the flicks, and hanging in the air
float dustD(vec3 p) {
  float r = length(p - uSnout);
  float d = uPuff * exp(-r * r / 0.0012) * smoothstep(0.35, 0.75, fbm(p * 60.0 + vec3(0.0, -uTime * 0.5, 0.0), 3));
  return d * 8.0;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  rd.y += 0.0015 * (vnoise(vec2(fc.x * 0.02, fc.y * 0.05 - uTime * 6.0)) - 0.5) * smoothstep(0.06, 0.0, abs(rd.y));
  rd = normalize(rd);
  gCeil = 0.070; gShadowMax = 0.5; gFlatFar = 5.0;
  vec3 col = render(ro, rd, 60.0);
  // motes in the hot air near the lens, and the puffs at his snout
  float T = 1.0; vec3 acc = vec3(0.0);
  vec3 L = normalize(uSunDir);
  float tc = dot(uSnout - ro, rd);
  if (uPuff > 0.01 && length(ro + rd * tc - uSnout) < 0.07 && tc < gHitT + 0.08) {
    for (int i = 0; i < 12; i++) {
      float s = tc - 0.08 + 0.16 * (float(i) + hash12(fc + float(i))) / 12.0;
      vec3 p = ro + rd * s;
      float dd = dustD(p) * 0.16 / 12.0 * 30.0;
      acc += T * (1.0 - exp(-dd)) * vec3(0.8, 0.7, 0.55) * (uSunCol * 0.3 + uSkyCol * 0.5);
      T *= exp(-dd);
    }
  }
  return (col * T + acc) * uExp;
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [4.2, 3.9, 3.4], uSkyCol: [0.55, 0.55, 0.55], uGndCol: [0.35, 0.28, 0.2], uDull: 1.0, uSheen: 0.0, uPuff: 0, uSnout: [0, 0, 0] },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      const tg = tongue(t, flicks, 0.7);
      tg[3] = 0.45;     // the tongue droops down to the dust
      applyPose(u, ps, tg);
      const h = ps.head;
      u.uSnout.value.set(...V.add(V.add(h.pos, V.mul(h.F, 0.09)), [0, -0.008, 0]));
      let puff = 0; for (const f of flicks) { const x = t - f - 0.25; if (x > 0) puff = Math.max(puff, Math.min(1, x * 6) * Math.exp(-x * 1.6)); }
      u.uPuff.value = puff;
      const c = cam(t);
      u.uFocus.value = V.len(V.sub(V.add(h.pos, V.mul(h.F, 0.05)), c.pos));
      u.uAper.value = 0.004;
    },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.1, threshold: 0.95, vignette: 0.45, saturation: 0.75, contrast: 1.06, gain: [1.02, 1.0, 0.96] }); },
    finish(t) { return { grade: { shadows: [0.03, 0.02, 0.0], highlights: [1.0, 0.98, 0.92], amount: 0.35 } }; },
  };
};
