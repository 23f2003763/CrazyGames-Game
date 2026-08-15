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
# VIBRANT CARTOON POST-APOCALYPTIC MILITARY PALETTE
# =========================================================================
m_mil_olive = create_material("Mat_MilOlive", (0.24, 0.36, 0.18, 1.0), roughness=0.7, metallic=0.2)   # Olive green
m_mil_camo_dark = create_material("Mat_MilCamoDark", (0.16, 0.22, 0.14, 1.0), roughness=0.8)         # Dark olive
m_rust_orange = create_material("Mat_RustOrange", (0.78, 0.32, 0.12, 1.0), roughness=0.85, metallic=0.25) # Rust orange
m_hazard_yellow = create_material("Mat_HazardYellow", (0.96, 0.76, 0.08, 1.0), roughness=0.45)        # Warning yellow
m_dark_charcoal = create_material("Mat_DarkCharcoal", (0.14, 0.15, 0.16, 1.0), roughness=0.92)       # Scorched asphalt
m_faded_red = create_material("Mat_FadedRed", (0.84, 0.16, 0.12, 1.0), roughness=0.5, metallic=0.2)  # Explosive red
m_concrete_drab = create_material("Mat_ConcreteDrab", (0.48, 0.50, 0.46, 1.0), roughness=0.88)       # Bunker concrete
m_sandbag_tan = create_material("Mat_SandbagTan", (0.68, 0.58, 0.42, 1.0), roughness=0.95)          # Sandbags
m_metal_dark = create_material("Mat_MetalDark", (0.18, 0.20, 0.22, 1.0), roughness=0.6, metallic=0.5)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.40, 0.44, 0.46, 1.0), roughness=0.7, metallic=0.3)
m_tarp_olive = create_material("Mat_TarpOlive", (0.28, 0.40, 0.22, 1.0), roughness=0.92)             # Tattered tent canvas
m_tarp_camo = create_material("Mat_TarpCamo", (0.42, 0.45, 0.32, 1.0), roughness=0.92)
m_lamp_amber = create_material("Mat_LampAmber", (0.98, 0.72, 0.18, 1.0), roughness=0.3, emission=(0.98, 0.72, 0.18, 1.0), emission_strength=2.2)
m_explosive_glow = create_material("Mat_ExplosiveGlow", (0.98, 0.22, 0.08, 1.0), roughness=0.3, emission=(0.98, 0.22, 0.08, 1.0), emission_strength=2.5)
m_tire = create_material("Mat_Tire", (0.13, 0.14, 0.15, 1.0), roughness=0.92)
m_glass_dark = create_material("Mat_GlassDark", (0.08, 0.10, 0.12, 1.0), roughness=0.2, alpha=0.9)
m_vines = create_material("Mat_Vines", (0.28, 0.58, 0.16, 1.0), roughness=0.75)

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
    empty.empty_display_size = 0.8
    empty.location = loc
    empty.rotation_euler = rot
    bpy.context.scene.collection.objects.link(empty)
    return empty

print("Building 'MILITARY CHECKPOINT (OUTPOST OMEGA)' Combat Arena...")

all_objects = []

# =========================================================================
# 1. SCORCHED CRACKED COMBAT ARENA FLOOR (Wide Open 18m x 16m Arena)
# =========================================================================
# Underlay scorched dark earth & ash
ground_scorch = create_box("Arena_ScorchBed", (28.0, 26.0, 0.10), (0, 0, 0.05), mat=m_dark_charcoal)
all_objects.append(ground_scorch)

# Main broken asphalt fighting pad with blast damage
arena_slabs = [
    {"name": "Arena_CenterPad", "size": (16.0, 14.0, 0.16), "loc": (0, 0, 0.09), "rot": 0.04, "mat": m_concrete_drab},
    {"name": "Arena_SouthEntry", "size": (9.0, 8.0, 0.16), "loc": (0, -10.5, 0.09), "rot": -0.05, "mat": m_dark_charcoal},
    {"name": "Arena_EastLaneA", "size": (7.5, 7.5, 0.14), "loc": (10.5, 7.5, 0.08), "rot": 0.12, "mat": m_dark_charcoal},
    {"name": "Arena_WestLaneB", "size": (7.5, 7.5, 0.14), "loc": (-10.5, 7.0, 0.08), "rot": -0.10, "mat": m_dark_charcoal},
    {"name": "Arena_NorthLaneC", "size": (8.0, 8.0, 0.14), "loc": (0, 11.5, 0.08), "rot": 0.02, "mat": m_dark_charcoal},
]
for asd in arena_slabs:
    as_mesh = create_box(asd["name"], asd["size"], asd["loc"], rot=(0, 0, asd["rot"]), mat=asd["mat"])
    all_objects.append(as_mesh)

# 3 Large Blast Craters on the ground
crater1 = create_cylinder("BlastCrater_1", 2.4, 0.02, (-2.5, -1.5, 0.18), vertices=8, mat=m_dark_charcoal)
crater2 = create_cylinder("BlastCrater_2", 1.8, 0.02, (4.5, 2.0, 0.18), vertices=8, mat=m_dark_charcoal)
crater3 = create_cylinder("BlastCrater_3", 2.8, 0.02, (1.0, -6.5, 0.18), vertices=8, mat=m_dark_charcoal)
all_objects.extend([crater1, crater2, crater3])

# 18 Broken jagged asphalt chunks around perimeter
chunk_coords = [
    (-12.5, -9.0, 0.3), (-13.0, -3.0, -0.4), (-13.5, 3.0, 0.2), (-11.5, 11.0, -0.3),
    (-5.0, 13.5, 0.4), (5.0, 13.5, -0.2), (12.0, 11.5, 0.3), (13.5, 3.0, -0.4),
    (13.0, -3.0, 0.2), (12.0, -9.0, -0.3), (-5.5, -13.5, 0.4), (5.5, -13.5, -0.2),
    (-8.0, -5.0, 0.2), (8.0, -5.0, -0.2), (0, -14.5, 0.3), (-3.0, 8.5, -0.2)
]
for c_idx, (cx, cy, crot) in enumerate(chunk_coords):
    c_mesh = create_box(f"Arena_Chunk_{c_idx}", (2.0, 1.6, 0.16), (cx, cy, 0.09), rot=(0, 0, crot), mat=m_concrete_drab)
    all_objects.append(c_mesh)


# =========================================================================
# 2. DAMAGED COMMAND BUNKER (Back: X = -3.5, Y = 7.5, Height = 4.8m)
# =========================================================================
bunker_base = create_box("Bunker_HeavyBase", (12.4, 7.8, 1.4), (-3.5, 7.5, 0.7), mat=m_concrete_drab)
bunker_walls = create_box("Bunker_ConcreteWalls", (11.6, 7.0, 3.2), (-3.5, 7.5, 2.8), mat=m_mil_olive)
bunker_roof = create_box("Bunker_HeavyRoofDeck", (13.0, 8.4, 0.5), (-3.5, 7.5, 4.65), mat=m_concrete_drab)
# Rooftop Sandbag machine gun nest
for sby in [4.0, 11.0]:
    sb_wall = create_box(f"Bunker_SandbagRoof_{sby}", (11.0, 0.5, 0.65), (-3.5, sby, 5.2), mat=m_sandbag_tan)
    all_objects.append(sb_wall)
for sbx in [-9.2, 2.2]:
    sb_side = create_box(f"Bunker_SandbagSide_{sbx}", (0.5, 6.0, 0.65), (sbx, 7.5, 5.2), mat=m_sandbag_tan)
    all_objects.append(sb_side)

# Blast Armored Door & Observation Slit (Facing Y = 3.8)
bunker_door_frame = create_box("Bunker_BlastDoorFrame", (2.4, 0.35, 2.8), (-3.5, 3.85, 1.9), mat=m_metal_dark)
bunker_door_leaf = create_box("Bunker_BlastDoorLeaf", (1.9, 0.18, 2.5), (-3.5, 3.9, 1.9), mat=m_rust_orange)
obs_slit = create_box("Bunker_ObservationSlit", (4.8, 0.25, 0.45), (-3.5, 3.88, 3.6), mat=m_glass_dark)
all_objects.extend([bunker_base, bunker_walls, bunker_roof, bunker_door_frame, bunker_door_leaf, obs_slit])

# Rooftop Satellite Radar Dome & Antenna Mast
radar_pedestal = create_box("Bunker_RadarPedestal", (1.2, 1.2, 0.8), (0.5, 8.5, 5.3), mat=m_metal_dark)
radar_dish = create_cylinder("Bunker_RadarDish", 1.1, 0.25, (0.5, 8.5, 6.4), rot=(0.6, 0.3, -0.4), vertices=8, mat=m_mil_olive)
bunker_antenna = create_cylinder("Bunker_AntennaPole", 0.08, 4.2, (-7.5, 8.5, 6.8), rot=(0.12, -0.15, 0), vertices=4, mat=m_metal_dark)
all_objects.extend([radar_pedestal, radar_dish, bunker_antenna])


# =========================================================================
# 3. TWO FORTIFIED MILITARY GUARD TOWERS (West: X = -10.5, East: X = +10.5)
# =========================================================================
# --- GUARD TOWER 1 (West: X = -10.5, Y = -2.5) ---
for px, py in [(-11.8, -3.8), (-9.2, -3.8), (-11.8, -1.2), (-9.2, -1.2)]:
    col = create_cylinder(f"TowerW_Col_{px}_{py}", 0.16, 6.5, (px, py, 3.25), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerW_floor = create_box("TowerW_Floor", (3.2, 3.2, 0.25), (-10.5, -2.5, 5.0), mat=m_concrete_drab)
towerW_cabin = create_box("TowerW_CabinArmored", (3.0, 3.0, 1.6), (-10.5, -2.5, 5.9), mat=m_mil_olive)
towerW_roof = create_box("TowerW_Roof", (3.6, 3.6, 0.2), (-10.5, -2.5, 6.8), rot=(-0.05, 0, 0.05), mat=m_rust_orange)
towerW_light = create_cylinder("TowerW_Searchlight", 0.28, 0.45, (-9.2, -3.6, 5.6), rot=(0.7, 0.4, 0), vertices=6, mat=m_lamp_amber)
all_objects.extend([towerW_floor, towerW_cabin, towerW_roof, towerW_light])

# --- GUARD TOWER 2 (East: X = 10.5, Y = -2.5) ---
for px, py in [(9.2, -3.8), (11.8, -3.8), (9.2, -1.2), (11.8, -1.2)]:
    col = create_cylinder(f"TowerE_Col_{px}_{py}", 0.16, 6.5, (px, py, 3.25), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerE_floor = create_box("TowerE_Floor", (3.2, 3.2, 0.25), (10.5, -2.5, 5.0), mat=m_concrete_drab)
towerE_cabin = create_box("TowerE_CabinArmored", (3.0, 3.0, 1.6), (10.5, -2.5, 5.9), mat=m_mil_olive)
towerE_roof = create_box("TowerE_Roof", (3.6, 3.6, 0.2), (10.5, -2.5, 6.8), rot=(0.05, 0, -0.05), mat=m_hazard_yellow)
towerE_siren = create_cylinder("TowerE_SirenHorn", 0.22, 0.5, (9.2, -3.6, 5.6), rot=(0.6, -0.4, 0), vertices=6, mat=m_metal_dark)
all_objects.extend([towerE_floor, towerE_cabin, towerE_roof, towerE_siren])


# =========================================================================
# 4. WRECKED ARMORED MILITARY VEHICLE (APC / Combat Transport at X = -6.5, Y = -6.0)
# =========================================================================
apc_origin = Vector((-6.5, -6.0, 0.4))
apc_rot = Euler((0.08, -0.06, 0.45))

apc_hull_lower = create_box("APC_HullLower", (5.2, 2.4, 0.9), apc_origin + Vector((0, 0, 0.55)), rot=(0.08, -0.06, 0.45), mat=m_mil_olive)
apc_hull_upper = create_box("APC_HullUpper", (3.6, 2.2, 0.75), apc_origin + Vector((-0.2, 0, 1.3)), rot=(0.08, -0.06, 0.45), mat=m_mil_camo_dark)
apc_turret = create_cylinder("APC_TurretRing", 0.9, 0.6, apc_origin + Vector((0.4, 0, 1.85)), rot=(0.08, -0.06, 0.45), vertices=8, mat=m_metal_dark)
apc_cannon = create_cylinder("APC_CannonBarrel", 0.12, 2.4, apc_origin + Vector((1.8, -0.3, 1.95)), rot=(1.2, 0.4, 0), vertices=6, mat=m_rust_orange)
apc_armor_plate = create_box("APC_ArmorSlat", (2.8, 0.1, 0.8), apc_origin + Vector((0, 1.3, 0.8)), rot=(0.3, 0, 0.45), mat=m_rust_orange)

# 6 Heavy Combat Wheels
apc_wheel_offsets = [
    Vector((1.6, 1.3, 0.05)), Vector((1.6, -1.3, 0.05)),
    Vector((0, 1.3, 0.05)), Vector((0, -1.3, 0.05)),
    Vector((-1.6, 1.3, 0.05)), Vector((-1.6, -1.3, 0.05))
]
for w_idx, w_off in enumerate(apc_wheel_offsets):
    rot_off = w_off.copy()
    rot_off.rotate(apc_rot)
    w_mesh = create_cylinder(f"APC_Wheel_{w_idx}", 0.48, 0.32, apc_origin + rot_off, rot=(1.57, 0.45, 0), vertices=8, mat=m_tire)
    all_objects.append(w_mesh)

all_objects.extend([apc_hull_lower, apc_hull_upper, apc_turret, apc_cannon, apc_armor_plate])


# =========================================================================
# 5. MILITARY CARGO SHIPPING CONTAINERS (Defensive Perimeter Barriers)
# =========================================================================
# Container 1: Olive Green (North-East Flank: X = 7.5, Y = 6.0)
cont1 = create_box("Container_Olive_1", (6.5, 2.5, 2.6), (7.5, 6.0, 1.4), rot=(0, 0, 0.15), mat=m_mil_olive)
# Container 2: Rust Orange Stacked atop (X = 7.5, Y = 6.0, Z = 3.9)
cont2 = create_box("Container_Rust_2", (6.5, 2.5, 2.6), (7.5, 6.0, 3.9), rot=(0, 0, 0.15), mat=m_rust_orange)
# Container 3: Caution Yellow (West Flank: X = -10.5, Y = 3.5)
cont3 = create_box("Container_Yellow_3", (6.0, 2.4, 2.5), (-10.5, 3.5, 1.35), rot=(0, 0, -1.5), mat=m_hazard_yellow)
all_objects.extend([cont1, cont2, cont3])


# =========================================================================
# 6. COLLAPSED ROAD GATE, CONCRETE BARRIERS & RAZOR-WIRE HEDGEHOGS
# =========================================================================
# Crushed Turnpike Boom Gate at South Entry (X = 0.0, Y = -9.0)
gate_pedestal_L = create_box("Gate_Pedestal_L", (1.1, 1.1, 1.4), (-4.5, -9.0, 0.7), mat=m_concrete_drab)
gate_pedestal_R = create_box("Gate_Pedestal_R", (1.1, 1.1, 1.4), (4.5, -9.0, 0.7), mat=m_concrete_drab)
gate_boom_snapped = create_box("Gate_BoomSnapped", (5.2, 0.18, 0.35), (-1.2, -9.0, 0.6), rot=(0, 0.25, 0.12), mat=m_hazard_yellow)
gate_boom_fallen = create_box("Gate_BoomFallen", (4.2, 0.18, 0.35), (2.4, -8.8, 0.2), rot=(0.1, 0, -0.4), mat=m_hazard_yellow)
all_objects.extend([gate_pedestal_L, gate_pedestal_R, gate_boom_snapped, gate_boom_fallen])

# Concrete Jersey Barriers with Hazard Stripes
barrier_data = [
    {"x": -7.5, "y": -8.5, "rot": 0.35},
    {"x": -5.0, "y": -9.2, "rot": 0.05},
    {"x": 5.0, "y": -9.2, "rot": -0.05},
    {"x": 7.5, "y": -8.5, "rot": -0.35},
    {"x": -9.5, "y": -6.5, "rot": 1.4},
    {"x": 9.5, "y": -6.5, "rot": -1.4},
]
for b_idx, bd in enumerate(barrier_data):
    jb_base = create_box(f"Jersey_Base_{b_idx}", (2.8, 0.5, 0.8), (bd["x"], bd["y"], 0.25), rot=(0, 0, bd["rot"]), mat=m_concrete_drab)
    jb_top = create_box(f"Jersey_Top_{b_idx}", (2.6, 0.6, 0.4), (bd["x"], bd["y"], 0.75), rot=(0, 0, bd["rot"]), mat=m_hazard_yellow)
    all_objects.extend([jb_base, jb_top])

# Steel Razor-Wire / Anti-Tank Czech Hedgehogs
hedgehog_locs = [(-6.5, -11.0), (6.5, -11.0), (-11.5, 8.5), (11.5, 8.5)]
for h_idx, (hx, hy) in enumerate(hedgehog_locs):
    b1 = create_box(f"Hedgehog_{h_idx}_1", (0.16, 0.16, 2.2), (hx, hy, 0.75), rot=(0.7, 0.7, 0), mat=m_rust_orange)
    b2 = create_box(f"Hedgehog_{h_idx}_2", (0.16, 0.16, 2.2), (hx, hy, 0.75), rot=(-0.7, 0.7, 0), mat=m_rust_orange)
    b3 = create_box(f"Hedgehog_{h_idx}_3", (0.16, 0.16, 2.2), (hx, hy, 0.75), rot=(0, 0, 0.7), mat=m_metal_dark)
    all_objects.extend([b1, b2, b3])


# =========================================================================
# 7. 3 VISIBLE EXPLOSIVE FUEL BARRELS (Combat FX Target Points)
# High-contrast bright red & hazard yellow
# =========================================================================
exp_coords = [
    {"name": "Explosive_Barrel_1", "loc": (-5.0, 1.0, 0.65), "rot": (0, 0, 0)},
    {"name": "Explosive_Barrel_2", "loc": (6.0, 3.0, 0.65), "rot": (0, 0, 0.2)},
    {"name": "Explosive_Barrel_3", "loc": (1.5, -4.0, 0.65), "rot": (0, 0, -0.15)}
]
for ed in exp_coords:
    b_main = create_cylinder(ed["name"], 0.48, 1.3, ed["loc"], rot=ed["rot"], vertices=8, mat=m_faded_red)
    b_hazard = create_cylinder(f"{ed['name']}_Ring", 0.50, 0.25, (ed["loc"][0], ed["loc"][1], ed["loc"][2] + 0.1), rot=ed["rot"], vertices=8, mat=m_explosive_glow)
    all_objects.extend([b_main, b_hazard])


# =========================================================================
# 8. TATTERED DESTROYED MILITARY TENT & SUPPLY CACHE
# =========================================================================
# Destroyed Command Tent (East Flank: X = 6.0, Y = -5.5)
tent_frame1 = create_cylinder("Tent_Pole1", 0.08, 2.6, (4.5, -5.5, 1.3), rot=(0.2, 0, 0), vertices=4, mat=m_metal_dark)
tent_frame2 = create_cylinder("Tent_Pole2", 0.08, 2.4, (7.5, -5.5, 1.2), rot=(-0.3, 0.2, 0), vertices=4, mat=m_metal_dark)
tent_tarp = create_box("Tent_CollapsedCanvas", (3.6, 2.8, 0.2), (6.0, -5.5, 0.35), rot=(0.15, -0.1, 0.3), mat=m_tarp_olive)
all_objects.extend([tent_frame1, tent_frame2, tent_tarp])

# Military Supply Crates Stacks
mil_crates = [
    {"name": "MilCrate_1", "size": (1.3, 1.3, 1.1), "loc": (5.0, -7.0, 0.55), "rot": 0.2, "mat": m_mil_olive},
    {"name": "MilCrate_2", "size": (1.1, 1.1, 0.9), "loc": (5.0, -7.0, 1.55), "rot": -0.15, "mat": m_mil_camo_dark},
    {"name": "MilCrate_3", "size": (1.4, 0.9, 0.8), "loc": (-7.5, 4.5, 0.4), "rot": 0.4, "mat": m_rust_orange},
    {"name": "MilCrate_4", "size": (1.2, 1.2, 1.0), "loc": (-8.5, -7.5, 0.5), "rot": -0.25, "mat": m_mil_olive},
]
for mc in mil_crates:
    mc_obj = create_box(mc["name"], mc["size"], mc["loc"], rot=(0, 0, mc["rot"]), mat=mc["mat"])
    all_objects.append(mc_obj)


# =========================================================================
# 9. MILITARY WARNING SIGNAGE & LIGHTS
# =========================================================================
# Large Hazard Sign: "RESTRICTED AREA / LETHAL FORCE" (At Entrance: X = -3.5, Y = -11.5)
sign_leg_L = create_cylinder("SignRestricted_LegL", 0.08, 3.4, (-4.5, -11.5, 1.7), vertices=4, mat=m_metal_dark)
sign_leg_R = create_cylinder("SignRestricted_LegR", 0.08, 3.4, (-2.5, -11.5, 1.7), vertices=4, mat=m_metal_dark)
sign_board = create_box("SignRestricted_Board", (2.4, 0.1, 1.5), (-3.5, -11.5, 2.6), rot=(0.08, 0, 0), mat=m_faded_red)
sign_center = create_box("SignRestricted_Center", (2.1, 0.12, 1.2), (-3.5, -11.5, 2.6), rot=(0.08, 0, 0), mat=m_hazard_yellow)
all_objects.extend([sign_leg_L, sign_leg_R, sign_board, sign_center])


# =========================================================================
# 10. GAMEPLAY COMBAT & HORDE SOCKETS (Exported for future wave systems)
# =========================================================================
sockets = [
    create_socket("SOCKET_PLAYER_ENTRY", (0.0, -12.5, 0.1), (0, 0, 0)),
    create_socket("SOCKET_HORDE_A", (12.0, 10.0, 0.1), (0, 0, 2.35)),
    create_socket("SOCKET_HORDE_B", (-12.0, 8.0, 0.1), (0, 0, -2.35)),
    create_socket("SOCKET_HORDE_C", (0.0, 14.0, 0.1), (0, 0, 3.14)),
    create_socket("SOCKET_BOSS", (0.0, 4.0, 0.1), (0, 0, 3.14)),
    create_socket("SOCKET_EXPLOSIVE_1", (-5.0, 1.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_EXPLOSIVE_2", (6.0, 3.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_EXPLOSIVE_3", (1.5, -4.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_GATE", (0.0, -9.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_BUNKER_DOOR", (-3.5, 3.9, 0.1), (0, 0, 0)),
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

print("'MILITARY CHECKPOINT' exported successfully!")
