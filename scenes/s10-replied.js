// 10 · "The serpent replied:"
// At the trunk of the tree at the centre: the serpent pours down the old furrowed bark in a slow
// spiral toward the lens, coils catching the gold light that falls through the dark leaves (a few
// red fruit glow up there), until his head leaves the trunk and arrives into close-up; his tongue
// flicks and his eye comes to fill the frame.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pathPts, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const SUN = V.nrm([0.45, 0.65, -0.6]);
const RT = (y) => 0.36 + 0.16 * Math.exp(-y * 2.2);   // the trunk's radius, flaring at the roots
const RS = 0.022;

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const tSer = (ws.find((w) => /serpent/i.test(w.w)) ?? { start: P.from + 3 }).start;
  const tRep = (ws.find((w) => /replied/i.test(w.w)) ?? { start: P.from + 3.8 }).start;
  const D = P.to - P.from;
  // the path: a spiral down the trunk (dense control points on the bark), ending on the side facing
  // the lens, then a smooth arc off the bark toward it
  const ctrl = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, th = 1.2 * Math.PI * (1 - u);
    const y = 1.05 + 1.95 * (1 - u) * (0.6 + 0.4 * (1 - u));
    const r = RT(y) + RS * 0.62 + 0.004;
    ctrl.push([r * Math.sin(th), y, -r * Math.cos(th)]);
  }
  const end = ctrl[20];
  ctrl.push([end[0] + 0.01, end[1] - 0.03, end[2] - 0.12], [end[0] + 0.02, end[1] - 0.04, end[2] - 0.3], [end[0] + 0.03, end[1] - 0.03, end[2] - 0.55], [end[0] + 0.04, end[1] - 0.02, end[2] - 0.85]);
  const path = pathPts(ctrl, 4000);
  const upAt = (s, p) => {
    const r = Math.hypot(p[0], p[2]);
    const out = [p[0] / r, 0, p[2] / r];
    const off = r - RT(p[1]);
    return off > 0.06 ? [0, 1, 0] : V.nrm(V.add(out, [0, 0.15, 0]));
  };
  // arc length where the head ends (close to the lens) and where it starts
  const sEnd = (() => { let lo = 0, hi = path.length; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.at(m)[2] > end[2] - 0.38) lo = m; else hi = m; } return lo; })();
  const sStart = sEnd - 1.45;
  const sAt = (t) => {
    const x = clamp((t - P.from) / (D - 0.5), 0, 1);
    return sStart + (sEnd - sStart) * (0.15 * x + 0.85 * ease.inOut3(x));
  };
  const poseT = (t) => {
    const sHead = sAt(t);
    // at the end he lifts his head a little toward the lens and looks into it
    const lk = ease.inOut3(clamp((t - (P.to - 1.4)) / 1.1, 0, 1));
    const base = path.at(sHead);
    const neck = lk > 0 ? { len: 0.24, k: lk, pos: V.add(base, [0.0, 0.045 * lk, 0.0]), dir: V.nrm([0.15 * lk, -0.12, -1]) } : null;
    return pose({ path, sHead, L: 1.45, rMax: RS, up: upAt, neck });
  };
  const flicks = [tSer + 0.1, tRep + 0.05, P.to - 0.75];
  const camEnd = [end[0] + 0.02, end[1] + 0.07, end[2] - 0.62];
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    const ps = poseT(t);
    const h = V.add(ps.head.pos, V.mul(ps.head.F, 0.04));
    const pos = V.lerp([0.95, 1.25, -0.8], camEnd, k);
    const tgt = V.add(h, [0.0, 0.08 * (1 - k), 0.0]);
    return { pos, target: tgt, fov: 32 - 4 * k };
  };
  return {
    name: 's10-replied', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
float trunkR(float y) { return 0.36 + 0.16 * exp(-y * 2.2); }
vec2 trunkUV(vec3 p) { return vec2(atan(p.x, -p.z) * 0.4, p.y); }
float envSDF(vec3 p, out float id) {
  id = 10.0;
  float r = length(p.xz);
  float d = r - trunkR(p.y);
  if (d < 0.05) { vec2 uv = trunkUV(p); d -= 0.012 * smoothstep(0.0, 0.6, abs(vnoise(vec2(uv.x * 9.0 + 2.0 * vnoise(uv * vec2(1.5, 0.6)), uv.y * 1.6)) - 0.5) * 2.0); }
  d *= 0.8;
  // the ground at its foot
  float g = p.y;
  if (g < d) { d = g; id = 11.0; }
  return d;
}
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  if (id < 10.5) {
    vec2 uv = trunkUV(p);
    float h = trunkH(uv);
    float e = 0.002;
    float hx = trunkH(uv + vec2(e, 0.0)), hy = trunkH(uv + vec2(0.0, e));
    vec3 T = normalize(vec3(-p.z, 0.0, p.x)) * 1.0;
    n = normalize(n - 0.6 * ((hx - h) / e * T + (hy - h) / e * vec3(0.0, 1.0, 0.0)));
    alb = trunkCol(uv, h); rough = 0.85; spec = 0.03;
  } else {
    // grass and fallen leaves round the roots
    alb = mix(vec3(0.04, 0.06, 0.015), vec3(0.16, 0.13, 0.05), fbm(p.xz * 6.0, 4)) * (0.6 + 0.8 * vnoise(p.xz * 80.0)); rough = 0.9; spec = 0.02;
  }
}
vec3 sky(vec3 rd) { return canopyBokeh(rd, normalize(uSunDir), uTime, 1.0); }
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) {
  // warm haze in the shafts of light
  float sd = pow(max(dot(rd, normalize(uSunDir)), 0.0), 6.0);
  // the garden beyond dissolves into warm green-gold haze
  vec3 hz = vec3(0.32, 0.26, 0.11) + vec3(0.3, 0.2, 0.08) * sd;
  return mix(col, hz, 1.0 - exp(-t * 0.16)) + vec3(0.25, 0.16, 0.06) * sd * (1.0 - exp(-t * 0.5));
}
float sunVis(vec3 p) { return dapple(p, normalize(uSunDir), 2.2, uTime); }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) { return vec3(0.0); }
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = lensRay(fc, ro); return render(ro, rd, 8.0); }`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [3.2, 2.3, 1.25], uSkyCol: [0.32, 0.3, 0.2], uGndCol: [0.12, 0.1, 0.05] },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      const c = cam(t);
      u.uFocus.value = V.len(V.sub(V.add(ps.head.pos, V.mul(ps.head.F, 0.045)), c.pos));
      u.uAper.value = 0.006;
    },
    post(t) { return grade(t, { exposure: 1.25, bloom: 0.15, threshold: 0.9, vignette: 0.55, saturation: 1.06, contrast: 1.07 }); },
    finish(t) { return { flare: { amount: 0.08, threshold: 1.2, tint: [1.0, 0.75, 0.45], length: 0.3 }, grade: { shadows: [0.01, 0.025, 0.015], highlights: [1.0, 0.92, 0.78], amount: 0.45 } }; },
  };
};
