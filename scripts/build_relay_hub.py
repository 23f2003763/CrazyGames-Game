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
m_canvas_sand = create_material("Mat_CanvasSand", (0.82, 0.76, 0.58, 1.0), roughness=0.92)
m_canvas_orange = create_material("Mat_CanvasOrange", (0.92, 0.46, 0.12, 1.0), roughness=0.9)
m_canvas_blue = create_material("Mat_CanvasBlue", (0.18, 0.44, 0.68, 1.0), roughness=0.9)  # Draped tarp
m_fire_glow = create_material("Mat_FireGlow", (0.98, 0.52, 0.06, 1.0), roughness=0.3, emission=(0.98, 0.52, 0.06, 1.0), emission_strength=2.8)
m_lamp_warm = create_material("Mat_LampWarm", (0.98, 0.82, 0.24, 1.0), roughness=0.3, emission=(0.98, 0.82, 0.24, 1.0), emission_strength=2.5)
m_beacon_red = create_material("Mat_BeaconRed", (0.98, 0.12, 0.08, 1.0), roughness=0.3, emission=(0.98, 0.12, 0.08, 1.0), emission_strength=3.0)
m_sign_yellow = create_material("Mat_SignYellow", (0.98, 0.86, 0.10, 1.0), roughness=0.3, emission=(0.98, 0.86, 0.10, 1.0), emission_strength=1.5)
m_sign_red = create_material("Mat_SignRed", (0.88, 0.18, 0.14, 1.0), roughness=0.45)
m_sign_green = create_material("Mat_SignGreen", (0.12, 0.50, 0.26, 1.0), roughness=0.5)
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

print("Building properly proportioned 'THE RELAY' Starting Survivor Hub...")

all_objects = []

# =========================================================================
# 1. RANGER STATION CABIN (Proper human-scale: 8.2m wide, 6.0m deep, 3.4m height)
# =========================================================================
cabin_stone = create_box("Ranger_StoneBase", (8.6, 6.4, 0.6), (-3.8, 3.6, 0.3), mat=m_stone_base)
cabin_walls = create_box("Ranger_TimberWalls", (8.2, 6.0, 2.6), (-3.8, 3.6, 1.9), mat=m_wood_plank)

for cx, cy in [(-7.8, 0.7), (0.2, 0.7), (-7.8, 6.5), (0.2, 6.5)]:
    corner_log = create_cylinder(f"Ranger_LogCorner_{cx}_{cy}", 0.25, 3.4, (cx, cy, 1.7), vertices=6, mat=m_wood_dark)
    all_objects.append(corner_log)

roof_eaves = create_box("Ranger_RoofDeck", (9.2, 6.8, 0.25), (-3.8, 3.6, 3.3), mat=m_roof_green)
roof_ridge = create_box("Ranger_RoofRidge", (9.4, 0.8, 0.8), (-3.8, 3.6, 3.8), rot=(0.4, 0, 0), mat=m_roof_green)
roof_patch = create_box("Ranger_RoofRustPatch", (2.4, 3.0, 0.06), (-2.6, 4.2, 3.5), rot=(0.1, 0, 0.2), mat=m_metal_rust)
all_objects.extend([cabin_stone, cabin_walls, roof_eaves, roof_ridge, roof_patch])

# Porch
porch_deck = create_box("Ranger_PorchDeck", (5.2, 1.8, 0.25), (-3.4, 0.0, 0.45), mat=m_wood_deck)
porch_steps = create_box("Ranger_PorchSteps", (2.8, 1.0, 0.2), (-3.4, -1.2, 0.2), mat=m_wood_deck)
porch_rail = create_box("Ranger_PorchRail", (5.2, 0.12, 0.8), (-3.4, -0.85, 0.95), mat=m_wood_dark)
for px in [-5.8, -1.0]:
    p_post = create_cylinder(f"Ranger_PorchPost_{px}", 0.14, 2.2, (px, -0.8, 1.4), vertices=6, mat=m_wood_dark)
    all_objects.append(p_post)
all_objects.extend([porch_deck, porch_steps, porch_rail])

# Front Entrance Door (Door height 2.5m - 1.2x Ryder)
door_frame = create_box("Ranger_DoorFrame", (1.4, 0.15, 2.5), (-3.4, 0.62, 1.85), mat=m_wood_dark)
door_mesh = create_box("Ranger_DoorLeaf", (1.1, 0.08, 2.3), (-3.4, 0.65, 1.75), mat=m_wood_plank)
lantern_mount = create_box("Ranger_LanternMount", (0.08, 0.25, 0.08), (-2.5, 0.55, 2.4), mat=m_metal_dark)
lantern_light = create_cylinder("Ranger_PorchLantern", 0.15, 0.3, (-2.5, 0.4, 2.3), vertices=6, mat=m_lamp_warm)
all_objects.extend([door_frame, door_mesh, lantern_mount, lantern_light])

# Windows
for wx in [-5.8, -1.2]:
    win_f = create_box(f"Ranger_WinFrame_{wx}", (1.4, 0.15, 1.4), (wx, 0.62, 2.0), mat=m_wood_dark)
    win_g = create_box(f"Ranger_WinGlass_{wx}", (1.2, 0.06, 1.2), (wx, 0.65, 2.0), mat=m_glass_dark)
    all_objects.extend([win_f, win_g])

# =========================================================================
# 2. RADIO MAST (Distinct landmark silhouette, 10m height)
# =========================================================================
mast_base = create_box("RadioMast_ConcreteBase", (1.8, 1.8, 0.5), (4.5, 4.5, 0.25), mat=m_stone_base)
all_objects.append(mast_base)

mast_height = 9.0
mast_leg_coords = [(-0.6, -0.6), (0.6, -0.6), (-0.6, 0.6), (0.6, 0.6)]
for lx, ly in mast_leg_coords:
    m_leg = create_cylinder(f"RadioMast_Leg_{lx}_{ly}", 0.06, mast_height, (4.5 + lx * 0.6, 4.5 + ly * 0.6, 5.0), vertices=4, mat=m_metal_dark)
    all_objects.append(m_leg)

for tz in [2.0, 4.0, 6.0, 8.0]:
    b_x = create_box(f"Mast_Brace_{tz}", (1.3, 1.3, 0.06), (4.5, 4.5, tz), mat=m_metal_rust)
    all_objects.append(b_x)

top_mast = create_cylinder("RadioMast_TopPole", 0.05, 3.0, (4.7, 4.7, 10.5), rot=(0.1, 0.08, 0.15), vertices=4, mat=m_metal_dark)
comm_dish = create_cylinder("RadioMast_CommDish", 0.7, 0.15, (4.6, 4.1, 9.2), rot=(1.2, 0.4, -0.5), vertices=8, mat=m_roof_green)
beacon_lamp = create_cylinder("RadioMast_BeaconRed", 0.15, 0.25, (4.9, 4.9, 12.0), vertices=8, mat=m_beacon_red)
all_objects.extend([top_mast, comm_dish, beacon_lamp])

# =========================================================================
# 3. HERO ENTRANCE GATE & PROPORTIONATE "THE RELAY" SIGNBOARD
# Gate opening: 4.4m wide (fits 3-4 players side-by-side)
# =========================================================================
gate_post_L = create_cylinder("Gate_Post_Left", 0.3, 4.0, (-2.4, -7.5, 2.0), vertices=6, mat=m_wood_dark)
gate_post_R = create_cylinder("Gate_Post_Right", 0.3, 4.0, (2.4, -7.5, 2.0), vertices=6, mat=m_wood_dark)
gate_arch = create_box("Gate_ArchBeam", (5.4, 0.35, 0.35), (0.0, -7.5, 3.7), rot=(0, 0, 0), mat=m_wood_dark)
all_objects.extend([gate_post_L, gate_post_R, gate_arch])

# Signboard: Tasteful, elevated, does NOT obstruct camera view of the player
sign_board_main = create_box("Hero_Sign_Board", (4.8, 0.2, 0.9), (0.0, -7.65, 4.3), mat=m_wood_dark)
sign_board_trim = create_box("Hero_Sign_Trim", (4.9, 0.15, 0.95), (0.0, -7.62, 4.3), mat=m_canvas_orange)
all_objects.extend([sign_board_main, sign_board_trim])

# 3D Lettering scaled neatly
letters_the = [('T', -1.7), ('H', -1.2), ('E', -0.7)]
for ch, lx in letters_the:
    l_objs = create_3d_letter(ch, (lx, -7.78, 4.3), (0.35, 0.5), 0.08, m_sign_yellow)
    all_objects.extend(l_objs)

letters_relay = [('R', 0.1), ('E', 0.55), ('L', 1.0), ('A', 1.45), ('Y', 1.9)]
for ch, lx in letters_relay:
    l_objs = create_3d_letter(ch, (lx, -7.78, 4.3), (0.35, 0.5), 0.08, m_sign_yellow)
    all_objects.extend(l_objs)

gate_lamp_L = create_cylinder("Gate_Lantern_L", 0.16, 0.3, (-2.1, -7.7, 3.4), vertices=6, mat=m_lamp_warm)
gate_lamp_R = create_cylinder("Gate_Lantern_R", 0.16, 0.3, (2.1, -7.7, 3.4), vertices=6, mat=m_lamp_warm)
all_objects.extend([gate_lamp_L, gate_lamp_R])

# =========================================================================
# 4. LOOKOUT WATCHTOWER (Gate Corner: X = 4.2, Y = -7.0)
# =========================================================================
for lk_x, lk_y in [(3.2, -8.0), (5.2, -8.0), (3.2, -6.0), (5.2, -6.0)]:
    lk_post = create_cylinder(f"Lookout_Post_{lk_x}_{lk_y}", 0.14, 3.8, (lk_x, lk_y, 1.9), vertices=6, mat=m_wood_dark)
    all_objects.append(lk_post)

lookout_floor = create_box("Lookout_Floor", (2.4, 2.4, 0.2), (4.2, -7.0, 3.0), mat=m_wood_deck)
lookout_rail = create_box("Lookout_Railing", (2.3, 2.3, 0.7), (4.2, -7.0, 3.45), mat=m_wood_dark)
lookout_canvas = create_box("Lookout_CanopyCanvas", (2.6, 2.6, 0.1), (4.2, -7.0, 4.6), rot=(-0.08, 0, 0.05), mat=m_canvas_orange)
lookout_spotlight = create_cylinder("Lookout_Spotlight", 0.18, 0.3, (3.3, -7.8, 3.3), rot=(0.6, 0.4, 0), vertices=6, mat=m_lamp_warm)
all_objects.extend([lookout_floor, lookout_rail, lookout_canvas, lookout_spotlight])

# =========================================================================
# 5. PERIMETER PALISADE WALLS (Height 2.0m - chest/head level)
# =========================================================================
wall_segments = [
    {"x": -9.5, "y": 1.5, "len": 5.5, "rot": 1.57, "mat": m_wood_dark},
    {"x": -9.5, "y": -3.5, "len": 4.5, "rot": 1.57, "mat": m_wood_dark},
    {"x": -9.2, "y": 5.5, "len": 3.5, "rot": 1.7, "mat": m_metal_rust},
    {"x": -4.8, "y": 8.0, "len": 8.0, "rot": 0.0, "mat": m_wood_dark},
    {"x": 3.2, "y": 8.0, "len": 7.5, "rot": 0.0, "mat": m_metal_corrugated},
    {"x": 7.5, "y": 5.0, "len": 5.5, "rot": 1.57, "mat": m_wood_dark},
    {"x": 7.5, "y": 0.0, "len": 5.5, "rot": 1.57, "mat": m_metal_corrugated},
    {"x": -5.8, "y": -7.5, "len": 5.5, "rot": 0.0, "mat": m_wood_dark},
    {"x": 5.6, "y": -7.5, "len": 4.5, "rot": 0.0, "mat": m_metal_corrugated},
]
for w_idx, ws in enumerate(wall_segments):
    wall_mesh = create_box(f"Palisade_Wall_{w_idx}", (ws["len"], 0.3, 2.0), (ws["x"], ws["y"], 1.0), rot=(0, 0, ws["rot"]), mat=ws["mat"])
    all_objects.append(wall_mesh)

tarp_mesh = create_box("Hanging_Tarp_Blue", (2.4, 0.1, 1.6), (-9.6, 2.0, 1.3), rot=(0.05, 0, 1.57), mat=m_canvas_blue)
all_objects.append(tarp_mesh)

# =========================================================================
# 6. OPEN COURTYARD FEATURES (Campfire, Seating, Workbench, Generator)
# =========================================================================
# Campfire
fire_stone_ring = create_cylinder("Campfire_StoneRing", 0.9, 0.22, (0.0, -1.5, 0.11), vertices=8, mat=m_stone_base)
fire_pit_dark = create_cylinder("Campfire_AshBed", 0.7, 0.08, (0.0, -1.5, 0.16), vertices=8, mat=m_metal_dark)
fire_embers = create_cylinder("Campfire_EmbersGlow", 0.55, 0.2, (0.0, -1.5, 0.25), vertices=7, mat=m_fire_glow)
log1 = create_cylinder("Campfire_Log1", 0.1, 1.2, (0.0, -1.5, 0.28), rot=(0.3, 0.5, 0.7), vertices=5, mat=m_wood_dark)
log2 = create_cylinder("Campfire_Log2", 0.1, 1.1, (0.0, -1.5, 0.28), rot=(-0.4, 0.6, -0.5), vertices=5, mat=m_wood_dark)
spit_post_L = create_cylinder("Campfire_SpitL", 0.04, 1.0, (-0.6, -1.5, 0.5), vertices=4, mat=m_metal_dark)
spit_post_R = create_cylinder("Campfire_SpitR", 0.04, 1.0, (0.6, -1.5, 0.5), vertices=4, mat=m_metal_dark)
spit_bar = create_cylinder("Campfire_SpitBar", 0.03, 1.4, (0.0, -1.5, 0.95), rot=(0, 0, 1.57), vertices=4, mat=m_metal_dark)
spit_pot = create_cylinder("Campfire_Pot", 0.18, 0.25, (0.0, -1.5, 0.65), vertices=6, mat=m_metal_dark)
bench_N = create_box("Campfire_BenchN", (1.6, 0.4, 0.35), (0.0, -0.5, 0.18), mat=m_wood_dark)
bench_W = create_box("Campfire_BenchW", (0.4, 1.4, 0.35), (-1.1, -1.6, 0.18), mat=m_wood_dark)
bench_S = create_box("Campfire_BenchS", (1.4, 0.4, 0.35), (0.2, -2.5, 0.18), mat=m_wood_dark)
all_objects.extend([fire_stone_ring, fire_pit_dark, fire_embers, log1, log2, spit_post_L, spit_post_R, spit_bar, spit_pot, bench_N, bench_W, bench_S])

# Workbench Zone
wb_canopy = create_box("Workbench_RoofLeanTo", (3.0, 2.4, 0.12), (5.5, 0.5, 2.5), rot=(0, -0.25, 0), mat=m_metal_corrugated)
for wbp_y in [-0.5, 1.5]:
    wbp = create_cylinder(f"Workbench_Post_{wbp_y}", 0.1, 2.4, (4.2, wbp_y, 1.2), vertices=5, mat=m_wood_dark)
    all_objects.append(wbp)
wb_table = create_box("Workbench_Table", (1.8, 0.8, 0.75), (5.6, 0.5, 0.38), mat=m_wood_deck)
wb_vise = create_box("Workbench_Vise", (0.25, 0.25, 0.22), (4.9, 0.7, 0.85), mat=m_metal_dark)
wb_toolbox = create_box("Workbench_Toolbox", (0.55, 0.3, 0.26), (5.9, 0.3, 0.88), mat=m_metal_rust)
wb_lamp = create_cylinder("Workbench_HangingLamp", 0.14, 0.24, (5.5, 0.5, 2.0), vertices=6, mat=m_lamp_warm)
all_objects.extend([wb_canopy, wb_table, wb_vise, wb_toolbox, wb_lamp])

# Diesel Generator
gen_skid = create_box("Gen_WoodSkid", (2.0, 1.4, 0.2), (-7.5, 5.0, 0.1), mat=m_wood_dark)
gen_housing = create_box("Gen_Housing", (1.7, 1.1, 1.0), (-7.5, 5.0, 0.7), mat=m_metal_rust)
gen_exhaust = create_cylinder("Gen_ExhaustPipe", 0.08, 1.3, (-6.9, 5.2, 1.4), rot=(0.1, 0, 0.2), vertices=6, mat=m_metal_dark)
gen_lamp = create_cylinder("Gen_WorkLight", 0.12, 0.2, (-6.5, 4.5, 1.2), vertices=6, mat=m_lamp_warm)
all_objects.extend([gen_skid, gen_housing, gen_exhaust, gen_lamp])

# Water Cistern
for st_x, st_y in [(-8.5, -2.8), (-7.0, -2.8), (-8.5, -1.3), (-7.0, -1.3)]:
    stilt = create_cylinder(f"Water_Stilt_{st_x}_{st_y}", 0.14, 3.4, (st_x, st_y, 1.7), vertices=6, mat=m_wood_dark)
    all_objects.append(stilt)
water_tank_drum = create_cylinder("Water_TankCistern", 0.95, 1.8, (-7.75, -2.05, 4.0), vertices=10, mat=m_metal_corrugated)
water_tank_roof = create_cylinder("Water_TankRoof", 1.05, 0.3, (-7.75, -2.05, 5.0), vertices=10, mat=m_roof_green)
all_objects.extend([water_tank_drum, water_tank_roof])

# Crates and Barrels
c1 = create_box("Supply_Crate_1", (0.8, 0.8, 0.7), (2.8, 2.0, 0.35), rot=(0, 0, 0.2), mat=m_crate_military)
c2 = create_box("Supply_Crate_2", (0.7, 0.7, 0.6), (2.8, 2.0, 1.0), rot=(0, 0, -0.15), mat=m_crate_military)
b1 = create_cylinder("Fuel_Barrel_Red", 0.32, 0.95, (-6.3, 4.5, 0.48), vertices=8, mat=m_barrel_fuel)
b2 = create_cylinder("Water_Barrel_Blue", 0.32, 0.95, (-6.8, -0.8, 0.48), vertices=8, mat=m_barrel_water)
all_objects.extend([c1, c2, b1, b2])

# =========================================================================
# 7. NAMED GAMEPLAY SOCKETS
# =========================================================================
sockets = [
    create_socket("SPAWN_PLAYER", (0.0, -4.5, 0.0), (0, 0, 0)),
    create_socket("SOCKET_MAIN_DOOR", (-3.4, -0.6, 0.45), (0, 0, 0)),
    create_socket("SOCKET_WORKBENCH", (4.8, 0.5, 0.0), (0, 0, 1.57)),
    create_socket("SOCKET_GENERATOR", (-6.0, 5.0, 0.0), (0, 0, -1.57)),
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

print("Properly scaled 'THE RELAY' exported successfully!")
