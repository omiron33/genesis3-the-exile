// 13 · "Like gods you will discern / what is good and what is evil."
// The pool beneath the tree, mirror-still: low at its edge we see the trunk standing in gold light
// above, and the whole tree hanging upside down in the dark water below. A fruit drops past the lens
// and into the pool; the rings run out, and as they pass the reflection divides into two trees side
// by side, one lit gold, one black. The rings run on to the edge of the frame.
import { grade, ease, keys, linesAt, wordIn } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export default (P) => {
  const [A] = linesAt(P.from - 0.6, 'Like gods');
  const gods = wordIn(A, 'gods').start, disc = wordIn(A, 'discern').start;
  const tHit = gods + 0.75;                 // the fruit meets the water
  const DROP = [7.0, -13.7];                // where (x, z)
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const cam = (t) => {
    const p = prog(t), e = 0.6 * p + 0.4 * ease.inOut3(p);
    const pos = [7.9 - 0.45 * e, 6.42 + 0.32 + 0.04 * e, -15.75 + 0.25 * e];
    const tgt = [2.2, 6.4 + 1.6, 0.0];
    return { pos, target: tgt, fov: 58, roll: 0.0 };
  };
  return {
    name: 's13-discern', from: P.from, to: P.to,
    frag: WORLD_GLSL + /* glsl */ `
uniform float uSplit, uFall, uFocus, uAper;
uniform vec3 uFruitW;
// the falling fruit: a small red sphere with the tree fruit's skin
float fallT(vec3 ro, vec3 rd) {
  vec3 oc = ro - uFruitW; float b = dot(oc, rd), c = dot(oc, oc) - 0.045 * 0.045, h = b * b - c;
  if (h < 0.0 || uFall < 0.5) return -1.0;
  return -b - sqrt(h);
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float tf = fallT(ro, rd);
  if (tf > 0.0) {
    vec3 p = ro + rd * tf, n = normalize(p - uFruitW);
    return fruitSkin(n, rd, SUN, sunC(), skyAmb(), 1.0, n * 0.045);
  }
  float tpl = (WP - ro.y) / rd.y;
  vec3 q = ro + rd * tpl;
  if (tpl > 0.0 && poolD(q.xz) < 0.3 && terrBase(q.xz) < WP) {
    vec3 n = waterN(q, true);
    vec3 rr = reflect(rd, n); rr.y = abs(rr.y);
    // after the fruit falls the reflection divides: the left half of the pool shows the tree lit,
    // shifted one way; the right half shows it black, shifted the other
    vec3 camR = normalize(cross(normalize(uCamTarget - uCamPos), vec3(0.0, 1.0, 0.0)));
    float side = dot(q - uCamPos, camR) / max(dot(q - uCamPos, normalize(uCamTarget - uCamPos)), 0.1);
    float ring = length(q.xz - vec2(${DROP[0]}, ${DROP[1]}));
    float sp = uSplit * smoothstep(0.0, 0.5, (uTime - ${tHit.toFixed(3)}) * 0.8 - ring * 0.3 + 0.3);
    // the seam between the two wanders with the rings
    float wob = 0.02 * sin(ring * 9.0 - uTime * 3.0) + 0.015 * sin(q.z * 3.0 + uTime);
    float kL = smoothstep(-0.035, 0.035, -side + wob);  // 1 on the lit (screen-left) half
    vec3 rL = rr, rD = rr;
    rL.xz = rot(sp * 0.075) * rL.xz;
    rD.xz = rot(-sp * 0.075) * rD.xz;
    float dd;
    vec3 rc;
    if (kL > 0.999) rc = landSky(q + n * 0.02, rL, jit, true, dd);
    else if (kL < 0.001) rc = landSky(q + n * 0.02, rD, jit, true, dd);
    else rc = mix(landSky(q + n * 0.02, rD, jit, true, dd), landSky(q + n * 0.02, rL, jit, true, dd), kL);
    // the dark tree: everything in that half of the water goes to a cold black
    // (the dark tree is black against a cold, dim sky)
    float lum = min(dot(rc, vec3(0.2126, 0.7152, 0.0722)), 3.0);
    vec3 darkC = dd < 300.0 ? rc * 0.01 : lum * vec3(0.12, 0.14, 0.19);
    rc = mix(rc, darkC, sat(sp) * (1.0 - kL));
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    vec3 body = vec3(0.01, 0.014, 0.012) * (skyAmb() + sunC() * 0.03);
    vec3 col = mix(body, rc, max(fr, 0.6));
    return atmos(col, rd, tpl);
  }
  float depth;
  return gardenScene(ro, rd, jit, depth);
}`,
    uniforms: { ...WORLD_UNIFORMS, uTreeWind: 0.06, uGrass: 0, uSplit: 0, uFall: 0, uFruitW: [0, -100, 0], uFocus: 18, uAper: 0.004, uDrop: [DROP[0], DROP[1], tHit] },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      // the fruit falls from above the frame and past the lens into the water at tHit
      const t0 = tHit - 0.62;
      if (t > t0 && t < tHit) {
        const k = (t - t0);
        const y = 6.42 + 0.5 * 9.81 * (tHit - t) * (tHit - t) * (1.0 + 0.0 * k);
        u.uFruitW.value.set(DROP[0], y, DROP[1]);
        u.uFall.value = 1;
      } else u.uFall.value = 0;
      u.uSplit.value = keys(t, [[P.from, 0], [tHit, 0], [disc + 0.6, 1, ease.inOut3], [P.to, 1.15]]);
      u.uFocus.value = 18;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.14, threshold: 1.0, contrast: 1.08 }); },
    finish(t) { return { leak: { ...FINISH.film.leak, amount: 0.1 }, grade: { shadows: [0.02, 0.015, 0.01], highlights: [1.0, 0.94, 0.84], amount: 0.3 } }; },
  };
};
