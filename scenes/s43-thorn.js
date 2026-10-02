// 43 · "It will give you thorn and thistle; / the herbs of the field / will be your food."
// Low on the cracked hardpan under a white sun, hard black shadows. On "thorn" thorn shoots force up
// out of the cracks and twist as they climb (a time-lapse), studded with long thorns; on "thistle"
// thistles shoot up behind them and their spiny heads swell and split into silver down. On the last
// line the camera creeps in to one thorn, close, its point sharp against the glare.
import { grade, ease, drift, linesAt, wordIn, spring, clamp } from '/song/lib/look.js';
import { THORN_GLSL, THORN_UNIFORMS } from '/song/lib/x-judgement-thorn.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2, L3] = linesAt(P.from - 0.8, 'It will give you thorn', 'the herbs of the field', 'will be your food');
  const thorn = wordIn(L1, 'thorn') ?? L1.words[4], thistle = wordIn(L1, 'thistle') ?? L1.words[6];
  const tG = (t) => clamp(0.08 * clamp((t - P.from) / 0.8, 0, 1) + 0.55 * spring(t, thorn.start - 0.05, 0.9, 0.12) + 0.4 * ease.inOut3((t - thorn.start - 0.6) / 3.5), 0, 1.05);
  const sG = (t) => clamp(0.6 * spring(t, thistle.start - 0.05, 1.0, 0.12) + 0.45 * ease.inOut3((t - thistle.start - 0.5) / 3.0), 0, 1.05);
  const op = (t) => ease.inOut3((t - (L2.start - 0.2)) / 2.4);
  const c3 = L3.start - 0.5;
  const cam = (t) => {
    const d = drift(t, 0.0015);
    const a = ease.inOut3((t - c3) / (P.to - c3));
    const pos0 = [0.05 + 0.03 * clamp((t - P.from) / (c3 - P.from), 0, 1), 0.13, -0.32];
    const tgt0 = [0.0, 0.15, 0.3];
    // the close: in to the thorn on the middle shoot
    const pos1 = [-0.045, 0.165, 0.08], tgt1 = [0.0, 0.17, 0.36];
    const m = (u, v) => u.map((x, i) => x + (v[i] - x) * a);
    const pos = m(pos0, pos1);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target: m(tgt0, tgt1), fov: 44 - 10 * a };
  };
  return {
    name: 's43-thorn', from: P.from, to: P.to,
    frag: THORN_GLSL + /* glsl */ `
vec3 sky(vec3 rd) {
  vec3 c = earthSky(rd);
  c += uKeyCol * pow(max(dot(rd, KEY), 0.0), 400.0) * 0.8;
  return c;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  rd.y += uHeat * 0.0012 * (vnoise(vec2(fc.x * 0.012, fc.y * 0.05 - uTime * 9.0)) - 0.5) * smoothstep(0.06, -0.02, rd.y);
  rd = normalize(rd);
  float t = thornMarch(ro, rd, 30.0);
  if (t < 0.0) return sky(rd);
  vec3 p = ro + rd * t;
  thornMap(p);
  int part = TPART;
  vec3 n = thornN(p, t);
  vec3 L = KEY;
  float sh = thornShadow(p + n * 0.0006, L);
  vec3 alb; float spec = 0.05, sp = 20.0, trans = 0.0;
  float wet, rough;
  if (part == 0) { alb = earthAlb(p, t, wet, rough); alb = mix(alb, vec3(dot(alb, vec3(0.33))), 0.45); }
  else if (part == 1) {
    // bramble cane: reddish-brown, green lower down, a waxy grey bloom in streaks, dry splits
    float st = fbm(p * vec3(500.0, 60.0, 500.0), 3);
    alb = mix(vec3(0.16, 0.05, 0.03), vec3(0.3, 0.1, 0.05), st);
    alb = mix(alb, vec3(0.12, 0.14, 0.06), (1.0 - TS) * 0.35);
    alb = mix(alb, vec3(0.35, 0.33, 0.33), smoothstep(0.55, 0.75, fbm(p * vec3(300.0, 40.0, 300.0) + 4.0, 3)) * 0.45);
    n = normalize(n + 0.25 * (vec3(vnoise(p * 3000.0), vnoise(p * 3000.0 + 3.0), vnoise(p * 3000.0 + 6.0)) - 0.5));
    spec = 0.25; sp = 30.0;
  }
  else if (part == 2) { alb = mix(vec3(0.3, 0.07, 0.04), vec3(0.62, 0.5, 0.3), smoothstep(0.3, 0.9, TS)); spec = 0.5; sp = 60.0; }
  else if (part == 3) { alb = mix(vec3(0.16, 0.2, 0.12), vec3(0.3, 0.33, 0.25), fbm(p * 800.0, 2)); spec = 0.2; }
  else if (part == 4) {
    // bracts: grey-green, cobwebbed with fine white hairs, spines tipped straw-yellow
    vec3 hq = p;
    alb = mix(vec3(0.14, 0.17, 0.1), vec3(0.32, 0.34, 0.26), fbm(p * 900.0, 2));
    alb = mix(alb, vec3(0.7, 0.62, 0.38), smoothstep(0.6, 0.9, vnoise(p * 2500.0)) * 0.4);
    spec = 0.3; sp = 40.0; trans = 0.1;
  }
  else {
    // florets: a crowded brush of magenta-purple threads, paler at the tips, catching the light
    vec3 fd = normalize(n);
    float strands = vnoise(vec2(atan(p.z - 0.4, p.x) * 220.0, p.y * 600.0)) * 0.6 + vnoise(p.xz * 6000.0) * 0.4;
    alb = mix(vec3(0.3, 0.05, 0.28), vec3(0.62, 0.3, 0.58), strands);
    n = normalize(n + 0.8 * (vec3(vnoise(p * 5000.0), 0.5, vnoise(p * 5000.0 + 9.0)) - 0.5));
    spec = 0.2; sp = 10.0; trans = 0.45;
  }
  float ndl = dot(n, L);
  vec3 c = alb * uKeyCol * sat(ndl) * sh;
  c += alb * uAmbCol * (0.55 + 0.45 * n.y);
  // the pale hardpan throws hot light back up into everything standing on it
  c += alb * uKeyCol * vec3(0.42, 0.38, 0.33) * 0.32 * (0.5 - 0.5 * n.y) * (part == 0 ? 0.0 : 1.0);
  c += alb * uFillCol * sat(dot(n, FILL)) * 0.4;
  c += alb * uKeyCol * trans * pow(sat(dot(rd, L)), 2.0) * 0.6;
  vec3 h = normalize(L - rd);
  c += uKeyCol * pow(sat(dot(n, h)), sp) * spec * sh;
  c = jFog(c, ro, rd, t);
  // dust hanging and drifting in the hard light, motes glinting
  float dust = 0.0;
  float tt = min(t, 3.0);
  for (int k = 0; k < 5; k++) {
    float tk = (float(k) + jRand(fc, 9.0)) / 5.0 * tt;
    vec3 pp = ro + rd * tk;
    dust += vnoise(pp * 6.0 + vec3(-uTime * 0.3, uTime * 0.05, 0.0)) * exp(-max(pp.y, 0.0) * 5.0);
  }
  c += uKeyCol * dust / 5.0 * tt * 0.035 * (0.4 + pow(max(dot(rd, KEY), 0.0), 3.0));
  for (int i = 0; i < 30; i++) {
    vec3 h = hash33(vec3(float(i), 2.2, 9.1));
    vec3 mp = vec3((h.x - 0.5) * 0.6, 0.02 + 0.3 * h.y, 0.05 + 0.6 * h.z) + vec3(mod(-uTime * 0.04 + h.z, 0.6) - 0.3, 0.01 * sin(uTime * 0.7 + h.x * 9.0), 0.0);
    float tc = dot(mp - ro, rd);
    if (tc <= 0.0 || tc > t) continue;
    float dd = length(ro + rd * tc - mp);
    c += uKeyCol * 0.25 * smoothstep(0.0012, 0.0, dd);
  }
  return c;
}`,
    uniforms: {
      ...THORN_UNIFORMS,
      uDry: 1.0, uNet: 1.0, uNetScale: 3.2, uHeat: 1.0,
      uKeyDir: [-0.45, 0.75, 0.35], uKeyCol: [3.6, 3.55, 3.45],
      uFillDir: [0.6, 0.4, -0.6], uFillCol: [0.15, 0.17, 0.2],
      uAmbCol: [0.26, 0.28, 0.32],
      uSkyTop: [0.5, 0.58, 0.72], uSkyHor: [0.95, 0.94, 0.92],
      uJFog: 0.03, uJFogCol: [0.9, 0.88, 0.85], uJAper: 0.004, uJFocus: 0.6,
    },
    camera: cam,
    update(t, u) {
      u.uThornG.value = tG(t);
      u.uThistleG.value = sG(t);
      u.uOpen.value = op(t);
      const c = cam(t);
      const a = ease.inOut3((t - c3) / (P.to - c3));
      u.uJFocus.value = Math.hypot(c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]) * (1 - a) + 0.29 * a;
    },
    post(t) { return grade(t, { exposure: 0.85, bloom: 0.14, threshold: 1.0, contrast: 1.12, saturation: 0.85, vignette: 0.45 }); },
    finish(t) { return { flare: { amount: 0.12, threshold: 0.92, tint: [1.0, 0.97, 0.9], length: 0.35 } }; },
  };
};
