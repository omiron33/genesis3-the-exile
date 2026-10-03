// Builds an exile scene from a camera and a function that sets the world's state from song time.
import { EXILE_GLSL, EXILE_UNIFORMS } from '/song/lib/x-exile.js';

// pre: GLSL put ahead of the world (e.g. EX_HUMAN and its figure), uniforms: extra uniforms
export function exileScene(P, { name, cam, set = () => ({}), post, finish, pre = '', uniforms = {} }) {
  return {
    name, from: P.from, to: P.to,
    frag: pre + EXILE_GLSL + '\nvec3 shade(vec2 fc) { return exile(fc); }\n',
    uniforms: { ...EXILE_UNIFORMS, ...uniforms },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const s = { uFocus: c.focus ?? 20, uAper: c.aperture ?? 0, ...set(t, c) };
      for (const [k, v] of Object.entries(s)) {
        if (!u[k]) continue;
        if (Array.isArray(v)) u[k].value.set(...v); else u[k].value = v;
      }
    },
    post, finish,
  };
}
