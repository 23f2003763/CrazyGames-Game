import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

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

def create_bevelled_wall(name, width, height, thickness=0.35, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, bevel=0.04):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= width
        v.co.y *= thickness
        v.co.z *= height
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

def create_tapered_pillar(name, base_size, top_size, height, location=(0,0,0), mat=None, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        if v.co.z < 0:
            v.co.x *= base_size[0]
            v.co.y *= base_size[1]
            v.co.z = 0
        else:
            v.co.x *= top_size[0]
            v.co.y *= top_size[1]
            v.co.z = height
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.03, segments=1)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_pipe_conduit(name, radius, length, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=8):
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

def build_relay_v2():
    reset_scene()

    # Materials
    mat_concrete = get_or_create_material("Relay_Concrete", (0.55, 0.54, 0.50), roughness=0.9, metalness=0.05)
    mat_dark_panel = get_or_create_material("Relay_DarkPanel", (0.18, 0.20, 0.22), roughness=0.5, metalness=0.85)
    mat_orange_repair = get_or_create_material("Relay_OrangePlate", (0.85, 0.42, 0.08), roughness=0.65, metalness=0.2)
    mat_floor = get_or_create_material("Relay_FloorPlates", (0.32, 0.30, 0.28), roughness=0.85, metalness=0.4)
    mat_steel_trim = get_or_create_material("Relay_SteelTrim", (0.40, 0.42, 0.44), roughness=0.4, metalness=0.9)
    mat_screen_cyan = get_or_create_material("Relay_ScreenCyan", (0.05, 0.7, 0.9), roughness=0.2, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=3.5)
    mat_screen_amber = get_or_create_material("Relay_ScreenAmber", (0.9, 0.6, 0.05), roughness=0.2, metalness=0.1, emissive=(0.9, 0.55, 0.05), emissive_intensity=3.0)
    mat_roof = get_or_create_material("Relay_RoofMetal", (0.22, 0.23, 0.25), roughness=0.6, metalness=0.7)
    mat_wire_glow = get_or_create_material("Relay_WireGlow", (0.2, 0.8, 1.0), roughness=0.3, metalness=0.5, emissive=(0.0, 0.8, 1.0), emissive_intensity=2.5)

    root = bpy.data.objects.new("RELAY_OPERATIONS_V2", None)
    bpy.context.scene.collection.objects.link(root)

    # Footprint Layout:
    # Operations Room: Center-West (x in [-6.5, 0.5], z in [-4.5, 4.5]), Height 3.4m
    # Workshop Wing: East (x in [0.5, 6.5], z in [-4.5, 2.0]), Lower Height 2.7m
    # Airlock / Entrance: South-East (x in [0.5, 5.0], z in [2.0, 5.5]), Height 2.5m
    # External Generator Pad: West Exterior (x in [-7.5, -6.5], z in [-2.0, 2.0])

    # 1. Foundation Slab (Concrete plinth)
    create_bevelled_wall("Relay_FoundationSlab", 14.2, 0.35, thickness=11.2, location=(0, 0.175, 0), mat=mat_concrete, parent=root, bevel=0.08)

    # Floor plates (interior elevation y=0.35)
    create_bevelled_wall("Floor_Ops", 7.0, 0.04, thickness=9.0, location=(-3.0, 0.37, 0), mat=mat_floor, parent=root, bevel=0.02)
    create_bevelled_wall("Floor_Workshop", 6.0, 0.04, thickness=6.5, location=(3.5, 0.37, -1.25), mat=mat_floor, parent=root, bevel=0.02)
    create_bevelled_wall("Floor_Airlock", 4.5, 0.04, thickness=3.5, location=(2.75, 0.37, 3.75), mat=mat_floor, parent=root, bevel=0.02)

    # 2. EXTERIOR WALLS (Concrete base up to y=1.2m, Dark panels above up to ceiling)
    # NORTH WALL (full width x in [-6.5, 6.5], z = -4.5)
    create_bevelled_wall("Wall_N_Base", 13.5, 1.2, thickness=0.4, location=(0, 0.95, -4.5), mat=mat_concrete, parent=root)
    create_bevelled_wall("Wall_N_Upper", 13.5, 2.0, thickness=0.3, location=(0, 2.55, -4.5), mat=mat_dark_panel, parent=root)

    # WEST WALL (x = -6.5, z in [-4.5, 4.5])
    create_bevelled_wall("Wall_W_Base", 0.4, 1.2, thickness=9.4, location=(-6.5, 0.95, 0), mat=mat_concrete, parent=root)
    create_bevelled_wall("Wall_W_Upper", 0.3, 2.0, thickness=9.4, location=(-6.5, 2.55, 0), mat=mat_dark_panel, parent=root)

    # EAST WALL (Workshop + Airlock, x = 6.5, z in [-4.5, 5.5])
    create_bevelled_wall("Wall_E_Base", 0.4, 1.2, thickness=10.4, location=(6.5, 0.95, 0.5), mat=mat_concrete, parent=root)
    create_bevelled_wall("Wall_E_Upper", 0.3, 1.6, thickness=10.4, location=(6.5, 2.35, 0.5), mat=mat_dark_panel, parent=root)

    # SOUTH WALL - OPS (x in [-6.5, 0.5], z = 4.5) -> named with 'wall_fade' for interior reveal
    create_bevelled_wall("Wall_S_Ops_wall_fade", 7.0, 3.2, thickness=0.35, location=(-3.0, 1.95, 4.5), mat=mat_dark_panel, parent=root)

    # SOUTH WALL - AIRLOCK (x in [0.5, 5.0], z = 5.5) with Main Entrance Doorway at x=2.5
    create_bevelled_wall("Wall_S_Airlock_L_wall_fade", 1.8, 2.6, thickness=0.35, location=(1.1, 1.65, 5.5), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("Wall_S_Airlock_R_wall_fade", 1.8, 2.6, thickness=0.35, location=(4.1, 1.65, 5.5), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("Wall_S_Airlock_Header_wall_fade", 1.6, 0.5, thickness=0.35, location=(2.6, 2.7, 5.5), mat=mat_orange_repair, parent=root)

    # Entrance Canopy over Doorway
    create_bevelled_wall("Entrance_Canopy", 2.2, 0.12, thickness=1.4, location=(2.6, 2.85, 6.2), rotation=(-0.15, 0, 0), mat=mat_orange_repair, parent=root)
    create_pipe_conduit("Canopy_Strut_L", 0.03, 1.2, location=(1.7, 2.2, 6.0), rotation=(0.4, 0, 0.2), mat=mat_steel_trim, parent=root)
    create_pipe_conduit("Canopy_Strut_R", 0.03, 1.2, location=(3.5, 2.2, 6.0), rotation=(0.4, 0, -0.2), mat=mat_steel_trim, parent=root)

    # 3. INTERIOR PARTITION WALLS (with open doorways)
    # Partition between Ops and Workshop/Airlock (x = 0.5, z in [-4.5, 4.5], doorway at z=-1.0)
    create_bevelled_wall("Partition_Ops_N", 0.25, 3.0, thickness=3.2, location=(0.5, 1.85, -2.9), mat=mat_concrete, parent=root)
    create_bevelled_wall("Partition_Ops_S", 0.25, 3.0, thickness=3.2, location=(0.5, 1.85, 2.9), mat=mat_concrete, parent=root)
    create_bevelled_wall("Partition_Ops_Header", 0.25, 0.7, thickness=2.6, location=(0.5, 3.0, 0.0), mat=mat_steel_trim, parent=root)

    # Partition between Workshop and Airlock (z = 2.0, x in [0.5, 6.5], doorway at x=3.5)
    create_bevelled_wall("Partition_Work_L", 2.0, 2.5, thickness=0.25, location=(1.5, 1.6, 2.0), mat=mat_concrete, parent=root)
    create_bevelled_wall("Partition_Work_R", 2.0, 2.5, thickness=0.25, location=(5.5, 1.6, 2.0), mat=mat_concrete, parent=root)
    create_bevelled_wall("Partition_Work_Header", 2.0, 0.5, thickness=0.25, location=(3.5, 2.6, 2.0), mat=mat_steel_trim, parent=root)

    # 4. ROOFS (named with 'roof' for InteriorRevealSystem)
    create_bevelled_wall("Roof_Ops_roof", 7.6, 0.2, thickness=9.6, location=(-3.0, 3.55, 0), mat=mat_roof, parent=root)
    create_bevelled_wall("Roof_Workshop_roof", 6.6, 0.2, thickness=7.0, location=(3.5, 2.85, -1.25), mat=mat_roof, parent=root)
    create_bevelled_wall("Roof_Airlock_roof", 5.0, 0.2, thickness=4.0, location=(2.75, 2.65, 3.75), mat=mat_roof, parent=root)

    # 5. EXTERIOR STRUCTURES & ANTENNA MAST
    # Rooftop antenna mast (Tall comms lattice mast at north-west corner)
    create_tapered_pillar("Antenna_BasePillar", (0.8, 0.8), (0.5, 0.5), 1.2, location=(-5.0, 3.65, -3.2), mat=mat_steel_trim, parent=root)
    create_pipe_conduit("Antenna_Mast_Main", 0.08, 5.5, location=(-5.0, 7.0, -3.2), mat=mat_steel_trim, parent=root)
    # Cross arms & telemetry dish
    create_pipe_conduit("Antenna_CrossArm1", 0.04, 2.2, location=(-5.0, 8.2, -3.2), rotation=(0, 0, math.pi/2), mat=mat_steel_trim, parent=root)
    create_pipe_conduit("Antenna_CrossArm2", 0.04, 1.6, location=(-5.0, 9.2, -3.2), rotation=(math.pi/2, 0, 0), mat=mat_steel_trim, parent=root)
    # Antenna flashing beacon tip
    create_pipe_conduit("Antenna_BeaconTip", 0.06, 0.2, location=(-5.0, 9.8, -3.2), mat=mat_screen_amber, parent=root)

    # Rooftop HVAC ventilation units & conduit pipes
    create_bevelled_wall("HVAC_Unit_1", 1.6, 0.9, thickness=1.2, location=(-1.5, 4.1, 1.5), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("HVAC_Unit_2", 1.2, 0.7, thickness=1.0, location=(4.2, 3.3, -2.5), mat=mat_dark_panel, parent=root)
    create_pipe_conduit("Conduit_Roof_To_Wall", 0.05, 3.5, location=(-3.2, 3.6, -4.3), rotation=(0, 0, math.pi/2), mat=mat_steel_trim, parent=root)

    # External Generator Pad (West exterior)
    create_bevelled_wall("GenPad_Base", 1.6, 0.4, thickness=3.2, location=(-7.6, 0.2, 0), mat=mat_concrete, parent=root)
    create_bevelled_wall("Gen_Unit_Main", 1.2, 1.5, thickness=2.2, location=(-7.6, 1.15, 0), mat=mat_dark_panel, parent=root)
    create_pipe_conduit("Gen_ExhaustPipe", 0.07, 2.2, location=(-7.6, 2.6, 0.6), mat=mat_steel_trim, parent=root)

    # 6. ROOM A (COMMAND / SIGNAL ROOM) FURNITURE & EQUIPMENT
    # Signal Console (Large central terminal facing south)
    create_bevelled_wall("Signal_Terminal_Base", 2.2, 1.1, thickness=0.9, location=(-3.0, 0.9, -3.4), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("Signal_Terminal_Panel", 2.0, 1.0, thickness=0.15, location=(-3.0, 1.9, -3.5), rotation=(-0.15, 0, 0), mat=mat_steel_trim, parent=root)
    # 3 Glowing monitor screens on terminal
    create_bevelled_wall("Signal_Screen_Center", 0.9, 0.55, thickness=0.03, location=(-3.0, 1.95, -3.42), rotation=(-0.15, 0, 0), mat=mat_screen_cyan, parent=root)
    create_bevelled_wall("Signal_Screen_Left", 0.5, 0.45, thickness=0.03, location=(-3.7, 1.92, -3.38), rotation=(-0.15, 0.2, 0), mat=mat_screen_amber, parent=root)
    create_bevelled_wall("Signal_Screen_Right", 0.5, 0.45, thickness=0.03, location=(-2.3, 1.92, -3.38), rotation=(-0.15, -0.2, 0), mat=mat_screen_amber, parent=root)

    # Mara's Workstation (Desk + Chair to the right of terminal)
    create_bevelled_wall("Mara_Desk", 1.8, 0.85, thickness=0.9, location=(-1.2, 0.77, -1.8), mat=mat_steel_trim, parent=root)
    create_bevelled_wall("Mara_Desk_Screen", 0.6, 0.4, thickness=0.04, location=(-1.2, 1.35, -2.0), rotation=(-0.1, 0, 0), mat=mat_screen_cyan, parent=root)
    create_bevelled_wall("Mara_Chair_Base", 0.5, 0.45, thickness=0.5, location=(-1.2, 0.6, -1.1), mat=mat_dark_panel, parent=root)

    # Radio rack & Wall Map on West wall
    create_bevelled_wall("Radio_Rack_Tall", 1.0, 2.4, thickness=0.6, location=(-6.0, 1.55, 1.8), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("Wall_Map_Display", 2.2, 1.4, thickness=0.06, location=(-6.25, 2.1, -1.5), rotation=(0, math.pi/2, 0), mat=mat_screen_cyan, parent=root)

    # 7. ROOM B (ARC WORKSHOP) FURNITURE & EQUIPMENT
    # Heavy workbench along North wall
    create_bevelled_wall("Workbench_Main", 2.8, 0.9, thickness=1.0, location=(3.5, 0.8, -3.8), mat=mat_steel_trim, parent=root)
    create_bevelled_wall("Workbench_Backboard", 2.8, 1.2, thickness=0.08, location=(3.5, 1.85, -4.25), mat=mat_orange_repair, parent=root)
    # Arc battery chargers & testing rig
    create_bevelled_wall("Arc_Charger_Bank", 1.4, 1.6, thickness=0.6, location=(5.8, 1.15, -1.5), rotation=(0, -math.pi/2, 0), mat=mat_dark_panel, parent=root)
    create_pipe_conduit("Charger_Cable_Glow", 0.04, 1.8, location=(5.4, 1.0, -1.5), rotation=(0, 0, math.pi/2), mat=mat_wire_glow, parent=root)
    # Parts shelving along partition
    create_bevelled_wall("Parts_Shelves", 1.6, 2.2, thickness=0.5, location=(1.0, 1.45, 0.5), rotation=(0, math.pi/2, 0), mat=mat_steel_trim, parent=root)

    # 8. ROOM C (AIRLOCK / STORAGE)
    # Storage lockers on East wall
    create_bevelled_wall("Airlock_Lockers", 1.8, 2.0, thickness=0.6, location=(5.8, 1.35, 3.8), rotation=(0, -math.pi/2, 0), mat=mat_dark_panel, parent=root)
    create_bevelled_wall("Airlock_SupplyCrate", 0.8, 0.8, thickness=0.8, location=(1.2, 0.75, 4.5), mat=mat_orange_repair, parent=root)

    # 9. NAMED MARKERS & SOCKETS
    # Sockets for Gameplay Entities:
    add_marker("SOCKET_MARA", (-1.2, 0.38, -1.1), parent=root)  # Mara standing at desk
    add_marker("SOCKET_SIGNAL_CONSOLE", (-3.0, 0.38, -2.4), parent=root)  # Player standing in front of terminal
    add_marker("SOCKET_WORKBENCH", (3.5, 0.38, -2.8), parent=root)
    add_marker("SOCKET_PLAYER_DOOR_ENTRY", (2.6, 0.38, 4.6), parent=root)

    # Cutscene Camera Sockets (Designed outside walls for clean view)
    add_marker("CAM_OPEN_ANTENNA", (-9.5, 8.5, 6.5), parent=root)
    add_marker("TARGET_ANTENNA", (-5.0, 7.5, -3.2), parent=root)

    add_marker("CAM_OPEN_CONSOLE", (-3.0, 3.2, 2.5), parent=root)
    add_marker("TARGET_SIGNAL_CONSOLE", (-3.0, 1.8, -3.4), parent=root)

    add_marker("CAM_OPEN_MARA", (-0.2, 2.5, 1.8), parent=root)
    add_marker("TARGET_MARA", (-1.2, 1.5, -1.1), parent=root)

    add_marker("CAM_DIALOGUE", (-1.8, 2.2, 0.8), parent=root)
    add_marker("CAM_CONSOLE_INTERACT", (-3.0, 2.6, -0.6), parent=root)

    # Collision Box Markers (Exact bounds for physical walls)
    add_marker("COL_WALL_NORTH", (0, 1.5, -4.5), parent=root)
    add_marker("COL_WALL_WEST", (-6.5, 1.5, 0), parent=root)
    add_marker("COL_WALL_EAST", (6.5, 1.5, 0.5), parent=root)
    add_marker("COL_WALL_SOUTH_OPS", (-3.0, 1.5, 4.5), parent=root)
    add_marker("COL_WALL_SOUTH_AIRLOCK_L", (1.1, 1.5, 5.5), parent=root)
    add_marker("COL_WALL_SOUTH_AIRLOCK_R", (4.1, 1.5, 5.5), parent=root)
    add_marker("COL_PARTITION_OPS_N", (0.5, 1.5, -2.9), parent=root)
    add_marker("COL_PARTITION_OPS_S", (0.5, 1.5, 2.9), parent=root)
    add_marker("COL_CONSOLE", (-3.0, 0.9, -3.4), parent=root)
    add_marker("COL_WORKBENCH", (3.5, 0.8, -3.8), parent=root)

    # Flat shading across all meshes
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/relay_operations_v2.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Successfully exported Relay Operations V2 to {out_path}")

if __name__ == '__main__':
    build_relay_v2()
