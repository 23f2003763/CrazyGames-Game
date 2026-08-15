import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix

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

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_box(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=location,
        rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_chainlink_panel(width, height, location, mat, parent=None):
    # Stylized chainlink panel with frame & wire lattice slats
    panel_root = bpy.data.objects.new("ChainlinkPanel", None)
    bpy.context.scene.collection.objects.link(panel_root)
    panel_root.location = Vector(location)
    if parent:
        panel_root.parent = parent

    # Main wire mesh plane (thin double sided textured quad)
    mesh_box = create_box("MeshSlab", (width - 0.1, 0.02, height - 0.2), 
                          location=(location[0], location[1], location[2] + height/2), 
                          mat=mat, parent=panel_root)
    mesh_box.location = Vector((0, 0, height/2))
    return panel_root

def build_electric_fence_set():
    reset_scene()

    # Materials
    mat_steel = get_or_create_material("Fence_GalvanizedSteel", (0.35, 0.38, 0.40), roughness=0.65, metalness=0.7)
    mat_dark_iron = get_or_create_material("Fence_DarkIron", (0.18, 0.20, 0.22), roughness=0.8, metalness=0.8)
    mat_wire = get_or_create_material("Fence_ElectrifiedWire", (0.6, 0.65, 0.7), roughness=0.4, metalness=0.9, emissive=(0.2, 0.5, 0.9), emissive_intensity=1.8)
    mat_insulator = get_or_create_material("Fence_CeramicInsulator", (0.85, 0.82, 0.75), roughness=0.3, metalness=0.0)
    mat_warning = get_or_create_material("Fence_WarningPlate", (0.85, 0.65, 0.08), roughness=0.5, metalness=0.2)
    mat_box = get_or_create_material("Fence_PowerCabinet", (0.25, 0.32, 0.28), roughness=0.7, metalness=0.5)
    mat_light_green = get_or_create_material("Fence_LedGreen", (0.1, 0.9, 0.2), roughness=0.2, metalness=0.0, emissive=(0.1, 0.9, 0.2), emissive_intensity=3.0)

    # Master Root
    master_root = bpy.data.objects.new("ElectricFenceSet", None)
    bpy.context.scene.collection.objects.link(master_root)

    # -------------------------------------------------------------------------
    # 1. FenceStraight_4m
    # -------------------------------------------------------------------------
    f4 = bpy.data.objects.new("FenceStraight_4m", None)
    bpy.context.scene.collection.objects.link(f4)
    f4.parent = master_root
    f4.location = Vector((-10, 0, 0))

    # Posts at x=-2, x=+2 (height 2.8m)
    create_cylinder("Post_L", 0.06, 2.8, location=(-2.0, 0, 1.4), mat=mat_steel, parent=f4)
    create_cylinder("Post_R", 0.06, 2.8, location=(2.0, 0, 1.4), mat=mat_steel, parent=f4)
    # Horizontal rails
    create_box("Rail_Bottom", (4.0, 0.06, 0.06), location=(0, 0, 0.2), mat=mat_steel, parent=f4)
    create_box("Rail_Top", (4.0, 0.06, 0.06), location=(0, 0, 2.2), mat=mat_steel, parent=f4)
    # Mesh plane
    create_box("Mesh_4m", (3.9, 0.02, 1.95), location=(0, 0, 1.2), mat=mat_dark_iron, parent=f4)
    # Insulator brackets & 3 upper electric wires
    for y_wire in [2.35, 2.55, 2.75]:
        create_cylinder(f"Insulator_L_{y_wire}", 0.035, 0.12, location=(-2.0, 0.08, y_wire), rotation=(math.pi/2, 0, 0), mat=mat_insulator, parent=f4)
        create_cylinder(f"Insulator_R_{y_wire}", 0.035, 0.12, location=(2.0, 0.08, y_wire), rotation=(math.pi/2, 0, 0), mat=mat_insulator, parent=f4)
        create_box(f"ElectricWire_{y_wire}", (4.04, 0.018, 0.018), location=(0, 0.08, y_wire), mat=mat_wire, parent=f4)
    # Warning sign on center
    create_box("WarningSign", (0.5, 0.03, 0.35), location=(0, 0.04, 1.45), mat=mat_warning, parent=f4)

    # -------------------------------------------------------------------------
    # 2. FenceStraight_8m
    # -------------------------------------------------------------------------
    f8 = bpy.data.objects.new("FenceStraight_8m", None)
    bpy.context.scene.collection.objects.link(f8)
    f8.parent = master_root
    f8.location = Vector((0, 0, 0))

    # Posts at x=-4, x=0, x=+4
    for px in [-4.0, 0.0, 4.0]:
        create_cylinder(f"Post_8m_{px}", 0.06, 2.8, location=(px, 0, 1.4), mat=mat_steel, parent=f8)
    # Horizontal rails
    create_box("Rail_Bottom_8m", (8.0, 0.06, 0.06), location=(0, 0, 0.2), mat=mat_steel, parent=f8)
    create_box("Rail_Top_8m", (8.0, 0.06, 0.06), location=(0, 0, 2.2), mat=mat_steel, parent=f8)
    # Mesh plane
    create_box("Mesh_8m", (7.9, 0.02, 1.95), location=(0, 0, 1.2), mat=mat_dark_iron, parent=f8)
    # Insulators & 3 upper electric wires
    for y_wire in [2.35, 2.55, 2.75]:
        for px in [-4.0, 0.0, 4.0]:
            create_cylinder(f"Insulator_8m_{px}_{y_wire}", 0.035, 0.12, location=(px, 0.08, y_wire), rotation=(math.pi/2, 0, 0), mat=mat_insulator, parent=f8)
        create_box(f"ElectricWire_8m_{y_wire}", (8.04, 0.018, 0.018), location=(0, 0.08, y_wire), mat=mat_wire, parent=f8)
    # Warning signs
    create_box("WarningSign_L", (0.5, 0.03, 0.35), location=(-2.0, 0.04, 1.45), mat=mat_warning, parent=f8)
    create_box("WarningSign_R", (0.5, 0.03, 0.35), location=(2.0, 0.04, 1.45), mat=mat_warning, parent=f8)

    # -------------------------------------------------------------------------
    # 3. FenceCorner (90 degree corner)
    # -------------------------------------------------------------------------
    fc = bpy.data.objects.new("FenceCorner", None)
    bpy.context.scene.collection.objects.link(fc)
    fc.parent = master_root
    fc.location = Vector((10, 0, 0))

    # Corner corner post
    create_cylinder("CornerPost_Center", 0.08, 2.85, location=(0, 0, 1.42), mat=mat_steel, parent=fc)
    create_cylinder("CornerPost_X", 0.06, 2.8, location=(4.0, 0, 1.4), mat=mat_steel, parent=fc)
    create_cylinder("CornerPost_Y", 0.06, 2.8, location=(0, 4.0, 1.4), mat=mat_steel, parent=fc)
    
    # X Wing
    create_box("CornerMesh_X", (3.9, 0.02, 1.95), location=(2.0, 0, 1.2), mat=mat_dark_iron, parent=fc)
    create_box("CornerRail_Top_X", (4.0, 0.06, 0.06), location=(2.0, 0, 2.2), mat=mat_steel, parent=fc)
    create_box("CornerRail_Bot_X", (4.0, 0.06, 0.06), location=(2.0, 0, 0.2), mat=mat_steel, parent=fc)

    # Y Wing
    create_box("CornerMesh_Y", (0.02, 3.9, 1.95), location=(0, 2.0, 1.2), mat=mat_dark_iron, parent=fc)
    create_box("CornerRail_Top_Y", (0.06, 4.0, 0.06), location=(0, 2.0, 2.2), mat=mat_steel, parent=fc)
    create_box("CornerRail_Bot_Y", (0.06, 4.0, 0.06), location=(0, 2.0, 0.2), mat=mat_steel, parent=fc)

    # Upper electric wires on both wings
    for y_wire in [2.35, 2.55, 2.75]:
        create_box(f"CornerWire_X_{y_wire}", (4.04, 0.018, 0.018), location=(2.0, 0.08, y_wire), mat=mat_wire, parent=fc)
        create_box(f"CornerWire_Y_{y_wire}", (0.018, 4.04, 0.018), location=(0.08, 2.0, y_wire), mat=mat_wire, parent=fc)

    # -------------------------------------------------------------------------
    # 4. FenceGateLarge (5.5m wide road security gate with sliding wing)
    # -------------------------------------------------------------------------
    fg = bpy.data.objects.new("FenceGateLarge", None)
    bpy.context.scene.collection.objects.link(fg)
    fg.parent = master_root
    fg.location = Vector((0, 10, 0))

    # Heavy Gate Pillars
    create_box("GatePillar_L", (0.45, 0.45, 3.4), location=(-3.0, 0, 1.7), mat=mat_steel, parent=fg)
    create_box("GatePillar_R", (0.45, 0.45, 3.4), location=(3.0, 0, 1.7), mat=mat_steel, parent=fg)
    # Overhead gantry rail
    create_box("GateGantry", (6.45, 0.35, 0.25), location=(0, 0, 3.3), mat=mat_steel, parent=fg)

    # Left Gate Door (Swung open by default)
    gate_door_l = create_box("GateDoor_L", (2.65, 0.08, 2.6), location=(-1.5, 0, 1.4), mat=mat_dark_iron, parent=fg)
    # Right Gate Door
    gate_door_r = create_box("GateDoor_R", (2.65, 0.08, 2.6), location=(1.5, 0, 1.4), mat=mat_dark_iron, parent=fg)

    # Insulators & High-voltage warning plate
    create_box("GateWarningSign", (0.8, 0.04, 0.45), location=(0, 0.2, 3.3), mat=mat_warning, parent=fg)

    # -------------------------------------------------------------------------
    # 5. FencePowerBox (Electrical Gate Control Cabinet)
    # -------------------------------------------------------------------------
    pb = bpy.data.objects.new("FencePowerBox", None)
    bpy.context.scene.collection.objects.link(pb)
    pb.parent = master_root
    pb.location = Vector((-10, 10, 0))

    # Stand post
    create_cylinder("PowerBoxStand", 0.05, 1.2, location=(0, 0, 0.6), mat=mat_steel, parent=pb)
    # Main Cabinet
    create_box("PowerBoxCabinet", (0.6, 0.4, 0.85), location=(0, 0, 1.3), mat=mat_box, parent=pb)
    # Fuse / Switch Door Panel
    create_box("PowerBoxDoor", (0.52, 0.04, 0.75), location=(0, 0.22, 1.3), mat=mat_steel, parent=pb)
    # Status LED Light
    create_cylinder("PowerBoxLED", 0.04, 0.06, location=(0.18, 0.25, 1.55), rotation=(math.pi/2, 0, 0), mat=mat_light_green, parent=pb)
    # Conduit cable going down
    create_cylinder("PowerConduit", 0.025, 1.2, location=(-0.2, 0, 0.6), mat=mat_dark_iron, parent=pb)

    # -------------------------------------------------------------------------
    # 6. FenceBroken (Damaged breach section with bent rails and snapped wires)
    # -------------------------------------------------------------------------
    fb = bpy.data.objects.new("FenceBroken", None)
    bpy.context.scene.collection.objects.link(fb)
    fb.parent = master_root
    fb.location = Vector((10, 10, 0))

    create_cylinder("BrokenPost_L", 0.06, 2.8, location=(-2.0, 0, 1.4), mat=mat_steel, parent=fb)
    create_cylinder("BrokenPost_R", 0.06, 1.6, location=(2.0, 0, 0.8), rotation=(0, -0.35, 0.2), mat=mat_steel, parent=fb)
    # Twisted crumpled mesh on ground
    create_box("TornMesh_1", (1.8, 0.04, 1.4), location=(-1.0, 0.2, 0.8), rotation=(0.2, 0.1, -0.2), mat=mat_dark_iron, parent=fb)
    # Snapped sparking wire remnants
    create_box("WireSparkL", (1.5, 0.02, 0.02), location=(-1.2, 0.08, 2.4), rotation=(0, 0, -0.4), mat=mat_wire, parent=fb)

    # Export to GLB
    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/electric_fence_set.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported electric fence set to {out_path}")

if __name__ == '__main__':
    build_electric_fence_set()
