import bpy
import bmesh
import math
import os
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.7, metalness=0.1, emissive=None, emissive_intensity=1.0):
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

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

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

def build_electric_fence_set():
    reset_scene()

    mat_steel = get_or_create_material("Fence_GalvanizedSteel", (0.35, 0.38, 0.40), roughness=0.65, metalness=0.7)
    mat_dark_iron = get_or_create_material("Fence_DarkIron", (0.18, 0.20, 0.22), roughness=0.8, metalness=0.8)
    mat_wire = get_or_create_material("Fence_ElectrifiedWire", (0.6, 0.65, 0.7), roughness=0.4, metalness=0.9, emissive=(0.2, 0.7, 1.0), emissive_intensity=2.2)
    mat_insulator = get_or_create_material("Fence_CeramicInsulator", (0.85, 0.82, 0.75), roughness=0.3, metalness=0.0)
    mat_warning = get_or_create_material("Fence_WarningPlate", (0.85, 0.65, 0.08), roughness=0.5, metalness=0.2)
    mat_box = get_or_create_material("Fence_PowerCabinet", (0.25, 0.32, 0.28), roughness=0.7, metalness=0.5)
    mat_led = get_or_create_material("Fence_LedCyan", (0.0, 0.85, 1.0), roughness=0.2, metalness=0.0, emissive=(0.0, 0.85, 1.0), emissive_intensity=3.5)

    master_root = bpy.data.objects.new("ElectricFenceSet", None)
    bpy.context.scene.collection.objects.link(master_root)

    # -------------------------------------------------------------------------
    # 1. FenceStraight_4m (Standard 4m Modular Unit, Origin at (0,0,0))
    # -------------------------------------------------------------------------
    f4 = bpy.data.objects.new("FenceStraight_4m", None)
    bpy.context.scene.collection.objects.link(f4)
    f4.parent = master_root
    f4.location = Vector((-8, 0, 0))

    # Posts at x=-2.0, x=+2.0 (height 2.6m)
    create_cylinder("Post_L", 0.05, 2.6, location=(-2.0, 0, 1.3), mat=mat_steel, parent=f4)
    create_cylinder("Post_R", 0.05, 2.6, location=(2.0, 0, 1.3), mat=mat_steel, parent=f4)
    # Horizontal rails
    create_box("Rail_Bottom", (4.0, 0.05, 0.05), location=(0, 0, 0.2), mat=mat_steel, parent=f4)
    create_box("Rail_Top", (4.0, 0.05, 0.05), location=(0, 0, 2.0), mat=mat_steel, parent=f4)
    # Mesh panel
    create_box("Mesh_4m", (3.92, 0.02, 1.76), location=(0, 0, 1.1), mat=mat_dark_iron, parent=f4)
    # Insulators & 3 upper tension wires
    for y_wire in [2.15, 2.35, 2.55]:
        create_cylinder(f"Insulator_L_{y_wire}", 0.03, 0.1, location=(-2.0, 0.06, y_wire), rotation=(math.pi/2, 0, 0), mat=mat_insulator, parent=f4)
        create_cylinder(f"Insulator_R_{y_wire}", 0.03, 0.1, location=(2.0, 0.06, y_wire), rotation=(math.pi/2, 0, 0), mat=mat_insulator, parent=f4)
        create_box(f"ElectricWire_{y_wire}", (4.02, 0.015, 0.015), location=(0, 0.06, y_wire), mat=mat_wire, parent=f4)
    # Warning sign on center
    create_box("WarningSign", (0.45, 0.03, 0.3), location=(0, 0.03, 1.35), mat=mat_warning, parent=f4)

    # -------------------------------------------------------------------------
    # 2. FenceGateLarge (Security gate with two swinging doors)
    # -------------------------------------------------------------------------
    fg = bpy.data.objects.new("FenceGateLarge", None)
    bpy.context.scene.collection.objects.link(fg)
    fg.parent = master_root
    fg.location = Vector((0, 0, 0))

    # Heavy Gate Pillars
    create_box("GatePillar_L", (0.4, 0.4, 3.2), location=(-2.8, 0, 1.6), mat=mat_steel, parent=fg)
    create_box("GatePillar_R", (0.4, 0.4, 3.2), location=(2.8, 0, 1.6), mat=mat_steel, parent=fg)
    create_box("GateGantry", (6.0, 0.3, 0.25), location=(0, 0, 3.1), mat=mat_steel, parent=fg)

    # Left Door Root & Geometry
    gate_root_l = bpy.data.objects.new("GateDoor_L_Root", None)
    bpy.context.scene.collection.objects.link(gate_root_l)
    gate_root_l.parent = fg
    gate_root_l.location = Vector((-2.6, 0, 0))
    create_box("GateDoor_L", (2.5, 0.06, 2.4), location=(1.25, 0, 1.3), mat=mat_dark_iron, parent=gate_root_l)

    # Right Door Root & Geometry
    gate_root_r = bpy.data.objects.new("GateDoor_R_Root", None)
    bpy.context.scene.collection.objects.link(gate_root_r)
    gate_root_r.parent = fg
    gate_root_r.location = Vector((2.6, 0, 0))
    create_box("GateDoor_R", (2.5, 0.06, 2.4), location=(-1.25, 0, 1.3), mat=mat_dark_iron, parent=gate_root_r)

    # Warning sign on overhead gantry
    create_box("GateWarningSign", (0.8, 0.04, 0.4), location=(0, 0.18, 3.1), mat=mat_warning, parent=fg)

    # -------------------------------------------------------------------------
    # 3. FencePowerBox (Gate Control Cabinet)
    # -------------------------------------------------------------------------
    pb = bpy.data.objects.new("FencePowerBox", None)
    bpy.context.scene.collection.objects.link(pb)
    pb.parent = master_root
    pb.location = Vector((8, 0, 0))

    create_cylinder("PowerBoxStand", 0.04, 1.1, location=(0, 0, 0.55), mat=mat_steel, parent=pb)
    create_box("PowerBoxCabinet", (0.55, 0.35, 0.75), location=(0, 0, 1.2), mat=mat_box, parent=pb)
    create_cylinder("PowerBoxLED", 0.035, 0.05, location=(0.16, 0.2, 1.4), rotation=(math.pi/2, 0, 0), mat=mat_led, parent=pb)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/electric_fence_set.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported clean electric fence set to {out_path}")

if __name__ == '__main__':
    build_electric_fence_set()
