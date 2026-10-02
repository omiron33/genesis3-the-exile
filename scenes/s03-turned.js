// 03 · "He turned to the woman:"
// Over the serpent's head, soft and close in the foreground on its branch, down to the meadow below
// the trees: far off, a woman stands in tall grass, a small silhouette backlit by the low gold sun.
// Focus pulls from his head to her and stays on her as the sun flares behind her.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const SUN = V.nrm([0.05, 0.11, 1]);
const WOMAN = [-1.3, 0, 18];     // her feet on the meadow
const H = [0.0, 1.85, 0.0];      // the serpent's head, on a limb above the meadow

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const tTurn = (ws.find((w) => /turned/i.test(w.w)) ?? { start: P.from + 0.9 }).start;
  const tWoman = (ws.find((w) => /woman/i.test(w.w)) ?? { start: P.from + 2.2 }).start;
  const D = P.to - P.from;
  // the limb runs across below him; his body comes up off it in a curve to the lifted head
  const limbY = H[1] - 0.09;
  const path = pathFn((u) => [0.5 - u, limbY + 0.021 * 0.62 + 0.004 * Math.sin(u * 9), 0.06 - 0.12 * u + 0.03 * Math.sin(u * 5)], -0.4, 2.0, 2000);
  const poseT = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    // he turns his head toward her on "turned", then holds, swaying a little
    const turn = ease.inOut3(clamp((t - tTurn + 0.3) / 1.0, 0, 1));
    const toW = V.nrm(V.sub([WOMAN[0], 1.2, WOMAN[2]], H));
    const dir0 = V.nrm([-0.9, -0.05, 0.45]);
    const dir = V.nrm(V.add(V.mul(dir0, 1 - turn), V.mul(toW, turn)));
    const sway = [0.004 * Math.sin(t * 1.7), 0.003 * Math.sin(t * 1.1 + 1), 0];
    const pos = V.add(V.add(H, sway), [0.0, 0.0, 0.01 * k]);
    const sHead = 0.55 + 0.01 * k;
    return pose({ path, sHead, L: 1.3, rMax: 0.021, neck: { len: 0.3, k: 1, pos, dir } });
  };
  const flicks = [P.from + 0.35, tWoman + 0.15];
  const W = [WOMAN[0], 1.0, WOMAN[2]];
  const ww = V.nrm(V.sub(W, H));
  const uu = V.nrm(V.cross(ww, [0, 1, 0]));
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    const pos = V.add(V.add(H, V.mul(ww, -0.24 + 0.02 * k)), V.add(V.mul(uu, 0.05 - 0.008 * k), [0, 0.035 - 0.004 * k, 0]));
    const tgt = V.add(V.add(W, V.mul(uu, -2.4 - 0.3 * k)), [0, 0.0, 0]);
    return { pos, target: tgt, fov: 26 };
  };
  return {
    name: 's03-turned', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform vec3 uWoman;
uniform float uFlare;
float envSDF(vec3 p, out float id) {
  id = 10.0;
  // the limb below him
  vec3 q = p - vec3(0.0, ${(limbY).toFixed(4)} - 0.042, 0.0);
  float d = length(q.yz - vec2(0.0, 0.06 - 0.12 * (0.5 - p.x))) - 0.042;
  return d;
}
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  vec2 uv = vec2(p.x, atan(n.z, n.y) * 0.042);
  alb = barkCol2(uv, 0.0) * 0.8; rough = 0.8; spec = 0.03;
}
vec3 sky(vec3 rd) { return meadowSky(rd, normalize(uSunDir)) * 0.5; }
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return col; }
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) {
  // the sun ahead rims him; a soft warm bounce from the meadow fills him from below
  vec3 L = normalize(uSunDir);
  float rim = pow(sat(1.0 - dot(n, -rd)), 3.0) * sat(dot(rd, L) * 0.5 + 0.5);
  return vec3(2.2, 1.4, 0.6) * rim * 0.6 + alb * vec3(0.5, 0.35, 0.15) * sat(-n.y * 0.5 + 0.5) * 0.5;
}
// everything beyond the branch, with the lens blur done analytically: sky, the far trees, the
// meadow as layers of backlit grass front to back, and the woman standing among them
vec3 far(vec3 ro, vec3 rd) {
  vec3 sunD = normalize(uSunDir);
  float sd = pow(max(dot(rd, sunD), 0.0), 4.0);
  vec3 haze = vec3(0.5, 0.33, 0.15) * (0.45 + 0.9 * sd);
  // front to back: accumulate until the view is covered
  vec3 acc = vec3(0.0); float A = 0.0;
  bool womanDone = false;
  for (int i = 0; i < 16; i++) {
    float zl = 7.0 + float(i) * 2.5;
    float s = (zl - ro.z) / rd.z;
    if (!womanDone && uWoman.z < zl) {
      womanDone = true;
      float sw = (uWoman.z - ro.z) / rd.z;
      vec3 q3 = ro + rd * sw;
      vec2 q = vec2(-(q3.x - uWoman.x), q3.y - uWoman.y);
      float bwq = cocA(sw) * sw + 0.004;
      if (q.y > -0.1 - 3.0 * bwq && q.y < 1.9 + 3.0 * bwq && abs(q.x) < 0.6 + 3.0 * bwq) {
        float sdw = womanSD(q, uTime);
        float bw2 = cocA(sw) * sw + 0.004;
        float aw = smoothstep(bw2, -bw2, sdw);
        float rim = exp(-max(sdw, 0.0) / (0.006 + bw2)) * smoothstep(-0.03 - bw2, 0.0, sdw) * (0.35 + 0.65 * smoothstep(1.1, 1.65, q.y)) * 0.01 / (0.01 + bw2);
        vec3 cw = vec3(0.05, 0.035, 0.02) * aw + vec3(1.4, 0.85, 0.35) * rim * (0.5 + 1.2 * sd) * 0.6;
        float ar = max(aw, sat(rim * 0.8));
        acc += (1.0 - A) * cw; A += (1.0 - A) * ar;
      }
    }
    if (s <= 0.0) continue;
    vec3 p = ro + rd * s;
    if (p.y > 1.35) continue;           // above every stalk
    float bw = cocA(s) * s + 0.002;
    float a; vec3 g = grassLayer(p, bw, sunD, sd, uTime, float(i), a);
    g = mix(g, haze, 1.0 - exp(-s * 0.03));
    acc += (1.0 - A) * a * g; A += (1.0 - A) * a;
    if (A > 0.995) break;
  }
  if (A < 0.995) {
    vec3 c = meadowSky(rd, sunD);
    vec4 tr = farTrees(ro, rd, sunD, 48.0, uTime);
    c = mix(c, tr.rgb, tr.a);
    // the meadow beyond the last layer
    if (rd.y < 0.0 && tr.a < 0.5) c = mix(c, haze * 0.6, 0.7);
    acc += (1.0 - A) * c;
  }
  vec3 c = mix(acc, haze, 0.08);
  c += vec3(1.0, 0.7, 0.35) * uFlare * pow(max(dot(rd, sunD), 0.0), 3.0) * 0.5;
  return c;
}
vec3 shade(vec2 fc) {
  vec3 ro0; vec3 rd0 = camRay(fc, ro0);
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float id, si;
  vec4 h = marchScene(ro, rd, 0.9, id, si);
  if (id < 0.0) return far(ro0, rd0) * uExp;
  vec3 p = h.xyz;
  vec3 n = calcNormal(p, 0.00012 * (1.0 + h.w));
  vec3 L = normalize(uSunDir);
  float sh = softShadow(p + n * 0.0015, L, 0.002, 2.0, 14.0);
  float ao = calcAO(p, n, 0.03);
  vec3 col;
  if (id > 2.5 && id < 3.5) col = shadeEye(p, n, rd, sh);
  else if (id < 4.5) col = shadeSerpent(p, n, rd, id, si, sh, ao);
  else { vec3 alb; float rough, spec; envMat(p, n, id, alb, rough, spec); col = lightSurf(p, n, rd, alb, rough, vec3(spec), sh, ao, 0.3); }
  return col * uExp;
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [3.0, 2.0, 1.0], uSkyCol: [0.35, 0.33, 0.3], uGndCol: [0.4, 0.28, 0.12], uWoman: WOMAN, uFlare: 0 },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      const c = cam(t);
      const dh = V.len(V.sub(V.add(ps.head.pos, V.mul(ps.head.F, 0.04)), c.pos));
      const dw = V.len(V.sub([WOMAN[0], 1.2, WOMAN[2]], c.pos));
      // the pull: from his head to her, starting as he turns, settled by "woman"
      const k = ease.inOut3(clamp((t - tTurn) / Math.max(0.6, tWoman - tTurn), 0, 1));
      u.uFocus.value = 1 / (1 / dh + (1 / dw - 1 / dh) * k);
      u.uAper.value = 0.0045;
      u.uFlare.value = 0.15 + 0.6 * ease.inOut3(clamp((t - (P.to - 1.2)) / 1.2, 0, 1));
    },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.2, threshold: 0.9, vignette: 0.5, saturation: 1.05, contrast: 1.06 }); },
    finish(t) { return { flare: { amount: 0.08, threshold: 1.2, tint: [1.0, 0.72, 0.4], length: 0.3 }, leak: { amount: 0.12, warm: [1.0, 0.6, 0.25], cool: [0.9, 0.5, 0.3], speed: 0.05 }, grade: { shadows: [0.03, 0.02, 0.0], highlights: [1.0, 0.9, 0.74], amount: 0.45 } }; },
  };
};
