import bpy
import bmesh
import math
import os
import random
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.82, metalness=0.04):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
    return mat

def create_geological_rock(name, size_vec, location, mat, seed_val=42, parent=None):
    random.seed(seed_val)
    # Start with an icosphere with 1-2 subdivisions
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=1.0,
        location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size_vec)
    bpy.ops.object.transform_apply(scale=True)

    # Displace vertices along normal & add planar facets
    bm = bmesh.new()
    bm.from_mesh(obj.data)

    # Random vertex distortion
    for v in bm.verts:
        # Scale z flatter at bottom
        if v.co.z < 0:
            v.co.z *= 0.55
        noise = (Vector((random.random()-0.5, random.random()-0.5, random.random()-0.5))) * 0.4
        v.co += noise

    # Recalculate normals & apply flat shading
    bm.to_mesh(obj.data)
    bm.free()

    # Move origin to bottom of bounding box
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    min_z = min([v.co.z for v in obj.data.vertices])
    
    # Shift vertices so lowest Z is at Z = 0
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        v.co.z -= min_z
    bm.to_mesh(obj.data)
    bm.free()

    for poly in obj.data.polygons:
        poly.use_smooth = False

    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_rock_set():
    reset_scene()

    mat_rock = get_or_create_material("Rock_Slate", (0.36, 0.38, 0.40), roughness=0.84, metalness=0.04)

    master_root = bpy.data.objects.new("StylizedRockSet", None)
    bpy.context.scene.collection.objects.link(master_root)

    # -------------------------------------------------------------------------
    # Small Rocks (Width ~0.6m - 1.0m)
    # -------------------------------------------------------------------------
    create_geological_rock("Rock_Small_A", (0.5, 0.4, 0.35), (-6, 0, 0), mat_rock, seed_val=101, parent=master_root)
    create_geological_rock("Rock_Small_B", (0.4, 0.6, 0.3), (-4, 0, 0), mat_rock, seed_val=102, parent=master_root)
    create_geological_rock("Rock_Small_C", (0.45, 0.45, 0.4), (-2, 0, 0), mat_rock, seed_val=103, parent=master_root)

    # -------------------------------------------------------------------------
    # Medium Rocks (Width ~1.4m - 2.2m)
    # -------------------------------------------------------------------------
    create_geological_rock("Rock_Medium_A", (1.2, 0.9, 0.8), (0, 0, 0), mat_rock, seed_val=201, parent=master_root)
    create_geological_rock("Rock_Medium_B", (1.0, 1.4, 0.9), (3, 0, 0), mat_rock, seed_val=202, parent=master_root)
    create_geological_rock("Rock_Medium_C", (1.3, 1.1, 0.7), (6, 0, 0), mat_rock, seed_val=203, parent=master_root)

    # -------------------------------------------------------------------------
    # Large Boulders (Width ~2.8m - 4.2m)
    # -------------------------------------------------------------------------
    create_geological_rock("Rock_Large_A", (2.2, 1.6, 1.5), (-4, 5, 0), mat_rock, seed_val=301, parent=master_root)
    create_geological_rock("Rock_Large_B", (1.8, 2.4, 1.7), (4, 5, 0), mat_rock, seed_val=302, parent=master_root)

    # Export
    out_path = os.path.abspath("public/models/world/rock_set.glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported stylized rock set to {out_path}")

if __name__ == '__main__':
    build_rock_set()
