# Builds the film's two people with MakeHuman's MPFB 2 add-on for Blender, poses them with its rig,
# and bakes every pose the scenes need into assets/humans/ (git-ignored, reproducible with this file):
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/make-humans.py -- [--only name,...] [--preview]
#
#   assets/humans/glb/<set>-<pose>.glb   the posed meshes (body, hair, fig-leaf girdle or tunic of skin)
#                                        (bare: nothing but hair; her long hair falls forward over her breast)
#   assets/humans/sdf/<grid>/<set>-<pose>.bin   a signed distance volume of the same, RG8 (R distance,
#                                        G material: 0 skin, 0.5 hair, 0.85 fig leaves, 1 garment of skin)
#   assets/humans/index.js               what was baked (grids, poses, content hashes) for lib/x-human.js
#
# Needs MPFB 2 (extensions.blender.org, installed as bl_ext.user_default.mpfb) and the CC0 MakeHuman
# system assets (hair) unpacked under assets/humans/src/ (see docs/CREDITS.md). The scenes never see a
# face or skin: the volumes only carry shape, and the shaders draw them as dark, rim-lit silhouettes.
#
# Frames: Blender has the figure facing -Y with +Z up. The volumes use the scenes' figure frame:
# x = the figure's left (Blender +X), y = up (Blender +Z), z = forward (Blender -Y); feet on y = 0.
import bpy, addon_utils, sys, os, json, math, hashlib, time
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
SONG = os.path.dirname(HERE)
OUT = os.path.join(SONG, 'assets', 'humans')
SRC = os.path.join(OUT, 'src')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None):
    return argv[argv.index('--' + k) + 1] if ('--' + k) in argv else d
ONLY = set(filter(None, (arg('only', '') or '').split(',')))
PREVIEW = '--preview' in argv
NOBAKE = '--nobake' in argv

addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

# ------------------------------------------------------------------ the two people
PEOPLE = {
    # an adult man, lean and strong, natural proportions; short-to-medium hair
    'man': dict(macro=dict(gender=1.0, age=0.5, muscle=0.62, weight=0.48, proportions=0.75, height=0.62),
                hair='short02/short02.mhclo'),
    # an adult woman, natural proportions, nearly as tall as he is (about 7.5 cm shorter); long hair
    # down her back and two locks of it brought forward over her breast (make_locks)
    'woman': dict(macro=dict(gender=0.0, age=0.47, muscle=0.5, weight=0.47, proportions=0.75, height=0.683, cupsize=0.45),
                  hair='long01/long01.mhclo'),
}

def F(r, u, f):
    """a direction in the figure frame (right, up, forward) as a Blender vector"""
    return Vector((-r, -f, u)).normalized()

def sag(a, side=0.0, out=0.0):
    """a limb pointing down, swung forward by a degrees and out to the side (side: +1 = figure's left)"""
    a = math.radians(a)
    return F(-side * out, -math.cos(a), math.sin(a))

# ------------------------------------------------------------------ building
def build(who, outfit):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    P = PEOPLE[who]
    m = TargetService.get_default_macro_info_dict()
    m.update(P['macro'])
    m['race'] = {'asian': 0.33, 'caucasian': 0.34, 'african': 0.33}
    body = HumanService.create_human(macro_detail_dict=m, detailed_helpers=True, extra_vertex_groups=True)
    body.name = who
    rig = HumanService.add_builtin_rig(body, 'game_engine')
    hair = HumanService.add_mhclo_asset(os.path.join(SRC, 'hair', P['hair']), body, asset_type='Hair', subdiv_levels=0)
    hair.name = who + '.hair'
    parts = {'body': body, 'hair': hair}
    if who == 'woman':
        parts['locks'] = make_locks(body, rig)
    if outfit == 'leaves':
        parts['cloth'] = make_girdle(body, rig)
    elif outfit == 'skin':
        parts['cloth'] = make_tunic(body, rig)
    return rig, parts

def bone_head(rig, name):
    return rig.matrix_world @ rig.pose.bones[name].head

def rest_bvh(body, rig, drop=()):
    """the body at rest as a BVH, leaving out faces mostly weighted to the given bones"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    vg = {g.index: g.name for g in body.vertex_groups}
    # the masked (evaluated) mesh keeps vertex order of the kept vertices; map through positions
    verts = [ev.matrix_world @ v.co for v in me.vertices]
    bad = set()
    if drop:
        for v in me.vertices:
            w = sum(g.weight for g in v.groups if vg.get(g.group, '') in drop)
            if w > 0.4: bad.add(v.index)
    polys = [list(p.vertices) for p in me.polygons if not any(i in bad for i in p.vertices)]
    t = BVHTree.FromPolygons(verts, polys)
    ev.to_mesh_clear()
    return t

ARMS = {'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r'} | \
       {f'{f}_0{i}_{s}' for f in ('thumb', 'index', 'middle', 'ring', 'pinky') for i in (1, 2, 3) for s in 'lr'}

def hull_radius(bvh, z, ang, cx=0.0, cy=0.0, R=0.7):
    """the body's outer hull at height z in direction ang (0 = forward, +pi/2 = figure's left)"""
    d = Vector((math.sin(ang), -math.cos(ang), 0.0))
    o = Vector((cx, cy, z)) + d * R
    hit, n, i, dist = bvh.ray_cast(o, -d, R)
    return (R - dist) if hit else None

def skinned(name, verts, faces, groups, rig):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for gname in sorted({g for ws in groups for g in ws}):
        ob.vertex_groups.new(name=gname)
    for i, ws in enumerate(groups):
        tot = sum(ws.values()) or 1.0
        for g, w in ws.items():
            ob.vertex_groups[g].add([i], w / tot, 'REPLACE')
    mod = ob.modifiers.new('rig', 'ARMATURE'); mod.object = rig
    ob.parent = rig
    return ob

def hip_weights(ang, t):
    """skinning for a point of a skirt: t = 0 at the waist .. 1 at the hem"""
    x = math.sin(ang)   # +1 the figure's left
    k = min(1.0, t) * 0.75
    return {'pelvis': 1.0 - k + 1e-3, 'thigh_l': k * max(0.0, min(1.0, 0.5 + 0.9 * x)) + 1e-4, 'thigh_r': k * max(0.0, min(1.0, 0.5 - 0.9 * x)) + 1e-4}

def leaf_outline(th, L, k):
    """a fig leaf seen flat, hung by its stalk: distance from the stalk to the edge at angle th
    (0 = straight down to the tip, +-pi/2 = out to the sides). Five deep lobes, the middle one longest."""
    lobes = ((0.0, 1.0), (0.62, 0.84), (-0.62, 0.84), (1.25, 0.58), (-1.25, 0.58))
    r = 0.3
    for c, ln in lobes:
        c += 0.06 * math.sin(k * 3.7 + c * 5.0)
        r = max(r, 0.3 + (ln - 0.3) * math.exp(-((th - c) / 0.21) ** 2))
    return L * r

def make_girdle(body, rig):
    """the girdle they sewed of fig leaves: a thin cord tied round the hips, high, and a few large
    fig leaves hung from it on their stalks, front, sides and back, with gaps between them, so the
    outline is ragged and plainly leafy (no skirt, nothing above the hips)"""
    bvh = rest_bvh(body, rig, drop=ARMS)
    zc = bone_head(rig, 'thigh_l').z            # the hip joints
    zcord = zc + 0.075                          # the cord: low on the belly, over the hip bones
    def hull(z, a):
        return hull_radius(bvh, z, a) or 0.15
    verts, faces, groups = [], [], []
    # the cord: a narrow band round the body
    A = 48
    for j, dz in enumerate((0.006, -0.006)):
        for i in range(A):
            a = 2 * math.pi * i / A
            r = hull(zcord, a) + 0.004
            verts.append((math.sin(a) * r, -math.cos(a) * r, zcord + dz))
            groups.append({'pelvis': 1.0})
    for i in range(A):
        faces.append((i, (i + 1) % A, A + (i + 1) % A, A + i))
    # the leaves: (angle round the body, length, sideways tilt) - a large leaf over the front, one over
    # the seat, and one hanging at each hip, standing off it; bare skin and the cord between them, so
    # from any side the outline is a few separate lobed leaves on a cord, not a skirt
    LEAVES = [(0.0, 0.205, 0.0), (1.62, 0.17, 0.3), (-1.64, 0.165, -0.26), (math.pi, 0.2, 0.05)]
    for k, (a0, L, tilt) in enumerate(LEAVES):
        R0 = hull(zcord, a0) + 0.01
        base = len(verts)
        NT, NR = 41, 7
        ths = [-1.75 + 3.5 * i / (NT - 1) for i in range(NT)]
        for j in range(NR):
            rho = (j + 0.15) / (NR - 0.85)
            for th in ths:
                rr = leaf_outline(th, L, k) * rho
                u = rr * math.sin(th + tilt)
                v = max(-0.025, 0.012 + rr * math.cos(th + tilt))   # the stalk is a centimetre below the cord
                a = a0 + u / R0
                z = zcord - v
                # hang clear of the body: never closer than the hips above, standing off a little more
                # toward the tip, the leaf's middle bellying out
                rb = max(hull(z, a), hull(zcord, a), hull(zcord - 0.05, a)) if z > zc - 0.16 else max(hull(zcord, a), hull(zcord - 0.05, a))
                r = rb + 0.01 + (0.025 + 0.03 * math.sin(a) ** 2) * (max(0.0, v) / 0.2) ** 1.5 + 0.005 * (1.0 - rho) * math.cos(th)
                verts.append((math.sin(a) * r, -math.cos(a) * r, z))
                groups.append(hip_weights(a, max(0.0, v - 0.04) / 0.3))
        for j in range(NR - 1):
            for i in range(NT - 1):
                q = base + j * NT + i
                faces.append((q, q + 1, q + NT + 1, q + NT))
    return skinned('girdle', verts, faces, groups, rig)

def make_locks(body, rig):
    """her long hair: besides what falls down her back, two thick locks brought forward over her
    shoulders that fall down over her breast in a loose curtain, their ends ragged"""
    bvh = rest_bvh(body, rig, drop=ARMS)
    hd = bone_head(rig, 'head')
    zsh = bone_head(rig, 'upperarm_l').z
    z0, z1, zend = hd.z + 0.05, zsh + 0.035, zsh - 0.33
    def front(x, z):
        hit, n, i, d = bvh.ray_cast(Vector((x, -0.8, z)), Vector((0, 1, 0)), 1.6)
        return hit.y if hit else None
    verts, faces, groups = [], [], []
    NS, NW = 30, 9
    for sd in (1.0, -1.0):
        base = len(verts)
        cols = []
        for i in range(NW):
            w = i / (NW - 1) - 0.5
            # each column of strands ends at its own length: a ragged end
            ln = 1.0 - 0.14 * abs(math.sin(w * 9.0 + sd)) - 0.08 * (2 * abs(w)) ** 2
            col = []
            yprev = yfl = None
            for j in range(NS):
                s = j / (NS - 1) * ln
                # the path: from beside the head, over the front of the shoulder, down the breast
                if s < 0.28:
                    u = s / 0.28
                    z = z0 + (z1 - z0) * u
                    xc = 0.08 + 0.035 * u * u
                    wd = 0.045 + 0.035 * u
                else:
                    u = (s - 0.28) / 0.72
                    z = z1 + (zend - z1) * u
                    xc = 0.115 - 0.02 * u
                    wd = (0.08 + 0.035 * min(1.0, u * 2.5)) * (1.0 - 0.45 * max(0.0, (s - 0.82) / 0.18))
                x = sd * (xc + w * wd)
                if s < 0.28:
                    # beside the head and neck, then forward over the top of the shoulder
                    yh = hd.y + 0.02
                    yf = front(x, zsh - 0.02)
                    ysh = (yf if yf is not None and yf < 0.0 else hd.y - 0.06) - 0.015
                    y = yh + (ysh - yh) * (u * u * (3 - 2 * u))
                else:
                    yf = front(x, z)
                    if yf is not None and yf > 0.0: yf = None      # missed the front (past the side)
                    if yf is None: yf = yfl if yfl is not None else hd.y - 0.06
                    yfl = yf
                    y = yf - 0.013
                    # it falls as a curtain: below the fullest point it hangs down instead of following in
                    if yprev is not None: y = min(y, yprev + 0.12 * abs(z - zprev))
                yprev, zprev = y, z
                y += 0.003 * math.sin(w * 31.0 + sd * 2.0)      # strands
                col.append((x, y, z))
                if s < 0.12: ws = {'head': 1.0}
                elif s < 0.3:
                    f = (s - 0.12) / 0.18
                    ws = {'head': 1.0 - f + 1e-3, 'neck_01': 0.5 * f + 1e-3, 'spine_03': 0.5 * f + 1e-3}
                else:
                    ws = {'spine_03': 1.0}
                groups.append(ws)
            verts.extend(col)
        for i in range(NW - 1):
            for j in range(NS - 1):
                q = base + i * NS + j
                faces.append((q, q + NS, q + NS + 1, q + 1))
    return skinned('locks', verts, faces, groups, rig)

def make_tunic(body, rig):
    """a garment of skin: a sleeveless tunic from the shoulders to the knee, its hem uneven"""
    bvh = rest_bvh(body, rig, drop=ARMS)
    zsh = bone_head(rig, 'upperarm_l').z
    zneck = bone_head(rig, 'neck_01').z
    zhip = bone_head(rig, 'thigh_l').z
    zknee = bone_head(rig, 'calf_l').z
    zhem = zknee + 0.04
    A, rows = 28, 26
    verts, faces, groups = [], [], []
    spines = [('spine_03', zsh - 0.12), ('spine_02', zsh - 0.25), ('spine_01', zhip + 0.12), ('pelvis', zhip)]
    for j in range(rows):
        t = j / (rows - 1)
        z0 = zneck - 0.01 + (zhem - zneck) * t
        for i in range(A):
            a = 2 * math.pi * i / A
            hem = 0.035 * math.sin(a * 3 + 1.0) + 0.02 * math.sin(a * 7 + 2.0) if t > 0.95 else 0.0
            z = z0 + hem * t
            if z > zsh:
                # over the shoulders: from the neck out to the shoulder tip, a slope
                r = hull_radius(bvh, zsh - 0.02, a) or 0.15
                f = (z - zsh) / max(zneck - zsh, 1e-3)
                r = r * (1 - 0.55 * f) + 0.02
            else:
                r = hull_radius(bvh, z, a) or 0.15
                below = max(0.0, (zhip - z) / max(zhip - zhem, 1e-3))
                r += 0.025 + 0.06 * below * below
                if z < zhip:   # the skirt hangs from the hips: never narrower than at the hip
                    r = max(r, (hull_radius(bvh, zhip - 0.05, a) or 0.18) + 0.025 + 0.05 * below)
            verts.append((math.sin(a) * r, -math.cos(a) * r, z))
            if z > zhip:
                ws = {'spine_03': 1e-3}
                for (bn, bz), (bn2, bz2) in zip(spines, spines[1:]):
                    if bz2 <= z:
                        u = max(0.0, min(1.0, (z - bz2) / max(bz - bz2, 1e-3)))
                        ws = {bn: u + 1e-3, bn2: 1 - u + 1e-3}; break
                if z > spines[0][1]: ws = {'spine_03': 1.0}
                groups.append(ws)
            else:
                groups.append(hip_weights(a, (zhip - z) / max(zhip - zhem, 1e-3)))
    for j in range(rows - 1):
        for i in range(A):
            a, b = j * A + i, j * A + (i + 1) % A
            faces.append((a, b, b + A, a + A))
    return skinned('tunic', verts, faces, groups, rig)

# ------------------------------------------------------------------ posing
def upd():
    bpy.context.view_layer.update()

def reset(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    upd()

def rotate(rig, name, axis, deg):
    """turn a bone (and everything below it) about a world axis through its head"""
    pb = rig.pose.bones[name]
    M = rig.matrix_world @ pb.matrix
    h = M.translation.copy()
    R = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis)) @ Matrix.Translation(-h)
    pb.matrix = rig.matrix_world.inverted() @ (R @ M)
    upd()

def aim(rig, name, d, twist=0.0):
    """point a bone along a world direction (its children follow)"""
    pb = rig.pose.bones[name]
    M = rig.matrix_world @ pb.matrix
    h = M.translation.copy()
    cur = (rig.matrix_world @ pb.tail) - h
    q = cur.normalized().rotation_difference(Vector(d).normalized())
    R = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)
    pb.matrix = rig.matrix_world.inverted() @ (R @ M)
    upd()
    if twist:
        rotate(rig, name, Vector(d).normalized(), twist)

def bdir(rig, name):
    pb = rig.pose.bones[name]
    return ((rig.matrix_world @ pb.tail) - (rig.matrix_world @ pb.head)).normalized()

def bend(rig, name, deg):
    """bend a joint forward (positive) in the figure's sagittal plane: about the figure's left-right axis"""
    rotate(rig, name, (1, 0, 0), deg)

def fingers(rig, curl=25.0, thumb=10.0):
    for s in 'lr':
        for f in ('index', 'middle', 'ring', 'pinky'):
            for i in (1, 2, 3):
                pb = rig.pose.bones.get(f'{f}_0{i}_{s}')
                if not pb: continue
                # curl about the hand's own side axis
                hb = rig.pose.bones[f'hand_{s}']
                ax = (rig.matrix_world.to_3x3() @ hb.matrix.to_3x3()) @ Vector((1, 0, 0))
                rotate(rig, pb.name, ax, curl * (0.7 + 0.15 * i) * (1 if s == 'l' else 1))
        pb = rig.pose.bones.get(f'thumb_02_{s}')
        if pb: rotate(rig, pb.name, (0, 0, 1), thumb * (1 if s == 'l' else -1))

def arms_down(rig, fwd=4.0, out=0.13, elbow=12.0, sides='lr', swing=(0.0, 0.0)):
    for k, s in enumerate('lr'):
        if s not in sides: continue
        sd = 1.0 if s == 'l' else -1.0
        a = fwd + swing[k]
        aim(rig, f'upperarm_{s}', sag(a, sd, out))
        aim(rig, f'lowerarm_{s}', sag(a + elbow, sd, out * 0.5))
        aim(rig, f'hand_{s}', sag(a + elbow + 4, sd, out * 0.3))

def legs(rig, thl=0.0, thr=0.0, knl=3.0, knr=3.0, footl=0.0, footr=0.0, out=0.035):
    """thigh forward angle, knee flexion and the foot's pitch (toe down +) for each leg, in degrees"""
    for s, th, kn, ft in (('l', thl, knl, footl), ('r', thr, knr, footr)):
        sd = 1.0 if s == 'l' else -1.0
        aim(rig, f'thigh_{s}', sag(th, sd, out))
        aim(rig, f'calf_{s}', sag(th - kn, sd, out * 0.4))
        # the foot bone runs from the ankle to the ball, about 28 degrees below level when flat
        p = math.radians(28 + ft)
        aim(rig, f'foot_{s}', F(-sd * 0.05, -math.sin(p), math.cos(p)))
        q = math.radians(max(-10.0, min(10.0, -ft * 0.3)))
        aim(rig, f'ball_{s}', F(-sd * 0.03, -math.sin(q) - 0.02, math.cos(q)))

def spine(rig, bow=0.0, side=0.0, turn=0.0, head=0.0, headturn=0.0, headtilt=0.0):
    """bow: forward bend of the back (degrees spread over the spine); head: extra bow of neck and head"""
    for b, k in (('spine_01', 0.25), ('spine_02', 0.35), ('spine_03', 0.4)):
        if bow: bend(rig, b, bow * k)
        if side: rotate(rig, b, (0, 1, 0), side * k)
        if turn: rotate(rig, b, (0, 0, 1), turn * k)
    if head: bend(rig, 'neck_01', head * 0.45); bend(rig, 'head', head * 0.55)
    if headturn: rotate(rig, 'neck_01', (0, 0, 1), headturn * 0.5); rotate(rig, 'head', (0, 0, 1), headturn * 0.5)
    if headtilt: rotate(rig, 'head', (0, 1, 0), headtilt)

def bump(p, c, w):
    d = (p - c + 0.5) % 1.0 - 0.5
    return math.exp(-d * d / (2 * w * w))

def gait(p):
    """sagittal angles through one stride from heel strike (p in 0..1): hip, knee, foot pitch"""
    hip = 9 + 21 * math.cos(2 * math.pi * (p - 0.04))
    knee = 4 + 14 * bump(p, 0.14, 0.07) + 58 * bump(p, 0.72, 0.105)
    foot = -14 * bump(p, 0.0, 0.05) + 34 * bump(p, 0.6, 0.075) + 8 * bump(p, 0.75, 0.06)
    return hip, knee, foot

def walk(rig, ph, tired=0.0):
    """one phase of a walk cycle, ph in [0, 1): the left heel strikes at 0"""
    w = 2 * math.pi * ph
    thl, knl, ftl = gait(ph % 1.0)
    thr, knr, ftr = gait((ph + 0.5) % 1.0)
    k = 1.0 - 0.3 * tired
    rotate(rig, 'pelvis', (0, 0, 1), -5 * math.cos(w) * k)
    rotate(rig, 'pelvis', (0, 1, 0), 2.5 * math.sin(2 * w))
    spine(rig, bow=3 + 7 * tired, turn=5 * math.cos(w) * k, head=4 + 16 * tired)
    legs(rig, thl * k, thr * k, knl, knr, ftl, ftr, out=0.02)
    arms_down(rig, fwd=3, out=0.1, elbow=14 + 8 * tired, swing=(-16 * math.cos(w) * k, 16 * math.cos(w) * k))

def stand(rig, **k):
    spine(rig, **{x: k[x] for x in ('bow', 'head', 'headturn', 'headtilt', 'turn', 'side') if x in k})
    legs(rig, 1.5, -1.0, 4, 3, out=k.get('stance', 0.04))
    arms_down(rig, fwd=k.get('armfwd', 4), out=k.get('armout', 0.12), elbow=k.get('elbow', 12))

# the poses the scenes use. Each is (who, outfit, [poses]); a pose is (name, function(rig)).
def P_stand(rig): stand(rig)
def P_still(rig): stand(rig, head=4, armout=0.1)
def P_bow(rig):
    # ashamed: head bowed deep, shoulders rounding, hands drawn together in front
    spine(rig, bow=12, head=34)
    legs(rig, 1.5, -1.0, 4, 3, out=0.03)
    for s in 'lr':
        sd = 1.0 if s == 'l' else -1.0
        aim(rig, f'upperarm_{s}', sag(16, sd, 0.06))
        aim(rig, f'lowerarm_{s}', F(sd * 0.5, -0.55, 0.62))
        aim(rig, f'hand_{s}', F(sd * 0.6, -0.6, 0.35))
def P_bowlow(rig):
    spine(rig, bow=22, head=44, turn=-14)
    legs(rig, 3, -2.0, 7, 5, out=0.03)
    for s in 'lr':
        sd = 1.0 if s == 'l' else -1.0
        aim(rig, f'upperarm_{s}', sag(20, sd, 0.05))
        aim(rig, f'lowerarm_{s}', F(sd * 0.55, -0.45, 0.66))
        aim(rig, f'hand_{s}', F(sd * 0.65, -0.55, 0.3))
def P_blame(rig):
    # he turns his head and shoulders to her and an open hand comes up toward her (his right)
    spine(rig, bow=3, turn=-12, head=8, headturn=-14)
    legs(rig, 2, -2, 4, 3, out=0.05)
    arms_down(rig, fwd=4, out=0.11, elbow=10, sides='l')
    aim(rig, 'upperarm_r', F(0.55, -0.72, 0.42))
    aim(rig, 'lowerarm_r', F(0.62, -0.25, 0.74))
    aim(rig, 'hand_r', F(0.6, -0.15, 0.78))
def P_hold_m(rig):
    # hand in hand, he on her left: his right hand reaches a little toward her
    stand(rig, head=10, headtilt=-3, armout=0.1)
    aim(rig, 'upperarm_r', sag(5, -1.0, 0.2))
    aim(rig, 'lowerarm_r', sag(16, -1.0, 0.33))
    aim(rig, 'hand_r', sag(18, -1.0, 0.3))
def P_hold_w(rig):
    stand(rig, head=14, headtilt=6, armout=0.1)
    aim(rig, 'upperarm_l', sag(5, 1.0, 0.2))
    aim(rig, 'lowerarm_l', sag(16, 1.0, 0.33))
    aim(rig, 'hand_l', sag(18, 1.0, 0.3))
def P_seated(rig):
    # on the ground by the fire, knees drawn up, hunched forward, forearms over the knees
    spine(rig, bow=38, head=16)
    for s in 'lr':
        sd = 1.0 if s == 'l' else -1.0
        aim(rig, f'thigh_{s}', F(-sd * 0.16, 0.32, 0.95))
        aim(rig, f'calf_{s}', F(-sd * 0.03, -0.97, -0.2))
        aim(rig, f'foot_{s}', F(-sd * 0.05, -0.3, 0.95))
        aim(rig, f'ball_{s}', F(-sd * 0.03, -0.05, 1.0))
        aim(rig, f'upperarm_{s}', F(-sd * 0.12, -0.55, 0.83))
        aim(rig, f'lowerarm_{s}', F(sd * 0.35, -0.05, 0.94))
        aim(rig, f'hand_{s}', F(sd * 0.3, -0.35, 0.88))
def P_look(rig):
    # standing, looking out: head level and a little turned, for the over-the-shoulder shots
    stand(rig, head=-2, headturn=8, armout=0.1)
def P_peer(rig):
    # crouched among the leaves, head forward, looking out
    spine(rig, bow=20, head=-14)
    legs(rig, 3, -1, 6, 4, out=0.04)
    arms_down(rig, fwd=20, out=0.14, elbow=30)

def ramp(prefix, fa, fb, n=4):
    """poses part way from fa to fb (each bone's rotation slerped): prefix0 = fa .. prefix<n> = fb"""
    def capture(rig, fn):
        reset(rig); fn(rig)
        return {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}
    def make(i):
        def f(rig):
            A = capture(rig, fa); B = capture(rig, fb)
            reset(rig)
            k = i / n
            k = k * k * (3 - 2 * k) if False else k
            for pb in rig.pose.bones:
                qa, la = A[pb.name]; qb, lb = B[pb.name]
                pb.rotation_quaternion = qa.slerp(qb, k); pb.location = la.lerp(lb, k)
            upd()
        return f
    return [(f'{prefix}{i}', make(i)) for i in range(n + 1)]

WALK_N = 16
SETS = [
    # bodies for the far and middle shots (1.5 cm voxels)
    ('man-bare', 'man', None, 'body', [('stand', P_stand), ('still', P_still)] + ramp('bow', P_stand, P_bow, 3)),
    ('woman-bare', 'woman', None, 'body', [('stand', P_stand), ('still', P_still)] + ramp('bow', P_stand, P_bow, 3)),
    ('man-leaves', 'man', 'leaves', 'body', [('stand', P_stand), ('bow', P_bow), ('blame', P_blame), ('hold', P_hold_m)] + ramp('blame', P_stand, P_blame, 3) +
        [(f'walk{i:02d}', (lambda i: lambda r: walk(r, i / WALK_N))(i)) for i in range(WALK_N)]),
    ('woman-leaves', 'woman', 'leaves', 'body', [('stand', P_stand), ('bow', P_bow), ('bowlow', P_bowlow), ('hold', P_hold_w)] + ramp('bow', P_stand, P_bow, 3) + ramp('low', P_bow, P_bowlow, 2) +
        [(f'walk{i:02d}', (lambda i: lambda r: walk(r, i / WALK_N))(i)) for i in range(WALK_N)]),
    ('man-skin', 'man', 'skin', 'body', [('seated', P_seated)] +
        [(f'walk{i:02d}', (lambda i: lambda r: walk(r, i / WALK_N, tired=1.0))(i)) for i in range(WALK_N)]),
    # head and shoulders, close and soft, for the over-the-shoulder shots (4 mm voxels)
    ('man-leaves-bust', 'man', 'leaves', 'bust', [('look', P_look), ('peer', P_peer)]),
    ('woman-leaves-bust', 'woman', 'leaves', 'bust', [('bow', P_bow), ('bowlow', P_bowlow)] + ramp('low', P_bow, P_bowlow, 3)),
]

# the volumes: a box in the figure frame, a voxel size and the distance the 8 bits span (+-clamp)
GRIDS = {
    'body': dict(lo=(-0.8, -0.02, -0.6), hi=(0.8, 1.97, 0.8), vox=0.015, clamp=0.06),
    # the bust grid is placed per pose round the head (see bake): a box above the chest
    'bust': dict(lo=(-0.36, -0.9, -0.3), hi=(0.36, 0.3, 0.36), vox=0.004, clamp=0.024),
}

# ------------------------------------------------------------------ baking
def ground(rig, parts):
    """put the lowest point of the posed figure on the ground and centre the hips over the origin"""
    dg = bpy.context.evaluated_depsgraph_get()
    zmin = 1e9
    for k in ('body', 'cloth'):
        ob = parts.get(k)
        if not ob: continue
        ev = ob.evaluated_get(dg); me = ev.to_mesh()
        zmin = min(zmin, min((ev.matrix_world @ v.co).z for v in me.vertices))
        ev.to_mesh_clear()
    rig.location.z -= zmin
    upd()

def posed_mesh(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg); me = ev.to_mesh()
    V = np.array([tuple(ev.matrix_world @ v.co) for v in me.vertices], dtype=np.float64)
    Fc = [list(p.vertices) for p in me.polygons]
    ev.to_mesh_clear()
    # Blender -> figure frame
    V = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1)
    return V, Fc

def bvh_of(V, Fc):
    return BVHTree.FromPolygons([Vector(v) for v in V], Fc)

def sdf_grid(meshes, lo, n, vox, clamp):
    """signed distance (clamped) and material over a grid; meshes: [(bvh, signed, shell, mat)]"""
    nx, ny, nz = n
    D = np.full((nz, ny, nx), clamp, np.float32); M = np.zeros((nz, ny, nx), np.float32)
    # coarse pass every 4 voxels decides where the fine work is
    step = 4
    cx, cy, cz = [list(range(0, k, step)) + ([k - 1] if (k - 1) % step else []) for k in n]
    near = np.zeros((len(cz), len(cy), len(cx)), bool)
    band = clamp + step * vox * 1.8
    def dist_at(p, lim):
        best, mat = lim, 0.0
        for bvh, signed, shell, m in meshes:
            hit, nrm, idx, d = bvh.find_nearest(p, lim)
            if hit is None: continue
            if signed:
                s = -1.0 if (p - hit).dot(nrm) < 0 else 1.0
                dd = s * d
            else:
                dd = d - shell
            if dd < best: best, mat = dd, m
        return best, mat
    for k, z in enumerate(cz):
        for j, y in enumerate(cy):
            for i, x in enumerate(cx):
                p = Vector((lo[0] + (x + 0.5) * vox, lo[1] + (y + 0.5) * vox, lo[2] + (z + 0.5) * vox))
                d, _ = dist_at(p, band)
                near[k, j, i] = d < band
    # fine pass where any coarse corner of the cell is near a surface
    zz = {z: k for k, z in enumerate(cz)}
    def cidx(v, arr):
        import bisect
        a = bisect.bisect_right(arr, v) - 1
        return max(0, a), min(len(arr) - 1, a + 1)
    inside_seed = []
    for z in range(nz):
        k0, k1 = cidx(z, cz)
        for y in range(ny):
            j0, j1 = cidx(y, cy)
            row_any = False
            for x in range(nx):
                i0, i1 = cidx(x, cx)
                if not near[k0:k1 + 1, j0:j1 + 1, i0:i1 + 1].any():
                    continue
                p = Vector((lo[0] + (x + 0.5) * vox, lo[1] + (y + 0.5) * vox, lo[2] + (z + 0.5) * vox))
                d, m = dist_at(p, clamp)
                D[z, y, x] = d; M[z, y, x] = m
    # voxels further than the clamp from every surface are inside or outside the body: decide on the
    # coarse grid by counting crossings of the body along three rays (a majority, so the open eye
    # sockets of the base mesh can't fool it), then give each such voxel its nearest coarse point's side
    body = meshes[0][0]
    def crossings(p, d):
        n, o = 0, p.copy()
        for _ in range(40):
            hit, nrm, i, dist = body.ray_cast(o, d, 4.0)
            if hit is None: break
            n += 1; o = hit + d * 1e-4
        return n
    dirs = [Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0))]
    inside = np.zeros((len(cz), len(cy), len(cx)), bool)
    for k, z in enumerate(cz):
        for j, y in enumerate(cy):
            for i, x in enumerate(cx):
                p = Vector((lo[0] + (x + 0.5) * vox, lo[1] + (y + 0.5) * vox, lo[2] + (z + 0.5) * vox))
                inside[k, j, i] = sum(crossings(p, d) % 2 for d in dirs) >= 2
    far = D >= clamp * 0.999
    if far.any():
        zi, yi, xi = np.nonzero(far)
        ck = np.clip(np.round(zi / step).astype(int), 0, len(cz) - 1)
        cj = np.clip(np.round(yi / step).astype(int), 0, len(cy) - 1)
        ci = np.clip(np.round(xi / step).astype(int), 0, len(cx) - 1)
        neg = inside[ck, cj, ci]
        D[zi[neg], yi[neg], xi[neg]] = -clamp
    return D, M

def encode(D, M, clamp):
    r = np.clip(np.round((D / clamp * 0.5 + 0.5) * 255), 0, 255).astype(np.uint8)
    g = np.clip(np.round(M * 255), 0, 255).astype(np.uint8)
    return np.stack([r, g], -1)   # (nz, ny, nx, 2): x fastest, as texImage3D wants

def export_glb(parts, path):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts.values(): ob.select_set(True)
    bpy.context.view_layer.objects.active = parts['body']
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_animations=False,
                              export_materials='NONE', export_yup=True, export_skins=False, export_morph=False)

def preview(rig, parts, path):
    """a quick look: front, side and back, flat grey (only for checking poses)"""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'
    sc.render.resolution_x, sc.render.resolution_y = 360, 640
    sc.render.film_transparent = False
    cam = bpy.data.objects.get('pv') or bpy.data.objects.new('pv', bpy.data.cameras.new('pv'))
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.1
    sc.camera = cam
    shots = []
    for k, (ang, nm) in enumerate(((0, 'front'), (90, 'side'), (180, 'back'))):
        a = math.radians(ang)
        cam.location = (4 * math.sin(a), -4 * math.cos(a), 0.95)
        cam.rotation_euler = (math.pi / 2, 0, a)
        sc.render.filepath = path + f'-{nm}.png'
        bpy.ops.render.render(write_still=True)
        shots.append(sc.render.filepath)
    return shots

def main():
    os.makedirs(os.path.join(OUT, 'glb'), exist_ok=True)
    idx_path = os.path.join(OUT, 'index.json')
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {'grids': {}, 'poses': {}}
    index['grids'] = {k: {'lo': g['lo'], 'hi': g['hi'], 'vox': g['vox'], 'clamp': g['clamp'],
                          'n': [int(round((g['hi'][i] - g['lo'][i]) / g['vox'])) for i in range(3)]} for k, g in GRIDS.items()}
    for set_name, who, outfit, grid, poses in SETS:
        todo = [(n, f) for n, f in poses if not ONLY or set_name in ONLY or f'{set_name}-{n}' in ONLY or n in ONLY]
        if not todo: continue
        rig, parts = build(who, outfit)
        upd(); rest_loc = rig.location.copy()
        G = index['grids'][grid]
        os.makedirs(os.path.join(OUT, 'sdf', grid), exist_ok=True)
        for pname, fn in todo:
            t0 = time.time()
            key = f'{set_name}-{pname}'
            reset(rig); rig.location = rest_loc; upd()
            fn(rig)
            ground(rig, parts)
            if PREVIEW:
                preview(rig, parts, os.path.join(OUT, 'preview', key))
            if NOBAKE: continue
            export_glb(parts, os.path.join(OUT, 'glb', key + '.glb'))
            meshes = []
            Vb, Fb = posed_mesh(parts['body'])
            meshes.append((bvh_of(Vb, Fb), True, 0.0, 0.0))
            Vh, Fh = posed_mesh(parts['hair'])
            meshes.append((bvh_of(Vh, Fh), False, 0.008 if grid == 'body' else 0.0075, 0.5))
            if 'locks' in parts:
                Vl, Fl = posed_mesh(parts['locks'])
                meshes.append((bvh_of(Vl, Fl), False, 0.009 if grid == 'body' else 0.0075, 0.5))
            if 'cloth' in parts:
                Vc, Fcl = posed_mesh(parts['cloth'])
                # leaves are thin: a sheet a little over a voxel thick; the tunic of skin is heavy
                sh = (0.012 if grid == 'body' else 0.0045) if outfit == 'leaves' else (0.022 if grid == 'body' else 0.006)
                meshes.append((bvh_of(Vc, Fcl), False, sh, 0.85 if outfit == 'leaves' else 1.0))
            lo = list(G['lo'])
            entry = {'grid': grid}
            if grid == 'bust':
                # centre the bust box on the head (figure frame), from the posed rig
                hd = rig.matrix_world @ rig.pose.bones['head'].head
                hx, hy, hz = hd.x, hd.z, -hd.y
                lo = [lo[0] + hx, lo[1] + hy, lo[2] + hz]
            entry['lo'] = [round(v, 5) for v in lo]
            D, M = sdf_grid(meshes, lo, G['n'], G['vox'], G['clamp'])
            data = encode(D, M, G['clamp']).tobytes()
            rel = f'sdf/{grid}/{key}.bin'
            open(os.path.join(OUT, rel), 'wb').write(data)
            entry.update(file=rel, sha=hashlib.sha256(data).hexdigest()[:16],
                         height=round(float(max(Vb[:, 1].max(), Vh[:, 1].max())), 4))
            # landmarks in the figure frame (for the scenes: where a head or a hand is)
            for b in ('head', 'neck_01', 'hand_l', 'hand_r', 'pelvis', 'spine_03'):
                v = rig.matrix_world @ rig.pose.bones[b].head
                entry[b] = [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]
            index['poses'][key] = entry
            print(f'BAKED {key} in {time.time() - t0:.1f}s', flush=True)
            json.dump(index, open(idx_path, 'w'), indent=1)
    json.dump(index, open(idx_path, 'w'), indent=1)
    # a module the scenes import, so a new bake changes their cache keys
    with open(os.path.join(OUT, 'index.js'), 'w') as f:
        f.write('// written by tools/make-humans.py: the baked people (see lib/x-human.js)\nexport default ' + json.dumps(index, indent=1) + ';\n')
    print('DONE', flush=True)

main()
