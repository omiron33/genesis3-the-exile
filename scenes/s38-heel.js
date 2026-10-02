// 38 · "He will keep watch against your head, / and you against his heel."
// The Protoevangelium. On dark wet ground at dusk a pillar of calm white-gold light stands; its
// light falls over the serpent's head. The serpent, coiled and dulled, rears and strikes, but only
// at the pillar's foot; the light does not move, does not flinch, and brightens a little. Then the
// first sheet of rain sweeps across the frame into the next scene.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const RS = 0.024;
const C = [-0.5, 0, 0.16];     // the coil's centre; the pillar stands at the origin

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const w = (re, d) => (ws.find((x) => re.test(x.w)) ?? { start: d }).start;
  const tHead = w(/head/i, P.from + 2.4);
  const tAnd = (ws.find((x) => /^and$/i.test(x.w) && x.start > tHead) ?? { start: P.from + 3.5 }).start;
  const tHeel = w(/heel/i, P.from + 4.8);
  const D = P.to - P.from;
  // the coil: a spiral on the ground, its outer end leading toward the pillar
  const path = pathFn((u) => {
    const th = 2 * Math.PI * 1.55 * u - 0.6, r = 0.07 + 0.15 * u;
    return [C[0] + r * Math.cos(th), RS * 0.55, C[2] + r * Math.sin(th)];
  }, 0, 1, 3000);
  const sEnd = path.length;
  const pillarFoot = [0.0, 0.03, 0.0];
  const poseT = (t) => {
    // rearing: the neck lifts through the first line, under the light
    const rear = ease.inOut3(clamp((t - P.from - 0.3) / 1.8, 0, 1));
    // the strike: a fast lunge to the pillar's foot on "against his", a slower recoil after "heel"
    const tS = tAnd + 0.55;
    const lunge = t < tS ? 0 : t < tS + 0.16 ? ease.out3((t - tS) / 0.16) : 1 - ease.inOut3(clamp((t - tHeel - 0.2) / 0.6, 0, 1)) * 0.85;
    const base = path.at(sEnd);
    const sway = [0.01 * Math.sin(t * 1.3), 0.006 * Math.sin(t * 2.1), 0.008 * Math.cos(t * 1.1)];
    const up = V.add([-0.17, 0.05 + 0.13 * rear, -0.02], V.mul(sway, rear));
    const strikeTo = V.add(pillarFoot, [-0.11, 0.008, -0.01]);
    const pos = V.lerp(up, strikeTo, lunge);
    const lookUp = V.nrm(V.sub([0, 0.32, 0], up));
    const dir = V.nrm(V.lerp(V.lerp([1, -0.1, -0.1], lookUp, rear * (1 - lunge)), [1, -0.28, -0.05], lunge));
    return pose({ path, sHead: sEnd, L: 1.35, rMax: RS, neck: { len: 0.42, k: 1, pos, dir } });
  };
  const flicks = [P.from + 0.6, tHead + 0.2, tHeel + 0.9];
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    return { pos: [-0.2 - 0.04 * k, 0.16 + 0.015 * k, -0.95 + 0.08 * k], target: [-0.24, 0.22, 0.0], fov: 38, roll: 0.0 };
  };
  return {
    name: 's38-heel', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform float uPillar, uRain;
const float PR = 0.045;    // the pillar's core radius
float envSDF(vec3 p, out float id) { id = 10.0; return p.y - 0.003 * fbm(p.xz * 30.0, 2); }
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  // dark wet earth: soil, small stones, a sheen of water
  float s1 = fbm(p.xz * 18.0, 4);
  alb = mix(vec3(0.03, 0.025, 0.02), vec3(0.08, 0.065, 0.05), s1);
  vec2 g = p.xz * 60.0; vec2 gi = floor(g); vec2 gf = fract(g) - 0.5 - 0.5 * (hash22(gi) - 0.5);
  float stone = step(0.86, hash12(gi)) * smoothstep(0.32, 0.18, length(gf));
  alb = mix(alb, vec3(0.12, 0.11, 0.1) * (0.6 + 0.6 * hash12(gi + 2.0)), stone);
  n = normalize(n + vec3(fbm(p.xz * 80.0, 2) - 0.5, 0.0, fbm(p.xz * 80.0 + 7.0, 2) - 0.5) * 0.4 + vec3(gf.x, 0.0, gf.y) * stone * 0.8);
  rough = mix(0.45, 0.7, s1); spec = 0.03;
}
vec3 sky(vec3 rd) {
  // a dark dusk sky under cloud, faintly warmer toward the pillar
  vec3 c = mix(vec3(0.03, 0.035, 0.045), vec3(0.008, 0.01, 0.016), smoothstep(0.0, 0.5, rd.y));
  float cl = fbm(rd.xz / (rd.y + 0.2) * 0.8 + uTime * 0.01, 4);
  c *= 0.7 + 0.6 * cl;
  return c;
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return mix(col, vec3(0.015, 0.016, 0.02), 1.0 - exp(-t * 0.08)); }
float sunVis(vec3 p) { return 1.0; }
// the pillar's light on everything: a vertical line source at x = z = 0
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) {
  vec3 col = vec3(0.0);
  vec3 lc = vec3(1.0, 0.86, 0.62) * uPillar;
  for (int i = 0; i < 4; i++) {
    vec3 lp = vec3(0.0, 0.12 + 0.45 * float(i) * (1.0 + 0.5 * float(i)), 0.0);
    vec3 L = lp - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float nl = sat(dot(n, L));
    vec3 h = normalize(L - rd);
    float sp = pow(sat(dot(n, h)), mix(400.0, 20.0, rough)) * (1.0 - rough) * 2.0;
    float vis = float(i) < 0.5 ? 1.0 : 0.85;
    col += lc * (alb * (nl * 0.8 + 0.2) + vec3(sp) * nl) / (d2 + 0.02) * 0.22 * vis;
  }
  return col;
}
// the column of light seen through the air: a soft gaussian round the axis, integrated along the
// ray up to what it hits (so the serpent can stand in front of it)
float erfA(float x) { float s = sign(x); x = abs(x); float t = 1.0 / (1.0 + 0.47047 * x); return s * (1.0 - t * (0.3480242 + t * (-0.0958798 + t * 0.7478556)) * exp(-x * x)); }
vec3 pillarGlow(vec3 ro, vec3 rd, float tEnd) {
  vec2 o = ro.xz, d = rd.xz;
  float dd = dot(d, d) + 1e-6;
  float tc = -dot(o, d) / dd;
  float d0 = length(o + d * tc);
  float hl = sqrt(dd);
  vec3 c = vec3(0.0);
  // a bright core and a wide soft halo
  for (int k = 0; k < 2; k++) {
    float r = k == 0 ? PR : PR * 6.0;
    float amp = k == 0 ? 0.3 : 0.05;
    float a = (0.0 - tc) * hl / r, b = (tEnd - tc) * hl / r;
    float integ = 0.886 * r / hl * (erfA(b) - erfA(a)) * exp(-d0 * d0 / (r * r));
    c += vec3(1.0, 0.88, 0.66) * amp * integ / r;
  }
  // fades toward the top of frame a little and stands on the ground at its foot
  vec3 pc = ro + rd * clamp(tc, 0.0, tEnd);
  float foot = smoothstep(-0.02, 0.04, pc.y);
  // slow motes rising in it
  float mote = smoothstep(0.75, 0.95, vnoise(vec2(pc.y * 18.0 - uTime * 0.6, atan(pc.z, pc.x) * 3.0)));
  return c * foot * uPillar * (1.0 + 0.15 * mote * exp(-d0 / PR));
}
vec3 rain(vec3 ro, vec3 rd, float tHit, vec3 col) {
  if (uRain <= 0.0) return col;
  float hl = length(rd.xz);
  for (int i = 0; i < 5; i++) {
    float dist = 0.3 * pow(1.9, float(i));
    float s = dist / max(hl, 0.05);
    if (s > tHit) break;
    vec3 p = ro + rd * s;
    float ang = atan(p.x - ro.x, p.z - ro.z) * dist;
    float sc = 1.0 / (1.0 + float(i) * 0.6);
    vec2 q = vec2((ang + 0.35 * p.y) * 34.0 * sc, (p.y + uTime * 7.5) * 1.6 * sc);
    vec2 id = floor(q), f = fract(q);
    float h = hash12(id + float(i) * 13.0);
    // the sheet sweeps in from the left
    float front = smoothstep(-0.2, 0.2, uRain * 2.4 - 1.2 - ang / max(dist, 0.3) * 0.8);
    if (h < 1.0 - (i < 2 ? 0.15 : 0.5) * front) continue;
    float x = abs(f.x - 0.5 - 0.3 * (h - 0.5));
    float len = 0.35 + 0.5 * fract(h * 13.7), y0 = fract(h * 7.3) * (1.0 - len);
    float streak = smoothstep(0.045, 0.0, x) * smoothstep(y0, y0 + 0.1, f.y) * smoothstep(y0 + len, y0 + len - 0.15, f.y);
    // drops near the pillar catch its light
    float lit = 0.1 + 1.2 * exp(-length(p.xz) / 0.3) * uPillar;
    col += vec3(0.7, 0.68, 0.62) * lit * streak * 0.07 / (1.0 + float(i) * 0.3) * front;
  }
  return col;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  vec3 col = render(ro, rd, 30.0);
  float id = gHitId; vec4 h = vec4(gHitP, gHitT);
  float tEnd = min(gHitT, 30.0);
  col += pillarGlow(ro, rd, tEnd) * uExp;
  return rain(ro, rd, tEnd, col);
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: [0.3, 0.8, -0.5], uSunCol: [0.02, 0.022, 0.03], uSkyCol: [0.08, 0.09, 0.12], uGndCol: [0.01, 0.01, 0.01], uDull: 0.75, uSheen: 0.4, uPillar: 1, uRain: 0 },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      // the light: calm, a slow breath, brightening a little after the strike
      const after = ease.inOut3(clamp((t - tHeel) / 0.5, 0, 1));
      u.uPillar.value = 0.9 + 0.04 * Math.sin(t * 1.1) + 0.45 * after - 0.25 * ease.inOut3(clamp((t - (P.to - 0.6)) / 0.6, 0, 1));
      u.uRain.value = ease.inOut3(clamp((t - (P.to - 1.1)) / 1.0, 0, 1));
      u.uWet.value = 0.3;
      const c = cam(t);
      u.uFocus.value = V.len(V.sub(V.add(ps.head.pos, V.mul(ps.head.F, 0.05)), c.pos));
      u.uAper.value = 0.006;
    },
    post(t) { return grade(t, { exposure: 1.1, bloom: 0.22, threshold: 0.85, vignette: 0.55, saturation: 0.95, contrast: 1.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.025], highlights: [1.0, 0.94, 0.82], amount: 0.45 } }; },
  };
};
