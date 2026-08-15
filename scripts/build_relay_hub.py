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
# VIBRANT HOME BASE COLOR PALETTE
# =========================================================================
m_wood_dark = create_material("Mat_WoodDark", (0.36, 0.22, 0.12, 1.0), roughness=0.88)     # Heavy timber logs
m_wood_plank = create_material("Mat_WoodPlank", (0.58, 0.38, 0.20, 1.0), roughness=0.85)   # Siding planks
m_wood_deck = create_material("Mat_WoodDeck", (0.64, 0.44, 0.24, 1.0), roughness=0.8)      # Porch flooring
m_stone_base = create_material("Mat_StoneBase", (0.42, 0.44, 0.42, 1.0), roughness=0.9)    # Foundation stone
m_roof_green = create_material("Mat_RoofGreen", (0.16, 0.38, 0.24, 1.0), roughness=0.6, metallic=0.2) # Ranger green metal
m_metal_rust = create_material("Mat_MetalRust", (0.58, 0.24, 0.12, 1.0), roughness=0.85, metallic=0.25)
m_metal_dark = create_material("Mat_MetalDark", (0.18, 0.20, 0.22, 1.0), roughness=0.6, metallic=0.5)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.44, 0.48, 0.50, 1.0), roughness=0.7, metallic=0.3)
m_canvas_sand = create_material("Mat_CanvasSand", (0.82, 0.76, 0.58, 1.0), roughness=0.92) # Lookout tent canvas
m_canvas_orange = create_material("Mat_CanvasOrange", (0.92, 0.46, 0.12, 1.0), roughness=0.9)
m_ground_gravel = create_material("Mat_GroundGravel", (0.48, 0.46, 0.42, 1.0), roughness=0.95)
m_ground_dirt = create_material("Mat_GroundDirt", (0.40, 0.30, 0.18, 1.0), roughness=0.95)
m_fire_glow = create_material("Mat_FireGlow", (0.98, 0.55, 0.08, 1.0), roughness=0.3, emission=(0.98, 0.55, 0.08, 1.0), emission_strength=2.8)
m_lamp_warm = create_material("Mat_LampWarm", (0.98, 0.82, 0.24, 1.0), roughness=0.3, emission=(0.98, 0.82, 0.24, 1.0), emission_strength=2.5)
m_beacon_red = create_material("Mat_BeaconRed", (0.98, 0.12, 0.08, 1.0), roughness=0.3, emission=(0.98, 0.12, 0.08, 1.0), emission_strength=3.0)
m_solar_blue = create_material("Mat_SolarBlue", (0.12, 0.22, 0.48, 1.0), roughness=0.25, metallic=0.4)
m_sign_green = create_material("Mat_SignGreen", (0.12, 0.52, 0.28, 1.0), roughness=0.5)
m_sign_yellow = create_material("Mat_SignYellow", (0.95, 0.78, 0.12, 1.0), roughness=0.45)
m_sign_red = create_material("Mat_SignRed", (0.88, 0.18, 0.14, 1.0), roughness=0.45)
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

print("Building 'THE RELAY' Starting Survivor Hub Exterior...")

all_objects = []

# =========================================================================
# 1. GROUND FOUNDATION & COURTYARD GRAVEL PAD
# Centered around (0, 0, 0) in model coordinates
# =========================================================================
# Outer earthy dirt footprint
ground_base = create_box("Hub_GroundDirt", (28.0, 26.0, 0.12), (0, 0, 0.06), mat=m_ground_dirt)
# Main compacted gravel courtyard
courtyard_gravel = create_box("Hub_CourtyardGravel", (22.0, 20.0, 0.16), (0.5, -0.5, 0.09), rot=(0, 0, 0.04), mat=m_ground_gravel)
# Entrance path throat heading towards south-east road (-Y, +X in model)
road_throat = create_box("Hub_RoadThroat", (8.5, 9.0, 0.15), (2.0, -12.5, 0.08), rot=(0, 0, -0.06), mat=m_ground_gravel)
all_objects.extend([ground_base, courtyard_gravel, road_throat])


# =========================================================================
# 2. CHUNKY RANGER STATION CABIN (Positioned at Back-West: X = -5.0, Y = 4.0)
# =========================================================================
# Stone Foundation Plinth
cabin_stone = create_box("Ranger_StoneBase", (11.4, 8.4, 1.2), (-5.0, 4.0, 0.6), mat=m_stone_base)
# Wood Plank Upper Cabin Walls (5.2m high)
cabin_walls = create_box("Ranger_TimberWalls", (10.8, 7.8, 3.8), (-5.0, 4.0, 3.1), mat=m_wood_plank)
# Chunky corner log pillars
for cx, cy in [(-10.2, 0.3), (0.2, 0.3), (-10.2, 7.7), (0.2, 7.7)]:
    corner_log = create_cylinder(f"Ranger_LogCorner_{cx}_{cy}", 0.35, 5.0, (cx, cy, 2.5), vertices=6, mat=m_wood_dark)
    all_objects.append(corner_log)

# Gabled Ranger Green Metal Roof
roof_eaves = create_box("Ranger_RoofDeck", (12.2, 9.0, 0.4), (-5.0, 4.0, 5.2), mat=m_roof_green)
roof_ridge = create_box("Ranger_RoofRidge", (12.4, 1.2, 1.1), (-5.0, 4.0, 5.7), rot=(0.4, 0, 0), mat=m_roof_green)
# Weathered rust & corrugated patch on roof
roof_patch = create_box("Ranger_RoofRustPatch", (3.2, 4.0, 0.08), (-3.5, 4.8, 5.45), rot=(0.1, 0, 0.2), mat=m_metal_rust)
# Rooftop Dormer / Observation Lookout Window
dormer_walls = create_box("Ranger_DormerWalls", (3.2, 2.8, 1.8), (-5.0, 1.8, 5.8), mat=m_wood_plank)
dormer_roof = create_box("Ranger_DormerRoof", (3.6, 3.2, 0.3), (-5.0, 1.8, 6.8), rot=(0.2, 0, 0), mat=m_roof_green)
dormer_window = create_box("Ranger_DormerWindow", (2.4, 0.2, 1.2), (-5.0, 0.3, 5.8), mat=m_glass_dark)
all_objects.extend([cabin_stone, cabin_walls, roof_eaves, roof_ridge, roof_patch, dormer_walls, dormer_roof, dormer_window])

# Front Porch Deck & Steps (Facing Y = -0.5)
porch_deck = create_box("Ranger_PorchDeck", (7.5, 2.8, 0.35), (-4.5, -0.8, 1.05), mat=m_wood_deck)
porch_steps = create_box("Ranger_PorchSteps", (4.0, 1.6, 0.3), (-4.5, -2.6, 0.6), mat=m_wood_deck)
porch_rail = create_box("Ranger_PorchRail", (7.6, 0.15, 0.9), (-4.5, -2.15, 1.6), mat=m_wood_dark)
# Porch posts supporting roof overhang
for px in [-7.8, -1.2]:
    p_post = create_cylinder(f"Ranger_PorchPost_{px}", 0.18, 2.8, (px, -2.0, 2.4), vertices=6, mat=m_wood_dark)
    all_objects.append(p_post)
all_objects.extend([porch_deck, porch_steps, porch_rail])

# Front Entrance Door & Lantern (X = -4.5, Y = 0.0)
door_frame = create_box("Ranger_DoorFrame", (1.6, 0.2, 2.6), (-4.5, 0.05, 2.5), mat=m_wood_dark)
door_mesh = create_box("Ranger_DoorLeaf", (1.3, 0.1, 2.4), (-4.5, 0.08, 2.4), mat=m_wood_plank)
lantern_mount = create_box("Ranger_LanternMount", (0.1, 0.3, 0.1), (-3.4, -0.05, 3.2), mat=m_metal_dark)
lantern_light = create_cylinder("Ranger_PorchLantern", 0.18, 0.35, (-3.4, -0.2, 3.1), vertices=6, mat=m_lamp_warm)
all_objects.extend([door_frame, door_mesh, lantern_mount, lantern_light])

# Front Windows with protective wooden shutters
for wx in [-7.5, -1.5]:
    win_f = create_box(f"Ranger_WinFrame_{wx}", (1.8, 0.2, 1.8), (wx, 0.05, 2.8), mat=m_wood_dark)
    win_g = create_box(f"Ranger_WinGlass_{wx}", (1.5, 0.08, 1.5), (wx, 0.08, 2.8), mat=m_glass_dark)
    win_shutter = create_box(f"Ranger_Shutter_{wx}", (0.7, 0.08, 1.6), (wx - 0.9, -0.05, 2.8), rot=(0, 0, 0.3), mat=m_wood_plank)
    all_objects.extend([win_f, win_g, win_shutter])


# =========================================================================
# 3. TALL DAMAGED RADIO MAST (Major Silhouette: X = 5.5, Y = 6.5, Height 14m)
# =========================================================================
mast_base = create_box("RadioMast_ConcreteBase", (2.4, 2.4, 0.8), (5.5, 6.5, 0.4), mat=m_stone_base)
all_objects.append(mast_base)

# 4 Steel Corner Legs of Lattice Tower
mast_height = 13.5
mast_leg_coords = [(-0.9, -0.9), (0.9, -0.9), (-0.9, 0.9), (0.9, 0.9)]
for lx, ly in mast_leg_coords:
    m_leg = create_cylinder(f"RadioMast_Leg_{lx}_{ly}", 0.09, mast_height, (5.5 + lx * 0.7, 6.5 + ly * 0.7, 7.5), vertices=4, mat=m_metal_dark)
    all_objects.append(m_leg)

# Cross Bracing Struts on Mast
for tz in range(2, 13, 2):
    b_x = create_box(f"Mast_Brace_{tz}", (1.8, 1.8, 0.08), (5.5, 6.5, tz), mat=m_metal_rust)
    all_objects.append(b_x)

# Bent upper antenna mast with tilted communication dish
top_mast = create_cylinder("RadioMast_TopPole", 0.07, 4.5, (5.8, 6.8, 15.0), rot=(0.14, 0.12, 0.2), vertices=4, mat=m_metal_dark)
dish_mount = create_cylinder("RadioMast_DishMount", 0.08, 1.0, (5.6, 6.2, 13.2), rot=(0.5, 0.8, 0), vertices=4, mat=m_metal_dark)
comm_dish = create_cylinder("RadioMast_CommDish", 0.95, 0.2, (5.6, 5.8, 13.5), rot=(1.2, 0.4, -0.5), vertices=8, mat=m_roof_green)
# Glowing Red Beacon on Mast Top (Subtle bloom element)
beacon_lamp = create_cylinder("RadioMast_BeaconRed", 0.2, 0.35, (6.1, 7.1, 17.2), vertices=8, mat=m_beacon_red)
all_objects.extend([top_mast, dish_mount, comm_dish, beacon_lamp])


# =========================================================================
# 4. ROOFTOP SOLAR PANEL ARRAY (On Cabin Roof)
# =========================================================================
for s_idx in range(3):
    s_x = -7.5 + s_idx * 1.8
    s_frame = create_box(f"Solar_Frame_{s_idx}", (1.5, 1.8, 0.1), (s_x, 5.8, 5.9), rot=(-0.4, 0, 0), mat=m_metal_dark)
    s_panel = create_box(f"Solar_Cell_{s_idx}", (1.35, 1.65, 0.06), (s_x, 5.8, 5.95), rot=(-0.4, 0, 0), mat=m_solar_blue)
    all_objects.extend([s_frame, s_panel])


# =========================================================================
# 5. ELEVATED WATER TOWER & CISTERN (X = -10.5, Y = -2.5)
# =========================================================================
for st_x, st_y in [(-11.5, -3.5), (-9.5, -3.5), (-11.5, -1.5), (-9.5, -1.5)]:
    stilt = create_cylinder(f"Water_Stilt_{st_x}_{st_y}", 0.18, 4.5, (st_x, st_y, 2.25), vertices=6, mat=m_wood_dark)
    all_objects.append(stilt)

water_tank_deck = create_box("Water_TankDeck", (2.8, 2.8, 0.25), (-10.5, -2.5, 4.5), mat=m_wood_deck)
water_tank_drum = create_cylinder("Water_TankCistern", 1.25, 2.4, (-10.5, -2.5, 5.8), vertices=10, mat=m_metal_corrugated)
water_tank_roof = create_cylinder("Water_TankRoof", 1.35, 0.4, (-10.5, -2.5, 7.1), vertices=10, mat=m_roof_green)
water_pipe = create_cylinder("Water_DrainPipe", 0.08, 4.2, (-9.4, -2.5, 2.2), vertices=4, mat=m_metal_rust)
all_objects.extend([water_tank_deck, water_tank_drum, water_tank_roof, water_pipe])


# =========================================================================
# 6. FORTIFIED PERIMETER WALLS & RECYCLED HIGHWAY SIGNS
# Enclosing flanks and rear, leaving open front gate facing road
# =========================================================================
wall_segments = [
    # West wall (X = -12.5, Y = -7..+10)
    {"x": -12.5, "y": 2.0, "len": 6.5, "rot": 1.57, "mat": m_wood_dark},
    {"x": -12.5, "y": 8.0, "len": 5.5, "rot": 1.57, "mat": m_metal_corrugated},
    {"x": -12.5, "y": -4.0, "len": 5.5, "rot": 1.57, "mat": m_wood_dark},
    # North rear wall (Y = +11.5, X = -12..+9)
    {"x": -6.5, "y": 11.5, "len": 9.5, "rot": 0.0, "mat": m_wood_dark},
    {"x": 3.5, "y": 11.5, "len": 9.5, "rot": 0.0, "mat": m_metal_corrugated},
    # East wall (X = +9.5, Y = -4..+11)
    {"x": 9.5, "y": 8.0, "len": 6.0, "rot": 1.57, "mat": m_wood_dark},
    {"x": 9.5, "y": 2.0, "len": 6.0, "rot": 1.57, "mat": m_metal_corrugated},
    # Front-Left gate wing (Y = -9.0, X = -12..-3)
    {"x": -7.5, "y": -9.0, "len": 7.0, "rot": -0.15, "mat": m_wood_dark},
    # Front-Right gate wing (Y = -9.5, X = +4..+9)
    {"x": 6.8, "y": -9.5, "len": 5.5, "rot": 0.2, "mat": m_metal_corrugated},
]
for w_idx, ws in enumerate(wall_segments):
    wall_mesh = create_box(f"Palisade_Wall_{w_idx}", (ws["len"], 0.4, 2.8), (ws["x"], ws["y"], 1.4), rot=(0, 0, ws["rot"]), mat=ws["mat"])
    all_objects.append(wall_mesh)

# Recycled Highway Road Signs bolted on walls as armor
sign1 = create_box("Armor_InterstateShield", (1.4, 0.08, 1.4), (-12.7, 4.0, 1.8), rot=(0, 1.57, 0), mat=m_sign_green)
sign2 = create_box("Armor_YieldYellow", (1.3, 0.08, 1.3), (-6.5, -9.25, 1.6), rot=(0, -0.15, 0.78), mat=m_sign_yellow)
sign3 = create_box("Armor_StopRed", (1.2, 0.08, 1.2), (9.7, 5.0, 1.7), rot=(0, 1.57, 0.4), mat=m_sign_red)
all_objects.extend([sign1, sign2, sign3])

# Heavy Timber Gate Posts (Open gateway: X = -3.5 to +3.5)
gate_post_L = create_cylinder("Gate_Post_Left", 0.38, 4.5, (-3.5, -9.2, 2.25), vertices=6, mat=m_wood_dark)
gate_post_R = create_cylinder("Gate_Post_Right", 0.38, 4.5, (3.8, -9.6, 2.25), vertices=6, mat=m_wood_dark)
# Overhead Gate Arch Beam
gate_arch = create_box("Gate_ArchBeam", (7.8, 0.4, 0.45), (0.1, -9.4, 4.2), rot=(0, 0, -0.05), mat=m_wood_dark)
# Warm hanging entrance lantern (Bloom element)
gate_lantern = create_cylinder("Gate_LanternGlow", 0.22, 0.4, (0.1, -9.4, 3.7), vertices=6, mat=m_lamp_warm)
all_objects.extend([gate_post_L, gate_post_R, gate_arch, gate_lantern])


# =========================================================================
# 7. LOOKOUT WATCHTOWER / PLATFORM (At Gate Corner: X = 5.5, Y = -8.5)
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
# 8. WORKBENCH ZONE (Sheltered Lean-To at East Wall: X = 7.0, Y = 0.5)
# =========================================================================
wb_canopy = create_box("Workbench_RoofLeanTo", (4.0, 3.2, 0.15), (7.0, 0.5, 3.4), rot=(0, -0.3, 0), mat=m_metal_corrugated)
for wbp_y in [-0.8, 1.8]:
    wbp = create_cylinder(f"Workbench_Post_{wbp_y}", 0.14, 3.2, (5.2, wbp_y, 1.6), vertices=5, mat=m_wood_dark)
    all_objects.append(wbp)

# Sturdy Timber Workbench Table
wb_table = create_box("Workbench_Table", (2.4, 1.1, 0.9), (7.2, 0.5, 0.45), mat=m_wood_deck)
wb_vise = create_box("Workbench_Vise", (0.35, 0.35, 0.3), (6.2, 0.8, 1.05), mat=m_metal_dark)
wb_toolbox = create_box("Workbench_Toolbox", (0.7, 0.4, 0.35), (7.6, 0.3, 1.08), mat=m_metal_rust)
wb_lamp = create_cylinder("Workbench_HangingLamp", 0.16, 0.28, (7.0, 0.5, 2.6), vertices=6, mat=m_lamp_warm)
all_objects.extend([wb_canopy, wb_table, wb_vise, wb_toolbox, wb_lamp])


# =========================================================================
# 9. DIESEL GENERATOR UNIT (West Wall: X = -9.5, Y = 6.5)
# =========================================================================
gen_skid = create_box("Gen_WoodSkid", (2.6, 1.8, 0.25), (-9.5, 6.5, 0.15), mat=m_wood_dark)
gen_housing = create_box("Gen_Housing", (2.2, 1.4, 1.4), (-9.5, 6.5, 0.95), mat=m_metal_rust)
gen_control = create_box("Gen_ControlPanel", (0.7, 0.1, 0.6), (-9.5, 5.75, 1.1), mat=m_metal_dark)
gen_exhaust = create_cylinder("Gen_ExhaustPipe", 0.1, 1.8, (-8.7, 6.8, 1.8), rot=(0.1, 0, 0.2), vertices=6, mat=m_metal_dark)
gen_dial = create_cylinder("Gen_StatusGlow", 0.12, 0.08, (-9.5, 5.68, 1.2), rot=(1.57, 0, 0), vertices=6, mat=m_lamp_warm)
all_objects.extend([gen_skid, gen_housing, gen_control, gen_exhaust, gen_dial])


# =========================================================================
# 10. CAMPFIRE ZONE & SURVIVOR SEATING (Courtyard: X = 0.5, Y = -2.0)
# Warm glowing embers & campfire for cozy home atmosphere
# =========================================================================
fire_stone_ring = create_cylinder("Campfire_StoneRing", 1.3, 0.3, (0.5, -2.0, 0.15), vertices=8, mat=m_stone_base)
fire_pit_dark = create_cylinder("Campfire_AshBed", 1.0, 0.1, (0.5, -2.0, 0.22), vertices=8, mat=m_metal_dark)
fire_embers = create_cylinder("Campfire_EmbersGlow", 0.75, 0.25, (0.5, -2.0, 0.35), vertices=7, mat=m_fire_glow)
# Charred timber logs over fire
log1 = create_cylinder("Campfire_Log1", 0.14, 1.6, (0.5, -2.0, 0.4), rot=(0.3, 0.5, 0.7), vertices=5, mat=m_wood_dark)
log2 = create_cylinder("Campfire_Log2", 0.14, 1.5, (0.5, -2.0, 0.4), rot=(-0.4, 0.6, -0.5), vertices=5, mat=m_wood_dark)
# Cooking Spit with Hanging Cast-Iron Pot
spit_post_L = create_cylinder("Campfire_SpitL", 0.06, 1.4, (-0.4, -2.0, 0.7), vertices=4, mat=m_metal_dark)
spit_post_R = create_cylinder("Campfire_SpitR", 0.06, 1.4, (1.4, -2.0, 0.7), vertices=4, mat=m_metal_dark)
spit_bar = create_cylinder("Campfire_SpitBar", 0.04, 2.0, (0.5, -2.0, 1.3), rot=(0, 0, 1.57), vertices=4, mat=m_metal_dark)
spit_pot = create_cylinder("Campfire_Pot", 0.25, 0.35, (0.5, -2.0, 0.85), vertices=6, mat=m_metal_dark)
# Seating log benches around fire
bench_N = create_box("Campfire_BenchN", (2.2, 0.5, 0.4), (0.5, -0.6, 0.2), rot=(0, 0, 0.05), mat=m_wood_dark)
bench_W = create_box("Campfire_BenchW", (0.5, 1.8, 0.4), (-1.0, -2.2, 0.2), rot=(0, 0, 0.1), mat=m_wood_dark)
bench_S = create_box("Campfire_BenchS", (1.8, 0.5, 0.4), (0.7, -3.5, 0.2), rot=(0, 0, -0.08), mat=m_wood_dark)
all_objects.extend([fire_stone_ring, fire_pit_dark, fire_embers, log1, log2, spit_post_L, spit_post_R, spit_bar, spit_pot, bench_N, bench_W, bench_S])


# =========================================================================
# 11. SUPPLY CRATES, MEDICAL BOXES & FUEL DRUMS
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
# 12. NAMED GAMEPLAY SOCKET EMPTIES (Exported for future systems)
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

print(f"Exporting {len(all_objects)} objects/sockets to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("'THE RELAY' starting survivor hub exported successfully!")
