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
m_stucco_cream = create_material("Mat_StuccoCream", (0.94, 0.88, 0.74, 1.0), roughness=0.8) # Faded warm cream
m_retro_teal = create_material("Mat_RetroTeal", (0.12, 0.58, 0.62, 1.0), roughness=0.55)    # Vibrant retro teal
m_retro_orange = create_material("Mat_RetroOrange", (0.94, 0.38, 0.08, 1.0), roughness=0.5) # Vibrant 70s orange
m_brick_red = create_material("Mat_BrickRed", (0.72, 0.26, 0.18, 1.0), roughness=0.9)      # Terracotta wainscot
m_roof_dark = create_material("Mat_RoofDark", (0.16, 0.18, 0.20, 1.0), roughness=0.92)     # Dark roof gravel
m_concrete_pad = create_material("Mat_ConcretePad", (0.58, 0.59, 0.56, 1.0), roughness=0.85) # Forecourt concrete
m_asphalt_cracked = create_material("Mat_AsphaltCracked", (0.30, 0.31, 0.33, 1.0), roughness=0.92) # Cracked asphalt
m_curb_yellow = create_material("Mat_CurbYellow", (0.95, 0.76, 0.12, 1.0), roughness=0.55) # Bright yellow curb
m_canopy_cream = create_material("Mat_CanopyCream", (0.86, 0.88, 0.84, 1.0), roughness=0.7) # Canopy fascia
m_metal_rust = create_material("Mat_MetalRust", (0.55, 0.24, 0.14, 1.0), roughness=0.85, metallic=0.25) # Rust orange-brown
m_metal_dark = create_material("Mat_MetalDark", (0.20, 0.22, 0.25, 1.0), roughness=0.6, metallic=0.5) # Dark frame/posts
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.42, 0.46, 0.48, 1.0), roughness=0.7, metallic=0.3)
m_glass_cyan = create_material("Mat_GlassCyan", (0.24, 0.76, 0.82, 1.0), roughness=0.15, alpha=0.55) # Clean teal glass
m_glass_broken = create_material("Mat_GlassBroken", (0.45, 0.84, 0.88, 1.0), roughness=0.3, alpha=0.45) # Jagged glass
m_wood_plank = create_material("Mat_WoodPlank", (0.54, 0.35, 0.18, 1.0), roughness=0.88)  # Weathered wood planks
m_vines = create_material("Mat_Vines", (0.28, 0.58, 0.16, 1.0), roughness=0.75)           # Lush overgrowth ivy
m_pump_red = create_material("Mat_PumpRed", (0.88, 0.14, 0.10, 1.0), roughness=0.45, metallic=0.2) # Bold cherry red
m_pump_yellow = create_material("Mat_PumpYellow", (0.96, 0.74, 0.10, 1.0), roughness=0.45, metallic=0.2) # Bold yellow
m_pump_teal = create_material("Mat_PumpTeal", (0.14, 0.65, 0.68, 1.0), roughness=0.45, metallic=0.2) # Bold seafoam teal
m_pump_meter = create_material("Mat_PumpMeter", (0.96, 0.97, 0.94, 1.0), roughness=0.35) # Gauge face
m_sign_glow = create_material("Mat_SignGlow", (0.98, 0.52, 0.08, 1.0), roughness=0.35, emission=(0.98, 0.52, 0.08, 1.0), emission_strength=1.5)
m_sign_red = create_material("Mat_SignRed", (0.86, 0.16, 0.12, 1.0), roughness=0.4, emission=(0.86, 0.16, 0.12, 1.0), emission_strength=1.2)
m_sign_white = create_material("Mat_SignWhite", (0.98, 0.98, 0.98, 1.0), roughness=0.35)
m_car_yellow = create_material("Mat_CarYellow", (0.85, 0.66, 0.20, 1.0), roughness=0.75, metallic=0.2) # Wrecked car
m_tire = create_material("Mat_Tire", (0.15, 0.16, 0.17, 1.0), roughness=0.92)
m_barrel_oil = create_material("Mat_BarrelOil", (0.17, 0.18, 0.20, 1.0), roughness=0.6, metallic=0.3)
m_barrel_yellow = create_material("Mat_BarrelYellow", (0.90, 0.64, 0.12, 1.0), roughness=0.55, metallic=0.3)

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

print("Building Perfectly Composed Abandoned Gas Station...")

all_objects = []

# =========================================================================
# 1. IRREGULAR MULTI-POLYGON CRACKED FORECOURT & APRON
# Non-rectangular faceted footprint with broken asphalt cutouts and missing edges
# =========================================================================
# Core pump pad (under pumps: X = -7..+7, Y = -14..-9)
pad_pumps = create_box("Forecourt_PumpPad", (16.0, 7.5, 0.18), (0, -11.5, 0.09), rot=(0, 0, 0.02), mat=m_concrete_pad)
# Storefront walkway apron (in front of store: X = -9..+9, Y = -4..+1)
pad_store = create_box("Forecourt_StoreApron", (18.5, 6.0, 0.20), (0, -1.0, 0.10), rot=(0, 0, -0.02), mat=m_concrete_pad)
# Connecting diagonal mid-court
pad_mid = create_box("Forecourt_MidCourt", (15.0, 7.0, 0.18), (0.5, -6.5, 0.09), rot=(0, 0, 0.05), mat=m_asphalt_cracked)
# Tapered driveway neck extending south towards road (+Z in world)
pad_driveway = create_box("Forecourt_DrivewayNeck", (11.0, 8.0, 0.16), (0.5, -17.5, 0.08), rot=(0, 0, -0.06), mat=m_asphalt_cracked)
# West service corner
pad_west = create_box("Forecourt_WestPad", (8.0, 9.0, 0.16), (-10.5, -7.0, 0.08), rot=(0, 0, 0.12), mat=m_asphalt_cracked)
# East service corner
pad_east = create_box("Forecourt_EastPad", (8.0, 8.0, 0.16), (10.5, -4.0, 0.08), rot=(0, 0, -0.10), mat=m_asphalt_cracked)
all_objects.extend([pad_pumps, pad_store, pad_mid, pad_driveway, pad_west, pad_east])

# 18 Broken jagged asphalt perimeter chunks & missing slab gaps
chunk_coords = [
    (-8.5, -15.5, 0.4), (8.0, -15.0, -0.3), (5.5, -21.0, 0.2), (-5.0, -20.5, -0.25),
    (-14.5, -9.0, 0.5), (-14.0, -4.0, -0.4), (-13.5, 1.5, 0.3), (13.5, -7.5, -0.4),
    (14.0, -1.0, 0.3), (12.5, 3.5, -0.2), (-8.0, 3.5, 0.15), (7.0, -10.0, 0.6),
    (-6.5, -9.0, -0.5), (0.0, -14.0, 0.3), (9.5, -12.5, -0.4), (-11.0, -13.0, 0.4)
]
for c_idx, (cx, cy, crot) in enumerate(chunk_coords):
    c_size = (1.8 + math.sin(c_idx * 2) * 0.6, 1.4 + math.cos(c_idx * 3) * 0.5, 0.2)
    c_obj = create_box(f"Asphalt_JaggedEdge_{c_idx}", c_size, (cx, cy, 0.10), rot=(0, 0, crot), mat=m_asphalt_cracked)
    all_objects.append(c_obj)

# Large Dark Oil Puddles & Fuel Stains
oil1 = create_cylinder("OilStain_Pump1", 2.2, 0.02, (-3.8, -11.5, 0.20), vertices=8, mat=m_roof_dark)
oil2 = create_cylinder("OilStain_Pump2", 1.8, 0.02, (0.0, -12.2, 0.20), vertices=8, mat=m_roof_dark)
oil3 = create_cylinder("OilStain_Driveway", 2.8, 0.02, (1.5, -16.5, 0.20), vertices=8, mat=m_roof_dark)
all_objects.extend([oil1, oil2, oil3])


# =========================================================================
# 2. STOREFRONT BUILDING & GARAGE WORKSHOP (Positioned at back: Y = +3.0)
# Completely unobstructed and clearly visible from camera!
# =========================================================================
# Foundation Plinth
b_plinth = create_box("Building_Plinth", (18.6, 10.6, 0.4), (0, 3.0, 0.2), mat=m_concrete_pad)
# Red Brick Wainscoting (Lower 1.2m)
b_brick = create_box("Building_BrickBase", (18.0, 10.0, 1.2), (0, 3.0, 0.9), mat=m_brick_red)
all_objects.extend([b_plinth, b_brick])

# Left: Service Garage (X = -5.2, Higher roofline, 6.0m high)
garage_walls = create_box("Garage_Walls", (7.4, 9.8, 4.2), (-5.2, 3.0, 3.5), mat=m_stucco_cream)
garage_trim = create_box("Garage_RoofTrim", (7.8, 10.2, 0.55), (-5.2, 3.0, 5.7), mat=m_retro_teal)
garage_roof = create_box("Garage_RoofTar", (7.0, 9.4, 0.18), (-5.2, 3.0, 5.6), mat=m_roof_dark)
# Damaged bent roll-up corrugated door (Facing Y = -1.9)
garage_door_frame = create_box("Garage_DoorFrame", (4.8, 0.35, 3.8), (-5.2, -1.9, 2.3), mat=m_metal_dark)
garage_door_top = create_box("Garage_DoorRoll", (4.4, 0.25, 1.4), (-5.2, -1.88, 3.3), mat=m_metal_corrugated)
garage_door_bent = create_box("Garage_DoorBent", (4.4, 0.25, 1.3), (-5.2, -1.82, 1.5), rot=(-0.25, 0, 0.08), mat=m_metal_corrugated)
all_objects.extend([garage_walls, garage_trim, garage_roof, garage_door_frame, garage_door_top, garage_door_bent])

# Right: Convenience Mart (X = 3.6, 5.0m high)
mart_walls = create_box("Mart_Walls", (10.4, 9.6, 3.4), (3.6, 3.0, 3.1), mat=m_stucco_cream)
mart_trim = create_box("Mart_RoofTrim", (10.8, 10.0, 0.55), (3.6, 3.0, 4.9), mat=m_retro_orange)
mart_roof = create_box("Mart_RoofTar", (10.0, 9.2, 0.18), (3.6, 3.0, 4.8), mat=m_roof_dark)
all_objects.extend([mart_walls, mart_trim, mart_roof])

# Retro Awning Band running across storefront
awning_stripe = create_box("Store_AwningStripe", (17.8, 0.45, 0.35), (0, -1.95, 4.1), mat=m_retro_teal)
awning_orange = create_box("Store_AwningOrange", (17.8, 0.5, 0.18), (0, -1.97, 4.3), mat=m_retro_orange)
all_objects.extend([awning_stripe, awning_orange])

# Collapsed Roof Corner (Back-Right of Mart)
roof_hole_rubble = create_box("Roof_Rubble_1", (2.8, 2.4, 0.4), (7.5, 6.8, 4.7), rot=(0.15, -0.1, 0.2), mat=m_metal_rust)
roof_hole_beam = create_cylinder("Roof_Rubble_Beam", 0.12, 3.0, (7.2, 6.6, 5.1), rot=(0.4, 0.3, 0), vertices=4, mat=m_metal_dark)
all_objects.extend([roof_hole_rubble, roof_hole_beam])

# Rooftop AC Condenser & Vent Pipes
ac_main = create_box("Rooftop_AC_Unit", (2.2, 1.6, 1.3), (-4.5, 2.5, 6.4), rot=(0, 0, 0.12), mat=m_metal_rust)
ac_fan_grill = create_cylinder("Rooftop_AC_Grill", 0.6, 0.2, (-4.5, 2.5, 7.1), vertices=8, mat=m_metal_dark)
exhaust_pipe1 = create_cylinder("Rooftop_Pipe_1", 0.28, 1.6, (1.8, 2.0, 5.6), rot=(0.15, 0, 0.1), vertices=6, mat=m_metal_rust)
exhaust_pipe2 = create_cylinder("Rooftop_Pipe_2", 0.2, 1.2, (5.2, 4.5, 5.4), rot=(-0.1, 0, 0.15), vertices=6, mat=m_metal_dark)
all_objects.extend([ac_main, ac_fan_grill, exhaust_pipe1, exhaust_pipe2])

# FRONT STOREFRONT FACADE (Facing Y = -1.8)
# Dark Visible Recessed Entry Doorway (X = 0.5)
entry_recess = create_box("Entry_Recess", (2.6, 0.6, 2.8), (0.5, -1.6, 1.9), mat=m_roof_dark)
door_frame_main = create_box("Door_FrameMain", (2.4, 0.2, 2.6), (0.5, -1.88, 1.9), mat=m_metal_dark)
# Door leaf cocked ajar off its hinge
door_leaf_1 = create_box("Door_Leaf_Crooked", (0.95, 0.08, 2.4), (0.1, -2.1, 1.8), rot=(0.1, 0.15, 0.55), mat=m_glass_broken)
door_board1 = create_box("Door_Board_1", (1.2, 0.08, 0.25), (0.9, -1.98, 1.3), rot=(0, 0, 0.08), mat=m_wood_plank)
door_board2 = create_box("Door_Board_2", (1.2, 0.08, 0.25), (0.9, -1.98, 2.1), rot=(0, 0, -0.06), mat=m_wood_plank)
all_objects.extend([entry_recess, door_frame_main, door_leaf_1, door_board1, door_board2])

# Window 1 (Left: X = -2.0) - Boarded with 5 weathered rustic planks
win1_frame = create_box("Win1_Frame", (3.2, 0.22, 2.2), (-2.0, -1.85, 2.2), mat=m_retro_teal)
win1_glass = create_box("Win1_Glass", (3.0, 0.06, 2.0), (-2.0, -1.82, 2.2), mat=m_glass_cyan)
planks_w1 = [
    create_box("W1_Plank1", (3.4, 0.09, 0.30), (-2.0, -1.98, 1.4), rot=(0, 0, 0.06), mat=m_wood_plank),
    create_box("W1_Plank2", (3.3, 0.09, 0.28), (-2.0, -1.98, 2.0), rot=(0, 0, -0.05), mat=m_wood_plank),
    create_box("W1_Plank3", (3.4, 0.09, 0.30), (-2.0, -1.98, 2.6), rot=(0, 0, 0.08), mat=m_wood_plank),
    create_box("W1_Plank4_Diag", (3.0, 0.09, 0.26), (-2.0, -2.00, 2.1), rot=(0, 0, 0.58), mat=m_wood_plank),
    create_box("W1_Plank5_Diag", (2.8, 0.09, 0.26), (-2.0, -2.00, 2.2), rot=(0, 0, -0.52), mat=m_wood_plank),
]
all_objects.extend([win1_frame, win1_glass] + planks_w1)

# Window 2 (Right: X = 4.6) - Visibly Shattered Glass with Dark Void
win2_frame = create_box("Win2_Frame", (4.6, 0.22, 2.2), (4.6, -1.85, 2.2), mat=m_retro_teal)
win2_dark_interior = create_box("Win2_InteriorVoid", (4.4, 0.1, 2.0), (4.6, -1.78, 2.2), mat=m_roof_dark)
shard_A = create_box("Win2_Shard_A", (1.6, 0.06, 1.3), (3.6, -1.84, 1.7), rot=(0, 0, 0.22), mat=m_glass_broken)
shard_B = create_box("Win2_Shard_B", (1.4, 0.06, 1.1), (5.5, -1.84, 2.8), rot=(0, 0, -0.28), mat=m_glass_broken)
shard_C = create_box("Win2_Shard_C", (1.1, 0.06, 0.7), (4.4, -1.84, 1.4), rot=(0, 0, -0.15), mat=m_glass_broken)
plank_w2 = create_box("W2_FallenPlank", (2.4, 0.09, 0.26), (4.5, -1.98, 1.35), rot=(0, 0, -0.25), mat=m_wood_plank)
all_objects.extend([win2_frame, win2_dark_interior, shard_A, shard_B, shard_C, plank_w2])

# PROMINENT, LARGE, CROOKED "OCTANE 76" ROOFTOP SIGN (Bold Red & Orange, High Visibility)
sign_mount_L = create_cylinder("Sign_Mount_L", 0.12, 2.4, (-1.5, -1.8, 5.4), rot=(0.12, 0, 0.05), vertices=4, mat=m_metal_dark)
sign_mount_R = create_cylinder("Sign_Mount_R", 0.12, 2.4, (5.2, -1.8, 5.4), rot=(0.12, 0, -0.08), vertices=4, mat=m_metal_dark)
# Main crooked signboard backing (Bold Retro Red & Orange)
sign_board_main = create_box("Sign_Board_Main", (8.6, 0.45, 2.4), (1.8, -2.0, 6.2), rot=(0.10, -0.06, 0.12), mat=m_sign_red)
sign_board_border = create_box("Sign_Board_Border", (9.0, 0.35, 2.6), (1.8, -1.95, 6.2), rot=(0.10, -0.06, 0.12), mat=m_retro_orange)
# Large 3D Letter bars & Logo on sign
sign_letter_bar1 = create_box("Sign_OCTANE_Bar", (7.4, 0.12, 0.5), (1.8, -2.25, 6.8), rot=(0.10, -0.06, 0.12), mat=m_sign_glow)
sign_letter_bar2 = create_box("Sign_MART_Bar", (5.8, 0.12, 0.4), (1.8, -2.25, 5.9), rot=(0.10, -0.06, 0.12), mat=m_sign_white)
# Big bold Starburst/Octagon "76" emblem
sign_logo = create_cylinder("Sign_Logo76", 0.9, 0.2, (-1.8, -2.25, 6.2), rot=(1.57, 0.12, 0), vertices=8, mat=m_retro_teal)
sign_logo_star = create_cylinder("Sign_LogoStar", 0.65, 0.24, (-1.8, -2.28, 6.2), rot=(1.57, 0.12, 0), vertices=5, mat=m_sign_glow)
all_objects.extend([sign_mount_L, sign_mount_R, sign_board_main, sign_board_border, sign_letter_bar1, sign_letter_bar2, sign_logo, sign_logo_star])


# =========================================================================
# 3. PUMP ISLAND & 3 STRONGLY COLORED FUEL PUMPS
# Positioned at Y = -11.5 (under sleek canopy, completely open view to storefront)
# =========================================================================
# Raised Curved Pump Island (13.5m wide x 2.6m deep x 0.4m high)
island_curb = create_box("Pump_Island_Curb", (13.6, 2.8, 0.38), (0, -11.5, 0.38), rot=(0, 0, 0.03), mat=m_curb_yellow)
island_top = create_box("Pump_Island_Top", (13.0, 2.2, 0.10), (0, -11.5, 0.58), rot=(0, 0, 0.03), mat=m_concrete_pad)
all_objects.extend([island_curb, island_top])

# Concrete crash bollards at island ends with yellow warning stripes
boll_L = create_cylinder("Bollard_Left", 0.28, 1.2, (-6.4, -11.3, 0.9), vertices=8, mat=m_curb_yellow)
boll_R = create_cylinder("Bollard_Right", 0.28, 1.2, (6.4, -11.7, 0.9), vertices=8, mat=m_curb_yellow)
all_objects.extend([boll_L, boll_R])

# --- PUMP 1: Bold Cherry Red (Left: X = -3.8) ---
p1_base = create_box("Pump1_Base", (1.3, 1.0, 0.35), (-3.8, -11.4, 0.75), mat=m_metal_dark)
p1_body = create_box("Pump1_Body", (1.1, 0.85, 2.0), (-3.8, -11.4, 1.9), mat=m_pump_red)
p1_panel = create_box("Pump1_Panel", (1.16, 0.75, 1.6), (-3.8, -11.4, 1.9), mat=m_retro_orange)
p1_meter = create_box("Pump1_Meter", (0.85, 0.1, 0.7), (-3.8, -11.85, 2.2), mat=m_pump_meter)
p1_globe = create_cylinder("Pump1_Globe76", 0.34, 0.35, (-3.8, -11.4, 3.1), vertices=8, mat=m_retro_orange)
p1_nozzle = create_box("Pump1_Nozzle", (0.15, 0.25, 0.35), (-3.15, -11.4, 1.7), rot=(0, 0, 0.35), mat=m_metal_dark)
p1_hose = create_cylinder("Pump1_Hose", 0.06, 1.1, (-3.15, -11.4, 1.1), vertices=6, mat=m_tire)
all_objects.extend([p1_base, p1_body, p1_panel, p1_meter, p1_globe, p1_nozzle, p1_hose])

# --- PUMP 2: Bright Retro Yellow (Center: X = 0.0, Tilted & Dented) ---
p2_base = create_box("Pump2_Base", (1.3, 1.0, 0.35), (0.0, -11.5, 0.75), mat=m_metal_dark)
p2_body = create_box("Pump2_Body", (1.1, 0.85, 2.0), (0.0, -11.5, 1.9), rot=(0.06, 0.05, 0.12), mat=m_pump_yellow)
p2_meter = create_box("Pump2_Meter", (0.85, 0.1, 0.7), (0.0, -11.95, 2.2), rot=(0.06, 0.05, 0.12), mat=m_pump_meter)
p2_open_panel = create_box("Pump2_OpenPanel", (0.8, 0.08, 0.85), (0.1, -12.02, 1.1), rot=(0.3, 0.1, 0.4), mat=m_metal_rust)
p2_dangling_nozzle = create_box("Pump2_DanglingNozzle", (0.15, 0.25, 0.35), (0.75, -11.8, 0.5), rot=(0.8, 0, 0.3), mat=m_metal_dark)
p2_top_cap = create_box("Pump2_TopCap", (1.0, 0.75, 0.2), (0.0, -11.5, 2.95), rot=(0.06, 0.05, 0.12), mat=m_metal_rust)
all_objects.extend([p2_base, p2_body, p2_meter, p2_open_panel, p2_dangling_nozzle, p2_top_cap])

# --- PUMP 3: Bold Seafoam Teal (Right: X = +3.8, Broken Dial) ---
p3_base = create_box("Pump3_Base", (1.3, 1.0, 0.35), (3.8, -11.6, 0.75), mat=m_metal_dark)
p3_body = create_box("Pump3_Body", (1.1, 0.85, 2.0), (3.8, -11.6, 1.9), rot=(-0.04, 0.08, -0.15), mat=m_pump_teal)
p3_meter = create_box("Pump3_Meter", (0.85, 0.1, 0.7), (3.8, -12.05, 2.2), rot=(-0.04, 0.08, -0.15), mat=m_glass_broken)
p3_globe = create_cylinder("Pump3_GlobeBroken", 0.34, 0.35, (3.8, -11.6, 3.1), rot=(0.2, 0, -0.3), vertices=8, mat=m_metal_rust)
p3_dent1 = create_box("Pump3_DentRubble", (0.55, 0.35, 0.35), (4.2, -11.8, 1.1), rot=(0.3, 0.2, 0.1), mat=m_metal_rust)
all_objects.extend([p3_base, p3_body, p3_meter, p3_globe, p3_dent1])


# =========================================================================
# 4. SLEEK COMPACT PUMP CANOPY (-30% Size, Elevated, Non-Dominating)
# Dimensions: 14.5m wide x 6.5m deep x 0.7m thick, elevated at 6.6m height
# =========================================================================
# 2 Support Pillars (Left: X = -4.0, Right: X = +4.0, Y = -11.5)
pil1_base = create_box("Canopy_Pil1_Pedestal", (1.0, 1.0, 0.9), (-4.0, -11.5, 0.9), mat=m_concrete_pad)
pil1_col = create_cylinder("Canopy_Pil1_Col", 0.32, 5.0, (-4.0, -11.5, 3.8), vertices=6, mat=m_metal_dark)
pil1_truss1 = create_cylinder("Canopy_Pil1_Truss1", 0.08, 2.2, (-4.0, -12.4, 5.5), rot=(0.6, 0, 0), vertices=4, mat=m_metal_rust)
pil1_truss2 = create_cylinder("Canopy_Pil1_Truss2", 0.08, 2.2, (-4.0, -10.6, 5.5), rot=(-0.6, 0, 0), vertices=4, mat=m_metal_rust)
all_objects.extend([pil1_base, pil1_col, pil1_truss1, pil1_truss2])

pil2_base = create_box("Canopy_Pil2_Pedestal", (1.0, 1.0, 0.9), (4.0, -11.5, 0.9), mat=m_concrete_pad)
pil2_col = create_cylinder("Canopy_Pil2_Col", 0.32, 4.8, (4.0, -11.5, 3.7), rot=(0.06, 0, -0.05), vertices=6, mat=m_metal_dark)
pil2_truss1 = create_cylinder("Canopy_Pil2_Truss1", 0.08, 2.2, (4.0, -12.4, 5.4), rot=(0.6, 0, 0), vertices=4, mat=m_metal_rust)
all_objects.extend([pil2_base, pil2_col, pil2_truss1])

# Sleek Canopy Roof Structure (14.5m wide x 6.5m deep x 0.7m thick)
canopy_deck = create_box("Canopy_Deck", (14.5, 6.5, 0.7), (0, -11.5, 6.6), rot=(-0.03, 0, 0.02), mat=m_canopy_cream)
canopy_f_orange = create_box("Canopy_Trim_F_Orange", (14.6, 0.08, 0.28), (0, -14.78, 6.6), rot=(-0.03, 0, 0.02), mat=m_retro_orange)
canopy_f_teal = create_box("Canopy_Trim_F_Teal", (14.6, 0.08, 0.18), (0, -14.78, 6.32), rot=(-0.03, 0, 0.02), mat=m_retro_teal)
canopy_b_orange = create_box("Canopy_Trim_B_Orange", (14.6, 0.08, 0.28), (0, -8.22, 6.6), rot=(-0.03, 0, 0.02), mat=m_retro_orange)
all_objects.extend([canopy_deck, canopy_f_orange, canopy_f_teal, canopy_b_orange])

# Collapsed Canopy Corner (North-East corner with dangling metal & wire light)
canopy_collapsed_panel = create_box("Canopy_CollapsedPanel", (3.2, 2.6, 0.10), (6.8, -13.5, 5.2), rot=(0.38, -0.22, 0.5), mat=m_metal_rust)
canopy_exposed_beam = create_cylinder("Canopy_ExposedBeam", 0.08, 2.6, (6.2, -13.0, 5.8), rot=(0.5, 0.3, 0), vertices=4, mat=m_metal_dark)
canopy_dangling_light = create_box("Canopy_DanglingLight", (1.0, 0.45, 0.12), (3.6, -12.0, 5.4), rot=(0.6, 0.2, -0.4), mat=m_sign_white)
all_objects.extend([canopy_collapsed_panel, canopy_exposed_beam, canopy_dangling_light])

# Underside lights
for lx in [-3.8, 0.0]:
    u_light = create_box(f"Canopy_UndersideLight_{lx}", (1.2, 0.5, 0.10), (lx, -11.5, 6.22), mat=m_sign_white)
    all_objects.append(u_light)


# =========================================================================
# 5. ABANDONED WRECKED VEHICLE (Parked on west apron: X = -9.2, Y = -7.5)
# =========================================================================
car_origin = Vector((-9.2, -7.5, 0.35))
car_rot = Euler((0.05, -0.04, 0.65))

car_body = create_box("Wreck_Car_Body", (4.2, 1.9, 0.85), car_origin + Vector((0, 0, 0.55)), rot=(0.05, -0.04, 0.65), mat=m_car_yellow)
car_cabin = create_box("Wreck_Car_Cabin", (2.3, 1.7, 0.70), car_origin + Vector((-0.3, 0.1, 1.25)), rot=(0.05, -0.04, 0.65), mat=m_car_yellow)
car_windshield = create_box("Wreck_Car_Windshield", (0.9, 1.6, 0.60), car_origin + Vector((0.75, -0.1, 1.2)), rot=(0.05, 0.4, 0.65), mat=m_glass_broken)
car_engine = create_box("Wreck_Car_Engine", (1.0, 0.85, 0.50), car_origin + Vector((1.35, -0.2, 0.7)), rot=(0.05, -0.04, 0.65), mat=m_metal_rust)
car_door_bent = create_box("Wreck_Car_DoorDetached", (1.1, 0.1, 0.80), car_origin + Vector((-0.2, -1.1, 0.4)), rot=(0.4, 0, 0.85), mat=m_car_yellow)
wheel_offsets = [Vector((1.2, 0.95, 0.05)), Vector((1.2, -0.95, 0.05)), Vector((-1.2, 0.95, 0.05)), Vector((-1.2, -0.95, 0.05))]
for w_idx, w_off in enumerate(wheel_offsets):
    rot_w_off = w_off.copy()
    rot_w_off.rotate(car_rot)
    wheel = create_cylinder(f"Wreck_Car_Wheel_{w_idx}", 0.36, 0.22, car_origin + rot_w_off, rot=(1.57, 0.65, 0), vertices=8, mat=m_tire)
    all_objects.append(wheel)

all_objects.extend([car_body, car_cabin, car_windshield, car_engine, car_door_bent])


# =========================================================================
# 6. CROOKED VINTAGE ROADSIDE TOTEM SIGN (At Driveway Entrance: X = -9.5, Y = -18.0)
# =========================================================================
totem_base = create_box("Totem_Pedestal", (1.3, 1.3, 0.55), (-9.5, -18.0, 0.28), mat=m_concrete_pad)
totem_pole_L = create_cylinder("Totem_Pole_L", 0.15, 8.5, (-9.8, -18.0, 4.4), rot=(0.14, 0, -0.22), vertices=6, mat=m_metal_dark)
totem_pole_R = create_cylinder("Totem_Pole_R", 0.15, 8.5, (-9.0, -18.0, 4.4), rot=(0.14, 0, -0.22), vertices=6, mat=m_metal_dark)
totem_sign_main = create_cylinder("Totem_SignOctagon", 2.2, 0.42, (-10.4, -18.2, 7.6), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_sign_red)
totem_sign_rim = create_cylinder("Totem_SignRim", 2.4, 0.32, (-10.4, -18.2, 7.6), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_retro_teal)
totem_sign_center = create_cylinder("Totem_SignCenter76", 1.5, 0.46, (-10.4, -18.2, 7.6), rot=(1.57, 0.22, 0.7), vertices=8, mat=m_sign_glow)
totem_arrow = create_box("Totem_NeonArrow", (2.6, 0.28, 0.45), (-10.2, -18.3, 5.4), rot=(0.14, 0.22, -0.35), mat=m_sign_glow)
all_objects.extend([totem_base, totem_pole_L, totem_pole_R, totem_sign_main, totem_sign_rim, totem_sign_center, totem_arrow])


# =========================================================================
# 7. DEBRIS, TIRES, BARRELS, PALLETS & OVERGROWTH VINES
# =========================================================================
# Stack of 4 tires near garage wall
for t_idx in range(4):
    t_obj = create_cylinder(f"Tire_Stack_{t_idx}", 0.42, 0.26, (-9.4, -0.5 + t_idx * 0.08, 0.28 + t_idx * 0.26), rot=(1.57, t_idx * 0.35, 0), vertices=8, mat=m_tire)
    all_objects.append(t_obj)

# 2 Loose tires lying flat on forecourt
t_flat1 = create_cylinder("Tire_Flat_1", 0.42, 0.24, (2.8, -14.5, 0.20), rot=(0, 0, 0.1), vertices=8, mat=m_tire)
t_flat2 = create_cylinder("Tire_Flat_2", 0.42, 0.24, (-2.0, -15.5, 0.20), rot=(0.1, 0, 0.3), vertices=8, mat=m_tire)
all_objects.extend([t_flat1, t_flat2])

# Metal Barrels (Hazard Yellow, Red Flammable, Dark Oil)
barrel_data = [
    {"name": "Barrel_Yellow_1", "loc": (-9.4, -2.2, 0.75), "rot": (0, 0, 0), "mat": m_barrel_yellow},
    {"name": "Barrel_Red_Overturned", "loc": (-6.8, -8.5, 0.48), "rot": (1.57, 0, 0.5), "mat": m_pump_red},
    {"name": "Barrel_Oil_1", "loc": (9.8, -1.0, 0.75), "rot": (0, 0, 0), "mat": m_barrel_oil},
    {"name": "Barrel_Oil_2_Tilted", "loc": (10.6, -0.2, 0.70), "rot": (0.2, 0, 0.15), "mat": m_barrel_oil},
    {"name": "Barrel_Yellow_2", "loc": (10.2, -4.5, 0.75), "rot": (0, 0, 0), "mat": m_barrel_yellow},
]
for bd in barrel_data:
    b_obj = create_cylinder(bd["name"], 0.44, 1.2, bd["loc"], rot=bd["rot"], vertices=8, mat=bd["mat"])
    all_objects.append(b_obj)

# Leaned Wooden Pallets
pallet_data = [
    {"name": "Pallet_1", "size": (1.5, 0.16, 1.5), "loc": (-9.2, 1.2, 0.85), "rot": (0, -0.18, 0.25)},
    {"name": "Pallet_2", "size": (1.4, 0.16, 1.4), "loc": (9.4, 2.2, 0.8), "rot": (0, 0.15, -0.22)},
    {"name": "Pallet_3_Broken", "size": (1.3, 0.15, 0.75), "loc": (1.8, -17.5, 0.20), "rot": (0.05, 0, 0.4)},
]
for pd in pallet_data:
    p_obj = create_box(pd["name"], pd["size"], pd["loc"], pd["rot"], mat=m_wood_plank)
    all_objects.append(p_obj)

# Overgrowth Vines & Weeds bursting from cracks
vines_data = [
    {"name": "Vine_GarageCorner", "size": (1.1, 1.1, 3.6), "loc": (-9.0, 3.0, 2.0), "rot": (0.05, 0.1, 0.25)},
    {"name": "Vine_MartRight", "size": (1.0, 1.0, 3.2), "loc": (9.0, 3.0, 1.8), "rot": (-0.05, 0.15, -0.2)},
    {"name": "Vine_CanopyPillar", "size": (0.8, 0.8, 2.8), "loc": (-4.0, -11.5, 2.2), "rot": (0.1, 0.05, 0.45)},
    {"name": "Weeds_Forecourt_1", "size": (1.4, 1.4, 0.65), "loc": (-2.5, -8.5, 0.4), "rot": (0, 0.8, 0)},
    {"name": "Weeds_Forecourt_2", "size": (1.3, 1.3, 0.60), "loc": (5.5, -6.5, 0.4), "rot": (0, -0.5, 0)},
]
for vd in vines_data:
    v_obj = create_box(vd["name"], vd["size"], vd["loc"], vd["rot"], mat=m_vines)
    all_objects.append(v_obj)

# Select all objects and export
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

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
