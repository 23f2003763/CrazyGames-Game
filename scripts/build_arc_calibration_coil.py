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

def build_coil():
    reset_scene()

    mat_metal = get_or_create_material("Coil_DarkMetal", (0.16, 0.18, 0.22), roughness=0.5, metalness=0.85)
    mat_cyan_glow = get_or_create_material("Coil_CyanCore", (0.0, 0.9, 1.0), roughness=0.1, metalness=0.1, emissive=(0.0, 0.9, 1.0), emissive_intensity=5.0)
    mat_ceramic = get_or_create_material("Coil_CeramicRing", (0.85, 0.82, 0.78), roughness=0.3, metalness=0.05)

    coil_root = bpy.data.objects.new("ARC_CALIBRATION_COIL_ROOT", None)
    bpy.context.scene.collection.objects.link(coil_root)

    # 1. Base pedestal
    create_cylinder("Base_Plate", 0.55, 0.16, location=(0, 0, 0.08), mat=mat_metal, parent=coil_root)
    create_cylinder("Base_Cone", 0.42, 0.30, location=(0, 0, 0.25), mat=mat_metal, parent=coil_root)

    # 2. Central pillar & ceramic rings
    create_cylinder("Pillar_Shaft", 0.16, 1.2, location=(0, 0, 0.95), mat=mat_metal, parent=coil_root)
    for z in [0.55, 0.85, 1.15]:
        create_cylinder(f"Ceramic_Ring_{z}", 0.36, 0.10, location=(0, 0, z), mat=mat_ceramic, parent=coil_root)

    # 3. Exposed glowing Arc energy core
    create_cylinder("Arc_Core", 0.24, 0.35, location=(0, 0, 1.55), mat=mat_cyan_glow, parent=coil_root)

    # 4. Top discharge prongs & electrode cap
    create_cylinder("Top_Cap", 0.32, 0.12, location=(0, 0, 1.8), mat=mat_metal, parent=coil_root)
    create_box("Prong_L", (0.06, 0.06, 0.35), location=(-0.24, 0, 1.9), rotation=(0, -0.35, 0), mat=mat_metal, parent=coil_root)
    create_box("Prong_R", (0.06, 0.06, 0.35), location=(0.24, 0, 1.9), rotation=(0, 0.35, 0), mat=mat_metal, parent=coil_root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/tutorial", exist_ok=True)
    out_path = os.path.abspath("public/models/tutorial/arc_calibration_coil.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Arc Calibration Coil to {out_path}")

if __name__ == '__main__':
    build_coil()
