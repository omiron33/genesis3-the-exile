// The surge (s14): the instrumental turn toward the taking. A gale hits the garden around the tree at
// its centre (lib/x-tree-world.js, used read-only): the crown thrashes, the low sun strobes through
// the gaps in the moving crown, waves of bent grass run across the meadow toward the tree, the red
// fruit swings on its twigs. No particles in the air (nothing that could read
// as rain, seeds or snow).
import { ease, clamp01, beats } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS, terrBaseJS } from '/song/lib/x-tree-world.js';

// the gale: slams in on the first beat, holds, eases a little over the last beat
export function gale(t, P) {
  const D = P.to - P.from;
  return clamp01((t - P.from + 0.05) / 0.35) * (1 - 0.35 * ease.inOut3(clamp01((t - (P.to - 0.2 * D)) / (0.2 * D))));
}
// a hit on each beat that settles fast (handheld, taking the drums)
export function hits(t, P) {
  let x = 0, y = 0;
  for (const b of beats) {
    if (b < P.from - 0.01 || b > t) continue;
    const k = t - b, e = Math.exp(-k * 7) * Math.sin(k * 26);
    x += e * Math.sin(b * 13.1); y += e * Math.cos(b * 7.7);
  }
  return [x, y];
}

// the camera: low in the meadow below the rise, pushing in hard toward the tree and ending near the
// edge of its crown on a long lens, tilted up at a fruit-laden limb (s15 then goes under the branches)
const F4 = [-1.23, 14.15, -9.94];   // fruitPosJS(4): a fruit on the near side of the crown
export function surgeCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = 0.25 * u + 0.75 * ease.inOut3(u);
    const g = gale(t, P);
    const [hx, hy] = hits(t, P);
    const x = 7.0 - 7.5 * k, z = -60 + 36 * k;
    const y = terrBaseJS(x, z) + 1.35 + 0.3 * k;
    const lookUp = 0.85 * ease.inOut3(clamp01((u - 0.4) / 0.6));
    const tgt = [0.6 * (1 - lookUp) + F4[0] * lookUp, 18.0 * (1 - lookUp) + (F4[1] - 2.0) * lookUp, 0 * (1 - lookUp) + F4[2] * lookUp];
    const amp = 0.05 * g;
    const dist = Math.hypot(tgt[0] - x, tgt[1] - y, tgt[2] - z);
    return {
      pos: [x + hx * amp * 0.5, y + hy * amp * 0.4, z],
      target: [tgt[0] + hx * amp * 5, tgt[1] + hy * amp * 4, tgt[2]],
      fov: 46 - 18 * k, roll: 0.012 * hx * g, focus: dist, aperture: 0.02,
    };
  };
}

export const SURGE_UNIFORMS = {
  ...WORLD_UNIFORMS, uGrass: 1, uGrassFar: 16, uGrassH: 1.0, uTreeWind: 0.1, uTreeShiver: 0, uCloudSh: 0, uCloudX: -200,
  uFocus: 40, uAper: 0.02, uGale: 0, uWaveT: 0,
};

export const SURGE_GLSL = WORLD_GLSL + /* glsl */ `
uniform float uFocus, uAper, uGale, uWaveT;
// waves of wind across the meadow: broad bands of grass laid flat, showing their pale undersides,
// running from behind the camera toward the tree (+z), with the gusts' lulls dark between them
float meadowWave(vec2 xz) {
  // gust patches (cat's-paws) racing over the grass toward the tree at about 10 m/s, broken up and
  // streaked along the wind
  vec2 q = xz + 4.0 * vec2(fbm(xz * 0.05, 2), fbm(xz * 0.05 + 5.0, 2));
  float g = fbm(vec2(q.x * 0.07, q.y * 0.12 - uWaveT * 0.75), 4);
  float band = smoothstep(0.47, 0.72, g);
  band *= 0.65 + 0.35 * vnoise(vec2(q.x * 1.6, q.y * 0.25 - uWaveT * 2.0));
  return band * uGale;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenScene(ro, rd, jit, depth);
  // the wind waves on the grass (only where we see the meadow floor, not the tree or the sky)
  if (depth < 600.0) {
    vec3 p = ro + rd * depth;
    float above = p.y - terrBase(p.xz);
    float onGrass = smoothstep(0.9, 0.2, above) * smoothstep(9.0, 16.0, length(p.xz - uTreePos.xz));
    if (onGrass > 0.0) {
      float w = meadowWave(p.xz);
      float sun = sat(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(SUN.x, 0.0, SUN.z))));
      // laid grass shows its pale, silvery undersides and catches the sun; the lulls stand dark
      c = c * mix(1.0, 0.8, onGrass * uGale * (1.0 - w)) + onGrass * w * vec3(0.09, 0.1, 0.055) * (0.5 + 1.2 * sun) * exp(-depth * 0.004);
    }
  }
  return c;
}`;
