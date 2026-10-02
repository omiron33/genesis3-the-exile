// 31 · "The serpent tricked me, she replied; I ate."
// Low in the grass at cold dusk, the lens a hand's height above the dew: the serpent pours past
// close beside us and races away through the wet blades on a long sinuous line, flattening a dark
// trail in the silver dew, and is gone under the big low leaves at the edge of the thicket.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';

export const kind = 'shader';

const SUN = V.nrm([-0.35, 0.12, 1]);
const RS = 0.021;
const LEAVES_Z = 2.5;
// the line he takes: sinuous across the field, away from the lens
const px = (z) => 0.13 * Math.sin(2 * Math.PI * z / 0.75 + 0.4) * Math.min(1, Math.max(0.25, z / 1.2)) + 0.04 * z;
const GLSL_PX = `float pathX(float z) { return 0.13 * sin(6.2831853 * z / 0.75 + 0.4) * clamp(z / 1.2, 0.25, 1.0) + 0.04 * z; }`;

export default (P) => {
  const D = P.to - P.from;
  const path = pathFn((z) => [px(z), RS * 0.62, z], -3, 8, 6000);
  // arc length of the point at depth z
  const sOfZ = (z) => { let lo = 0, hi = path.length; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.at(m)[2] < z) lo = m; else hi = m; } return lo; };
  const s0 = sOfZ(0.75), s1 = sOfZ(LEAVES_Z + 1.65);   // the tail is under the leaves at the end
  const sHeadAt = (t) => {
    const x = clamp((t - P.from) / (D - 0.5), 0, 1);
    return s0 + (s1 - s0) * (0.35 * x + 0.65 * ease.inOut3(x));
  };
  const poseT = (t) => pose({ path, sHead: sHeadAt(t), L: 1.35, rMax: RS });
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / D, 0, 1));
    return { pos: [-0.14 + 0.05 * k, 0.2 - 0.02 * k, -0.5 + 0.25 * k], target: [0.12 + 0.05 * k, 0.0, 2.4], fov: 34 };
  };
  return {
    name: 's31-tricked', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform float uZHead;
${GLSL_PX}
float envSDF(vec3 p, out float id) { id = 10.0; return p.y; }
// the lawn seen from above: fine blades combed in many directions, silvered with dew, and the dark
// flattened trail where he has passed
float trailK(vec3 p) { return smoothstep(0.05, 0.022, abs(p.x - pathX(p.z))) * smoothstep(uZHead + 0.05, uZHead - 0.15, p.z); }
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  float tr = trailK(p);
  vec2 q = p.xz;
  float dir = fbm(q * 3.0, 2) * 6.0;
  vec2 g = rot(dir) * q;
  float bl = vnoise(vec2(g.x * 900.0, g.y * 90.0));
  float bl2 = vnoise(vec2(g.x * 1600.0 + 3.0, g.y * 140.0));
  vec3 c = mix(vec3(0.01, 0.018, 0.012), vec3(0.05, 0.075, 0.06), bl * 0.6 + bl2 * 0.4);
  c *= 0.75 + 0.5 * fbm(q * 8.0, 3);
  // the trail: blades pressed flat and darker, the dew gone
  c = mix(c, vec3(0.008, 0.013, 0.01) * (0.7 + 0.6 * vnoise(vec2(p.z * 300.0, 1.0))), tr * 0.85);
  alb = c;
  // bump: blade grain, smoother in the trail
  vec3 bn = vec3(bl - 0.5, 0.0, bl2 - 0.5) * 0.6 * (1.0 - tr * 0.7);
  n = normalize(n + bn);
  rough = mix(mix(0.6, 0.4, tr), 0.9, smoothstep(1.5, 5.0, length(p.xz - uCamPos.xz))); spec = 0.03;
}
// dew: tiny beads that flash with the sky (view dependent sparkle)
vec3 dew(vec3 p, vec3 rd, float pixw) {
  float tr = trailK(p);
  vec2 g = p.xz * 220.0;
  vec2 id = floor(g), f = fract(g);
  vec3 h = hash33(vec3(id, 1.0));
  vec2 o = h.xy - f;
  float r = 0.06 + 0.08 * h.z;
  float d = length(o) / max(r, pixw * 220.0 * 1.5);
  float bead = smoothstep(1.0, 0.3, d) * step(0.85, h.z);
  // glint when the bead's highlight faces the sky behind
  float gl = pow(sat(0.5 + 0.5 * sin(h.x * 40.0 + rd.x * 30.0 + rd.z * 20.0)), 8.0);
  // a fine silver film of dew everywhere it lies
  float film = 0.25 * (1.0 - tr);
  return vec3(0.5, 0.6, 0.78) * (bead * (0.1 + 0.9 * gl) * (1.0 - tr) + film * 0.05) * smoothstep(6.0, 0.5, length(p.xz - uCamPos.xz));
}
vec3 sky(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(vec3(0.42, 0.44, 0.5), vec3(0.12, 0.16, 0.26), smoothstep(0.0, 0.35, y));
  c = mix(c, vec3(0.04, 0.06, 0.12), smoothstep(0.3, 0.9, y));
  // the last cold-rose light where the sun went down
  float sd = max(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  c += vec3(0.35, 0.22, 0.2) * pow(sd, 6.0) * smoothstep(0.25, 0.0, y);
  // the far treeline
  float az = atan(rd.x, rd.z);
  float top = 0.03 + 0.025 * fbm(vec2(az * 5.0, 1.0), 4) + 0.02 * pow(fbm(vec2(az * 30.0, 3.0), 3), 2.0) + 0.008 * fbm(vec2(az * 120.0, 3.0), 2);
  c = mix(c, vec3(0.03, 0.04, 0.055), smoothstep(top + 0.004, top - 0.004, y));
  return c;
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return mix(col, vec3(0.16, 0.19, 0.25), 1.0 - exp(-t * 0.08)); }
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) { return vec3(0.0); }

// one layer of grass blades in the plane z = zl (x across, y up); writes alpha
vec3 blades(vec3 p, float zl, float bw, float L, out float a) {
  a = 0.0;
  vec3 col = vec3(0.0);
  // where he has passed the blades lie flattened and the dew is knocked off
  float px = pathX(zl);
  float trail = smoothstep(0.055, 0.025, abs(p.x - px)) * step(zl, uZHead + 0.02);
  float cw = 0.0075;
  float cx = floor(p.x / cw);
  for (int i = -2; i <= 2; i++) {
    float id = cx + float(i);
    vec3 h = hash33(vec3(id, L, 3.7));
    float x0 = (id + h.x) * cw;
    if (hash11(id * 1.31 + L * 7.7) > 0.35) continue;
    float hgt = mix(0.02, 0.11, h.y * h.y) * (1.0 - 0.75 * trail);
    float lean = (h.z - 0.5) * 0.06 + 0.012 * sin(uTime * 1.3 + id * 0.37 + L) + trail * 0.05 * sign(x0 - px);
    float y = p.y / hgt;
    if (y < 0.0 || y > 1.0) continue;
    float xc = x0 + lean * y * y;
    float w = 0.0019 * pow(1.0 - y, 0.6) + 0.0002;
    float d = abs(p.x - xc) - w;
    float aa = smoothstep(bw, -bw, d);
    if (aa <= 0.0) continue;
    // cold green-grey, darker low down, a silver edge from the sky
    float edge = smoothstep(-w, 0.0, d) ;
    vec3 c = mix(vec3(0.012, 0.02, 0.016), vec3(0.06, 0.08, 0.07), y) * (0.7 + 0.6 * hash11(id * 3.1 + L));
    c += vec3(0.12, 0.15, 0.2) * edge * y;
    // dew: a bead or two on the blade, catching the sky
    float dy = fract(h.x * 7.3 + h.z * 3.1) * 0.7 + 0.15;
    float bead = smoothstep(0.0022 + bw, 0.0, length(vec2(p.x - (x0 + lean * dy * dy), (y - dy) * hgt)));
    c += vec3(0.7, 0.8, 1.0) * bead * (1.0 - trail) * step(0.35, h.z) * 0.8;
    col = mix(col, c, aa * (1.0 - a)); a = max(a, aa);
  }
  return col;
}
// the edge of the thicket: a low clump of broad dark leaves hugging the ground, a shadowed hollow
// beneath them where he goes in; a layer at z = LEAVES_Z. Leaves are pointed ovals on a grid,
// each kept only if it sits under the clump's mounded outline; the nearest-numbered wins.
float clumpEnv(float x) { return 0.34 * sqrt(max(1.0 - pow(x / 0.9, 2.0), 0.0)); }
vec3 bigLeaves(vec3 p, float bw, out float a) {
  float cx = pathX(${LEAVES_Z.toFixed(2)});
  vec2 q = vec2(p.x - cx, p.y);
  float cs = 0.075;
  vec2 g = floor(q / cs);
  a = 0.0; vec3 col = vec3(0.0); float best = -1.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 id = g + vec2(i, j);
    vec3 h = hash33(vec3(id, 5.0));
    vec2 c = (id + h.xy) * cs;
    if (c.y > clumpEnv(c.x) || c.y < 0.0) continue;
    float ang = (h.z - 0.5) * 1.6 + (c.x > 0.0 ? -0.5 : 0.5 + 3.14159) * smoothstep(0.0, 0.5, abs(c.x)) + 0.04 * sin(uTime * 0.9 + id.x);
    vec2 l = rot(ang) * (q - c);
    float L = 0.07 + 0.05 * h.x, W = 0.032 + 0.018 * h.y;
    // pointed oval: narrows toward the tip at +x
    float w = W * sqrt(max(1.0 - pow(l.x / L, 2.0), 0.0)) * (1.0 - 0.35 * smoothstep(-0.2, 1.0, l.x / L));
    float d = abs(l.y) - w;
    float aa = smoothstep(bw, -bw, d) * step(abs(l.x), L);
    if (aa > 0.0 && h.z * 0.5 + c.y > best) {
      best = h.z * 0.5 + c.y;
      vec3 lc = vec3(0.012, 0.022, 0.015) * (0.6 + 0.8 * h.y) * (0.75 + 0.5 * fbm(l * 60.0, 2));
      lc *= 0.7 + 0.5 * smoothstep(-W, W, l.y);                         // the leaf's two halves
      lc *= 0.6 + 0.6 * smoothstep(0.0, 0.34, c.y);                     // inner leaves in shadow
      lc *= 1.0 - 0.25 * smoothstep(0.003, 0.0, abs(l.y));             // midrib
      lc += vec3(0.025, 0.032, 0.045) * smoothstep(-0.006, 0.0, d) * smoothstep(0.1, 0.3, c.y / 0.34) * h.y; // rim
      lc *= mix(0.2, 1.0, smoothstep(0.0, 0.12, p.y));                 // the hollow beneath
      col = lc; a = max(a, aa);
    }
  }
  return col;
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  gCeil = 0.06; gShadowMax = 0.5; gFlatFar = 5.0;
  vec3 col = render(ro, rd, 12.0);
  float id = gHitId; vec4 h = vec4(gHitP, gHitT);
  float tHit = gHitT;
  float pix = 1.0 / uRes.y * tan(radians(uFov) * 0.5) * 2.0;
  if (id > 9.5) col += atmos(dew(h.xyz, rd, pix * h.w + cocA(h.w) * h.w), ro, rd, h.w) * uExp;
  // taller blades and stems standing out of the lawn, and the thicket, far to near, each only in
  // front of what the ray hit
  bool leavesDone = false;
  for (int i = 23; i >= -1; i--) {
    float fi = float(i);
    float zl = ro.z + 0.12 + 0.06 * fi + 0.006 * fi * fi;
    if (!leavesDone && (zl < ${LEAVES_Z.toFixed(2)} || i < 0)) {
      leavesDone = true;
      float s = (${LEAVES_Z.toFixed(2)} - ro.z) / rd.z;
      if (s > 0.0 && s < tHit) {
        vec3 p = ro + rd * s;
        float a; vec3 l = bigLeaves(p, pix * s + cocA(s) * s, a);
        col = mix(col, atmos(l * (uSkyCol * 2.5 + 0.3), ro, rd, s), a);
      }
    }
    if (i < 0) break;
    float s = (zl - ro.z) / rd.z;
    if (s <= 0.0 || s > tHit) continue;
    vec3 p = ro + rd * s;
    if (p.y > 0.12 || p.y < -0.01) continue;
    float bw = pix * s + cocA(s) * s;
    float a; vec3 g = blades(p, zl, bw, fi, a);
    if (a > 0.0) {
      vec3 gc = g * (uSkyCol * 2.2 + 0.4);
      gc = atmos(gc, ro, rd, s);
      col = mix(col, gc, a);
    }
  }
  return col * uExp;
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [0.35, 0.36, 0.45], uSkyCol: [0.16, 0.2, 0.3], uGndCol: [0.03, 0.035, 0.04], uZHead: 0 },
    camera: cam,
    update(t, u) {
      const ps = poseT(t);
      applyPose(u, ps, tongue(t, []));
      u.uZHead.value = ps.head.pos[2];
      const c = cam(t);
      u.uFocus.value = Math.max(0.5, Math.min(3.2, V.len(V.sub(ps.pts[6], c.pos))));
      u.uAper.value = 0.004;
      u.uWet.value = 0.5;
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.1, threshold: 0.9, vignette: 0.55, saturation: 0.9, contrast: 1.05, gain: [0.95, 0.99, 1.06] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [0.92, 0.96, 1.0], amount: 0.5 } }; },
  };
};
