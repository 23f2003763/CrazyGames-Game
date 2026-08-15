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

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_arc_props():
    reset_scene()

    # Materials
    mat_metal = get_or_create_material("Arc_DarkMetal", (0.16, 0.18, 0.22), roughness=0.6, metalness=0.8)
    mat_cyan_glow = get_or_create_material("Arc_CyanEnergy", (0.0, 0.9, 1.0), roughness=0.2, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=4.0)
    mat_violet_glow = get_or_create_material("Arc_VioletSignal", (0.7, 0.2, 1.0), roughness=0.2, metalness=0.1, emissive=(0.7, 0.2, 1.0), emissive_intensity=4.5)
    mat_ceramic = get_or_create_material("Arc_InsulatorCeramic", (0.8, 0.82, 0.85), roughness=0.3, metalness=0.1)

    master_root = bpy.data.objects.new("ArcPropsSet", None)
    bpy.context.scene.collection.objects.link(master_root)

    # -------------------------------------------------------------------------
    # 1. Arc_Calibration_Coil (Stationary training pylon for tutorial)
    # -------------------------------------------------------------------------
    coil_root = bpy.data.objects.new("Arc_Calibration_Coil", None)
    bpy.context.scene.collection.objects.link(coil_root)
    coil_root.parent = master_root
    coil_root.location = Vector((-6, 0, 0))

    create_cylinder("Coil_Base", 0.45, 0.2, location=(0, 0, 0.1), mat=mat_metal, parent=coil_root)
    create_cylinder("Coil_Shaft", 0.14, 1.6, location=(0, 0, 0.9), mat=mat_metal, parent=coil_root)
    # 3 Insulator rings
    for z in [0.6, 0.95, 1.3]:
        create_cylinder(f"Coil_Ring_{z}", 0.32, 0.08, location=(0, 0, z), mat=mat_ceramic, parent=coil_root)
    # Top Arc emitter sphere/head
    create_cylinder("Coil_Head", 0.22, 0.35, location=(0, 0, 1.7), mat=mat_cyan_glow, parent=coil_root)
    create_box("Coil_Prong_L", (0.04, 0.04, 0.3), location=(-0.25, 0, 1.8), rotation=(0, -0.3, 0), mat=mat_metal, parent=coil_root)
    create_box("Coil_Prong_R", (0.04, 0.04, 0.3), location=(0.25, 0, 1.8), rotation=(0, 0.3, 0), mat=mat_metal, parent=coil_root)

    # -------------------------------------------------------------------------
    # 2. Signal_Repeater_Console (Level 1 Ending Landmark Terminal)
    # -------------------------------------------------------------------------
    rep_root = bpy.data.objects.new("Signal_Repeater_Console", None)
    bpy.context.scene.collection.objects.link(rep_root)
    rep_root.parent = master_root
    rep_root.location = Vector((0, 0, 0))

    # Heavy concrete/metal foundation base
    create_box("Rep_Base", (1.8, 1.4, 0.3), location=(0, 0, 0.15), mat=mat_metal, parent=rep_root)
    # Terminal console chassis
    create_box("Rep_Console", (1.2, 0.8, 1.1), location=(0, 0, 0.75), mat=mat_metal, parent=rep_root)
    # CRT / Hologram screen face
    create_box("Rep_Screen", (0.9, 0.05, 0.5), location=(0, 0.42, 1.1), rotation=(-0.4, 0, 0), mat=mat_violet_glow, parent=rep_root)
    # Shard Receptacle Core Socket
    create_cylinder("Rep_CoreSocket", 0.16, 0.25, location=(0, 0.15, 1.35), rotation=(0, 0, 0), mat=mat_cyan_glow, parent=rep_root)
    # Communications Dish / Mast
    create_cylinder("Rep_Mast", 0.06, 2.8, location=(0.6, -0.4, 1.5), mat=mat_metal, parent=rep_root)
    create_cylinder("Rep_Dish", 0.45, 0.08, location=(0.6, -0.4, 2.9), rotation=(0.5, 0.3, 0), mat=mat_ceramic, parent=rep_root)

    # -------------------------------------------------------------------------
    # 3. Signal_Shard_Drop (Floating quest item dropped by final Scarab)
    # -------------------------------------------------------------------------
    shard_root = bpy.data.objects.new("Signal_Shard_Drop", None)
    bpy.context.scene.collection.objects.link(shard_root)
    shard_root.parent = master_root
    shard_root.location = Vector((6, 0, 0))

    create_box("Shard_Core", (0.22, 0.22, 0.35), location=(0, 0, 0.5), rotation=(0.4, 0.6, 0.2), mat=mat_violet_glow, parent=shard_root)
    create_box("Shard_Ring1", (0.35, 0.35, 0.04), location=(0, 0, 0.5), rotation=(0.7, -0.5, 0.4), mat=mat_cyan_glow, parent=shard_root)

    # -------------------------------------------------------------------------
    # 4. Volt_Caster_Weapon (Weapon Rack Pickup Model)
    # -------------------------------------------------------------------------
    gun_root = bpy.data.objects.new("Volt_Caster_Weapon", None)
    bpy.context.scene.collection.objects.link(gun_root)
    gun_root.parent = master_root
    gun_root.location = Vector((0, 6, 0))

    create_box("Gun_Receiver", (0.12, 0.55, 0.18), location=(0, 0.1, 0.5), mat=mat_metal, parent=gun_root)
    create_box("Gun_Barrel", (0.08, 0.45, 0.10), location=(0, 0.55, 0.52), mat=mat_metal, parent=gun_root)
    create_cylinder("Gun_ArcCore", 0.06, 0.25, location=(0, 0.2, 0.52), rotation=(math.pi/2, 0, 0), mat=mat_cyan_glow, parent=gun_root)
    create_box("Gun_Grip", (0.08, 0.12, 0.22), location=(0, -0.08, 0.36), rotation=(0.35, 0, 0), mat=mat_metal, parent=gun_root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/arc_props.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Arc Props Set to {out_path}")

if __name__ == '__main__':
    build_arc_props()
