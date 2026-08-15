import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Clear existing objects in scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Helper function to create materials with Principled BSDF
def create_material(name, color, roughness=0.7, metallic=0.0, alpha=1.0, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    node_p = nodes.new(type='ShaderNodeBsdfPrincipled')
    if 'Base Color' in node_p.inputs:
        node_p.inputs['Base Color'].default_value = color
    node_p.inputs['Roughness'].default_value = roughness
    node_p.inputs['Metallic'].default_value = metallic
    if alpha < 1.0:
        if 'Alpha' in node_p.inputs:
            node_p.inputs['Alpha'].default_value = alpha
        mat.blend_method = 'BLEND'
    
    if emission:
        if 'Emission Color' in node_p.inputs:
            node_p.inputs['Emission Color'].default_value = emission
            node_p.inputs['Emission Strength'].default_value = emission_strength
        elif 'Emission' in node_p.inputs:
            node_p.inputs['Emission'].default_value = emission
            
    node_out = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(node_p.outputs['BSDF'], node_out.inputs['Surface'])
    return mat

# =========================================================================
# VIBRANT CARTOON HOME BASE COLOR PALETTE
# =========================================================================
m_wood_dark = create_material("Mat_WoodDark", (0.34, 0.20, 0.10, 1.0), roughness=0.9)       # Heavy logs
m_wood_plank = create_material("Mat_WoodPlank", (0.56, 0.36, 0.18, 1.0), roughness=0.85)    # Siding planks
m_wood_deck = create_material("Mat_WoodDeck", (0.62, 0.42, 0.22, 1.0), roughness=0.8)       # Porch flooring
m_stone_base = create_material("Mat_StoneBase", (0.44, 0.45, 0.43, 1.0), roughness=0.9)     # Foundation stone
m_roof_green = create_material("Mat_RoofGreen", (0.16, 0.38, 0.24, 1.0), roughness=0.6, metallic=0.2) # Ranger green
m_metal_rust = create_material("Mat_MetalRust", (0.58, 0.24, 0.12, 1.0), roughness=0.85, metallic=0.25)
m_metal_dark = create_material("Mat_MetalDark", (0.18, 0.20, 0.22, 1.0), roughness=0.6, metallic=0.5)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.42, 0.46, 0.48, 1.0), roughness=0.7, metallic=0.3)
m_canvas_sand = create_material("Mat_CanvasSand", (0.82, 0.76, 0.58, 1.0), roughness=0.92) # Lookout tent canvas
m_canvas_orange = create_material("Mat_CanvasOrange", (0.92, 0.46, 0.12, 1.0), roughness=0.9)
m_canvas_blue = create_material("Mat_CanvasBlue", (0.18, 0.44, 0.68, 1.0), roughness=0.9)  # Draped tarp
m_ground_dirt = create_material("Mat_GroundDirt", (0.38, 0.28, 0.16, 1.0), roughness=0.95) # Earth paths
m_ground_concrete = create_material("Mat_GroundConcrete", (0.52, 0.53, 0.49, 1.0), roughness=0.88) # Concrete slabs
m_fire_glow = create_material("Mat_FireGlow", (0.98, 0.52, 0.06, 1.0), roughness=0.3, emission=(0.98, 0.52, 0.06, 1.0), emission_strength=2.8)
m_lamp_warm = create_material("Mat_LampWarm", (0.98, 0.82, 0.24, 1.0), roughness=0.3, emission=(0.98, 0.82, 0.24, 1.0), emission_strength=2.5)
m_beacon_red = create_material("Mat_BeaconRed", (0.98, 0.12, 0.08, 1.0), roughness=0.3, emission=(0.98, 0.12, 0.08, 1.0), emission_strength=3.0)
m_sign_yellow = create_material("Mat_SignYellow", (0.98, 0.86, 0.10, 1.0), roughness=0.3, emission=(0.98, 0.86, 0.10, 1.0), emission_strength=1.5)
m_sign_red = create_material("Mat_SignRed", (0.88, 0.18, 0.14, 1.0), roughness=0.45)
m_sign_green = create_material("Mat_SignGreen", (0.12, 0.50, 0.26, 1.0), roughness=0.5)
m_vines_bright = create_material("Mat_VinesBright", (0.32, 0.68, 0.18, 1.0), roughness=0.7) # Weeds
m_crate_military = create_material("Mat_CrateMil", (0.30, 0.42, 0.24, 1.0), roughness=0.8)
m_barrel_fuel = create_material("Mat_BarrelFuel", (0.88, 0.22, 0.12, 1.0), roughness=0.5, metallic=0.3)
m_barrel_water = create_material("Mat_BarrelWater", (0.18, 0.46, 0.68, 1.0), roughness=0.5, metallic=0.3)
m_glass_dark = create_material("Mat_GlassDark", (0.12, 0.14, 0.16, 1.0), roughness=0.2, alpha=0.85)

def create_box(name, size, loc, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

def create_cylinder(name, radius, depth, loc, rot=(0,0,0), vertices=8, mat=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj

def create_socket(name, loc, rot=(0,0,0)):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.6
    empty.location = loc
    empty.rotation_euler = rot
    bpy.context.scene.collection.objects.link(empty)
    return empty

# Helper to generate 3D Block Lettering
def create_3d_letter(char, pos, size, thickness, mat):
    objs = []
    x, y, z = pos
    w, h = size
    t = thickness
    hw, hh = w / 2, h / 2
    
    if char == 'T':
        b1 = create_box(f"Let_T_H", (w, t, h*0.28), (x, y, z + hh - h*0.14), mat=mat)
        b2 = create_box(f"Let_T_V", (w*0.32, t, h*0.78), (x, y, z - h*0.11), mat=mat)
        objs.extend([b1, b2])
    elif char == 'H':
        b1 = create_box(f"Let_H_L", (w*0.3, t, h), (x - hw + w*0.15, y, z), mat=mat)
        b2 = create_box(f"Let_H_R", (w*0.3, t, h), (x + hw - w*0.15, y, z), mat=mat)
        b3 = create_box(f"Let_H_M", (w*0.6, t, h*0.26), (x, y, z), mat=mat)
        objs.extend([b1, b2, b3])
    elif char == 'E':
        b1 = create_box(f"Let_E_L", (w*0.28, t, h), (x - hw + w*0.14, y, z), mat=mat)
        b2 = create_box(f"Let_E_T", (w*0.75, t, h*0.25), (x + w*0.1, y, z + hh - h*0.125), mat=mat)
        b3 = create_box(f"Let_E_M", (w*0.6, t, h*0.22), (x + w*0.05, y, z), mat=mat)
        b4 = create_box(f"Let_E_B", (w*0.75, t, h*0.25), (x + w*0.1, y, z - hh + h*0.125), mat=mat)
        objs.extend([b1, b2, b3, b4])
    elif char == 'R':
        b1 = create_box(f"Let_R_L", (w*0.28, t, h), (x - hw + w*0.14, y, z), mat=mat)
        b2 = create_box(f"Let_R_T", (w*0.6, t, h*0.25), (x, y, z + hh - h*0.125), mat=mat)
        b3 = create_box(f"Let_R_M", (w*0.6, t, h*0.22), (x, y, z + h*0.05), mat=mat)
        b4 = create_box(f"Let_R_Loop", (w*0.28, t, h*0.45), (x + hw - w*0.14, y, z + hh*0.5), mat=mat)
        b5 = create_box(f"Let_R_Leg", (w*0.3, t, h*0.55), (x + w*0.12, y, z - h*0.24), rot=(0, -0.4, 0), mat=mat)
        objs.extend([b1, b2, b3, b4, b5])
    elif char == 'L':
        b1 = create_box(f"Let_L_V", (w*0.28, t, h), (x - hw + w*0.14, y, z), mat=mat)
        b2 = create_box(f"Let_L_H", (w*0.75, t, h*0.25), (x + w*0.1, y, z - hh + h*0.125), mat=mat)
        objs.extend([b1, b2])
    elif char == 'A':
        b1 = create_box(f"Let_A_L", (w*0.28, t, h), (x - hw + w*0.14, y, z), mat=mat)
        b2 = create_box(f"Let_A_R", (w*0.28, t, h), (x + hw - w*0.14, y, z), mat=mat)
        b3 = create_box(f"Let_A_T", (w*0.6, t, h*0.26), (x, y, z + hh - h*0.13), mat=mat)
        b4 = create_box(f"Let_A_M", (w*0.6, t, h*0.24), (x, y, z), mat=mat)
        objs.extend([b1, b2, b3, b4])
    elif char == 'Y':
        b1 = create_box(f"Let_Y_V", (w*0.3, t, h*0.55), (x, y, z - h*0.24), mat=mat)
        b2 = create_box(f"Let_Y_L", (w*0.28, t, h*0.55), (x - w*0.2, y, z + h*0.2), rot=(0, 0.45, 0), mat=mat)
        b3 = create_box(f"Let_Y_R", (w*0.28, t, h*0.55), (x + w*0.2, y, z + h*0.2), rot=(0, -0.45, 0), mat=mat)
        objs.extend([b1, b2, b3])
        
    return objs

print("Polishing 'THE RELAY' Starting Survivor Hub...")

all_objects = []

# =========================================================================
# 1. ORGANIC CRACKED CONCRETE SLABS & DIRT TRAILS (NO GIANT CLEAN RECTANGLE)
# =========================================================================
# Underlay dark dirt paths winding naturally
dirt_pads = [
    {"name": "Dirt_Courtyard", "size": (18.0, 16.0, 0.08), "loc": (0, 0, 0.04), "rot": 0.05},
    {"name": "Dirt_GatePath", "size": (8.5, 9.0, 0.08), "loc": (1.5, -10.5, 0.04), "rot": -0.08},
    {"name": "Dirt_CabinPorch", "size": (9.0, 6.0, 0.08), "loc": (-4.5, 0.0, 0.04), "rot": 0.02},
]
for dp in dirt_pads:
    d_mesh = create_box(dp["name"], dp["size"], dp["loc"], rot=(0, 0, dp["rot"]), mat=m_ground_dirt)
    all_objects.append(d_mesh)

# Irregular cracked concrete flagstone slabs in courtyard
concrete_slabs = [
    {"name": "Slab_Center", "size": (6.5, 5.5, 0.14), "loc": (0.5, -2.0, 0.09), "rot": 0.08},
    {"name": "Slab_Workbench", "size": (5.0, 4.0, 0.14), "loc": (6.5, 0.5, 0.09), "rot": -0.12},
    {"name": "Slab_Generator", "size": (4.5, 3.5, 0.14), "loc": (-8.5, 5.5, 0.09), "rot": 0.15},
    {"name": "Slab_PorchWalk", "size": (5.5, 3.5, 0.14), "loc": (-4.0, -3.5, 0.09), "rot": -0.05},
    {"name": "Slab_GateThresh", "size": (6.0, 4.0, 0.14), "loc": (0.5, -8.5, 0.09), "rot": 0.04},
    {"name": "Slab_LookoutPad", "size": (4.0, 4.0, 0.14), "loc": (5.5, -8.0, 0.09), "rot": -0.1},
]
for cs in concrete_slabs:
    s_mesh = create_box(cs["name"], cs["size"], cs["loc"], rot=(0, 0, cs["rot"]), mat=m_ground_concrete)
    all_objects.append(s_mesh)

# 20+ Jagged Perimeter Chunks breaking the boundary into grass
perimeter_chunks = [
    (-10.5, -8.0, 0.3, 1.8), (-11.5, -3.0, -0.4, 1.6), (-11.0, 3.0, 0.2, 1.9), (-9.5, 8.5, -0.3, 1.7),
    (-4.0, 10.5, 0.4, 2.0), (2.0, 10.5, -0.2, 1.8), (8.0, 8.5, 0.3, 1.9), (9.0, 3.0, -0.4, 1.6),
    (9.5, -3.0, 0.2, 1.8), (7.5, -11.0, -0.3, 1.7), (-4.5, -11.0, 0.4, 1.9), (3.5, -14.0, -0.2, 1.6),
    (-1.5, -13.5, 0.3, 1.8), (-7.5, -6.5, -0.2, 1.5), (4.0, -5.0, 0.3, 1.5), (3.0, 4.5, -0.2, 1.4)
]
for p_idx, (px, py, prot, pscale) in enumerate(perimeter_chunks):
    chunk = create_box(f"Hub_PerimeterChunk_{p_idx}", (pscale * 1.6, pscale * 1.3, 0.14), (px, py, 0.09), rot=(0, 0, prot), mat=m_ground_concrete)
    all_objects.append(chunk)

# Chunky weed clusters bursting through ground cracks & wall bases
weed_locations = [
    (-2.5, -4.5), (3.5, -2.5), (-6.5, -2.0), (4.5, 3.0), (-2.0, 2.5),
    (-10.5, 1.0), (8.5, -1.0), (1.5, -11.5), (-3.5, -8.5), (5.5, -6.0)
]
for w_idx, (wx, wy) in enumerate(weed_locations):
    weed = create_box(f"Hub_Weed_{w_idx}", (1.1, 1.1, 0.55), (wx, wy, 0.28), rot=(0, w_idx * 0.7, 0), mat=m_vines_bright)
    all_objects.append(weed)


# =========================================================================
# 2. CHUNKY RANGER STATION CABIN (Back-West: X = -5.0, Y = 4.0)
# =========================================================================
cabin_stone = create_box("Ranger_StoneBase", (11.4, 8.4, 1.2), (-5.0, 4.0, 0.6), mat=m_stone_base)
cabin_walls = create_box("Ranger_TimberWalls", (10.8, 7.8, 3.8), (-5.0, 4.0, 3.1), mat=m_wood_plank)

for cx, cy in [(-10.2, 0.3), (0.2, 0.3), (-10.2, 7.7), (0.2, 7.7)]:
    corner_log = create_cylinder(f"Ranger_LogCorner_{cx}_{cy}", 0.35, 5.0, (cx, cy, 2.5), vertices=6, mat=m_wood_dark)
    all_objects.append(corner_log)

roof_eaves = create_box("Ranger_RoofDeck", (12.2, 9.0, 0.4), (-5.0, 4.0, 5.2), mat=m_roof_green)
roof_ridge = create_box("Ranger_RoofRidge", (12.4, 1.2, 1.1), (-5.0, 4.0, 5.7), rot=(0.4, 0, 0), mat=m_roof_green)
roof_patch = create_box("Ranger_RoofRustPatch", (3.2, 4.0, 0.08), (-3.5, 4.8, 5.45), rot=(0.1, 0, 0.2), mat=m_metal_rust)
dormer_walls = create_box("Ranger_DormerWalls", (3.2, 2.8, 1.8), (-5.0, 1.8, 5.8), mat=m_wood_plank)
dormer_roof = create_box("Ranger_DormerRoof", (3.6, 3.2, 0.3), (-5.0, 1.8, 6.8), rot=(0.2, 0, 0), mat=m_roof_green)
dormer_window = create_box("Ranger_DormerWindow", (2.4, 0.2, 1.2), (-5.0, 0.3, 5.8), mat=m_glass_dark)
all_objects.extend([cabin_stone, cabin_walls, roof_eaves, roof_ridge, roof_patch, dormer_walls, dormer_roof, dormer_window])

porch_deck = create_box("Ranger_PorchDeck", (7.5, 2.8, 0.35), (-4.5, -0.8, 1.05), mat=m_wood_deck)
porch_steps = create_box("Ranger_PorchSteps", (4.0, 1.6, 0.3), (-4.5, -2.6, 0.6), mat=m_wood_deck)
porch_rail = create_box("Ranger_PorchRail", (7.6, 0.15, 0.9), (-4.5, -2.15, 1.6), mat=m_wood_dark)
for px in [-7.8, -1.2]:
    p_post = create_cylinder(f"Ranger_PorchPost_{px}", 0.18, 2.8, (px, -2.0, 2.4), vertices=6, mat=m_wood_dark)
    all_objects.append(p_post)
all_objects.extend([porch_deck, porch_steps, porch_rail])

# Front Entrance Door & Warm Lantern (Bloom Element)
door_frame = create_box("Ranger_DoorFrame", (1.6, 0.2, 2.6), (-4.5, 0.05, 2.5), mat=m_wood_dark)
door_mesh = create_box("Ranger_DoorLeaf", (1.3, 0.1, 2.4), (-4.5, 0.08, 2.4), mat=m_wood_plank)
lantern_mount = create_box("Ranger_LanternMount", (0.1, 0.3, 0.1), (-3.4, -0.05, 3.2), mat=m_metal_dark)
lantern_light = create_cylinder("Ranger_PorchLantern", 0.2, 0.38, (-3.4, -0.2, 3.1), vertices=6, mat=m_lamp_warm)
all_objects.extend([door_frame, door_mesh, lantern_mount, lantern_light])

for wx in [-7.5, -1.5]:
    win_f = create_box(f"Ranger_WinFrame_{wx}", (1.8, 0.2, 1.8), (wx, 0.05, 2.8), mat=m_wood_dark)
    win_g = create_box(f"Ranger_WinGlass_{wx}", (1.5, 0.08, 1.5), (wx, 0.08, 2.8), mat=m_glass_dark)
    win_shutter = create_box(f"Ranger_Shutter_{wx}", (0.7, 0.08, 1.6), (wx - 0.9, -0.05, 2.8), rot=(0, 0, 0.3), mat=m_wood_plank)
    all_objects.extend([win_f, win_g, win_shutter])


# =========================================================================
# 3. TALL DAMAGED RADIO MAST (Major Landmark Silhouette: X = 5.5, Y = 6.5)
# =========================================================================
mast_base = create_box("RadioMast_ConcreteBase", (2.4, 2.4, 0.8), (5.5, 6.5, 0.4), mat=m_stone_base)
all_objects.append(mast_base)

mast_height = 13.5
mast_leg_coords = [(-0.9, -0.9), (0.9, -0.9), (-0.9, 0.9), (0.9, 0.9)]
for lx, ly in mast_leg_coords:
    m_leg = create_cylinder(f"RadioMast_Leg_{lx}_{ly}", 0.09, mast_height, (5.5 + lx * 0.7, 6.5 + ly * 0.7, 7.5), vertices=4, mat=m_metal_dark)
    all_objects.append(m_leg)

for tz in range(2, 13, 2):
    b_x = create_box(f"Mast_Brace_{tz}", (1.8, 1.8, 0.08), (5.5, 6.5, tz), mat=m_metal_rust)
    all_objects.append(b_x)

top_mast = create_cylinder("RadioMast_TopPole", 0.07, 4.5, (5.8, 6.8, 15.0), rot=(0.14, 0.12, 0.2), vertices=4, mat=m_metal_dark)
dish_mount = create_cylinder("RadioMast_DishMount", 0.08, 1.0, (5.6, 6.2, 13.2), rot=(0.5, 0.8, 0), vertices=4, mat=m_metal_dark)
comm_dish = create_cylinder("RadioMast_CommDish", 0.95, 0.2, (5.6, 5.8, 13.5), rot=(1.2, 0.4, -0.5), vertices=8, mat=m_roof_green)
beacon_lamp = create_cylinder("RadioMast_BeaconRed", 0.2, 0.35, (6.1, 7.1, 17.2), vertices=8, mat=m_beacon_red)
all_objects.extend([top_mast, dish_mount, comm_dish, beacon_lamp])

# Power / antenna cables running from mast into cabin roof
cable_wire1 = create_cylinder("Mast_Cable_1", 0.03, 6.5, (0.5, 5.2, 6.2), rot=(0.3, 0.8, 1.1), vertices=4, mat=m_metal_dark)
cable_wire2 = create_cylinder("Mast_Cable_2", 0.03, 7.2, (-1.5, 6.0, 5.5), rot=(-0.2, 0.9, 0.8), vertices=4, mat=m_metal_dark)
all_objects.extend([cable_wire1, cable_wire2])


# =========================================================================
# 4. HERO ENTRANCE GATE & 3D "THE RELAY" BLOCK SIGNBOARD
# Facing incoming road and isometric camera
# =========================================================================
# Heavy Log Gate Posts
gate_post_L = create_cylinder("Gate_Post_Left", 0.42, 5.2, (-3.6, -9.2, 2.6), vertices=6, mat=m_wood_dark)
gate_post_R = create_cylinder("Gate_Post_Right", 0.42, 5.2, (3.8, -9.6, 2.6), vertices=6, mat=m_wood_dark)
gate_arch = create_box("Gate_ArchBeam", (8.2, 0.45, 0.5), (0.1, -9.4, 4.8), rot=(0, 0, -0.05), mat=m_wood_dark)
all_objects.extend([gate_post_L, gate_post_R, gate_arch])

# HERO SIGNBOARD: "THE RELAY" (Bold 3D Lettering, High Contrast)
sign_board_main = create_box("Hero_Sign_Board", (8.6, 0.35, 1.6), (0.1, -9.65, 5.8), rot=(0.08, 0, -0.04), mat=m_wood_dark)
sign_board_trim = create_box("Hero_Sign_Trim", (8.8, 0.25, 1.7), (0.1, -9.6, 5.8), rot=(0.08, 0, -0.04), mat=m_canvas_orange)
all_objects.extend([sign_board_main, sign_board_trim])

# 3D Block Letters: T - H - E &nbsp; R - E - L - A - Y
# Word "THE"
letters_the = [('T', -2.8), ('H', -2.0), ('E', -1.2)]
for ch, lx in letters_the:
    l_objs = create_3d_letter(ch, (lx, -9.88, 5.85), (0.6, 0.85), 0.12, m_sign_yellow)
    all_objects.extend(l_objs)

# Word "RELAY"
letters_relay = [('R', 0.2), ('E', 1.0), ('L', 1.8), ('A', 2.6), ('Y', 3.4)]
for ch, lx in letters_relay:
    l_objs = create_3d_letter(ch, (lx, -9.88, 5.85), (0.6, 0.85), 0.12, m_sign_yellow)
    all_objects.extend(l_objs)

# 2 Warm Amber Hurricane Lanterns flanking gate sign (Bloom Elements)
gate_lamp_L = create_cylinder("Gate_Lantern_L", 0.22, 0.42, (-3.2, -9.7, 4.6), vertices=6, mat=m_lamp_warm)
gate_lamp_R = create_cylinder("Gate_Lantern_R", 0.22, 0.42, (3.4, -9.9, 4.6), vertices=6, mat=m_lamp_warm)
all_objects.extend([gate_lamp_L, gate_lamp_R])


# =========================================================================
# 5. LOOKOUT WATCHTOWER / PLATFORM (Gate Corner: X = 5.5, Y = -8.5)
# =========================================================================
for lk_x, lk_y in [(4.2, -9.8), (6.8, -9.8), (4.2, -7.2), (6.8, -7.2)]:
    lk_post = create_cylinder(f"Lookout_Post_{lk_x}_{lk_y}", 0.18, 5.2, (lk_x, lk_y, 2.6), vertices=6, mat=m_wood_dark)
    all_objects.append(lk_post)

lookout_floor = create_box("Lookout_Floor", (3.0, 3.0, 0.25), (5.5, -8.5, 4.2), mat=m_wood_deck)
lookout_rail = create_box("Lookout_Railing", (2.9, 2.9, 0.9), (5.5, -8.5, 4.75), mat=m_wood_dark)
lookout_canvas = create_box("Lookout_CanopyCanvas", (3.2, 3.2, 0.12), (5.5, -8.5, 6.2), rot=(-0.1, 0, 0.05), mat=m_canvas_orange)
lookout_spotlight = create_cylinder("Lookout_Spotlight", 0.25, 0.4, (4.3, -9.6, 4.6), rot=(0.6, 0.4, 0), vertices=6, mat=m_lamp_warm)
all_objects.extend([lookout_floor, lookout_rail, lookout_canvas, lookout_spotlight])


# =========================================================================
# 6. FORTIFIED WALLS WITH ASYMMETRIC BREACH & HANGING TARP
# =========================================================================
wall_segments = [
    # West wall (X = -12.5)
    {"x": -12.5, "y": 2.0, "len": 6.5, "rot": 1.57, "mat": m_wood_dark},
    {"x": -12.5, "y": -4.0, "len": 5.5, "rot": 1.57, "mat": m_wood_dark},
    # North-West Damaged / Breached Wall Section (Repaired with crooked metal sheet & planks)
    {"x": -12.2, "y": 7.5, "len": 4.5, "rot": 1.7, "mat": m_metal_rust},
    # North rear wall (Y = +11.5)
    {"x": -6.5, "y": 11.5, "len": 9.5, "rot": 0.0, "mat": m_wood_dark},
    {"x": 3.5, "y": 11.5, "len": 9.5, "rot": 0.0, "mat": m_metal_corrugated},
    # East wall (X = +9.5)
    {"x": 9.5, "y": 8.0, "len": 6.0, "rot": 1.57, "mat": m_wood_dark},
    {"x": 9.5, "y": 2.0, "len": 6.0, "rot": 1.57, "mat": m_metal_corrugated},
    # Front wings
    {"x": -7.5, "y": -9.0, "len": 7.0, "rot": -0.15, "mat": m_wood_dark},
    {"x": 6.8, "y": -9.5, "len": 5.5, "rot": 0.2, "mat": m_metal_corrugated},
]
for w_idx, ws in enumerate(wall_segments):
    wall_mesh = create_box(f"Palisade_Wall_{w_idx}", (ws["len"], 0.4, 2.8), (ws["x"], ws["y"], 1.4), rot=(0, 0, ws["rot"]), mat=ws["mat"])
    all_objects.append(wall_mesh)

# Draped blue survivor tarp hanging over west wall
tarp_mesh = create_box("Hanging_Tarp_Blue", (3.2, 0.15, 2.2), (-12.6, 2.5, 1.8), rot=(0.05, 0, 1.57), mat=m_canvas_blue)
all_objects.append(tarp_mesh)

# Recycled Highway Armor Signs
sign1 = create_box("Armor_InterstateShield", (1.4, 0.08, 1.4), (-12.7, 4.0, 1.8), rot=(0, 1.57, 0), mat=m_sign_green)
sign2 = create_box("Armor_YieldYellow", (1.3, 0.08, 1.3), (-6.5, -9.25, 1.6), rot=(0, -0.15, 0.78), mat=m_sign_yellow)
sign3 = create_box("Armor_StopRed", (1.2, 0.08, 1.2), (9.7, 5.0, 1.7), rot=(0, 1.57, 0.4), mat=m_sign_red)
all_objects.extend([sign1, sign2, sign3])


# =========================================================================
# 7. WORKBENCH ZONE (Sheltered Lean-To: X = 7.0, Y = 0.5)
# =========================================================================
wb_canopy = create_box("Workbench_RoofLeanTo", (4.0, 3.2, 0.15), (7.0, 0.5, 3.4), rot=(0, -0.3, 0), mat=m_metal_corrugated)
for wbp_y in [-0.8, 1.8]:
    wbp = create_cylinder(f"Workbench_Post_{wbp_y}", 0.14, 3.2, (5.2, wbp_y, 1.6), vertices=5, mat=m_wood_dark)
    all_objects.append(wbp)

wb_table = create_box("Workbench_Table", (2.4, 1.1, 0.9), (7.2, 0.5, 0.45), mat=m_wood_deck)
wb_vise = create_box("Workbench_Vise", (0.35, 0.35, 0.3), (6.2, 0.8, 1.05), mat=m_metal_dark)
wb_toolbox = create_box("Workbench_Toolbox", (0.7, 0.4, 0.35), (7.6, 0.3, 1.08), mat=m_metal_rust)
wb_lamp = create_cylinder("Workbench_HangingLamp", 0.18, 0.32, (7.0, 0.5, 2.6), vertices=6, mat=m_lamp_warm)
# Scattered scrap timber planks and metal pipes
scrap_pipe = create_cylinder("Scrap_Pipe", 0.08, 1.8, (5.8, -0.2, 0.08), rot=(0, 1.57, 0.4), vertices=5, mat=m_metal_rust)
scrap_plank = create_box("Scrap_Plank", (1.6, 0.25, 0.08), (6.0, 1.4, 0.08), rot=(0, 0, 0.2), mat=m_wood_plank)
all_objects.extend([wb_canopy, wb_table, wb_vise, wb_toolbox, wb_lamp, scrap_pipe, scrap_plank])


# =========================================================================
# 8. DIESEL GENERATOR UNIT (West Wall: X = -9.5, Y = 6.5)
# =========================================================================
gen_skid = create_box("Gen_WoodSkid", (2.6, 1.8, 0.25), (-9.5, 6.5, 0.15), mat=m_wood_dark)
gen_housing = create_box("Gen_Housing", (2.2, 1.4, 1.4), (-9.5, 6.5, 0.95), mat=m_metal_rust)
gen_control = create_box("Gen_ControlPanel", (0.7, 0.1, 0.6), (-9.5, 5.75, 1.1), mat=m_metal_dark)
gen_exhaust = create_cylinder("Gen_ExhaustPipe", 0.1, 1.8, (-8.7, 6.8, 1.8), rot=(0.1, 0, 0.2), vertices=6, mat=m_metal_dark)
gen_dial = create_cylinder("Gen_StatusGlow", 0.14, 0.08, (-9.5, 5.68, 1.2), rot=(1.57, 0, 0), vertices=6, mat=m_lamp_warm)
gen_lamp = create_cylinder("Gen_WorkLight", 0.16, 0.26, (-8.2, 5.8, 1.6), vertices=6, mat=m_lamp_warm)
all_objects.extend([gen_skid, gen_housing, gen_control, gen_exhaust, gen_dial, gen_lamp])


# =========================================================================
# 9. CAMPFIRE ZONE & SURVIVOR SEATING (Courtyard: X = 0.5, Y = -2.0)
# =========================================================================
fire_stone_ring = create_cylinder("Campfire_StoneRing", 1.3, 0.3, (0.5, -2.0, 0.15), vertices=8, mat=m_stone_base)
fire_pit_dark = create_cylinder("Campfire_AshBed", 1.0, 0.1, (0.5, -2.0, 0.22), vertices=8, mat=m_metal_dark)
fire_embers = create_cylinder("Campfire_EmbersGlow", 0.8, 0.28, (0.5, -2.0, 0.35), vertices=7, mat=m_fire_glow)
log1 = create_cylinder("Campfire_Log1", 0.14, 1.6, (0.5, -2.0, 0.4), rot=(0.3, 0.5, 0.7), vertices=5, mat=m_wood_dark)
log2 = create_cylinder("Campfire_Log2", 0.14, 1.5, (0.5, -2.0, 0.4), rot=(-0.4, 0.6, -0.5), vertices=5, mat=m_wood_dark)
spit_post_L = create_cylinder("Campfire_SpitL", 0.06, 1.4, (-0.4, -2.0, 0.7), vertices=4, mat=m_metal_dark)
spit_post_R = create_cylinder("Campfire_SpitR", 0.06, 1.4, (1.4, -2.0, 0.7), vertices=4, mat=m_metal_dark)
spit_bar = create_cylinder("Campfire_SpitBar", 0.04, 2.0, (0.5, -2.0, 1.3), rot=(0, 0, 1.57), vertices=4, mat=m_metal_dark)
spit_pot = create_cylinder("Campfire_Pot", 0.25, 0.35, (0.5, -2.0, 0.85), vertices=6, mat=m_metal_dark)
bench_N = create_box("Campfire_BenchN", (2.2, 0.5, 0.4), (0.5, -0.6, 0.2), rot=(0, 0, 0.05), mat=m_wood_dark)
bench_W = create_box("Campfire_BenchW", (0.5, 1.8, 0.4), (-1.0, -2.2, 0.2), rot=(0, 0, 0.1), mat=m_wood_dark)
bench_S = create_box("Campfire_BenchS", (1.8, 0.5, 0.4), (0.7, -3.5, 0.2), rot=(0, 0, -0.08), mat=m_wood_dark)
all_objects.extend([fire_stone_ring, fire_pit_dark, fire_embers, log1, log2, spit_post_L, spit_post_R, spit_bar, spit_pot, bench_N, bench_W, bench_S])


# =========================================================================
# 10. WATER TOWER & ROOFTOP SOLAR PANELS
# =========================================================================
for st_x, st_y in [(-11.5, -3.5), (-9.5, -3.5), (-11.5, -1.5), (-9.5, -1.5)]:
    stilt = create_cylinder(f"Water_Stilt_{st_x}_{st_y}", 0.18, 4.5, (st_x, st_y, 2.25), vertices=6, mat=m_wood_dark)
    all_objects.append(stilt)

water_tank_deck = create_box("Water_TankDeck", (2.8, 2.8, 0.25), (-10.5, -2.5, 4.5), mat=m_wood_deck)
water_tank_drum = create_cylinder("Water_TankCistern", 1.25, 2.4, (-10.5, -2.5, 5.8), vertices=10, mat=m_metal_corrugated)
water_tank_roof = create_cylinder("Water_TankRoof", 1.35, 0.4, (-10.5, -2.5, 7.1), vertices=10, mat=m_roof_green)
water_pipe = create_cylinder("Water_DrainPipe", 0.08, 4.2, (-9.4, -2.5, 2.2), vertices=4, mat=m_metal_rust)
all_objects.extend([water_tank_deck, water_tank_drum, water_tank_roof, water_pipe])

for s_idx in range(3):
    s_x = -7.5 + s_idx * 1.8
    s_frame = create_box(f"Solar_Frame_{s_idx}", (1.5, 1.8, 0.1), (s_x, 5.8, 5.9), rot=(-0.4, 0, 0), mat=m_metal_dark)
    s_panel = create_box(f"Solar_Cell_{s_idx}", (1.35, 1.65, 0.06), (s_x, 5.8, 5.95), rot=(-0.4, 0, 0), mat=m_canvas_blue)
    all_objects.extend([s_frame, s_panel])


# =========================================================================
# 11. SUPPLY CRATES & BARRELS
# =========================================================================
crate_data = [
    {"name": "Supply_Crate_1", "size": (1.1, 1.1, 1.0), "loc": (3.5, 2.5, 0.5), "rot": (0, 0, 0.2), "mat": m_crate_military},
    {"name": "Supply_Crate_2", "size": (1.0, 1.0, 0.9), "loc": (3.5, 2.5, 1.4), "rot": (0, 0, -0.15), "mat": m_crate_military},
    {"name": "Supply_Crate_3", "size": (1.2, 0.8, 0.7), "loc": (4.8, 2.2, 0.35), "rot": (0, 0, 0.4), "mat": m_wood_plank},
    {"name": "Supply_Medical", "size": (0.8, 0.6, 0.5), "loc": (7.5, -2.5, 0.25), "rot": (0, 0, -0.2), "mat": m_canvas_sand},
]
for cd in crate_data:
    c_mesh = create_box(cd["name"], cd["size"], cd["loc"], cd["rot"], mat=cd["mat"])
    all_objects.append(c_mesh)

barrel_data = [
    {"name": "Fuel_Barrel_Red", "loc": (-8.0, 6.0, 0.65), "mat": m_barrel_fuel},
    {"name": "Water_Barrel_Blue", "loc": (-8.5, -1.0, 0.65), "mat": m_barrel_water},
    {"name": "Fuel_Barrel_Overturned", "loc": (3.2, 3.8, 0.45), "rot": (1.57, 0, 0.6), "mat": m_barrel_fuel},
]
for bd in barrel_data:
    b_mesh = create_cylinder(bd["name"], 0.42, 1.25, bd["loc"], rot=bd.get("rot", (0,0,0)), vertices=8, mat=bd["mat"])
    all_objects.append(b_mesh)


# =========================================================================
# 12. NAMED GAMEPLAY SOCKETS
# =========================================================================
sockets = [
    create_socket("SOCKET_MAIN_DOOR", (-4.5, -0.4, 1.1), (0, 0, 0)),
    create_socket("SOCKET_WORKBENCH", (6.0, 0.5, 0.1), (0, 0, 1.57)),
    create_socket("SOCKET_GENERATOR", (-8.2, 6.5, 0.1), (0, 0, -1.57)),
    create_socket("SOCKET_NPC_1", (0.5, -0.2, 0.2), (0, 0, 3.14)),
    create_socket("SOCKET_NPC_2", (-1.2, -2.2, 0.2), (0, 0, 1.57)),
    create_socket("SOCKET_PLAYER_SPAWN", (0.5, -5.5, 0.1), (0, 0, 0)),
]
all_objects.extend(sockets)

# Select all objects and export
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "relay_hub.glb")

print(f"Exporting {len(all_objects)} objects to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("Polished 'THE RELAY' exported successfully!")
