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

def create_box(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_emitter():
    reset_scene()

    mat_metal = get_or_create_material("Emitter_DarkMetal", (0.16, 0.18, 0.22), roughness=0.5, metalness=0.85)
    mat_red_glow = get_or_create_material("Emitter_RedWarning", (1.0, 0.2, 0.1), roughness=0.1, metalness=0.1, emissive=(1.0, 0.2, 0.1), emissive_intensity=4.0)
    mat_cyan_glow = get_or_create_material("Emitter_CyanLens", (0.0, 0.85, 1.0), roughness=0.1, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=3.0)

    root = bpy.data.objects.new("CALIBRATION_EMITTER_ROOT", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Heavy base & housing
    create_box("Base_Plinth", (0.85, 0.75, 0.15), location=(0, 0, 0.075), mat=mat_metal, parent=root)
    create_box("Emitter_Chassis", (0.65, 0.55, 0.55), location=(0, 0, 0.425), mat=mat_metal, parent=root)

    # 2. Warning Light Diodes
    create_cylinder("Warning_Light_L", 0.045, 0.08, location=(-0.24, 0.22, 0.74), mat=mat_red_glow, parent=root)
    create_cylinder("Warning_Light_R", 0.045, 0.08, location=(0.24, 0.22, 0.74), mat=mat_red_glow, parent=root)

    # 3. Horizontal Projector Slit / Scan Lens (front-facing along +Y)
    create_box("Scan_Lens_Bar", (0.52, 0.06, 0.14), location=(0, 0.29, 0.46), mat=mat_red_glow, parent=root)

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
