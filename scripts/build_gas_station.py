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
    # Support both Blender 4.x/5.x and legacy inputs
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

# Materials Definition - Stylized Cartoon Post-Apocalyptic Palette
m_wall = create_material("Mat_Wall", (0.78, 0.74, 0.65, 1.0), roughness=0.85) # Weathered stucco
m_wall_trim = create_material("Mat_WallTrim", (0.28, 0.42, 0.45, 1.0), roughness=0.7) # Teal painted trim
m_brick_base = create_material("Mat_BrickBase", (0.52, 0.32, 0.26, 1.0), roughness=0.9) # Brick wainscot
m_roof_tar = create_material("Mat_RoofTar", (0.22, 0.23, 0.25, 1.0), roughness=0.9) # Dark roof gravel
m_concrete = create_material("Mat_Concrete", (0.48, 0.50, 0.48, 1.0), roughness=0.85) # Cracked foundation
m_curb_yellow = create_material("Mat_CurbYellow", (0.85, 0.65, 0.18, 1.0), roughness=0.7) # Weathered yellow curb
m_canopy_white = create_material("Mat_CanopyWhite", (0.82, 0.84, 0.82, 1.0), roughness=0.75) # Canopy fascia
m_canopy_stripe = create_material("Mat_CanopyStripe", (0.88, 0.42, 0.15, 1.0), roughness=0.6) # Retro orange stripe
m_metal_rust = create_material("Mat_MetalRust", (0.45, 0.30, 0.24, 1.0), roughness=0.85, metallic=0.3) # Rusted steel
m_metal_dark = create_material("Mat_MetalDark", (0.22, 0.24, 0.26, 1.0), roughness=0.7, metallic=0.5) # Dark metal/posts
m_glass_clean = create_material("Mat_GlassClean", (0.35, 0.68, 0.72, 1.0), roughness=0.15, alpha=0.6) # Teal window glass
m_glass_broken = create_material("Mat_GlassBroken", (0.45, 0.75, 0.78, 1.0), roughness=0.25, alpha=0.5) # Jagged shard glass
m_wood_plank = create_material("Mat_WoodPlank", (0.46, 0.33, 0.22, 1.0), roughness=0.9) # Boarding planks
m_vines = create_material("Mat_Vines", (0.24, 0.45, 0.18, 1.0), roughness=0.8) # Overgrowth ivy
m_pump_red = create_material("Mat_PumpRed", (0.75, 0.22, 0.18, 1.0), roughness=0.55, metallic=0.2) # Red pump
m_pump_yellow = create_material("Mat_PumpYellow", (0.88, 0.66, 0.16, 1.0), roughness=0.55, metallic=0.2) # Yellow pump
m_pump_teal = create_material("Mat_PumpTeal", (0.22, 0.52, 0.54, 1.0), roughness=0.55, metallic=0.2) # Teal pump
m_pump_dial = create_material("Mat_PumpDial", (0.90, 0.92, 0.88, 1.0), roughness=0.4) # Meter face
m_sign_orange = create_material("Mat_SignOrange", (0.92, 0.55, 0.12, 1.0), roughness=0.4, emission=(0.92, 0.55, 0.12, 1.0), emission_strength=0.8)
m_sign_white = create_material("Mat_SignWhite", (0.95, 0.95, 0.95, 1.0), roughness=0.4)
m_tire = create_material("Mat_Tire", (0.16, 0.17, 0.18, 1.0), roughness=0.9)
m_barrel_oil = create_material("Mat_BarrelOil", (0.18, 0.18, 0.20, 1.0), roughness=0.6, metallic=0.3)

# Helper to create a mesh object
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

print("Building Abandoned Gas Station...")

# =========================================================================
# 1. MAIN CONVENIENCE STORE BUILDING (13m wide x 9m deep x 4.6m high)
# =========================================================================
building_group = []

# Main building foundation slab
slab = create_box("Store_Foundation", (13.6, 9.6, 0.35), (0, 0, 0.175), mat=m_concrete)
building_group.append(slab)

# Lower brick wainscot
brick_base = create_box("Store_BrickBase", (13.0, 9.0, 1.0), (0, 0, 0.5 + 0.35), mat=m_brick_base)
building_group.append(brick_base)

# Main stucco walls
walls = create_box("Store_MainWalls", (12.8, 8.8, 3.2), (0, 0, 1.6 + 1.35), mat=m_wall)
building_group.append(walls)

# Roof parapet / trim border
roof_trim = create_box("Store_RoofTrim", (13.4, 9.4, 0.5), (0, 0, 4.6), mat=m_wall_trim)
roof_top = create_box("Store_RoofSurface", (12.4, 8.4, 0.2), (0, 0, 4.5), mat=m_roof_tar)
building_group.extend([roof_trim, roof_top])

# Damaged / collapsed corner parapet detail (back-left corner)
roof_damage = create_box("Store_RoofDamage", (2.2, 2.2, 0.45), (-5.4, 3.4, 4.45), rot=(0.08, -0.06, 0.15), mat=m_metal_rust)
building_group.append(roof_damage)

# Rooftop AC Unit & Exhaust Vents
ac_box = create_box("Rooftop_AC", (1.8, 1.4, 1.1), (2.5, 1.2, 5.1), rot=(0, 0, 0.08), mat=m_metal_rust)
ac_fan = create_cylinder("Rooftop_AC_Fan", 0.45, 0.15, (2.5, 1.2, 5.7), vertices=8, mat=m_metal_dark)
vent1 = create_cylinder("Rooftop_Vent_1", 0.25, 0.9, (-2.5, 2.0, 5.0), vertices=6, mat=m_metal_rust)
vent2 = create_cylinder("Rooftop_Vent_2", 0.2, 0.7, (-3.5, 1.2, 4.9), rot=(0.12, 0, 0.1), vertices=6, mat=m_metal_dark)
building_group.extend([ac_box, ac_fan, vent1, vent2])

# Front Facade Storefront Windows & Entrance Door (Facing Y = -4.5)
# Entrance Doorway (Recessed at X = -1.2)
door_frame = create_box("Door_Frame", (1.8, 0.25, 2.7), (-1.2, -4.45, 1.7), mat=m_wall_trim)
door_leaf_ajar = create_box("Door_Leaf_Ajar", (0.85, 0.08, 2.5), (-1.5, -4.6, 1.6), rot=(0, 0, 0.45), mat=m_glass_clean)
building_group.extend([door_frame, door_leaf_ajar])

# Storefront Window 1 (Left - Boarded Up at X = -4.2)
win1_frame = create_box("Win1_Frame", (3.2, 0.2, 2.2), (-4.2, -4.45, 2.1), mat=m_wall_trim)
win1_glass = create_box("Win1_Glass", (3.0, 0.06, 2.0), (-4.2, -4.43, 2.1), mat=m_glass_clean)
# Boarding wooden planks
plank1 = create_box("Board_1", (3.4, 0.08, 0.28), (-4.2, -4.54, 1.4), rot=(0, 0, 0.06), mat=m_wood_plank)
plank2 = create_box("Board_2", (3.3, 0.08, 0.26), (-4.2, -4.54, 2.0), rot=(0, 0, -0.04), mat=m_wood_plank)
plank3 = create_box("Board_3", (3.4, 0.08, 0.28), (-4.2, -4.54, 2.6), rot=(0, 0, 0.08), mat=m_wood_plank)
plank4 = create_box("Board_4_Diag", (2.8, 0.08, 0.24), (-4.2, -4.56, 2.1), rot=(0, 0, 0.65), mat=m_wood_plank)
building_group.extend([win1_frame, win1_glass, plank1, plank2, plank3, plank4])

# Storefront Window 2 (Right - Shattered / Broken Glass at X = 2.4)
win2_frame = create_box("Win2_Frame", (3.6, 0.2, 2.2), (2.4, -4.45, 2.1), mat=m_wall_trim)
# Jagged broken shards
shard1 = create_box("Win2_Shard1", (1.4, 0.06, 1.2), (1.5, -4.43, 1.6), rot=(0, 0, 0.15), mat=m_glass_broken)
shard2 = create_box("Win2_Shard2", (1.2, 0.06, 0.9), (3.3, -4.43, 2.5), rot=(0, 0, -0.2), mat=m_glass_broken)
building_group.extend([win2_frame, shard1, shard2])

# Storefront Roof Sign ("OCTANE MART" Signboard above entrance)
sign_backing = create_box("Store_Sign_Backing", (5.2, 0.35, 1.1), (-0.5, -4.6, 4.3), rot=(0.04, 0, 0), mat=m_sign_orange)
sign_border = create_box("Store_Sign_Border", (5.4, 0.25, 1.25), (-0.5, -4.5, 4.3), mat=m_metal_dark)
sign_text_bar1 = create_box("Store_Sign_Stripe1", (4.6, 0.08, 0.15), (-0.5, -4.78, 4.6), mat=m_sign_white)
sign_text_bar2 = create_box("Store_Sign_Stripe2", (3.8, 0.08, 0.15), (-0.5, -4.78, 4.0), mat=m_sign_white)
building_group.extend([sign_backing, sign_border, sign_text_bar1, sign_text_bar2])


# =========================================================================
# 2. PUMP FORECOURT & 3 FUEL PUMPS
# =========================================================================
forecourt_group = []

# Forecourt main concrete ground slab (22m wide x 16m deep x 0.18m high)
forecourt_slab = create_box("Forecourt_Slab", (22.0, 16.0, 0.18), (0, -10.5, 0.09), mat=m_concrete)
# Oil puddle decals / dirt stain slab
oil_stain1 = create_cylinder("Oil_Stain_1", 1.8, 0.02, (-4.0, -10.5, 0.19), vertices=8, mat=m_roof_tar)
oil_stain2 = create_cylinder("Oil_Stain_2", 1.4, 0.02, (3.5, -11.5, 0.19), vertices=8, mat=m_roof_tar)
forecourt_group.extend([forecourt_slab, oil_stain1, oil_stain2])

# Raised Pump Island (14m wide x 2.6m deep x 0.35m high)
pump_island = create_box("Pump_Island", (14.0, 2.6, 0.32), (0, -11.0, 0.34), mat=m_curb_yellow)
pump_island_top = create_box("Pump_Island_Top", (13.6, 2.2, 0.08), (0, -11.0, 0.52), mat=m_concrete)
forecourt_group.extend([pump_island, pump_island_top])

# Concrete crash bollards at island ends
bollard_L1 = create_cylinder("Bollard_L1", 0.22, 0.9, (-6.6, -11.0, 0.75), vertices=8, mat=m_curb_yellow)
bollard_R1 = create_cylinder("Bollard_R1", 0.22, 0.9, (6.6, -11.0, 0.75), vertices=8, mat=m_curb_yellow)
forecourt_group.extend([bollard_L1, bollard_R1])

# --- PUMP 1: Vintage Crimson Red (Left at X = -4.2) ---
p1_base = create_box("Pump1_Base", (1.1, 0.85, 0.3), (-4.2, -11.0, 0.65), mat=m_metal_dark)
p1_body = create_box("Pump1_Body", (0.95, 0.75, 1.7), (-4.2, -11.0, 1.65), mat=m_pump_red)
p1_dial = create_box("Pump1_Dial", (0.7, 0.08, 0.6), (-4.2, -11.38, 1.9), mat=m_pump_dial)
p1_top_cap = create_cylinder("Pump1_Globe", 0.28, 0.3, (-4.2, -11.0, 2.65), vertices=8, mat=m_sign_orange)
# Nozzle & Hose
p1_nozzle = create_box("Pump1_Nozzle", (0.12, 0.2, 0.3), (-3.65, -11.0, 1.5), rot=(0, 0, 0.3), mat=m_metal_dark)
p1_hose = create_cylinder("Pump1_Hose", 0.05, 0.9, (-3.65, -11.0, 0.95), vertices=5, mat=m_tire)
forecourt_group.extend([p1_base, p1_body, p1_dial, p1_top_cap, p1_nozzle, p1_hose])

# --- PUMP 2: Vintage Yellow (Center at X = 0.0, Slightly Dented/Tilted) ---
p2_base = create_box("Pump2_Base", (1.1, 0.85, 0.3), (0.0, -11.0, 0.65), mat=m_metal_dark)
p2_body = create_box("Pump2_Body", (0.95, 0.75, 1.7), (0.0, -11.0, 1.65), rot=(0.04, 0, 0.06), mat=m_pump_yellow)
p2_dial = create_box("Pump2_Dial", (0.7, 0.08, 0.6), (0.0, -11.38, 1.9), rot=(0.04, 0, 0.06), mat=m_pump_dial)
p2_top_cap = create_box("Pump2_Cap", (0.85, 0.65, 0.15), (0.0, -11.0, 2.55), rot=(0.04, 0, 0.06), mat=m_metal_rust)
p2_nozzle = create_box("Pump2_Nozzle", (0.12, 0.2, 0.3), (0.55, -11.0, 1.45), rot=(0, 0, -0.2), mat=m_metal_dark)
p2_hose = create_cylinder("Pump2_Hose", 0.05, 0.8, (0.55, -11.0, 0.95), vertices=5, mat=m_tire)
forecourt_group.extend([p2_base, p2_body, p2_dial, p2_top_cap, p2_nozzle, p2_hose])

# --- PUMP 3: Faded Teal (Right at X = 4.2, Heavily Weathered/Missing Hose) ---
p3_base = create_box("Pump3_Base", (1.1, 0.85, 0.3), (4.2, -11.0, 0.65), mat=m_metal_dark)
p3_body = create_box("Pump3_Body", (0.95, 0.75, 1.7), (4.2, -11.0, 1.65), rot=(0, 0.05, -0.05), mat=m_pump_teal)
p3_dial = create_box("Pump3_Dial", (0.7, 0.08, 0.6), (4.2, -11.38, 1.9), rot=(0, 0.05, -0.05), mat=m_pump_dial)
p3_top_cap = create_cylinder("Pump3_Globe", 0.28, 0.3, (4.2, -11.0, 2.65), vertices=8, mat=m_metal_rust)
p3_dents = create_box("Pump3_DentedPanel", (0.98, 0.78, 0.5), (4.2, -11.0, 1.1), rot=(0.08, 0, 0.12), mat=m_metal_rust)
forecourt_group.extend([p3_base, p3_body, p3_dial, p3_top_cap, p3_dents])


# =========================================================================
# 3. PUMP OVERHEAD CANOPY (16m wide x 8.5m deep x 5.4m high)
# =========================================================================
canopy_group = []

# 2 Sturdy Support Pillars with Concrete Pedestals
# Pillar 1 (Left: X = -4.5, Y = -11.0)
pil1_base = create_box("Canopy_Pil1_Base", (0.9, 0.9, 0.8), (-4.5, -11.0, 0.9), mat=m_concrete)
pil1_col = create_cylinder("Canopy_Pil1_Col", 0.32, 4.4, (-4.5, -11.0, 3.3), vertices=6, mat=m_metal_dark)
pil1_brace1 = create_cylinder("Canopy_Pil1_Brace1", 0.08, 2.2, (-4.5, -11.0, 4.8), rot=(0.6, 0, 0), vertices=4, mat=m_metal_rust)
pil1_brace2 = create_cylinder("Canopy_Pil1_Brace2", 0.08, 2.2, (-4.5, -11.0, 4.8), rot=(-0.6, 0, 0), vertices=4, mat=m_metal_rust)
canopy_group.extend([pil1_base, pil1_col, pil1_brace1, pil1_brace2])

# Pillar 2 (Right: X = 4.5, Y = -11.0)
pil2_base = create_box("Canopy_Pil2_Base", (0.9, 0.9, 0.8), (4.5, -11.0, 0.9), mat=m_concrete)
pil2_col = create_cylinder("Canopy_Pil2_Col", 0.32, 4.4, (4.5, -11.0, 3.3), vertices=6, mat=m_metal_dark)
pil2_brace1 = create_cylinder("Canopy_Pil2_Brace1", 0.08, 2.2, (4.5, -11.0, 4.8), rot=(0.6, 0, 0), vertices=4, mat=m_metal_rust)
pil2_brace2 = create_cylinder("Canopy_Pil2_Brace2", 0.08, 2.2, (4.5, -11.0, 4.8), rot=(-0.6, 0, 0), vertices=4, mat=m_metal_rust)
canopy_group.extend([pil2_base, pil2_col, pil2_brace1, pil2_brace2])

# Main Canopy Roof Structure (16m wide x 8.5m deep x 0.9m thick fascia)
canopy_roof = create_box("Canopy_Roof_Structure", (16.2, 8.6, 0.85), (0, -11.0, 5.6), mat=m_canopy_white)
# Colored retro horizontal trim stripes
canopy_stripe_f = create_box("Canopy_Stripe_Front", (16.3, 0.08, 0.3), (0, -15.32, 5.6), mat=m_canopy_stripe)
canopy_stripe_b = create_box("Canopy_Stripe_Back", (16.3, 0.08, 0.3), (0, -6.68, 5.6), mat=m_canopy_stripe)
canopy_stripe_l = create_box("Canopy_Stripe_Left", (0.08, 8.7, 0.3), (-8.12, -11.0, 5.6), mat=m_canopy_stripe)
canopy_stripe_r = create_box("Canopy_Stripe_Right", (0.08, 8.7, 0.3), (8.12, -11.0, 5.6), mat=m_canopy_stripe)
canopy_group.extend([canopy_roof, canopy_stripe_f, canopy_stripe_b, canopy_stripe_l, canopy_stripe_r])

# Canopy Damage: Bent hanging sheet metal on South-East corner
canopy_sheet_hang = create_box("Canopy_HangingSheet", (2.4, 1.8, 0.08), (7.4, -14.8, 4.9), rot=(0.35, -0.2, 0.4), mat=m_metal_rust)
canopy_exposed_strut = create_cylinder("Canopy_ExposedStrut", 0.06, 1.6, (7.0, -14.4, 5.2), rot=(0.4, 0.2, 0), vertices=4, mat=m_metal_dark)
canopy_group.extend([canopy_sheet_hang, canopy_exposed_strut])

# Underside canopy light fixtures
for lx in [-4.2, 0.0, 4.2]:
    light_fixture = create_box(f"Canopy_Light_{lx}", (1.4, 0.6, 0.15), (lx, -11.0, 5.12), mat=m_sign_white)
    canopy_group.append(light_fixture)


# =========================================================================
# 4. SURROUNDING DEBRIS, TIRES, BARRELS, OVERGROWTH & TOTEM SIGN
# =========================================================================
details_group = []

# Roadside Totem Sign Pole (Vintage Gas Station Octagon Sign at X = -9.5, Y = -16.0)
totem_pole = create_cylinder("Totem_Pole", 0.2, 7.2, (-9.5, -16.0, 3.6), rot=(0.06, 0, -0.08), vertices=6, mat=m_metal_dark)
totem_sign_board = create_cylinder("Totem_SignBoard", 1.8, 0.35, (-9.8, -16.0, 6.4), rot=(1.57, 0, 0.6), vertices=8, mat=m_sign_orange)
totem_sign_trim = create_cylinder("Totem_SignTrim", 1.95, 0.25, (-9.8, -16.0, 6.4), rot=(1.57, 0, 0.6), vertices=8, mat=m_metal_dark)
details_group.extend([totem_pole, totem_sign_board, totem_sign_trim])

# Stack of 3 Old Tires leaned against store side wall
for t_idx in range(3):
    tire = create_cylinder(f"Store_Tire_{t_idx}", 0.45, 0.28, (6.8, -2.5 + t_idx * 0.1, 0.2 + t_idx * 0.28), rot=(1.57, t_idx * 0.4, 0), vertices=8, mat=m_tire)
    details_group.append(tire)

# Oil Barrels next to store wall
barrel1 = create_cylinder("Debris_Barrel_1", 0.45, 1.2, (7.0, -0.8, 0.65), vertices=8, mat=m_barrel_oil)
barrel2_tipped = create_cylinder("Debris_Barrel_2_Tipped", 0.45, 1.2, (7.2, 0.6, 0.45), rot=(1.57, 0, 0.4), vertices=8, mat=m_metal_rust)
details_group.extend([barrel1, barrel2_tipped])

# Wooden Pallets leaned against wall
pallet1 = create_box("Debris_Pallet_1", (1.4, 0.15, 1.4), (-6.6, 1.2, 0.8), rot=(0, -0.15, 0.2), mat=m_wood_plank)
pallet2 = create_box("Debris_Pallet_2", (1.3, 0.15, 1.3), (-6.6, -0.3, 0.75), rot=(0, 0.1, 0.25), mat=m_wood_plank)
details_group.extend([pallet1, pallet2])

# Subtle Ivy / Overgrowth climbing up the store corners
vines1 = create_box("Vines_Corner_1", (0.8, 0.8, 2.6), (-6.4, -4.3, 1.5), rot=(0.05, 0.1, 0.3), mat=m_vines)
vines2 = create_box("Vines_Corner_2", (0.7, 0.7, 1.8), (6.4, 4.3, 1.1), rot=(-0.05, 0.15, -0.2), mat=m_vines)
vines3_canopy = create_box("Vines_Canopy_Pillar", (0.6, 0.6, 2.2), (-4.5, -11.0, 1.8), rot=(0.1, 0.05, 0.4), mat=m_vines)
details_group.extend([vines1, vines2, vines3_canopy])

# Select all created objects and set origin to bottom center
all_objs = building_group + forecourt_group + canopy_group + details_group
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objs:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objs[0]

# Export to GLB format
output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "abandoned_gas_station.glb")

print(f"Exporting {len(all_objs)} objects to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("Export completed successfully!")
