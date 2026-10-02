// 39 · "To the woman: Your pain and groaning / I will multiply. In pain / you will bring children forth."
// Macro, at dusk, in rain. Three beats on the line breaks:
//   1. rain is already falling on the dark soaked earth: drops strike the mud and the little pools,
//      crowns of spray, rings; a seed lies half sunk in the mud;
//   2. on "multiply" the seed's coat splits along its seam, in two hard pushes ("In pain");
//   3. on "you will bring children forth" a pale hooked shoot forces up out of the ground beside it,
//      lifting and cracking the crust, straightening; on the last word its seed leaves begin to open.
import { grade, ease, drift, linesAt, wordIn, spring, clamp } from '/song/lib/look.js';
import { SEED_GLSL, SEED_UNIFORMS, NSHOOT } from '/song/lib/x-judgement-seed.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2, L3] = linesAt(P.from - 0.8, 'To the woman', 'I will multiply', 'you will bring children');
  const mult = wordIn(L2, 'multiply') ?? L2.words[2], pain2 = wordIn(L2, 'pain') ?? L2.words[L2.words.length - 1];
  const bring = wordIn(L3, 'bring') ?? L3.words[2], forth = wordIn(L3, 'forth') ?? L3.words[L3.words.length - 1];
  const b2 = L2.start - 0.4, b3 = L3.start - 0.35;
  // the seed splits in two pushes
  const split = (t) => 0.45 * spring(t, mult.start + 0.05, 0.9, 0.12) + 0.55 * spring(t, pain2.start + 0.02, 1.0, 0.1);
  // the shoot: pushes up in efforts (it is hard), from below the surface
  const grow = (t) => {
    const x = clamp((t - b3) / (P.to - b3), 0, 1);
    const pushes = 0.35 * spring(t, bring.start, 0.7, 0.15) + 0.25 * spring(t, bring.start + 0.6, 0.7, 0.15) + 0.4 * ease.inOut3((t - (bring.start + 0.9)) / (P.to - bring.start - 0.9));
    return clamp(0.15 * x + 0.85 * pushes, 0, 1);
  };
  const BASE = [0.0105, -0.006, 0.0045];
  const shootPts = (t) => {
    const g = grow(t);
    const len = 0.0055 + 0.026 * g;
    const straight = 0.75 * ease.inOut3((t - (forth.start - 0.6)) / 1.2);
    const hook = 2.5 * (1 - straight);
    const out = [];
    let x = BASE[0], y = BASE[1], th = 0;
    const n = NSHOOT - 1, ds = len / n;
    for (let i = 0; i <= n; i++) {
      out.push(x, y, BASE[2] + 0.0006 * Math.sin(i * 0.7));
      const s = i * ds;
      const k = Math.min(1, Math.max(0, (s - (len - 0.011)) / 0.011));
      th = -0.12 + hook * k * k * (3 - 2 * k) + 0.03 * Math.sin(t * 1.3 + i);
      x += Math.sin(th) * ds * -1; y += Math.cos(th) * ds;
    }
    return out;
  };
  // camera: beat 1 wider on the rain, beat 2 close on the seed, beat 3 rising with the shoot
  const cam = (t) => {
    const d = drift(t, 0.0004);
    const a = ease.inOut3((t - b2 + 0.3) / 1.3), b = ease.inOut3((t - b3 + 0.1) / 1.4);
    const s1 = Math.min(1, (t - P.from) / (b2 - P.from));
    const g = grow(t);
    // beat 1: 9 cm off, the rain around the seed; beat 2: 4 cm, on the seed; beat 3: up with the shoot
    let pos = [0.025 - 0.006 * s1, 0.05 - 0.008 * s1, -0.085 + 0.01 * s1];
    let tgt = [0.0, 0.0, 0.01];
    pos = pos.map((v, i) => v + ([0.004, 0.026, -0.03][i] - v) * a);
    tgt = tgt.map((v, i) => v + ([0.0, 0.0005, 0.0][i] - v) * a);
    pos = pos.map((v, i) => v + ([0.012, 0.034 + 0.008 * g, -0.05][i] - v) * b);
    tgt = tgt.map((v, i) => v + ([0.0035, 0.004 + 0.011 * g, 0.002][i] - v) * b);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target: tgt, fov: 40 - 6 * a + 4 * b };
  };
  const focusAt = (t) => {
    const c = cam(t);
    const tgt = t > b3 ? [0.004, 0.004 + 0.011 * grow(t), 0.0015] : [0, 0.001, 0];
    return Math.hypot(tgt[0] - c.pos[0], tgt[1] - c.pos[1], tgt[2] - c.pos[2]);
  };
  return {
    name: 's39-pain', from: P.from, to: P.to,
    frag: SEED_GLSL + /* glsl */ `
const vec3 FILLD = normalize(vec3(-0.5, 0.7, -0.6));
const vec3 FILLC = vec3(0.16, 0.19, 0.26);
// granular wet mud: sand grains and crumbs in a film of water
vec3 grainN(vec2 xz, out float grain) {
  vec2 gc = floor(xz * 1400.0), gf = fract(xz * 1400.0) - 0.5;
  grain = hash12(gc);
  float e = smoothstep(0.5, 0.2, length(gf + (hash22(gc) - 0.5) * 0.3));   // rounded grains, dark gaps between
  vec2 g = vec2(vnoise(xz * 2800.0), vnoise(xz * 2800.0 + 9.0)) - 0.5;
  return normalize(vec3(g.x * 1.2, 1.0, g.y * 1.2)) * (0.5 + 0.5 * e);
}
vec3 shadeMud(vec3 p, vec3 rd, vec3 n, float t) {
  float grain;
  vec3 gn = grainN(p.xz, grain);
  float near = exp(-t * 12.0);
  n = normalize(n + vec3(gn.x, 0.0, gn.z) * 0.8 * near);
  float g = fbm(p.xz * 300.0, 3);
  vec3 alb = mix(vec3(0.05, 0.037, 0.027), vec3(0.1, 0.075, 0.053), g);
  // pale quartz grains and dark organic bits
  alb = mix(alb, vec3(0.22, 0.2, 0.17), step(0.86, grain) * 0.8 * near);
  alb = mix(alb, vec3(0.012, 0.01, 0.008), step(grain, 0.12) * 0.7);
  float mk = impactMark(p.xz);
  alb *= 1.0 - 0.4 * mk;
  float sh = seedShadow(p + n * 0.00005, KEYL);
  vec3 c = alb * uKeyC * sat(dot(n, KEYL)) * sh;
  c += alb * (duskSky(n) * 0.9 + FILLC * sat(dot(n, FILLD)));
  // the water film: tight glints on every grain
  vec3 r = reflect(rd, n);
  float fr = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, n)), 5.0);
  c += duskSky(r) * fr * 0.25 + FILLC * pow(sat(dot(r, FILLD)), 60.0) * 0.6;
  c += uKeyC * pow(sat(dot(r, KEYL)), 400.0) * 1.2 * sh * near;
  return c;
}
// droplets beaded on a surface (cells of ~0.7 mm): returns a mask and the drop's bulge normal
float beads(vec3 p, vec3 n, out vec3 bn) {
  vec3 g = p * 1100.0;
  vec3 i = floor(g), f = fract(g);
  vec3 h = hash33(i);
  vec3 c = 0.3 + 0.4 * h;
  float rr = 0.2 + 0.18 * h.x;
  vec3 d = f - c;
  d -= n * dot(d, n);
  float k = length(d) / rr;
  bn = normalize(n + d / rr * 1.6);
  return step(0.6, h.y) * smoothstep(1.0, 0.8, k);
}
vec3 shadeSeed(vec3 p, vec3 rd, vec3 n) {
  vec3 q = seedLocal(p);
  // shell: glossy chestnut brown with lengthwise fibres, a dark pointed tip, a pale rough cup scar
  float ang = atan(q.z, q.y);
  float fib = vnoise(vec2(ang * 80.0, q.x * 260.0)) * 0.6 + vnoise(vec2(ang * 260.0, q.x * 900.0)) * 0.4;
  vec3 coat = mix(vec3(0.16, 0.075, 0.03), vec3(0.32, 0.17, 0.07), fib);
  coat = mix(coat, vec3(0.06, 0.035, 0.02), smoothstep(0.004, 0.0095, q.x));
  float scar = smoothstep(-0.0075, -0.0095, q.x);
  coat = mix(coat, vec3(0.38, 0.3, 0.2) * (0.7 + 0.5 * vnoise(q.yz * 3000.0)), scar);
  coat *= 1.0 - 0.5 * smoothstep(0.0, -0.0025, p.y - mudBase(p.xz) - 0.0004);   // muddy where it meets the mud
  // the kernel: cream, fibrous where it tore
  vec3 kern = mix(vec3(0.62, 0.55, 0.38), vec3(0.78, 0.72, 0.55), vnoise(vec2(q.x * 2000.0, q.y * 400.0)));
  vec3 alb = mix(coat, kern, INNER);
  float sh = seedShadow(p + n * 0.00005, KEYL);
  vec3 bn;
  float bd = beads(p, n, bn) * (1.0 - INNER) * (1.0 - scar);
  vec3 nn = normalize(mix(n, bn, bd));
  vec3 c = alb * uKeyC * sat(dot(n, KEYL)) * sh + alb * (duskSky(n) * 0.9 + FILLC * 1.6 * sat(dot(n, FILLD)));
  c += alb * uKeyC * 0.25 * pow(sat(dot(rd, KEYL)), 3.0) * INNER;
  vec3 r = reflect(rd, nn);
  float fr = 0.04 + 0.96 * pow(1.0 - sat(dot(-rd, nn)), 5.0);
  float gloss = (1.0 - INNER) * (1.0 - scar);
  c += (duskSky(r) * fr * mix(0.5, 1.2, bd) + uKeyC * pow(sat(dot(r, KEYL)), mix(60.0, 400.0, bd)) * sh * mix(0.25, 4.0, bd) + FILLC * pow(sat(dot(r, FILLD)), 80.0) * 3.0 * bd) * gloss;
  return c;
}
vec3 shadeShoot(vec3 p, vec3 rd, vec3 n) {
  vec3 alb = mix(vec3(0.66, 0.6, 0.48), vec3(0.52, 0.58, 0.36), smoothstep(0.3, 1.0, HK));
  if (HK > 1.0) alb = vec3(0.3, 0.42, 0.18);
  float sh = seedShadow(p + n * 0.00005, KEYL);
  vec3 c = alb * uKeyC * sat(dot(n, KEYL)) * sh + alb * (duskSky(n) * 0.9 + FILLC * 1.6 * sat(dot(n, FILLD)));
  // translucent young tissue
  c += vec3(0.45, 0.5, 0.3) * uKeyC * pow(sat(dot(rd, KEYL)), 2.0) * 0.3;
  // fine hairs: a fuzz that catches the light at the silhouette, broken into strands
  float rim = pow(1.0 - sat(abs(dot(-rd, n))), 2.0);
  float strands = smoothstep(0.55, 0.9, vnoise(vec2(dot(p, vec3(1.0, 0.0, 0.7)) * 9000.0, p.y * 2500.0)));
  c += vec3(0.85, 0.85, 0.8) * (uKeyC * 0.35 + FILLC) * rim * (0.35 + 0.9 * strands) * (HK < 1.0 ? 1.0 : 0.2);
  vec3 bn;
  float bd = beads(p, n, bn) * 0.7;
  vec3 r = reflect(rd, normalize(mix(n, bn, bd)));
  c += uKeyC * pow(sat(dot(r, KEYL)), mix(60.0, 600.0, bd)) * mix(0.3, 2.0, bd) * sh;
  return c;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float t = seedMarch(ro, rd, 0.6);
  float tmax = t > 0.0 ? t : 1.0;
  // pools between the clods
  float tw = rd.y < 0.0 ? (WL - ro.y) / rd.y : -1.0;
  vec3 col;
  if (t > 0.0 && tw > 0.0 && tw < t) {
    vec3 p = ro + rd * tw;
    vec2 g = rippleG(p.xz) + (vec2(vnoise(p.xz * 400.0 + uTime * 3.0), vnoise(p.xz * 400.0 - uTime * 3.0 + 7.0)) - 0.5) * 0.04 * uRainK;
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 r = reflect(rd, n);
    float fr = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    col = mix(vec3(0.012, 0.009, 0.007), duskSky(r), fr) + uKeyC * pow(sat(dot(r, KEYL)), 300.0) * 2.0;
    tmax = tw;
  } else if (t > 0.0) {
    vec3 p = ro + rd * t;
    seedMap(p);
    int mid = MID;
    vec3 n = seedN(p, t);
    seedMap(p);
    if (mid == 1) col = shadeSeed(p, rd, n);
    else if (mid == 2) col = shadeShoot(p, rd, n);
    else col = shadeMud(p, rd, n, t);
  } else {
    col = duskSky(rd);
  }
  // falling drops and spray
  vec3 dn;
  vec2 dh = dropsTrace(ro, rd, tmax, dn);
  if (dh.y > 0.5) {
    vec3 rr = reflect(rd, dn), tr = refract(rd, dn, 0.75);
    float fr = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, dn)), 5.0);
    vec3 dc = duskSky(vec3(tr.x, -tr.y, tr.z)) * 0.7 + duskSky(rr) * fr + uKeyC * pow(sat(dot(rr, KEYL)), 60.0) * 3.0;
    col = mix(col, dc, 0.9);
  }
  // rain falling through the frame between us and the seed: fast drops (6 m/s), smeared by the
  // shutter into short bright streaks, out of focus
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 5.1, 2.3));
    float per = 0.3 + 0.35 * h.x;
    float age = mod(uTime + h.y * 7.0, per);
    vec3 c = vec3((h.x - 0.5) * 0.1, 0.1 - 6.0 * age, (h.z - 0.5) * 0.08 - 0.02);
    c.xz += uCamPos.xz * 0.7;
    if (c.y < -0.01) continue;
    vec3 a = c + vec3(0.0, 0.025, 0.0), b = c - vec3(0.0, 0.025, 0.0);
    vec3 ba = b - a, oa = ro - a;
    float bb = dot(ba, ba), rb = dot(rd, ba), ro2 = dot(oa, rd), ob = dot(oa, ba);
    float sa = clamp((ob - ro2 * rb) / max(bb - rb * rb, 1e-12), 0.0, 1.0);
    vec3 sp = a + ba * sa;
    float tr = dot(sp - ro, rd);
    if (tr <= 0.0 || tr > tmax) continue;
    float dd = length(ro + rd * tr - sp);
    float r = 0.0009;
    float k = dd / r;
    if (k < 1.0) {
      vec3 dc = duskSky(vec3(0.0, 1.0, 0.0)) * 0.9 + uKeyC * 0.35 + FILLC;
      col = mix(col, dc, 0.18 * (1.0 - k * k));
    }
  }
  return jFog(col, ro, rd, t > 0.0 ? t : 1.0);
}`,
    uniforms: {
      ...SEED_UNIFORMS, uShootR: 0.0008,
      uJFog: 0.6, uJFogCol: [0.03, 0.028, 0.03], uJSun: [-0.25, 0.32, 1.0], uJSunCol: [0.4, 0.25, 0.15],
      uJAper: 0.0018, uJFocus: 0.1,
    },
    camera: cam,
    update(t, u) {
      u.uSplit.value = split(t);
      const g = grow(t);
      u.uShootK.value = t > b3 - 0.1 ? 1 : 0;
      u.uShoot.value = shootPts(t);
      u.uLift.value = Math.min(1, g * 3);
      u.uRoot.value = ease.inOut3((t - pain2.start - 0.1) / 1.6);
      u.uCoty.value = 0.9 * ease.inOut3((t - (forth.start - 0.15)) / 0.9);
      u.uJFocus.value = focusAt(t);
    },
    post(t) { return grade(t, { exposure: 1.6, bloom: 0.2, threshold: 0.85, contrast: 1.06, saturation: 0.95, vignette: 0.55 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.92, 0.82], amount: 0.4 } }; },
  };
};
