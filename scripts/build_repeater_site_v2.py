import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

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

def create_bevelled_box(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, bevel=0.04):
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

def create_pipe(name, radius, length, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=8):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=vertices, radius1=radius, radius2=radius, depth=length)
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

def add_marker(name, location, parent=None):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.4
    empty.location = location
    bpy.context.scene.collection.objects.link(empty)
    if parent:
        empty.parent = parent
    return empty

def build_repeater_site_v2():
    reset_scene()

    mat_concrete = get_or_create_material("Rep_Concrete", (0.52, 0.50, 0.48), roughness=0.9, metalness=0.05)
    mat_dark_iron = get_or_create_material("Rep_DarkIron", (0.16, 0.17, 0.19), roughness=0.5, metalness=0.85)
    mat_steel = get_or_create_material("Rep_GalvanizedSteel", (0.42, 0.44, 0.46), roughness=0.4, metalness=0.9)
    mat_orange = get_or_create_material("Rep_HazardOrange", (0.85, 0.45, 0.08), roughness=0.6, metalness=0.2)
    mat_arc_cyan = get_or_create_material("Rep_ArcGlowCyan", (0.0, 0.85, 1.0), roughness=0.2, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=4.0)
    mat_lattice_red = get_or_create_material("Rep_LatticeRed", (0.9, 0.05, 0.1), roughness=0.2, metalness=0.2, emissive=(0.9, 0.05, 0.1), emissive_intensity=3.5)

    root = bpy.data.objects.new("REPEATER_SITE_V2", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Foundation Slab (Elevated 0.25m)
    create_bevelled_box("Rep_Plinth", (12.0, 10.0, 0.35), location=(0, 0, 0.175), mat=mat_concrete, parent=root, bevel=0.08)

    # 2. Tall Asymmetric Communications Mast (14m high landmark)
    # Mast base legs (4 heavy angular steel pillars)
    create_pipe("Mast_Leg_1", 0.12, 12.0, location=(-1.2, -1.2, 6.0), rotation=(0.04, -0.04, 0), mat=mat_steel, parent=root)
    create_pipe("Mast_Leg_2", 0.12, 12.0, location=( 1.2, -1.2, 6.0), rotation=(0.04,  0.04, 0), mat=mat_steel, parent=root)
    create_pipe("Mast_Leg_3", 0.12, 12.0, location=( 1.2,  1.2, 6.0), rotation=(-0.04, 0.04, 0), mat=mat_steel, parent=root)
    create_pipe("Mast_Leg_4", 0.12, 12.0, location=(-1.2,  1.2, 6.0), rotation=(-0.04,-0.04, 0), mat=mat_steel, parent=root)
    # Cross braces at heights 3m, 6m, 9m
    for h in [3.0, 6.0, 9.0]:
        create_bevelled_box(f"Mast_Brace_{h}", (2.2, 2.2, 0.15), location=(0, 0, h), mat=mat_dark_iron, parent=root, bevel=0.02)
    # Upper mast spire & top beacon
    create_pipe("Mast_Spire", 0.08, 4.0, location=(0, 0, 13.5), mat=mat_steel, parent=root)
    create_pipe("Mast_Top_Beacon", 0.14, 0.3, location=(0, 0, 15.6), mat=mat_arc_cyan, parent=root)
    # Transceiver dishes (Asymmetric array)
    create_pipe("Transceiver_Dish_Large", 0.9, 0.15, location=(0.8, -0.4, 10.5), rotation=(0.4, 0.3, 0), mat=mat_dark_iron, parent=root, vertices=12)
    create_pipe("Transceiver_Dish_Small", 0.5, 0.12, location=(-0.7, 0.6, 11.8), rotation=(-0.3, -0.5, 0), mat=mat_dark_iron, parent=root, vertices=12)

    # 3. Technical Operations Hut (West of Mast)
    create_bevelled_box("Tech_Hut_Body", (4.2, 3.4, 2.6), location=(-3.8, 0.5, 1.45), mat=mat_dark_iron, parent=root, bevel=0.06)
    create_bevelled_box("Tech_Hut_Roof", (4.6, 3.8, 0.2), location=(-3.8, 0.5, 2.85), mat=mat_orange, parent=root, bevel=0.04)
    # Terminal Console on East side of Hut facing the path
    create_bevelled_box("Repeater_Console_Base", (1.2, 0.8, 1.0), location=(-1.7, 0.5, 0.65), mat=mat_steel, parent=root, bevel=0.03)
    create_bevelled_box("Repeater_Console_Panel", (1.0, 0.1, 0.6), location=(-1.7, 0.2, 1.3), rotation=(-0.25, 0, 0), mat=mat_arc_cyan, parent=root, bevel=0.02)

    # 4. Three External Arc Capacitors (East of Mast)
    for i, z_offset in enumerate([-1.8, 0.0, 1.8]):
        create_bevelled_box(f"Capacitor_Base_{i+1}", (1.0, 1.0, 0.4), location=(3.8, z_offset, 0.45), mat=mat_dark_iron, parent=root, bevel=0.04)
        create_pipe(f"Capacitor_Cell_{i+1}", 0.35, 1.8, location=(3.8, z_offset, 1.45), mat=mat_steel, parent=root, vertices=10)
        create_pipe(f"Capacitor_Core_{i+1}", 0.18, 1.2, location=(3.8, z_offset, 1.45), mat=mat_arc_cyan, parent=root, vertices=8)

    # 5. Power Cable Channels
    create_pipe("Cable_Hut_To_Mast", 0.06, 2.6, location=(-1.8, 0, 0.38), rotation=(0, 0, math.pi/2), mat=mat_dark_iron, parent=root)
    create_pipe("Cable_Mast_To_Cap", 0.06, 2.6, location=(1.8, 0, 0.38), rotation=(0, 0, math.pi/2), mat=mat_dark_iron, parent=root)

    # 6. Sealed Northern Lattice Blast Barrier (Behind Repeater, z = -4.5m)
    create_bevelled_box("BlastGate_Pillar_L", (0.8, 0.8, 4.5), location=(-5.5, -4.5, 2.4), mat=mat_dark_iron, parent=root, bevel=0.08)
    create_bevelled_box("BlastGate_Pillar_R", (0.8, 0.8, 4.5), location=( 5.5, -4.5, 2.4), mat=mat_dark_iron, parent=root, bevel=0.08)
    create_bevelled_box("BlastGate_Gantry", (12.0, 0.8, 0.6), location=(0, -4.5, 4.5), mat=mat_dark_iron, parent=root, bevel=0.06)
    create_bevelled_box("BlastGate_Door_L", (5.2, 0.3, 3.8), location=(-2.6, -4.5, 2.1), mat=mat_orange, parent=root, bevel=0.04)
    create_bevelled_box("BlastGate_Door_R", (5.2, 0.3, 3.8), location=( 2.6, -4.5, 2.1), mat=mat_orange, parent=root, bevel=0.04)
    create_pipe("BlastGate_LockSensor", 0.2, 0.1, location=(0, -4.3, 2.5), rotation=(math.pi/2, 0, 0), mat=mat_lattice_red, parent=root)

    # 7. Gameplay Sockets & Camera Markers
    add_marker("SOCKET_REPEATER_CONSOLE", (-1.7, 0.35, -0.4), parent=root)
    add_marker("CAM_REPEATER_CLOSEUP", (-1.7, 1.8, 1.4), parent=root)
    add_marker("TARGET_REPEATER_CONSOLE", (-1.7, 1.2, 0.5), parent=root)
    add_marker("CAM_TOWER_RISE", (0, 3.0, 7.0), parent=root)
    add_marker("TARGET_TOWER_TOP", (0, 14.0, 0), parent=root)
    add_marker("CAM_FOREST_LOOK", (0, 3.5, -3.0), parent=root)
    add_marker("TARGET_DISTANT_FOREST", (0, 4.0, -25.0), parent=root)

    # Collision Boxes
    add_marker("COL_REPEATER_HUT", (-3.8, 1.4, 0.5), parent=root)
    add_marker("COL_REPEATER_MAST", (0, 1.5, 0), parent=root)
    add_marker("COL_REPEATER_CAPACITORS", (3.8, 1.0, 0), parent=root)
    add_marker("COL_BLAST_BARRIER", (0, 2.0, -4.5), parent=root)

    # Flat shading
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/repeater_site_v2.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Successfully exported Repeater Site V2 to {out_path}")

if __name__ == '__main__':
    build_repeater_site_v2()
