import bpy
import bmesh
import math
import os
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.5, metalness=0.8, emissive=None, emissive_intensity=1.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if emissive:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
                bsdf.inputs['Emission Strength'].default_value = emissive_intensity
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = (*emissive, 1.0)
    return mat

def create_bevelled_box(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, bevel=0.03):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_pipe(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=10):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=vertices, radius1=radius, radius2=radius, depth=depth)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_emitter():
    reset_scene()

    mat_metal = get_or_create_material("Emitter_DarkSteel", (0.18, 0.20, 0.24), roughness=0.5, metalness=0.85)
    mat_orange = get_or_create_material("Emitter_OrangePlates", (0.85, 0.45, 0.08), roughness=0.6, metalness=0.2)
    mat_red_glow = get_or_create_material("Emitter_RedWarning", (1.0, 0.15, 0.05), roughness=0.1, metalness=0.1, emissive=(1.0, 0.15, 0.05), emissive_intensity=4.5)
    mat_coil_amber = get_or_create_material("Emitter_EnergyCoil", (1.0, 0.6, 0.0), roughness=0.2, metalness=0.3, emissive=(1.0, 0.5, 0.0), emissive_intensity=3.5)

    root = bpy.data.objects.new("CALIBRATION_EMITTER_ROOT", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Heavy Base Plinth
    create_bevelled_box("Base_Plinth", (4.2, 0.9, 0.25), location=(0, 0, 0.125), mat=mat_metal, parent=root)

    # 2. Left and Right Vertical Emitter Posts (spanning 3.6m width)
    for sign, post_name in [(-1.0, "Post_L"), (1.0, "Post_R")]:
        px = sign * 1.8
        create_bevelled_box(f"{post_name}_Base", (0.55, 0.55, 0.4), location=(px, 0, 0.35), mat=mat_orange, parent=root)
        create_pipe(f"{post_name}_Mast", 0.08, 2.0, location=(px, 0, 1.35), mat=mat_metal, parent=root)
        
        # 3 Stacked Energy Coils
        for i, cy in enumerate([0.9, 1.4, 1.9]):
            create_pipe(f"{post_name}_Coil_{i+1}", 0.14, 0.15, location=(px, 0, cy), mat=mat_coil_amber, parent=root)
            
        # Top Warning Light Cap
        create_pipe(f"{post_name}_CapLight", 0.12, 0.18, location=(px, 0, 2.44), mat=mat_red_glow, parent=root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/tutorial", exist_ok=True)
    out_path = os.path.abspath("public/models/tutorial/calibration_emitter.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Calibration Emitter to {out_path}")

if __name__ == '__main__':
    build_emitter()
