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
# VIBRANT CARTOON POST-APOCALYPTIC COLOR PALETTE
# =========================================================================
m_stucco_cream = create_material("Mat_StuccoCream", (0.92, 0.86, 0.72, 1.0), roughness=0.8) # Faded cream walls
m_retro_teal = create_material("Mat_RetroTeal", (0.16, 0.54, 0.58, 1.0), roughness=0.6)    # Vibrant retro teal trim
m_retro_orange = create_material("Mat_RetroOrange", (0.92, 0.42, 0.12, 1.0), roughness=0.55) # 70s orange stripes
m_brick_red = create_material("Mat_BrickRed", (0.68, 0.28, 0.22, 1.0), roughness=0.9)      # Warm terracotta wainscot
m_roof_dark = create_material("Mat_RoofDark", (0.18, 0.20, 0.22, 1.0), roughness=0.92)     # Dark charcoal roof gravel
m_concrete_pad = create_material("Mat_ConcretePad", (0.55, 0.56, 0.54, 1.0), roughness=0.85) # Forecourt concrete
m_asphalt_cracked = create_material("Mat_AsphaltCracked", (0.32, 0.33, 0.35, 1.0), roughness=0.92) # Cracked asphalt
m_curb_yellow = create_material("Mat_CurbYellow", (0.92, 0.72, 0.15, 1.0), roughness=0.6)  # Bright yellow curb
m_canopy_cream = create_material("Mat_CanopyCream", (0.88, 0.89, 0.86, 1.0), roughness=0.7) # Canopy fascia
m_metal_rust = create_material("Mat_MetalRust", (0.52, 0.26, 0.16, 1.0), roughness=0.85, metallic=0.25) # Rust orange-brown
m_metal_dark = create_material("Mat_MetalDark", (0.24, 0.26, 0.28, 1.0), roughness=0.6, metallic=0.5) # Industrial frame
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.42, 0.46, 0.48, 1.0), roughness=0.7, metallic=0.3)
m_glass_cyan = create_material("Mat_GlassCyan", (0.28, 0.72, 0.78, 1.0), roughness=0.15, alpha=0.55) # Clean teal glass
m_glass_broken = create_material("Mat_GlassBroken", (0.45, 0.82, 0.85, 1.0), roughness=0.3, alpha=0.45) # Jagged glass
m_wood_plank = create_material("Mat_WoodPlank", (0.52, 0.34, 0.20, 1.0), roughness=0.88)  # Weathered wood planks
m_vines = create_material("Mat_Vines", (0.28, 0.56, 0.18, 1.0), roughness=0.75)           # Lush overgrowth ivy
m_pump_red = create_material("Mat_PumpRed", (0.85, 0.18, 0.14, 1.0), roughness=0.5, metallic=0.2) # Cherry red pump
m_pump_yellow = create_material("Mat_PumpYellow", (0.94, 0.72, 0.14, 1.0), roughness=0.5, metallic=0.2) # Yellow pump
m_pump_teal = create_material("Mat_PumpTeal", (0.18, 0.62, 0.65, 1.0), roughness=0.5, metallic=0.2) # Seafoam pump
m_pump_meter = create_material("Mat_PumpMeter", (0.95, 0.96, 0.92, 1.0), roughness=0.35) # Gauge face
m_sign_glow = create_material("Mat_SignGlow", (0.98, 0.58, 0.12, 1.0), roughness=0.35, emission=(0.98, 0.58, 0.12, 1.0), emission_strength=1.2)
m_sign_white = create_material("Mat_SignWhite", (0.96, 0.96, 0.96, 1.0), roughness=0.4)
m_car_yellow = create_material("Mat_CarYellow", (0.82, 0.64, 0.22, 1.0), roughness=0.75, metallic=0.2) # Wrecked car paint
m_tire = create_material("Mat_Tire", (0.16, 0.17, 0.18, 1.0), roughness=0.92)
m_barrel_oil = create_material("Mat_BarrelOil", (0.18, 0.19, 0.21, 1.0), roughness=0.6, metallic=0.3)
m_barrel_yellow = create_material("Mat_BarrelYellow", (0.88, 0.62, 0.14, 1.0), roughness=0.55, metallic=0.3)

# Helpers to create mesh objects
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

print("Building Redesigned Landmark Abandoned Gas Station...")

all_objects = []

# =========================================================================
# 1. IRREGULAR CRACKED FORECOURT & DRIVEWAY APRON
# =========================================================================
# Multi-slab irregular asphalt/concrete pad that extends towards the road (+Z and -X)
slabs_data = [
    # Center pump apron
    {"name": "Forecourt_Center", "size": (24.0, 18.0, 0.22), "loc": (0, -4.0, 0.11), "rot": (0, 0, 0.03), "mat": m_concrete_pad},
    # Driveway extension linking to the south road
    {"name": "Forecourt_SouthDrive", "size": (18.0, 14.0, 0.18), "loc": (2.0, -16.0, 0.09), "rot": (0, 0, -0.06), "mat": m_asphalt_cracked},
    # North-west parking corner
    {"name": "Forecourt_WestApron", "size": (14.0, 12.0, 0.18), "loc": (-13.0, -2.0, 0.09), "rot": (0, 0, 0.08), "mat": m_asphalt_cracked},
    # East service pad
    {"name": "Forecourt_EastPad", "size": (12.0, 14.0, 0.20), "loc": (12.5, 2.0, 0.10), "rot": (0, 0, -0.04), "mat": m_concrete_pad},
]

for sd in slabs_data:
    s_obj = create_box(sd["name"], sd["size"], sd["loc"], sd["rot"], sd["mat"])
    all_objects.append(s_obj)

# Broken jagged edge asphalt chunks along perimeter
for i in range(12):
    angle = (i / 12) * math.pi * 2
    px = math.cos(angle) * (14.0 + math.sin(i * 2.3) * 3.0)
    pz = math.sin(angle) * (12.0 + math.cos(i * 1.7) * 4.0) - 5.0
    rotZ = math.sin(i) * 0.8
    scale = 1.2 + math.sin(i * 3) * 0.6
    slab_chunk = create_box(f"Asphalt_EdgeChunk_{i}", (scale * 2.2, scale * 1.6, 0.22), (px, pz, 0.11), rot=(0, 0, rotZ), mat=m_asphalt_cracked)
    all_objects.append(slab_chunk)

# Dark oil puddles / fuel stains on forecourt
oil1 = create_cylinder("OilStain_1", 2.6, 0.02, (-4.2, -6.5, 0.23), vertices=10, mat=m_roof_dark)
oil2 = create_cylinder("OilStain_2", 1.8, 0.02, (2.8, -7.5, 0.23), vertices=8, mat=m_roof_dark)
oil3 = create_cylinder("OilStain_3", 3.2, 0.02, (5.5, -3.5, 0.23), vertices=10, mat=m_roof_dark)
all_objects.extend([oil1, oil2, oil3])


# =========================================================================
# 2. MAIN STORE BUILDING & GARAGE WORKSHOP (18m wide x 11m deep x 5.8m high)
# Positioned at back (Y = +5.0) facing South (+Y to -Y)
# =========================================================================
# Building Foundation Plinth
b_plinth = create_box("Building_Plinth", (18.6, 11.6, 0.45), (0, 5.0, 0.225), mat=m_concrete_pad)
all_objects.append(b_plinth)

# Red Brick Wainscoting (Lower 1.2m)
b_brick = create_box("Building_BrickBase", (18.0, 11.0, 1.2), (0, 5.0, 1.05), mat=m_brick_red)
all_objects.append(b_brick)

# Left Section: Service Garage / Workshop (X = -5.5, Higher roof, 6.2m high)
garage_walls = create_box("Garage_Walls", (7.4, 10.8, 4.4), (-5.3, 5.0, 3.8), mat=m_stucco_cream)
garage_trim = create_box("Garage_RoofTrim", (7.8, 11.2, 0.6), (-5.3, 5.0, 6.1), mat=m_retro_teal)
garage_roof = create_box("Garage_RoofTar", (7.0, 10.4, 0.2), (-5.3, 5.0, 6.0), mat=m_roof_dark)
# Damaged bent roll-up corrugated door (Facing Y = -0.5)
garage_door_frame = create_box("Garage_DoorFrame", (4.8, 0.35, 3.8), (-5.3, -0.4, 2.5), mat=m_metal_dark)
garage_door_top = create_box("Garage_DoorRoll", (4.4, 0.25, 1.6), (-5.3, -0.38, 3.4), mat=m_metal_corrugated)
garage_door_bent = create_box("Garage_DoorBent", (4.4, 0.25, 1.2), (-5.3, -0.32, 1.6), rot=(-0.25, 0, 0.08), mat=m_metal_corrugated)
all_objects.extend([garage_walls, garage_trim, garage_roof, garage_door_frame, garage_door_top, garage_door_bent])

# Right Section: Convenience Mart (X = 3.5, 5.2m high)
mart_walls = create_box("Mart_Walls", (10.6, 10.6, 3.6), (3.6, 5.0, 3.4), mat=m_stucco_cream)
mart_trim = create_box("Mart_RoofTrim", (11.0, 11.0, 0.55), (3.6, 5.0, 5.3), mat=m_retro_orange)
mart_roof = create_box("Mart_RoofTar", (10.2, 10.2, 0.2), (3.6, 5.0, 5.2), mat=m_roof_dark)
all_objects.extend([mart_walls, mart_trim, mart_roof])

# Retro Awning Band running across storefront
awning_stripe = create_box("Store_AwningStripe", (17.8, 0.5, 0.4), (0, -0.45, 4.4), mat=m_retro_teal)
awning_orange = create_box("Store_AwningOrange", (17.8, 0.55, 0.18), (0, -0.47, 4.6), mat=m_retro_orange)
all_objects.extend([awning_stripe, awning_orange])

# Collapsed / Damaged Roof Corner (Back-Right of Mart)
roof_hole_rubble = create_box("Roof_Rubble_1", (2.8, 2.4, 0.4), (7.5, 9.0, 5.1), rot=(0.15, -0.1, 0.2), mat=m_metal_rust)
roof_hole_beam = create_cylinder("Roof_Rubble_Beam", 0.12, 3.2, (7.2, 8.8, 5.5), rot=(0.4, 0.3, 0), vertices=4, mat=m_metal_dark)
all_objects.extend([roof_hole_rubble, roof_hole_beam])

# Rooftop Equipment: Heavy Industrial AC Condenser & Vent Pipes
ac_main = create_box("Rooftop_AC_Unit", (2.4, 1.8, 1.4), (-4.5, 4.0, 6.8), rot=(0, 0, 0.12), mat=m_metal_rust)
ac_fan_grill = create_cylinder("Rooftop_AC_Grill", 0.65, 0.2, (-4.5, 4.0, 7.55), vertices=8, mat=m_metal_dark)
ac_duct = create_box("Rooftop_AC_Duct", (1.2, 3.2, 0.9), (-4.5, 6.2, 6.5), mat=m_metal_corrugated)
exhaust_pipe1 = create_cylinder("Rooftop_Pipe_1", 0.3, 1.6, (2.0, 3.5, 6.0), rot=(0.15, 0, 0.1), vertices=6, mat=m_metal_rust)
exhaust_pipe2 = create_cylinder("Rooftop_Pipe_2", 0.22, 1.2, (5.0, 6.5, 5.8), rot=(-0.1, 0, 0.15), vertices=6, mat=m_metal_dark)
all_objects.extend([ac_main, ac_fan_grill, ac_duct, exhaust_pipe1, exhaust_pipe2])

# FRONT STOREFRONT FACADE (Facing Y = -0.3)
# Dark Recessed Entry Vestibule (X = 0.5)
entry_recess = create_box("Entry_Recess", (2.6, 0.6, 3.0), (0.5, -0.1, 2.1), mat=m_roof_dark)
door_frame_main = create_box("Door_FrameMain", (2.4, 0.2, 2.8), (0.5, -0.38, 2.1), mat=m_metal_dark)
# Door 1 (Broken glass panel, hanging crookedly off top hinge)
door_leaf_1 = create_box("Door_Leaf_Crooked", (1.0, 0.08, 2.6), (0.1, -0.6, 2.0), rot=(0.1, 0.15, 0.55), mat=m_glass_broken)
# Door 2 (Boarded with wood)
door_board1 = create_box("Door_Board_1", (1.2, 0.08, 0.25), (0.9, -0.48, 1.4), rot=(0, 0, 0.08), mat=m_wood_plank)
door_board2 = create_box("Door_Board_2", (1.2, 0.08, 0.25), (0.9, -0.48, 2.2), rot=(0, 0, -0.06), mat=m_wood_plank)
all_objects.extend([entry_recess, door_frame_main, door_leaf_1, door_board1, door_board2])

# Storefront Display Window 1 (Left of door: X = -2.0) - Boarded with 5 rustic planks
win1_frame = create_box("Win1_Frame", (3.2, 0.22, 2.4), (-2.0, -0.35, 2.4), mat=m_retro_teal)
win1_glass = create_box("Win1_Glass", (3.0, 0.06, 2.2), (-2.0, -0.32, 2.4), mat=m_glass_cyan)
planks_w1 = [
    create_box("W1_Plank1", (3.4, 0.09, 0.32), (-2.0, -0.48, 1.5), rot=(0, 0, 0.06), mat=m_wood_plank),
    create_box("W1_Plank2", (3.3, 0.09, 0.30), (-2.0, -0.48, 2.1), rot=(0, 0, -0.05), mat=m_wood_plank),
    create_box("W1_Plank3", (3.4, 0.09, 0.32), (-2.0, -0.48, 2.7), rot=(0, 0, 0.08), mat=m_wood_plank),
    create_box("W1_Plank4_Diag", (3.2, 0.09, 0.28), (-2.0, -0.50, 2.2), rot=(0, 0, 0.58), mat=m_wood_plank),
    create_box("W1_Plank5_Diag", (2.8, 0.09, 0.26), (-2.0, -0.50, 2.3), rot=(0, 0, -0.52), mat=m_wood_plank),
]
all_objects.extend([win1_frame, win1_glass] + planks_w1)

# Storefront Display Window 2 (Right of door: X = 4.8) - Visibly Shattered Jagged Glass
win2_frame = create_box("Win2_Frame", (4.8, 0.22, 2.4), (4.8, -0.35, 2.4), mat=m_retro_teal)
win2_dark_interior = create_box("Win2_InteriorVoid", (4.6, 0.1, 2.2), (4.8, -0.28, 2.4), mat=m_roof_dark)
# Big low-poly jagged glass shards
shard_A = create_box("Win2_Shard_A", (1.8, 0.06, 1.4), (3.6, -0.34, 1.8), rot=(0, 0, 0.22), mat=m_glass_broken)
shard_B = create_box("Win2_Shard_B", (1.5, 0.06, 1.2), (5.8, -0.34, 3.0), rot=(0, 0, -0.28), mat=m_glass_broken)
shard_C = create_box("Win2_Shard_C", (1.2, 0.06, 0.8), (4.5, -0.34, 1.5), rot=(0, 0, -0.15), mat=m_glass_broken)
plank_w2 = create_box("W2_FallenPlank", (2.6, 0.09, 0.28), (4.6, -0.48, 1.5), rot=(0, 0, -0.25), mat=m_wood_plank)
all_objects.extend([win2_frame, win2_dark_interior, shard_A, shard_B, shard_C, plank_w2])

# PROMINENT CROOKED "OCTANE MART 76" ROOFTOP SIGN (Above Storefront)
sign_mount_L = create_cylinder("Sign_Mount_L", 0.1, 2.2, (-1.8, -0.3, 5.8), rot=(0.12, 0, 0.05), vertices=4, mat=m_metal_dark)
sign_mount_R = create_cylinder("Sign_Mount_R", 0.1, 2.2, (4.8, -0.3, 5.8), rot=(0.12, 0, -0.08), vertices=4, mat=m_metal_dark)
# Main crooked signboard
sign_board_main = create_box("Sign_Board_Main", (7.8, 0.4, 2.2), (1.5, -0.55, 6.4), rot=(0.08, -0.05, 0.09), mat=m_retro_orange)
sign_board_border = create_box("Sign_Board_Border", (8.1, 0.32, 2.4), (1.5, -0.5, 6.4), rot=(0.08, -0.05, 0.09), mat=m_retro_teal)
# 3D Letter blocks on sign
sign_letter_bar1 = create_box("Sign_TextBar1", (6.8, 0.1, 0.4), (1.5, -0.78, 6.9), rot=(0.08, -0.05, 0.09), mat=m_sign_glow)
sign_letter_bar2 = create_box("Sign_TextBar2", (5.4, 0.1, 0.35), (1.5, -0.78, 6.1), rot=(0.08, -0.05, 0.09), mat=m_sign_white)
# Starburst / Octagon logo on sign left
sign_star = create_cylinder("Sign_LogoStar", 0.75, 0.15, (-1.8, -0.78, 6.4), rot=(1.57, 0.09, 0), vertices=8, mat=m_retro_teal)
all_objects.extend([sign_mount_L, sign_mount_R, sign_board_main, sign_board_border, sign_letter_bar1, sign_letter_bar2, sign_star])


# =========================================================================
# 3. PUMP ISLAND & 3 DETAILED FUEL PUMPS
# Positioned at Y = -7.0, unobstructed from South/South-West camera angle
# =========================================================================
# Raised Curved Pump Island (18m wide x 3.2m deep x 0.45m high)
island_curb = create_box("Pump_Island_Curb", (17.6, 3.4, 0.42), (0, -7.0, 0.42), rot=(0, 0, 0.04), mat=m_curb_yellow)
island_top = create_box("Pump_Island_Top", (17.0, 2.8, 0.12), (0, -7.0, 0.65), rot=(0, 0, 0.04), mat=m_concrete_pad)
all_objects.extend([island_curb, island_top])

# Concrete crash bollards at island ends with warning stripes
boll_L = create_cylinder("Bollard_Left", 0.28, 1.2, (-8.2, -6.8, 1.0), vertices=8, mat=m_curb_yellow)
boll_R = create_cylinder("Bollard_Right", 0.28, 1.2, (8.2, -7.2, 1.0), vertices=8, mat=m_curb_yellow)
all_objects.extend([boll_L, boll_R])

# --- PUMP 1: Vintage Cherry Red (Left at X = -5.0) ---
p1_base = create_box("Pump1_Base", (1.4, 1.1, 0.35), (-5.0, -6.8, 0.8), mat=m_metal_dark)
p1_body = create_box("Pump1_Body", (1.2, 0.95, 2.2), (-5.0, -6.8, 2.0), mat=m_pump_red)
p1_side_panel = create_box("Pump1_Panel", (1.26, 0.85, 1.8), (-5.0, -6.8, 2.0), mat=m_retro_orange)
p1_meter_F = create_box("Pump1_Meter_F", (0.9, 0.1, 0.75), (-5.0, -7.32, 2.3), mat=m_pump_meter)
p1_meter_B = create_box("Pump1_Meter_B", (0.9, 0.1, 0.75), (-5.0, -6.28, 2.3), mat=m_pump_meter)
p1_globe = create_cylinder("Pump1_Globe76", 0.36, 0.38, (-5.0, -6.8, 3.3), vertices=8, mat=m_retro_orange)
# Nozzle & Hose
p1_nozzle = create_box("Pump1_Nozzle", (0.15, 0.28, 0.4), (-4.3, -6.8, 1.8), rot=(0, 0, 0.35), mat=m_metal_dark)
p1_hose = create_cylinder("Pump1_Hose", 0.06, 1.2, (-4.3, -6.8, 1.1), vertices=6, mat=m_tire)
all_objects.extend([p1_base, p1_body, p1_side_panel, p1_meter_F, p1_meter_B, p1_globe, p1_nozzle, p1_hose])

# --- PUMP 2: Vintage Yellow (Center at X = 0.0, Tilted & Dented) ---
p2_base = create_box("Pump2_Base", (1.4, 1.1, 0.35), (0.0, -7.0, 0.8), mat=m_metal_dark)
p2_body = create_box("Pump2_Body", (1.2, 0.95, 2.2), (0.0, -7.0, 2.0), rot=(0.06, 0.05, 0.12), mat=m_pump_yellow)
p2_meter = create_box("Pump2_Meter", (0.9, 0.1, 0.75), (0.0, -7.52, 2.3), rot=(0.06, 0.05, 0.12), mat=m_pump_meter)
# Dented open service panel
p2_open_panel = create_box("Pump2_OpenPanel", (0.85, 0.08, 0.9), (0.1, -7.6, 1.2), rot=(0.3, 0.1, 0.4), mat=m_metal_rust)
p2_dangling_nozzle = create_box("Pump2_DanglingNozzle", (0.15, 0.28, 0.4), (0.8, -7.4, 0.5), rot=(0.8, 0, 0.3), mat=m_metal_dark)
p2_top_cap = create_box("Pump2_TopCap", (1.1, 0.85, 0.22), (0.0, -7.0, 3.15), rot=(0.06, 0.05, 0.12), mat=m_metal_rust)
all_objects.extend([p2_base, p2_body, p2_meter, p2_open_panel, p2_dangling_nozzle, p2_top_cap])

# --- PUMP 3: Faded Seafoam Teal (Right at X = 5.0, Heavily Damaged) ---
p3_base = create_box("Pump3_Base", (1.4, 1.1, 0.35), (5.0, -7.2, 0.8), mat=m_metal_dark)
p3_body = create_box("Pump3_Body", (1.2, 0.95, 2.2), (5.0, -7.2, 2.0), rot=(-0.04, 0.08, -0.15), mat=m_pump_teal)
p3_meter = create_box("Pump3_Meter", (0.9, 0.1, 0.75), (5.0, -7.72, 2.3), rot=(-0.04, 0.08, -0.15), mat=m_glass_broken)
p3_globe = create_cylinder("Pump3_GlobeBroken", 0.36, 0.38, (5.0, -7.2, 3.3), rot=(0.2, 0, -0.3), vertices=8, mat=m_metal_rust)
p3_dent1 = create_box("Pump3_DentRubble", (0.6, 0.4, 0.4), (5.5, -7.4, 1.2), rot=(0.3, 0.2, 0.1), mat=m_metal_rust)
all_objects.extend([p3_base, p3_body, p3_meter, p3_globe, p3_dent1])


# =========================================================================
# 4. OVERHEAD PUMP CANOPY WITH DRAMATIC PARTIAL COLLAPSE
# Elevated high (6.8m) and shifted slightly back so ALL 3 pumps are fully visible
# =========================================================================
# Support Pillars (2 Heavy Columns at X = -5.0 and X = 5.0, Y = -5.5)
# Pillar 1 (Left: X = -5.0)
pil1_base = create_box("Canopy_Pil1_Pedestal", (1.2, 1.2, 1.1), (-5.0, -5.5, 1.05), mat=m_concrete_pad)
pil1_col = create_cylinder("Canopy_Pil1_Column", 0.4, 5.2, (-5.0, -5.5, 4.0), vertices=6, mat=m_metal_dark)
pil1_truss_F = create_cylinder("Canopy_Pil1_TrussF", 0.1, 2.8, (-5.0, -6.8, 5.8), rot=(0.7, 0, 0), vertices=4, mat=m_metal_rust)
pil1_truss_B = create_cylinder("Canopy_Pil1_TrussB", 0.1, 2.8, (-5.0, -4.2, 5.8), rot=(-0.7, 0, 0), vertices=4, mat=m_metal_rust)
pil1_truss_L = create_cylinder("Canopy_Pil1_TrussL", 0.1, 2.8, (-6.3, -5.5, 5.8), rot=(0, 0.7, 0), vertices=4, mat=m_metal_rust)
all_objects.extend([pil1_base, pil1_col, pil1_truss_F, pil1_truss_B, pil1_truss_L])

# Pillar 2 (Right: X = 5.0 - Damaged & Tilted)
pil2_base = create_box("Canopy_Pil2_Pedestal", (1.2, 1.2, 1.1), (5.0, -5.5, 1.05), mat=m_concrete_pad)
pil2_col = create_cylinder("Canopy_Pil2_Column", 0.4, 5.0, (5.0, -5.5, 3.9), rot=(0.08, 0, -0.06), vertices=6, mat=m_metal_dark)
pil2_truss_F = create_cylinder("Canopy_Pil2_TrussF", 0.1, 2.8, (5.0, -6.8, 5.6), rot=(0.7, 0, 0), vertices=4, mat=m_metal_rust)
all_objects.extend([pil2_base, pil2_col, pil2_truss_F])

# Main Canopy Roof Deck (20m wide x 9.5m deep x 1.1m thick fascia)
canopy_deck = create_box("Canopy_Deck", (20.4, 9.6, 1.1), (0, -6.0, 7.0), rot=(-0.04, 0, 0.02), mat=m_canopy_cream)
# Retro orange & teal horizontal fascia trim stripes
canopy_f_orange = create_box("Canopy_Trim_F_Orange", (20.5, 0.1, 0.4), (0, -10.85, 7.0), rot=(-0.04, 0, 0.02), mat=m_retro_orange)
canopy_f_teal = create_box("Canopy_Trim_F_Teal", (20.5, 0.1, 0.25), (0, -10.85, 6.6), rot=(-0.04, 0, 0.02), mat=m_retro_teal)
canopy_b_orange = create_box("Canopy_Trim_B_Orange", (20.5, 0.1, 0.4), (0, -1.15, 7.0), rot=(-0.04, 0, 0.02), mat=m_retro_orange)
canopy_l_orange = create_box("Canopy_Trim_L_Orange", (0.1, 9.7, 0.4), (-10.25, -6.0, 7.0), rot=(-0.04, 0, 0.02), mat=m_retro_orange)
canopy_r_orange = create_box("Canopy_Trim_R_Orange", (0.1, 9.7, 0.4), (10.25, -6.0, 7.0), rot=(-0.04, 0, 0.02), mat=m_retro_orange)
all_objects.extend([canopy_deck, canopy_f_orange, canopy_f_teal, canopy_b_orange, canopy_l_orange, canopy_r_orange])

# DRAMATIC PARTIALLY COLLAPSED CANOPY CORNER (North-East / Right side)
canopy_collapsed_panel = create_box("Canopy_CollapsedPanel", (4.2, 3.6, 0.12), (9.2, -8.8, 5.4), rot=(0.42, -0.28, 0.55), mat=m_metal_rust)
canopy_exposed_beam1 = create_cylinder("Canopy_ExposedBeam1", 0.08, 3.4, (8.5, -8.2, 6.2), rot=(0.5, 0.3, 0), vertices=4, mat=m_metal_dark)
canopy_exposed_beam2 = create_cylinder("Canopy_ExposedBeam2", 0.08, 2.8, (9.8, -7.5, 5.8), rot=(-0.2, 0.6, 0.4), vertices=4, mat=m_metal_dark)
# Hanging dangling light fixture
canopy_dangling_light = create_box("Canopy_DanglingLight", (1.2, 0.5, 0.15), (4.5, -6.5, 5.6), rot=(0.65, 0.2, -0.4), mat=m_sign_white)
all_objects.extend([canopy_collapsed_panel, canopy_exposed_beam1, canopy_exposed_beam2, canopy_dangling_light])

# Underside recessed lights
for lx in [-5.0, 0.0]:
    u_light = create_box(f"Canopy_UndersideLight_{lx}", (1.4, 0.6, 0.12), (lx, -6.0, 6.42), mat=m_sign_white)
    all_objects.append(u_light)


# =========================================================================
# 5. ABANDONED WRECKED VEHICLE (Station Wagon / Sedan at X = -10.0, Y = -11.5)
# Parked at an angle near the driveway with flat tires and damage
# =========================================================================
car_origin = Vector((-10.0, -11.5, 0.35))
car_rot = Euler((0.05, -0.04, 0.75))

# Car Chassis & Lower Body
car_body = create_box("Wreck_Car_Body", (4.4, 2.0, 0.9), car_origin + Vector((0, 0, 0.55)), rot=(0.05, -0.04, 0.75), mat=m_car_yellow)
# Cabin & Roof
car_cabin = create_box("Wreck_Car_Cabin", (2.4, 1.8, 0.75), car_origin + Vector((-0.3, 0.1, 1.3)), rot=(0.05, -0.04, 0.75), mat=m_car_yellow)
# Broken Windshield & Windows
car_windshield = create_box("Wreck_Car_Windshield", (1.0, 1.7, 0.65), car_origin + Vector((0.8, -0.1, 1.25)), rot=(0.05, 0.4, 0.75), mat=m_glass_broken)
# Missing Hood (Exposed blocky engine block)
car_engine = create_box("Wreck_Car_Engine", (1.1, 0.9, 0.55), car_origin + Vector((1.4, -0.2, 0.75)), rot=(0.05, -0.04, 0.75), mat=m_metal_rust)
# Crooked detached door leaned on side
car_door_bent = create_box("Wreck_Car_DoorDetached", (1.2, 0.1, 0.85), car_origin + Vector((-0.2, -1.2, 0.45)), rot=(0.4, 0, 0.9), mat=m_car_yellow)
# 4 Sunken flat tires
wheel_offsets = [
    Vector((1.3, 1.05, 0.05)),
    Vector((1.3, -1.05, 0.05)),
    Vector((-1.3, 1.05, 0.05)),
    Vector((-1.3, -1.05, 0.05)),
]
for w_idx, w_off in enumerate(wheel_offsets):
    rot_w_off = w_off.copy()
    rot_w_off.rotate(car_rot)
    wheel = create_cylinder(f"Wreck_Car_Wheel_{w_idx}", 0.38, 0.24, car_origin + rot_w_off, rot=(1.57, 0.75, 0), vertices=8, mat=m_tire)
    all_objects.append(wheel)

all_objects.extend([car_body, car_cabin, car_windshield, car_engine, car_door_bent])


# =========================================================================
# 6. PROMINENT BENT ROADSIDE TOTEM SIGN (At Driveway Entrance: X = -12.0, Y = -18.0)
# =========================================================================
totem_base = create_box("Totem_Pedestal", (1.4, 1.4, 0.6), (-12.0, -18.0, 0.3), mat=m_concrete_pad)
# Dual steel poles tilted 14 degrees
totem_pole_L = create_cylinder("Totem_Pole_L", 0.16, 9.2, (-12.4, -18.0, 4.8), rot=(0.14, 0, -0.22), vertices=6, mat=m_metal_dark)
totem_pole_R = create_cylinder("Totem_Pole_R", 0.16, 9.2, (-11.4, -18.0, 4.8), rot=(0.14, 0, -0.22), vertices=6, mat=m_metal_dark)
# Big Vintage Octagon / Diamond Sign Face ("OCTANE 76")
totem_sign_main = create_cylinder("Totem_SignOctagon", 2.4, 0.45, (-13.0, -18.2, 8.2), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_retro_orange)
totem_sign_rim = create_cylinder("Totem_SignRim", 2.6, 0.35, (-13.0, -18.2, 8.2), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_retro_teal)
totem_sign_center = create_cylinder("Totem_SignCenter76", 1.6, 0.48, (-13.0, -18.2, 8.2), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_sign_glow)
# Neon arrow pointing into driveway
totem_arrow = create_box("Totem_NeonArrow", (2.8, 0.3, 0.5), (-12.8, -18.3, 5.8), rot=(0.14, 0.22, -0.35), mat=m_sign_glow)
all_objects.extend([totem_base, totem_pole_L, totem_pole_R, totem_sign_main, totem_sign_rim, totem_sign_center, totem_arrow])


# =========================================================================
# 7. APOCALYPSE DEBRIS, TIRES, BARRELS, PALLETS & OVERGROWTH VINES
# =========================================================================
# Stack of 4 tires near garage wall
for t_idx in range(4):
    t_obj = create_cylinder(f"Tire_Stack_{t_idx}", 0.45, 0.28, (-9.5, 1.2 + t_idx * 0.08, 0.3 + t_idx * 0.28), rot=(1.57, t_idx * 0.35, 0), vertices=8, mat=m_tire)
    all_objects.append(t_obj)

# 2 Loose tires lying flat on forecourt
t_flat1 = create_cylinder("Tire_Flat_1", 0.45, 0.26, (3.2, -12.5, 0.22), rot=(0, 0, 0.1), vertices=8, mat=m_tire)
t_flat2 = create_cylinder("Tire_Flat_2", 0.45, 0.26, (-2.5, -14.0, 0.22), rot=(0.1, 0, 0.3), vertices=8, mat=m_tire)
all_objects.extend([t_flat1, t_flat2])

# Metal Barrels (Hazard Yellow, Red Flammable, Dark Oil)
barrel_data = [
    # Upright Yellow Hazard near garage corner
    {"name": "Barrel_Yellow_1", "loc": (-9.6, -1.0, 0.8), "rot": (0, 0, 0), "mat": m_barrel_yellow},
    # Overturned Red Drum spilling near car
    {"name": "Barrel_Red_Overturned", "loc": (-7.8, -12.5, 0.55), "rot": (1.57, 0, 0.5), "mat": m_pump_red},
    # 2 Oil drums on East pad
    {"name": "Barrel_Oil_1", "loc": (10.5, 1.0, 0.8), "rot": (0, 0, 0), "mat": m_barrel_oil},
    {"name": "Barrel_Oil_2_Tilted", "loc": (11.5, 1.8, 0.75), "rot": (0.2, 0, 0.15), "mat": m_barrel_oil},
    {"name": "Barrel_Yellow_2", "loc": (10.8, -2.5, 0.8), "rot": (0, 0, 0), "mat": m_barrel_yellow},
]
for bd in barrel_data:
    b_obj = create_cylinder(bd["name"], 0.46, 1.25, bd["loc"], rot=bd["rot"], vertices=8, mat=bd["mat"])
    all_objects.append(b_obj)

# Leaned Wooden Pallets & Scrap Plywood
pallet_data = [
    {"name": "Pallet_1", "size": (1.6, 0.18, 1.6), "loc": (-9.4, 3.2, 0.9), "rot": (0, -0.18, 0.25)},
    {"name": "Pallet_2", "size": (1.5, 0.18, 1.5), "loc": (9.8, 4.5, 0.85), "rot": (0, 0.15, -0.22)},
    {"name": "Pallet_3_Broken", "size": (1.4, 0.16, 0.8), "loc": (2.2, -15.5, 0.22), "rot": (0.05, 0, 0.4)},
]
for pd in pallet_data:
    p_obj = create_box(pd["name"], pd["size"], pd["loc"], pd["rot"], mat=m_wood_plank)
    all_objects.append(p_obj)

# Chunky Ivy / Overgrowth Weeds climbing walls, roof, and forecourt cracks
vines_data = [
    # Garage left corner vine
    {"name": "Vine_GarageCorner", "size": (1.2, 1.2, 3.8), "loc": (-9.2, 5.0, 2.2), "rot": (0.05, 0.1, 0.25)},
    # Storefront right corner vine
    {"name": "Vine_MartRight", "size": (1.1, 1.1, 3.4), "loc": (9.2, 5.0, 2.0), "rot": (-0.05, 0.15, -0.2)},
    # Canopy pillar climber
    {"name": "Vine_CanopyPillar", "size": (0.9, 0.9, 3.2), "loc": (-5.0, -5.5, 2.5), "rot": (0.1, 0.05, 0.45)},
    # Rooftop edge creepers
    {"name": "Vine_RoofCreepers", "size": (2.4, 0.8, 0.6), "loc": (6.5, 0.2, 5.2), "rot": (0.15, -0.1, 0)},
    # Weeds bursting from forecourt asphalt crack
    {"name": "Weeds_Forecourt_1", "size": (1.4, 1.4, 0.7), "loc": (-3.0, -11.5, 0.45), "rot": (0, 0.8, 0)},
    {"name": "Weeds_Forecourt_2", "size": (1.2, 1.2, 0.6), "loc": (6.5, -9.5, 0.45), "rot": (0, -0.5, 0)},
]
for vd in vines_data:
    v_obj = create_box(vd["name"], vd["size"], vd["loc"], vd["rot"], mat=m_vines)
    all_objects.append(v_obj)

# Select all created objects and set origin to bottom center
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

# Export to GLB format
output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "abandoned_gas_station.glb")

print(f"Exporting {len(all_objects)} objects to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("Redesigned Gas Station exported successfully!")
