// 11 · "No death will come from this."
// Extreme close-up of the serpent's eye: a gold iris with a slit pupil behind a glassy cornea, the
// small plates round it, and in the curved glass the reflected world: the gold sky, the dark crown
// of the tree, a red fruit. The lie is told; the reflected light swells to a white bloom and falls
// back to a dark, still eye before the next line.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';
import lyrics from '/timing.js';

export const kind = 'shader';

const SUN = V.nrm([0.3, 0.75, -0.5]);

export default (P) => {
  const ws = lyrics.words.filter((w) => w.start >= P.from - 0.3 && w.start < P.to);
  const last = ws.at(-1) ?? { start: P.to - 2, end: P.to - 1.6 };
  const tDeath = (ws.find((w) => /death/i.test(w.w)) ?? { start: P.from + 1 }).start;
  const D = P.to - P.from;
  // the bloom: rises after the last word, peaks, and is gone 0.5 s before the cut
  const bPeak = Math.min(last.end + 0.55, P.to - 1.0), bEnd = P.to - 0.5, bStart = Math.min(last.end + 0.05, bPeak - 0.3);
  const bloom = (t) => t < bStart ? 0 : t < bPeak ? ease.inOut3((t - bStart) / (bPeak - bStart)) : 1 - ease.inOut3(clamp((t - bPeak) / (bEnd - bPeak), 0, 1));
  // the head lies still along +x, the right side of his face (and his eye) toward the lens at -z
  const path = pathFn((u) => [-u, 0, 0], -2, 0.5, 400);
  const poseT = (t) => {
    const br = 0.0006 * Math.sin(t * 1.9);
    return pose({ path, sHead: 0.0, L: 1.3, rMax: 0.021, roll: 0.0, headDir: [1, 0.02 + br, 0] });
  };
  const ps0 = poseT(P.from);
  const h = ps0.head;
  const R = V.nrm(V.cross(h.U, h.F));   // head's right
  // eye centre in the world (EYE_C on the side facing -z)
  const side = R[2] < 0 ? 1 : -1;
  const eyeW = V.add(V.add(h.pos, V.mul(R, 0.0148 * side)), V.add(V.mul(h.U, 0.0048), V.mul(h.F, 0.047)));
  const axis = V.nrm(V.add(V.add(V.mul(R, side), V.mul(h.U, 0.18)), V.mul(h.F, 0.42)));
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    const dist = 0.04 - 0.012 * k;
    const off = V.add(V.mul(axis, dist), V.add(V.mul(h.F, 0.004 - 0.003 * k), V.mul(h.U, 0.003)));
    const pos = V.add(eyeW, off);
    return { pos, target: V.add(V.add(eyeW, V.mul(h.F, 0.0025 * (1 - k))), V.mul(h.U, -0.0024 - 0.0006 * k)), fov: 32, roll: 0.02 * Math.sin(t * 0.7) };
  };
  return {
    name: 's11-no-death', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform vec3 uFruitDir;
uniform float uBloom;
float envSDF(vec3 p, out float id) { id = 10.0; return p.y + 0.03; }
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) { alb = vec3(0.08, 0.07, 0.05); rough = 0.9; spec = 0.02; }
// the world the eye reflects: gold sky, the dark crown of the tree above, one red fruit
vec3 sky(vec3 rd) {
  float y = rd.y;
  vec3 fd = normalize(uFruitDir);
  vec3 fx = normalize(cross(fd, vec3(0.0, 1.0, 0.0))), fy = cross(fx, fd);
  vec2 q = vec2(dot(rd, fx), dot(rd, fy)) / max(dot(rd, fd), 0.05);
  // the dark garden all round, and a window of low gold sky between the leaves behind the fruit
  float leaves = fbm(q * 2.2 + 3.0, 4);
  float win = smoothstep(1.1, 0.5, length(q * vec2(0.8, 1.0) - vec2(0.15, 0.1)) + 0.35 * (leaves - 0.5));
  vec3 gold = mix(vec3(1.25, 0.7, 0.24), vec3(0.6, 0.42, 0.24), smoothstep(-0.6, 0.8, q.y));
  vec3 c = mix(vec3(0.025, 0.03, 0.012), gold, win);
  // the fruit, hanging in the window, lit from the side, its stalk going up into the leaves
  float r = length(q * vec2(1.0, 1.08));
  float fruit = smoothstep(0.36, 0.33, r);
  vec3 fc = vec3(0.9, 0.05, 0.025) * (0.25 + 1.0 * smoothstep(0.5, -0.2, length(q - vec2(-0.12, 0.14))));
  fc += vec3(2.0, 1.5, 1.0) * smoothstep(0.07, 0.0, length(q - vec2(-0.13, 0.16)));
  c = mix(c, fc, fruit);
  float stalk = smoothstep(0.02, 0.01, abs(q.x - 0.03 * (q.y - 0.3))) * step(0.3, q.y) * step(q.y, 0.9);
  c = mix(c, vec3(0.03, 0.02, 0.01), stalk);
  // the bloom: the reflected light swells to white
  c = mix(c, vec3(6.0, 5.0, 3.6), uBloom * (0.4 + 0.6 * smoothstep(0.0, 0.6, y + 0.3)));
  return c;
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return col; }
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) { return alb * vec3(3.0, 2.5, 1.8) * uBloom * 0.4; }
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  vec3 c = render(ro, rd, 0.5);
  return c;
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [2.6, 1.9, 1.1], uSkyCol: [0.5, 0.42, 0.3], uGndCol: [0.15, 0.12, 0.06], uFruitDir: V.nrm(V.add(V.add(axis, V.mul(h.U, 0.18)), V.mul(h.F, -0.12))), uBloom: 0, uEyeRefl: 5.0 },
    camera: cam,
    update(t, u) {
      applyPose(u, poseT(t), [0, 0, 0.3, 0]);
      const c = cam(t);
      u.uFocus.value = V.len(V.sub(V.add(eyeW, V.mul(axis, 0.0058)), c.pos));
      u.uAper.value = 0.0009;
      u.uBloom.value = bloom(t);
      u.uExp.value = 1.0 - 0.35 * clamp((t - bEnd + 0.2) / 0.5, 0, 1);
    },
    post(t) { return grade(t, { exposure: 1.2, bloom: 0.16 + 0.3 * bloom(t), threshold: 0.85, vignette: 0.6, saturation: 1.05, contrast: 1.08 }); },
    finish(t) { return { grade: { shadows: [0.01, 0.02, 0.01], highlights: [1.0, 0.92, 0.8], amount: 0.4 } }; },
  };
};
