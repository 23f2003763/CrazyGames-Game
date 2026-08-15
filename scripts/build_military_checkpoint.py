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
# VIBRANT, HIGH-CONTRAST POST-APOCALYPTIC MILITARY PALETTE
# Olive Green + Rust Orange + Hazard Yellow + Faded Red + Charcoal + Concrete Beige
# =========================================================================
m_mil_olive = create_material("Mat_MilOlive", (0.22, 0.38, 0.16, 1.0), roughness=0.65, metallic=0.2)
m_mil_camo_dark = create_material("Mat_MilCamoDark", (0.14, 0.22, 0.10, 1.0), roughness=0.8)
m_rust_orange = create_material("Mat_RustOrange", (0.86, 0.34, 0.08, 1.0), roughness=0.85, metallic=0.25)
m_hazard_yellow = create_material("Mat_HazardYellow", (0.98, 0.80, 0.06, 1.0), roughness=0.45)
m_dark_charcoal = create_material("Mat_DarkCharcoal", (0.12, 0.13, 0.14, 1.0), roughness=0.95) # Scorched blast
m_asphalt_weathered = create_material("Mat_AsphaltWeathered", (0.24, 0.25, 0.27, 1.0), roughness=0.92) # Cracked road
m_dirt_churned = create_material("Mat_DirtChurned", (0.34, 0.24, 0.14, 1.0), roughness=0.95) # Churned dirt
m_concrete_beige = create_material("Mat_ConcreteBeige", (0.58, 0.56, 0.48, 1.0), roughness=0.85) # Dirty concrete
m_faded_red = create_material("Mat_FadedRed", (0.90, 0.16, 0.10, 1.0), roughness=0.45, metallic=0.2)
m_sandbag_tan = create_material("Mat_SandbagTan", (0.72, 0.60, 0.40, 1.0), roughness=0.95)
m_metal_dark = create_material("Mat_MetalDark", (0.16, 0.18, 0.20, 1.0), roughness=0.6, metallic=0.5)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.38, 0.42, 0.45, 1.0), roughness=0.7, metallic=0.3)
m_tarp_olive = create_material("Mat_TarpOlive", (0.26, 0.42, 0.20, 1.0), roughness=0.92)
m_lamp_amber = create_material("Mat_LampAmber", (0.98, 0.75, 0.16, 1.0), roughness=0.3, emission=(0.98, 0.75, 0.16, 1.0), emission_strength=2.4)
m_explosive_glow = create_material("Mat_ExplosiveGlow", (0.98, 0.20, 0.06, 1.0), roughness=0.3, emission=(0.98, 0.20, 0.06, 1.0), emission_strength=2.8)
m_tire = create_material("Mat_Tire", (0.12, 0.13, 0.14, 1.0), roughness=0.92)
m_glass_dark = create_material("Mat_GlassDark", (0.06, 0.08, 0.10, 1.0), roughness=0.2, alpha=0.9)
m_vines_charred = create_material("Mat_VinesCharred", (0.22, 0.44, 0.14, 1.0), roughness=0.8)

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
    empty.empty_display_size = 1.0
    empty.location = loc
    empty.rotation_euler = rot
    bpy.context.scene.collection.objects.link(empty)
    return empty

print("Building Redesigned Military Checkpoint with Strong Centerpiece & Grouped Clusters...")

all_objects = []

# =========================================================================
# 1. 6 IRREGULAR, BLENDED COMBAT GROUND ZONES (NO GIANT FLAT GREY SLAB)
# Layered multi-faceted polygons with scorched blast marks and dirt seams
# =========================================================================
# Underlay dark dirt & ash footprint (non-rectangular, broken bounds)
ground_dirt = create_box("Ground_DirtUnderlay", (38.0, 36.0, 0.08), (0, 0, 0.04), mat=m_dirt_churned)
all_objects.append(ground_dirt)

# Zone 1: Scorched Blast Killzone (Center-West: X = -4.0, Y = -1.0)
zone1_scorch = create_box("Zone1_ScorchedKillzone", (18.0, 16.0, 0.12), (-3.5, -1.0, 0.08), rot=(0, 0, 0.08), mat=m_dark_charcoal)
# Zone 2: Cracked Highway Asphalt (South Entry Lane 1: Y = -16..-8)
zone2_asphalt = create_box("Zone2_HighwayAsphalt", (11.0, 14.0, 0.14), (0.5, -13.0, 0.09), rot=(0, 0, -0.04), mat=m_asphalt_weathered)
# Zone 3: Dirty Concrete Bunker Pad (NW Bunker Cluster: X = -14.0, Y = 8.0)
zone3_concrete = create_box("Zone3_BunkerConcrete", (15.0, 13.0, 0.16), (-13.0, 8.0, 0.10), rot=(0, 0, -0.06), mat=m_concrete_beige)
# Zone 4: Churned Red Dirt & Tracks (NE Container Lane 3: X = +13.0, Y = +6.0)
zone4_dirt = create_box("Zone4_ContainerDirt", (13.0, 15.0, 0.12), (13.0, 6.0, 0.08), rot=(0, 0, 0.12), mat=m_dirt_churned)
# Zone 5: Breached Forest Verge (NW Lane 2: X = -14.0, Y = +15.0)
zone5_breach = create_box("Zone5_ForestBreach", (11.0, 11.0, 0.10), (-14.0, 15.0, 0.07), rot=(0, 0, 0.2), mat=m_dark_charcoal)
# Zone 6: South-East Roadside Shoulder (SE Tent & Pallet Zone: X = +11.0, Y = -11.0)
zone6_shoulder = create_box("Zone6_RoadShoulder", (11.0, 11.0, 0.12), (11.0, -11.0, 0.08), rot=(0, 0, -0.15), mat=m_asphalt_weathered)
all_objects.extend([zone1_scorch, zone2_asphalt, zone3_concrete, zone4_dirt, zone5_breach, zone6_shoulder])

# Yellow Highway Turnoff Centerline Markings on Lane 1 Asphalt
for my in [-17.0, -13.5, -10.0, -6.5]:
    c_line = create_box(f"Highway_YellowStripe_{my}", (0.35, 2.0, 0.02), (0.5, my, 0.17), rot=(0, 0, -0.04), mat=m_hazard_yellow)
    all_objects.append(c_line)

# 4 Large Distinct Blast Craters
crater1 = create_cylinder("BlastCrater_CenterCore", 3.2, 0.02, (-3.5, -1.0, 0.16), vertices=8, mat=m_dark_charcoal)
crater2 = create_cylinder("BlastCrater_Lane1", 2.6, 0.02, (2.5, -9.0, 0.16), vertices=8, mat=m_dark_charcoal)
crater3 = create_cylinder("BlastCrater_Lane2", 2.8, 0.02, (-12.0, 11.0, 0.16), vertices=8, mat=m_dark_charcoal)
crater4 = create_cylinder("BlastCrater_Lane3", 2.5, 0.02, (10.0, 8.0, 0.16), vertices=8, mat=m_dark_charcoal)
all_objects.extend([crater1, crater2, crater3, crater4])

# 20 Broken Jagged Concrete/Asphalt Perimeter Chunks
perimeter_chunks = [
    (-18.0, -13.0, 0.3), (-19.5, -4.0, -0.4), (-19.0, 5.0, 0.2), (-16.5, 15.0, -0.3),
    (-7.0, 18.0, 0.4), (7.0, 18.0, -0.2), (17.5, 14.0, 0.3), (19.0, 4.0, -0.4),
    (19.5, -5.0, 0.2), (17.0, -14.0, -0.3), (-8.5, -18.0, 0.4), (8.5, -18.0, -0.2),
    (-12.0, -6.0, 0.2), (12.0, -5.0, -0.2), (0, -19.5, 0.3), (0, 18.5, -0.2)
]
for c_idx, (cx, cy, crot) in enumerate(perimeter_chunks):
    c_mesh = create_box(f"Combat_Chunk_{c_idx}", (2.6, 2.0, 0.16), (cx, cy, 0.10), rot=(0, 0, crot), mat=m_concrete_beige)
    all_objects.append(c_mesh)


# =========================================================================
# 2. MEMORABLE CENTERPIECE: WRECKED ARMORED APC (Tilted in Killzone)
# Positioned at (X = -2.5, Y = -2.0) with dynamic 14° tilt and battle damage
# =========================================================================
apc_origin = Vector((-2.5, -2.0, 0.35))
apc_rot = Euler((0.15, -0.10, 0.65))

# Heavy Armored Lower Hull (Olive Drab with scorched black blast marks)
apc_hull_lower = create_box("APC_Center_HullLower", (5.6, 2.6, 1.0), apc_origin + Vector((0, 0, 0.6)), rot=(0.15, -0.10, 0.65), mat=m_mil_olive)
apc_hull_upper = create_box("APC_Center_HullUpper", (3.9, 2.4, 0.85), apc_origin + Vector((-0.2, 0, 1.45)), rot=(0.15, -0.10, 0.65), mat=m_mil_camo_dark)
# Rotated, Smashed Turret with elevated 90mm cannon
apc_turret = create_cylinder("APC_Center_TurretRing", 1.0, 0.7, apc_origin + Vector((0.4, 0, 2.1)), rot=(0.25, 0.1, 1.1), vertices=8, mat=m_metal_dark)
apc_cannon = create_cylinder("APC_Center_CannonBarrel", 0.14, 2.8, apc_origin + Vector((1.8, -0.5, 2.4)), rot=(1.35, 0.5, 0.3), vertices=6, mat=m_rust_orange)
# Slat Armor Plates (Rust Orange) and crushed front grill
apc_slat_R = create_box("APC_Center_SlatArmorR", (3.2, 0.12, 0.9), apc_origin + Vector((0, 1.4, 0.9)), rot=(0.4, 0, 0.65), mat=m_rust_orange)
apc_slat_L = create_box("APC_Center_SlatArmorL", (3.2, 0.12, 0.9), apc_origin + Vector((0, -1.4, 0.9)), rot=(-0.2, 0, 0.65), mat=m_rust_orange)
apc_blast_char = create_box("APC_Center_BlastChar", (1.8, 0.08, 0.7), apc_origin + Vector((1.2, 1.35, 0.95)), rot=(0.4, 0, 0.65), mat=m_dark_charcoal)

# 6 Heavy Deflated Combat Tires
apc_wheel_offsets = [
    Vector((1.8, 1.4, 0.05)), Vector((1.8, -1.4, 0.05)),
    Vector((0, 1.4, 0.05)), Vector((0, -1.4, 0.05)),
    Vector((-1.8, 1.4, 0.05)), Vector((-1.8, -1.4, 0.05))
]
for w_idx, w_off in enumerate(apc_wheel_offsets):
    rot_off = w_off.copy()
    rot_off.rotate(apc_rot)
    w_mesh = create_cylinder(f"APC_Center_Wheel_{w_idx}", 0.52, 0.36, apc_origin + rot_off, rot=(1.57, 0.65, 0), vertices=8, mat=m_tire)
    all_objects.append(w_mesh)

all_objects.extend([apc_hull_lower, apc_hull_upper, apc_turret, apc_cannon, apc_slat_R, apc_slat_L, apc_blast_char])


# =========================================================================
# 3. GROUPED CLUSTER 1: COMMAND BUNKER & SUPPLY DEPOT (NW: X = -14.0, Y = +9.0)
# =========================================================================
# Heavy Concrete Bunker Structure
bunker_base = create_box("Bunker_HeavyBase", (13.0, 8.5, 1.4), (-14.0, 9.0, 0.7), mat=m_concrete_beige)
bunker_walls = create_box("Bunker_ConcreteWalls", (12.0, 7.8, 3.4), (-14.0, 9.0, 3.0), mat=m_mil_olive)
bunker_roof = create_box("Bunker_HeavyRoofDeck", (13.6, 9.2, 0.55), (-14.0, 9.0, 4.95), mat=m_concrete_beige)

# Sandbag rooftop machine gun nest
sb_roof_f = create_box("Bunker_SandbagRoofF", (11.5, 0.5, 0.7), (-14.0, 5.2, 5.55), mat=m_sandbag_tan)
sb_roof_s = create_box("Bunker_SandbagRoofS", (0.5, 6.8, 0.7), (-8.2, 9.0, 5.55), mat=m_sandbag_tan)
all_objects.extend([bunker_base, bunker_walls, bunker_roof, sb_roof_f, sb_roof_s])

# Heavy Armored Blast Door & Slit
bunker_door_frame = create_box("Bunker_BlastDoorFrame", (2.6, 0.35, 3.0), (-14.0, 5.1, 2.1), mat=m_metal_dark)
bunker_door_leaf = create_box("Bunker_BlastDoorLeaf", (2.1, 0.2, 2.7), (-14.0, 5.15, 2.1), mat=m_rust_orange)
obs_slit = create_box("Bunker_ObservationSlit", (5.2, 0.25, 0.45), (-14.0, 5.15, 3.8), mat=m_glass_dark)
all_objects.extend([bunker_door_frame, bunker_door_leaf, obs_slit])

# Rooftop Radar Dish & Long-Range Antenna
radar_pedestal = create_box("Bunker_RadarPedestal", (1.3, 1.3, 0.9), (-10.5, 10.5, 5.65), mat=m_metal_dark)
radar_dish = create_cylinder("Bunker_RadarDish", 1.2, 0.28, (-10.5, 10.5, 6.8), rot=(0.6, 0.3, -0.4), vertices=8, mat=m_mil_olive)
bunker_antenna = create_cylinder("Bunker_AntennaPole", 0.09, 4.8, (-18.0, 10.5, 7.3), rot=(0.12, -0.15, 0), vertices=4, mat=m_metal_dark)
all_objects.extend([radar_pedestal, radar_dish, bunker_antenna])

# Stacked Shipping Container integrated with Bunker East Wall (Olive Green & Caution Yellow)
cont_bunker_1 = create_box("Cont_Bunker_Olive", (6.5, 2.5, 2.6), (-7.0, 8.5, 1.35), rot=(0, 0, 1.57), mat=m_mil_olive)
cont_bunker_2 = create_box("Cont_Bunker_Yellow", (6.5, 2.5, 2.6), (-7.0, 8.5, 3.95), rot=(0, 0, 1.57), mat=m_hazard_yellow)
all_objects.extend([cont_bunker_1, cont_bunker_2])


# =========================================================================
# 4. GROUPED CLUSTER 2: SOUTH ENTRANCE ROADBLOCK & WEST WATCHTOWER
# (SW: X = -16.0..0.0, Y = -18.0..-10.0)
# =========================================================================
# Guard Tower 1: South-West Corner (X = -16.0, Y = -12.0, Height = 8.5m)
for px, py in [(-17.5, -13.5), (-14.5, -13.5), (-17.5, -10.5), (-14.5, -10.5)]:
    col = create_cylinder(f"TowerSW_Col_{px}_{py}", 0.18, 7.5, (px, py, 3.75), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerSW_floor = create_box("TowerSW_Floor", (3.6, 3.6, 0.25), (-16.0, -12.0, 6.0), mat=m_concrete_beige)
towerSW_cabin = create_box("TowerSW_Cabin", (3.3, 3.3, 1.8), (-16.0, -12.0, 7.0), mat=m_mil_olive)
towerSW_roof = create_box("TowerSW_Roof", (4.0, 4.0, 0.25), (-16.0, -12.0, 8.0), rot=(-0.05, 0, 0.05), mat=m_rust_orange)
towerSW_light = create_cylinder("TowerSW_Searchlight", 0.32, 0.5, (-14.5, -13.0, 6.7), rot=(0.7, 0.5, 0), vertices=6, mat=m_lamp_amber)
all_objects.extend([towerSW_floor, towerSW_cabin, towerSW_roof, towerSW_light])

# Crushed Turnpike Gate & Pedestals at Lane 1 (Y = -16.0)
gate_ped_L = create_box("Gate_Ped_L", (1.2, 1.2, 1.6), (-4.5, -16.0, 0.8), mat=m_concrete_beige)
gate_ped_R = create_box("Gate_Ped_R", (1.2, 1.2, 1.6), (5.5, -16.0, 0.8), mat=m_concrete_beige)
gate_boom_1 = create_box("Gate_Boom_Snapped", (5.4, 0.2, 0.4), (-1.2, -16.0, 0.7), rot=(0, 0.25, 0.12), mat=m_hazard_yellow)
gate_boom_2 = create_box("Gate_Boom_Fallen", (4.4, 0.2, 0.4), (2.8, -15.8, 0.25), rot=(0.1, 0, -0.4), mat=m_hazard_yellow)
all_objects.extend([gate_ped_L, gate_ped_R, gate_boom_1, gate_boom_2])

# Concrete Jersey Barriers with Hazard Stripes flanking Lane 1
jersey_lane1 = [
    {"x": -8.0, "y": -15.5, "rot": 0.35},
    {"x": -5.5, "y": -16.2, "rot": 0.05},
    {"x": 6.0, "y": -16.2, "rot": -0.05},
    {"x": 9.0, "y": -15.5, "rot": -0.35},
    {"x": -11.5, "y": -13.5, "rot": 0.6},
]
for b_idx, bd in enumerate(jersey_lane1):
    jb_base = create_box(f"Jersey_L1_Base_{b_idx}", (3.0, 0.55, 0.85), (bd["x"], bd["y"], 0.28), rot=(0, 0, bd["rot"]), mat=m_concrete_beige)
    jb_top = create_box(f"Jersey_L1_Top_{b_idx}", (2.8, 0.65, 0.45), (bd["x"], bd["y"], 0.85), rot=(0, 0, bd["rot"]), mat=m_hazard_yellow)
    all_objects.extend([jb_base, jb_top])

# Large Warning Sign: "RESTRICTED AREA - LETHAL FORCE" (At Entrance: X = -4.5, Y = -18.0)
sign_leg_L = create_cylinder("Sign_LegL", 0.09, 3.8, (-5.8, -18.0, 1.9), vertices=4, mat=m_metal_dark)
sign_leg_R = create_cylinder("Sign_LegR", 0.09, 3.8, (-3.2, -18.0, 1.9), vertices=4, mat=m_metal_dark)
sign_board = create_box("Sign_Board", (2.8, 0.12, 1.6), (-4.5, -18.0, 2.9), rot=(0.08, 0, 0), mat=m_faded_red)
sign_center = create_box("Sign_Center", (2.5, 0.14, 1.3), (-4.5, -18.0, 2.9), rot=(0.08, 0, 0), mat=m_hazard_yellow)
all_objects.extend([sign_leg_L, sign_leg_R, sign_board, sign_center])


# =========================================================================
# 5. GROUPED CLUSTER 3: EAST CONTAINER WALL & WATCHTOWER 2
# (East: X = +12.0..+18.0, Y = -10.0..+12.0)
# =========================================================================
# Guard Tower 2: North-East Corner (X = +15.0, Y = +10.0, Height = 8.5m)
for px, py in [(13.5, 8.5), (16.5, 8.5), (13.5, 11.5), (16.5, 11.5)]:
    col = create_cylinder(f"TowerNE_Col_{px}_{py}", 0.18, 7.5, (px, py, 3.75), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerNE_floor = create_box("TowerNE_Floor", (3.6, 3.6, 0.25), (15.0, 10.0, 6.0), mat=m_concrete_beige)
towerNE_cabin = create_box("TowerNE_Cabin", (3.3, 3.3, 1.8), (15.0, 10.0, 7.0), mat=m_mil_olive)
towerNE_roof = create_box("TowerNE_Roof", (4.0, 4.0, 0.25), (15.0, 10.0, 8.0), rot=(0.05, 0, -0.05), mat=m_hazard_yellow)
towerNE_siren = create_cylinder("TowerNE_SirenHorn", 0.25, 0.55, (13.5, 8.8, 6.7), rot=(0.6, -0.4, 0), vertices=6, mat=m_metal_dark)
all_objects.extend([towerNE_floor, towerNE_cabin, towerNE_roof, towerNE_siren])

# Stacked Shipping Containers forming East Choke Wall
cont_e1 = create_box("Cont_East_Rust1", (7.0, 2.6, 2.8), (15.0, 2.0, 1.45), rot=(0, 0, 0.05), mat=m_rust_orange)
cont_e2 = create_box("Cont_East_Olive2", (7.0, 2.6, 2.8), (15.0, -4.5, 1.45), rot=(0, 0, -0.05), mat=m_mil_olive)
cont_e3_top = create_box("Cont_East_YellowTop", (7.0, 2.6, 2.8), (15.0, -1.0, 4.25), rot=(0, 0, 0.02), mat=m_hazard_yellow)
all_objects.extend([cont_e1, cont_e2, cont_e3_top])

# Destroyed Command Tent & Pallets (SE Flank: X = 11.5, Y = -10.0)
tent_pole1 = create_cylinder("Tent_Pole1", 0.09, 2.8, (9.5, -10.0, 1.4), rot=(0.2, 0, 0), vertices=4, mat=m_metal_dark)
tent_pole2 = create_cylinder("Tent_Pole2", 0.09, 2.6, (13.5, -10.0, 1.3), rot=(-0.3, 0.2, 0), vertices=4, mat=m_metal_dark)
tent_tarp = create_box("Tent_CollapsedCanvas", (4.2, 3.2, 0.2), (11.5, -10.0, 0.4), rot=(0.15, -0.1, 0.3), mat=m_tarp_olive)
all_objects.extend([tent_pole1, tent_pole2, tent_tarp])

# Large Military Supply Pallets & Ammo Crate Stacks
mil_crates = [
    {"name": "MilCrate_1", "size": (1.4, 1.4, 1.2), "loc": (10.5, -12.5, 0.6), "rot": 0.2, "mat": m_mil_olive},
    {"name": "MilCrate_2", "size": (1.2, 1.2, 1.0), "loc": (10.5, -12.5, 1.7), "rot": -0.15, "mat": m_mil_camo_dark},
    {"name": "MilCrate_3", "size": (1.5, 1.0, 0.9), "loc": (-10.5, 2.5, 0.45), "rot": 0.4, "mat": m_rust_orange},
    {"name": "MilCrate_4", "size": (1.3, 1.3, 1.1), "loc": (-13.5, -9.5, 0.55), "rot": -0.25, "mat": m_mil_olive},
]
for mc in mil_crates:
    mc_obj = create_box(mc["name"], mc["size"], mc["loc"], rot=(0, 0, mc["rot"]), mat=mc["mat"])
    all_objects.append(mc_obj)


# =========================================================================
# 6. ANTI-TANK CZECH HEDGEHOGS (Chokepoints at Choke Corners)
# =========================================================================
hedgehog_locs = [(-6.5, -17.5), (6.5, -17.5), (-12.5, 15.5), (11.5, 13.5), (-15.0, -6.0), (15.0, -8.0)]
for h_idx, (hx, hy) in enumerate(hedgehog_locs):
    b1 = create_box(f"Hedgehog_{h_idx}_1", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(0.7, 0.7, 0), mat=m_rust_orange)
    b2 = create_box(f"Hedgehog_{h_idx}_2", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(-0.7, 0.7, 0), mat=m_rust_orange)
    b3 = create_box(f"Hedgehog_{h_idx}_3", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(0, 0, 0.7), mat=m_metal_dark)
    all_objects.extend([b1, b2, b3])


# =========================================================================
# 7. 3 HIGH-CONTRAST EXPLOSIVE FUEL BARRELS (Edge Chokepoints)
# =========================================================================
exp_coords = [
    {"name": "Explosive_Barrel_1", "loc": (-8.5, 3.5, 0.7), "rot": (0, 0, 0)},     # Bunker east corner
    {"name": "Explosive_Barrel_2", "loc": (10.0, 3.5, 0.7), "rot": (0, 0, 0.2)},    # Container west corner
    {"name": "Explosive_Barrel_3", "loc": (4.5, -12.0, 0.7), "rot": (0, 0, -0.15)}   # Entrance barrier corner
]
for ed in exp_coords:
    b_main = create_cylinder(ed["name"], 0.52, 1.35, ed["loc"], rot=ed["rot"], vertices=8, mat=m_faded_red)
    b_hazard = create_cylinder(f"{ed['name']}_Ring", 0.54, 0.28, (ed["loc"][0], ed["loc"][1], ed["loc"][2] + 0.1), rot=ed["rot"], vertices=8, mat=m_explosive_glow)
    all_objects.extend([b_main, b_hazard])


# =========================================================================
# 8. PRESERVED GAMEPLAY SOCKETS
# =========================================================================
sockets = [
    create_socket("SOCKET_PLAYER_ENTRY", (0.0, -18.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_HORDE_A", (14.0, 15.0, 0.1), (0, 0, 2.35)),     # NE Container Choke
    create_socket("SOCKET_HORDE_B", (-15.0, 15.0, 0.1), (0, 0, -2.35)),   # NW Forest Breach
    create_socket("SOCKET_HORDE_C", (0.0, 17.0, 0.1), (0, 0, 3.14)),       # North Rear Culvert
    create_socket("SOCKET_BOSS", (0.0, 6.0, 0.1), (0, 0, 3.14)),           # Arena Back
    create_socket("SOCKET_EXPLOSIVE_1", (-8.5, 3.5, 0.1), (0, 0, 0)),      # Bunker edge
    create_socket("SOCKET_EXPLOSIVE_2", (10.0, 3.5, 0.1), (0, 0, 0)),      # Container edge
    create_socket("SOCKET_EXPLOSIVE_3", (4.5, -12.0, 0.1), (0, 0, 0)),     # Entrance edge
    create_socket("SOCKET_GATE", (0.0, -16.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_BUNKER_DOOR", (-14.0, 5.1, 0.1), (0, 0, 0)),
]
all_objects.extend(sockets)

# Select all objects and export
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "military_checkpoint.glb")

print(f"Exporting {len(all_objects)} objects/sockets to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("Redesigned 'MILITARY CHECKPOINT' exported successfully!")
