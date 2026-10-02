// 33 · "Because of this, the curse falls on you"
// The storm breaks over Paradise. We find the serpent pressed flat in the rain-beaten grass at the
// foot of the tree, wet scales lit only by the flashes; then the camera rises and tilts up the rise
// to the tree itself, black against the storm, lightning splitting the sky behind it, rain sweeping
// across. Flashes are timed off the words so none whitens the frame just before a word is sung.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const RS = 0.023;
const ground = (x, z) => 0.7 * Math.exp(-(x * x + z * z) / 30);
const BOLT = V.nrm([0.25, 0.75, 0.6]);   // toward the lightning, behind the tree

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.6 && w.start < P.to + 1.0);
  const onsets = lyrics.words.map((w) => w.start).filter((s) => s > P.from - 1 && s < P.to + 2);
  // big flashes: bright for ~0.25 s, never inside the 0.4 s before a sung onset; smaller ones
  // (never a white-out) fill the gaps
  const ok = (f, len) => onsets.every((o) => f + len < o - 0.4 || f > o);
  const flashes = [], amps = [];
  for (let f = P.from + 0.15; f < P.to - 0.15; f += 0.02) if (ok(f, 0.25) && (!flashes.length || f - flashes.at(-1) > 0.7)) { flashes.push(f); amps.push(1); }
  for (let f = P.from + 0.3; f < P.to - 0.3; f += 0.61) if (flashes.every((g) => Math.abs(g - f) > 0.5)) { flashes.push(f); amps.push(0.35); }
  const order = flashes.map((f, i) => [f, amps[i]]).sort((a, b) => a[0] - b[0]);
  flashes.length = 0; amps.length = 0; order.forEach(([f, a]) => { flashes.push(f); amps.push(a); });
  const flashAt = (t) => {
    let v = 0;
    flashes.forEach((f, i) => {
      const x = t - f;
      if (x >= 0 && x < 0.45) {
        // a double strike that decays: flicker inside the flash
        const env = Math.exp(-x * 14) + 0.55 * Math.exp(-Math.max(0, x - 0.07) * 16) * (x > 0.07 ? 1 : 0);
        v = Math.max(v, env * amps[i] * (0.8 + 0.2 * Math.sin(i * 7.1)));
      }
    });
    // far sheet lightning flickering in the clouds all the time (never a white-out)
    v += 0.06 * Math.max(0, Math.sin(t * 17.3) * Math.sin(t * 5.1 + 1.3));
    return v;
  };
  if (P.dbgFlash) console.log('flashes', JSON.stringify(flashes.map((f, i) => [+f.toFixed(2), amps[i]])));
  const boltSeed = (t) => { let k = -1; flashes.forEach((f, i) => { if (t >= f) k = i; }); return k; };
  // the serpent lies pressed flat in a loose S at the foot of the tree, sliding a little
  const g0 = [0.5, 0, -6.4];
  const path = pathFn((u) => { const x = g0[0] + 0.16 * Math.sin(u * 4.2), z = g0[2] + u; return [x, ground(x, z) + RS * 0.5, z]; }, -2.5, 1.5, 3000);
  const poseT = (t) => pose({ path, sHead: 2.5 + 0.04 * (t - P.from), L: 1.4, rMax: RS, roll: 0.0 });
  const D = P.to - P.from;
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from - 0.9) / (D - 0.9), 0, 1));
    const ps = poseT(t);
    const h = ps.head.pos;
    const p0 = [h[0] + 0.22, h[1] + 0.2, h[2] - 0.34];
    const p1 = [1.4, 1.2, -13.5];
    const t0 = V.add(ps.pts[9], [0.0, -0.02, 0.0]);
    const t1 = [0, 3.6, 0];
    const pos = V.lerp(p0, p1, k);
    pos[1] += 0.25 * Math.sin(Math.PI * k);
    return { pos, target: V.lerp(t0, t1, ease.inOut3(clamp((t - P.from - 1.1) / (D - 1.1), 0, 1))), fov: 40 + 6 * k, roll: 0.01 * Math.sin(t * 2.3) };
  };
  const flicks = [P.from + 0.45, P.from + 1.6];
  return {
    name: 's33-curse', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform float uFlash, uBolt;
float groundH(vec2 xz) { return 0.7 * exp(-dot(xz, xz) / 30.0) + 0.02 * vnoise(xz * 3.0); }
float trunkR(float y) { return 0.42 + 0.28 * exp(-(y - 0.7) * 2.5); }
float tree(vec3 p) {
  // trunk
  float d = length(p.xz) - trunkR(p.y);
  d = max(d, p.y - 3.4);
  // limbs spreading up and out
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.047 + 0.4;
    vec3 b = vec3(cos(a) * 2.6, 4.6 + 0.5 * sin(float(i) * 2.3), sin(a) * 2.6);
    d = smin(d, sdCapsule(p, vec3(0.0, 2.6, 0.0), b, 0.2), 0.3);
  }
  // the crown: a broad, ragged mass of leaves in several lobes, thrashing in the wind
  vec3 q = p - vec3(0.0, 5.4, 0.0);
  float c = sdEllipsoid(q, vec3(3.6, 1.5, 3.6));
  c = smin(c, sdEllipsoid(q - vec3(-2.6, 0.2, 0.8), vec3(2.2, 1.3, 2.2)), 0.8);
  c = smin(c, sdEllipsoid(q - vec3(2.7, -0.2, -0.6), vec3(2.3, 1.2, 2.3)), 0.8);
  c = smin(c, sdEllipsoid(q - vec3(0.4, 1.0, 0.3), vec3(2.2, 1.2, 2.2)), 0.8);
  if (c < 1.5) {
    vec3 w = vec3(sin(uTime * 2.1 + p.y), 0.0, cos(uTime * 1.7 + p.x)) * 0.12;
    c += 0.9 * (vnoise(p * 0.9 + w) - 0.5) + 0.45 * (vnoise(p * 2.7 + w * 2.0) - 0.5) + 0.2 * (vnoise(p * 7.0) - 0.5);
  }
  return min(d, c * 0.7);
}
float envSDF(vec3 p, out float id) {
  float g = (p.y - groundH(p.xz)) * 0.8;
  float tr = tree(p);
  if (tr < g) { id = 11.0; return tr; }
  id = 10.0; return g;
}
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  if (id < 10.5) {
    // rain-beaten grass, flattened and shining wet
    vec2 q = p.xz;
    float bl = vnoise(vec2(q.x * 500.0, q.y * 60.0)) * 0.6 + vnoise(q * 140.0) * 0.4;
    // flattened blades combed one way by the rain and wind
    vec2 g = rot(0.6 + 0.25 * vnoise(q * 0.7)) * q;
    float bl2 = vnoise(vec2(g.x * 900.0, g.y * 30.0 + 3.0 * vnoise(q * 40.0))) * (0.6 + 0.4 * vnoise(q * 120.0));
    alb = mix(vec3(0.03, 0.05, 0.028), vec3(0.11, 0.16, 0.08), bl2 * 0.7 + bl * 0.3) * (0.6 + 0.8 * fbm(q * 4.0, 3));
    // puddles and glossy flattened blades
    float pud = smoothstep(0.6, 0.7, fbm(q * 1.5 + 4.0, 4));
    n = normalize(n + vec3(bl - 0.5, 0.0, vnoise(q * 300.0) - 0.5) * 0.7);
    rough = mix(0.3, 0.12, pud); spec = 0.03;
    alb *= 1.0 - 0.5 * pud;
    n = normalize(n + vec3(bl2 - 0.4, 0.0, 0.0) * 0.35 * (1.0 - pud));
  } else {
    alb = vec3(0.025, 0.022, 0.02) * (0.6 + 0.8 * fbm(p * 3.0, 3)); rough = 0.6; spec = 0.03;
  }
}
// the bolt: a jagged path down the sky behind the tree, new for each flash
float bolt(vec3 rd) {
  if (uBolt < 0.0) return 0.0;
  float az = atan(rd.x, rd.z), el = rd.y;
  float x0 = (hash11(uBolt * 7.31) - 0.5) * 0.9;
  float d = 1e3;
  float x = x0, y = 0.75;
  for (int i = 0; i < 14; i++) {
    float y2 = y - 0.055;
    float x2 = x + (hash11(uBolt * 3.1 + float(i) * 1.7) - 0.5) * 0.06;
    vec2 pa = vec2(az, el) - vec2(x, y), ba = vec2(x2 - x, y2 - y);
    float h = sat(dot(pa, ba) / dot(ba, ba));
    d = min(d, length(pa - ba * h));
    // a fork
    if (i == 5) {
      vec2 f2 = vec2(x2 + 0.12, y2 - 0.2);
      vec2 pf = vec2(az, el) - vec2(x2, y2), bf = f2 - vec2(x2, y2);
      float hf = sat(dot(pf, bf) / dot(bf, bf));
      d = min(d, length(pf - bf * hf) * 1.6);
    }
    x = x2; y = y2;
  }
  return exp(-d / 0.0025) + 0.25 * exp(-d / 0.03);
}
vec3 sky(vec3 rd) {
  float y = rd.y;
  vec2 uv = rd.xz / (max(y, 0.0) + 0.12);
  float cl = fbm(uv * 0.35 + vec2(uTime * 0.04, uTime * 0.02), 6);
  float cl2 = fbm(uv * 1.3 - vec2(uTime * 0.08, 0.0), 4);
  vec3 base = mix(vec3(0.05, 0.055, 0.07), vec3(0.17, 0.18, 0.21), cl * 0.7 + cl2 * 0.3);
  base = mix(vec3(0.16, 0.17, 0.19), base, smoothstep(-0.02, 0.15, y));
  // far hills and the dark line of the garden's trees under the storm
  float az = atan(rd.x, rd.z);
  float hz = 0.035 + 0.03 * fbm(vec2(az * 3.0, 0.5), 4) + 0.012 * pow(fbm(vec2(az * 30.0, 2.0), 3), 2.0);
  base = mix(base, vec3(0.025, 0.03, 0.035) + vec3(0.12, 0.13, 0.16) * uFlash * 0.4, smoothstep(hz + 0.003, hz - 0.003, y));
  // the clouds lit from inside by the flash, brightest toward the bolt
  float toward = pow(max(dot(rd, normalize(vec3(0.25, 0.75, 0.6))), 0.0), 3.0);
  vec3 c = base + vec3(0.55, 0.6, 0.75) * uFlash * (0.25 + 1.6 * toward) * (0.4 + cl);
  c += vec3(2.5, 2.6, 3.0) * bolt(rd) * smoothstep(0.0, 0.2, uFlash) * 2.0;
  return c;
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) {
  vec3 fogc = vec3(0.05, 0.055, 0.065) + vec3(0.3, 0.33, 0.4) * uFlash * 0.4;
  return mix(col, fogc, 1.0 - exp(-t * 0.06));
}
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) { return vec3(0.0); }
// rain: streaks on a few cylinders round the lens, between it and what the ray hit
vec3 rain(vec3 ro, vec3 rd, float tHit, vec3 col) {
  float hl = length(rd.xz);
  for (int i = 0; i < 6; i++) {
    float dist = 0.35 * pow(1.9, float(i));
    float s = dist / max(hl, 0.05);
    if (s > tHit) break;
    vec3 p = ro + rd * s;
    float ang = atan(p.x - ro.x, p.z - ro.z) * dist;     // metres round the cylinder
    // drops falling at ~7 m/s, slanted by the wind; the shutter draws them as streaks
    float sc = 1.0 / (1.0 + float(i) * 0.6);
    vec2 q = vec2((ang + 0.3 * p.y) * 34.0 * sc, (p.y + uTime * 7.5) * 1.6 * sc);
    vec2 id = floor(q), f = fract(q);
    float h = hash12(id + float(i) * 13.0);
    if (h < (i < 2 ? 0.8 : 0.55)) continue;
    float x = abs(f.x - 0.5 - 0.3 * (h - 0.5));
    float len = 0.35 + 0.5 * fract(h * 13.7);
    float y0 = fract(h * 7.3) * (1.0 - len);
    float streak = smoothstep(0.045, 0.0, x) * smoothstep(y0, y0 + 0.1, f.y) * smoothstep(y0 + len, y0 + len - 0.15, f.y);
    col += (vec3(0.06, 0.065, 0.08) + vec3(0.5, 0.55, 0.7) * uFlash) * streak * 0.14 / (1.0 + float(i) * 0.3);
  }
  return col;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  vec3 col = render(ro, rd, 40.0);
  float id = gHitId; vec4 h = vec4(gHitP, gHitT);
  return rain(ro, rd, gHitT, col);
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: BOLT, uSunCol: [0, 0, 0], uSkyCol: [0.06, 0.065, 0.08], uGndCol: [0.02, 0.022, 0.025], uFlash: 0, uBolt: -1 },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      const fl = flashAt(t);
      u.uFlash.value = fl;
      u.uBolt.value = boltSeed(t);
      u.uSunCol.value.set(0.7 + 4.2 * fl, 0.75 + 4.4 * fl, 0.95 + 5.4 * fl);
      u.uSkyCol.value.set(0.9 + 0.2 * fl, 0.95 + 0.22 * fl, 1.15 + 0.3 * fl);
      u.uWet.value = 1.0;
      const c = cam(t);
      const k = clamp((t - P.from - 0.9) / (D - 0.9), 0, 1);
      u.uFocus.value = (1 - k) * V.len(V.sub(ps.head.pos, c.pos)) + k * V.len(c.pos);
      u.uAper.value = 0.004 * (1 - k) + 0.01 * k;
    },
    post(t) { return grade(t, { exposure: 1.9, bloom: 0.2, threshold: 0.8, vignette: 0.55, saturation: 0.85, contrast: 1.1, gain: [0.95, 0.98, 1.06] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.9, 0.95, 1.0], amount: 0.5 } }; },
  };
};
