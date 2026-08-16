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

def build_stormcore_hammer():
    reset_scene()

    mat_titanium = get_or_create_material("Hammer_Titanium", (0.15, 0.17, 0.20), roughness=0.35, metalness=0.9)
    mat_grip = get_or_create_material("Hammer_Grip", (0.08, 0.08, 0.08), roughness=0.85, metalness=0.05)
    mat_cyan_arc = get_or_create_material("Hammer_ArcCore", (0.0, 0.9, 1.0), roughness=0.1, metalness=0.1, emissive=(0.0, 0.9, 1.0), emissive_intensity=5.0)
    mat_copper = get_or_create_material("Hammer_CopperBus", (0.85, 0.45, 0.2), roughness=0.3, metalness=0.95)

    root = bpy.data.objects.new("STORMCORE_HAMMER_ROOT", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Shaft / Handle (runs along Y axis in local space)
    create_cylinder("Handle_Shaft", 0.024, 0.65, location=(0, 0.15, 0), rotation=(math.pi/2, 0, 0), mat=mat_titanium, parent=root)
    create_cylinder("Grip_Wrap", 0.028, 0.32, location=(0, 0.05, 0), rotation=(math.pi/2, 0, 0), mat=mat_grip, parent=root)
    create_cylinder("Pommel_Cap", 0.038, 0.05, location=(0, -0.18, 0), rotation=(math.pi/2, 0, 0), mat=mat_titanium, parent=root)

    # 2. Hammer Head (at top of shaft)
    head_center = (0, 0.48, 0)
    create_box("Hammer_Head_Body", (0.16, 0.20, 0.22), location=head_center, mat=mat_titanium, parent=root)
    create_box("Striking_Face_Front", (0.18, 0.05, 0.20), location=(0, 0.59, 0), mat=mat_titanium, parent=root)
    create_box("Striking_Face_Back", (0.14, 0.05, 0.16), location=(0, 0.37, 0), mat=mat_titanium, parent=root)

    # 3. Glowing Arc Rails on sides
    create_box("Arc_Rail_L", (0.025, 0.16, 0.18), location=(-0.088, 0.48, 0), mat=mat_cyan_arc, parent=root)
    create_box("Arc_Rail_R", (0.025, 0.16, 0.18), location=(0.088, 0.48, 0), mat=mat_cyan_arc, parent=root)

    # 4. Central Glowing Arc Energy Core
    create_cylinder("Core_Capsule", 0.045, 0.15, location=head_center, mat=mat_cyan_arc, parent=root)

    # 5. Dual Forward Discharge Prongs / Electrodes
    create_cylinder("Prong_L", 0.012, 0.10, location=(-0.055, 0.64, 0), rotation=(math.pi/2, 0, 0), mat=mat_copper, parent=root)
    create_cylinder("Prong_R", 0.012, 0.10, location=(0.055, 0.64, 0), rotation=(math.pi/2, 0, 0), mat=mat_copper, parent=root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/weapons", exist_ok=True)
    out_path = os.path.abspath("public/models/weapons/stormcore_hammer.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Stormcore Hammer to {out_path}")

if __name__ == '__main__':
    build_stormcore_hammer()
