// The man outside the garden (s53 walking out, s54 seated by his fire), in his garment of skin: the
// MakeHuman figure baked by tools/make-humans.py, put into the exile world through its EX_HUMAN hook
// (lib/x-exile.js figureSD). One atlas holds his walk cycle and his seated pose.
import { humanAtlas, humanGLSL, walkKeys, walkPose, pose } from '/song/lib/x-human.js';

export async function exileHuman({ rim = 1.0 } = {}) {
  const H = await humanAtlas([...walkKeys('man-skin').filter((k) => !k.endsWith('-stand')), 'man-skin-seated']);
  const pre = `#define EX_HUMAN\n#define EX_RIM ${rim.toFixed(2)}\n` + humanGLSL(['uHumA']) + /* glsl */ `
uniform vec3 uWalkHP, uSitHP;
float exHuman(vec3 p, vec3 base, vec3 fwd, float sit) {
  vec3 q = p - base;
  float bb = length(q - vec3(0.0, 0.9, 0.0)) - 1.3;
  if (bb > 0.3) return bb;
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  q = vec3(dot(q, r), q.y, dot(q, fwd));
  float m;
  return uHumAFig(q, sit > 0.5 ? uSitHP : uWalkHP, m);
}
`;
  return {
    pre,
    uniforms: { ...H.uniforms('uHumA'), uWalkHP: [0, 0, 0], uSitHP: pose(H, 'man-skin-seated') },
    // the walk at a phase in strides (1 = a full stride pair)
    walk: (phase) => walkPose(H, 'man-skin', phase),
  };
}
