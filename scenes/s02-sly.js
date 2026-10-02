// 02 · "none was as sly as the serpent."
// Macro on a sunlit branch in the golden afternoon: the serpent slides along it toward the left, its
// tail wrapped round the limb in a slow coil near the lens, the front of the body draping side to
// side over the bark, iridescent green-gold scales catching the sun. Focus racks from the moving
// coils to the head and its still eye; at the end the head lifts and turns away off frame left.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

// the limb (x runs along it; the right end comes toward the lens)
const KZ = 0.22;
const bc = (x) => [x, 0.03 * Math.sin(1.6 * x + 0.3) - 0.05 * x, KZ * x + 0.02 * Math.sin(2.1 * x)];
const BR = (x) => 0.042 + 0.008 * x;
const SUN = V.nrm([0.35, 0.55, 0.6]);

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const tSer = (ws.find((w) => /serpent/i.test(w.w)) ?? ws.at(-1) ?? { start: P.to - 1.5 }).start;
  const D = P.to - P.from;
  // a point on the bark at x, swung round the limb by phi: the front drapes side to side, the back
  // wraps the limb in a coil
  const phiOf = (x) => {
    const drape = 0.5 * Math.sin(x * 2 * Math.PI / 0.24 + 1.2);
    const w = Math.min(1, Math.max(0, (x - 0.16) / 0.05));
    const coil = 2 * Math.PI * Math.max(0, x - 0.18) / 0.15;
    return drape * (1 - w) + coil * w;
  };
  const surf = (x, rr) => {
    const c = bc(x), c2 = bc(x + 0.002);
    const T = V.nrm(V.sub(c2, c));
    const up = V.nrm(V.sub([0, 1, 0], V.mul(T, T[1])));
    const side = V.cross(T, up);
    const phi = phiOf(x);
    const dir = V.add(V.mul(up, Math.cos(phi)), V.mul(side, Math.sin(phi)));
    return V.add(c, V.mul(dir, BR(x) + rr));
  };
  const path = pathFn((u) => surf(-u, 0.021 * 0.62), -0.6, 1.2, 3000);
  const upAt = (s, p) => {
    const x = p[0];
    return V.nrm(V.sub(p, bc(x)));
  };
  const v = 0.026;
  const liftT = P.to - 1.7;
  // the path runs from +x (u = -1.2) to -x (u = 0.6): s grows toward the head's direction
  const sAtX = (x) => { let lo = 0, hi = path.length; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.at(m)[0] > x) lo = m; else hi = m; } return (lo + hi) / 2; };
  const sStart = sAtX(-0.04);
  const poseT = (t) => {
    // he glides on faster once his head is up (the integral of a speed ramp)
    const tg = t - (P.to - 0.95);
    const extra = tg > 0 ? 0.5 * 0.45 * tg * tg / 0.95 : 0;
    const sHead = sStart + v * (t - P.from) + extra;
    const lk = ease.inOut3(clamp((t - liftT) / 1.1, 0, 1));
    const base = path.at(sHead);
    const neck = lk > 0 ? { len: 0.26, k: lk, pos: V.add(base, [-0.05 * lk, 0.075 * lk, 0.035 * lk]), dir: V.nrm([-1, -0.15 + 0.1 * lk, -0.25 * lk]) } : null;
    return pose({ path, sHead, L: 1.3, rMax: 0.021, up: upAt, neck });
  };
  const H0 = path.at(sStart);
  const cam = (t) => {
    const p = ease.inOut3((t - P.from) / D);
    const e = ease.inOut3(clamp((t - liftT) / 1.7, 0, 1));
    const o = [H0[0] + 0.1, H0[1] + 0.02, H0[2]];
    const fx = -0.6 * v * (t - P.from) - 0.02 * e;   // the camera drifts left with him
    const tx = o[0] - 0.075 + fx;
    return { pos: [tx + 0.15 - 0.02 * p, o[1] + 0.085 + 0.008 * e, o[2] + 0.37 - 0.015 * p], target: [tx, o[1] + 0.0 + 0.008 * e, o[2]], fov: 30 };
  };
  const flicks = [P.from + 0.55, P.from + 1.5, tSer + 0.05];
  return {
    name: 's02-sly', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
const float KZ = ${KZ.toFixed(3)};
vec3 limbC(float x) { return vec3(x, 0.03 * sin(1.6 * x + 0.3) - 0.05 * x, KZ * x + 0.02 * sin(2.1 * x)); }
float limbR(float x) { return 0.042 + 0.008 * x; }
vec2 limbUV(vec3 p, out float r) {
  float x = p.x;
  vec3 q = p - limbC(x);
  vec3 T = normalize(vec3(1.0, 0.0, KZ));
  vec3 S = normalize(cross(T, vec3(0.0, 1.0, 0.0)));
  vec3 U = cross(S, T);
  float a = atan(dot(q, S), dot(q, U));
  r = length(vec2(dot(q, S), dot(q, U)));
  return vec2(x * 1.08, a * limbR(x));
}
float envSDF(vec3 p, out float id) {
  id = 10.0;
  float r; vec2 uv = limbUV(p, r);
  float d = r - limbR(p.x);
  d -= barkD(uv);
  return d * 0.9;
}
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  float r; vec2 uv = limbUV(p, r);
  float h = barkH2(uv);
  float e = 0.0006;
  float hx = barkH2(uv + vec2(e, 0.0)), hy = barkH2(uv + vec2(0.0, e));
  vec3 T = normalize(vec3(1.0, 0.0, KZ));
  vec3 B = normalize(cross(n, T));
  n = normalize(n - 0.7 * ((hx - h) / e * T + (hy - h) / e * B));
  alb = barkCol2(uv, h); rough = 0.8; spec = 0.03;
}
vec3 sky(vec3 rd) { return gardenBokeh(rd, normalize(vec3(-0.5, 0.35, -0.8)), 1.0, uTime) * 0.9; }
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return col; }
float sunVis(vec3 p) { return dapple(p, normalize(uSunDir), 5.0, uTime); }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) {
  // warm rim from the low sun glowing behind the garden
  vec3 g = normalize(vec3(-0.5, 0.35, -0.8));
  return alb * vec3(1.4, 0.9, 0.45) * pow(sat(dot(n, g)), 2.0) * 0.5;
}
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = lensRay(fc, ro); return render(ro, rd, 6.0); }`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [3.4, 2.5, 1.45], uSkyCol: [0.42, 0.5, 0.3], uGndCol: [0.22, 0.18, 0.08] },
    camera: P.dbg ? (t) => { const h = poseT(t).head; const F = h.F; const R = V.nrm(V.cross(h.U, F));
      const ps = poseT(t), m = ps.pts[14];
      if (P.dbg === 3) return { pos: V.add(m, [0.0, 0.06, 0.2]), target: m, fov: 30 };
      const o = V.add(V.add(h.pos, V.mul(R, 0.16)), V.add(V.mul(F, 0.07), V.mul(h.U, 0.05)));
      return { pos: o, target: V.add(h.pos, V.mul(F, 0.04)), fov: 30 }; } : cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      // rack focus from the coil near the lens to the head
      const k = ease.inOut3(clamp((t - P.from - 0.7) / 1.7, 0, 1));
      const c = cam(t);
      const dh = V.len(V.sub(V.add(ps.head.pos, V.mul(ps.head.F, 0.045)), c.pos));
      const coil = bc(0.1);
      const dc = V.len(V.sub(V.add(coil, [0, 0, 0.03]), c.pos));
      u.uFocus.value = dc + (dh - dc) * k;
      u.uAper.value = P.dbg || P.nodof ? 0 : 0.008;
      u.uDbg.value = P.dbgv ?? 0;
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.14, threshold: 0.9, vignette: 0.55, saturation: 1.08, contrast: 1.08 }); },
    finish(t) { return { flare: { amount: 0.08, threshold: 1.1, tint: [1.0, 0.75, 0.45], length: 0.3 }, grade: { shadows: [0.01, 0.03, 0.02], highlights: [1.0, 0.92, 0.78], amount: 0.45 } }; },
  };
};
