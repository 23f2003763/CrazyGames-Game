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
# RICH HIGH-CONTRAST MILITARY CARTOON PALETTE
# Olive Green + Rust Orange + Caution Yellow + Charcoal + Faded Red
# =========================================================================
m_mil_olive = create_material("Mat_MilOlive", (0.24, 0.38, 0.18, 1.0), roughness=0.65, metallic=0.2)
m_mil_camo_dark = create_material("Mat_MilCamoDark", (0.15, 0.22, 0.12, 1.0), roughness=0.8)
m_rust_orange = create_material("Mat_RustOrange", (0.82, 0.34, 0.10, 1.0), roughness=0.85, metallic=0.25)
m_hazard_yellow = create_material("Mat_HazardYellow", (0.98, 0.78, 0.08, 1.0), roughness=0.45)
m_dark_charcoal = create_material("Mat_DarkCharcoal", (0.13, 0.14, 0.15, 1.0), roughness=0.95) # Scorched ground
m_scorched_earth = create_material("Mat_ScorchedEarth", (0.22, 0.18, 0.14, 1.0), roughness=0.95)
m_faded_red = create_material("Mat_FadedRed", (0.88, 0.16, 0.10, 1.0), roughness=0.45, metallic=0.2)
m_concrete_drab = create_material("Mat_ConcreteDrab", (0.42, 0.44, 0.40, 1.0), roughness=0.88)
m_sandbag_tan = create_material("Mat_SandbagTan", (0.70, 0.58, 0.40, 1.0), roughness=0.95)
m_metal_dark = create_material("Mat_MetalDark", (0.16, 0.18, 0.20, 1.0), roughness=0.6, metallic=0.5)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.38, 0.42, 0.44, 1.0), roughness=0.7, metallic=0.3)
m_tarp_olive = create_material("Mat_TarpOlive", (0.26, 0.40, 0.20, 1.0), roughness=0.92)
m_lamp_amber = create_material("Mat_LampAmber", (0.98, 0.75, 0.16, 1.0), roughness=0.3, emission=(0.98, 0.75, 0.16, 1.0), emission_strength=2.4)
m_explosive_glow = create_material("Mat_ExplosiveGlow", (0.98, 0.20, 0.06, 1.0), roughness=0.3, emission=(0.98, 0.20, 0.06, 1.0), emission_strength=2.6)
m_tire = create_material("Mat_Tire", (0.12, 0.13, 0.14, 1.0), roughness=0.92)
m_glass_dark = create_material("Mat_GlassDark", (0.06, 0.08, 0.10, 1.0), roughness=0.2, alpha=0.9)
m_vines_charred = create_material("Mat_VinesCharred", (0.24, 0.45, 0.16, 1.0), roughness=0.8)

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

print("Rebuilding EXPANDED Military Checkpoint Combat Arena...")

all_objects = []

# =========================================================================
# 1. EXPANDED 2X COMBAT ARENA FLOOR (48m x 44m Envelope, Wide Open Center)
# Organic cracked asphalt, scorched craters, and 3 funneled attack lanes
# =========================================================================
# Scorched dark earth base
ground_scorch = create_box("Arena_ScorchBase", (48.0, 44.0, 0.10), (0, 0, 0.05), mat=m_dark_charcoal)
all_objects.append(ground_scorch)

# Wide Open Central Killzone Slabs (26m x 22m Open Maneuvering Field)
arena_slabs = [
    # Center fighting arena
    {"name": "Slab_ArenaCenter", "size": (24.0, 20.0, 0.16), "loc": (0, 0, 0.10), "rot": 0.03, "mat": m_concrete_drab},
    # Lane 1: South Main Highway Entrance Funnel (Y = -22..-12)
    {"name": "Slab_Lane1_SouthEntry", "size": (12.0, 14.0, 0.16), "loc": (0, -16.0, 0.10), "rot": -0.04, "mat": m_dark_charcoal},
    # Lane 2: North-West Forest/Barricade Breach Funnel (X = -18, Y = +15)
    {"name": "Slab_Lane2_NW_Breach", "size": (12.0, 12.0, 0.14), "loc": (-16.0, 14.0, 0.09), "rot": 0.15, "mat": m_scorched_earth},
    # Lane 3: North-East Container Chokepoint Funnel (X = +16, Y = +15)
    {"name": "Slab_Lane3_NE_Containers", "size": (12.0, 12.0, 0.14), "loc": (16.0, 14.0, 0.09), "rot": -0.12, "mat": m_scorched_earth},
    # North Rear Highway Culvert (Y = +18)
    {"name": "Slab_Lane_NorthRear", "size": (10.0, 10.0, 0.14), "loc": (0, 17.0, 0.09), "rot": 0.02, "mat": m_dark_charcoal},
    # West bunker terrace
    {"name": "Slab_WestBunkerPad", "size": (14.0, 12.0, 0.16), "loc": (-15.0, 6.0, 0.10), "rot": -0.05, "mat": m_concrete_drab},
    # East container apron
    {"name": "Slab_EastContainerPad", "size": (12.0, 16.0, 0.16), "loc": (16.0, 0.0, 0.10), "rot": 0.06, "mat": m_concrete_drab},
]
for asd in arena_slabs:
    as_mesh = create_box(asd["name"], asd["size"], asd["loc"], rot=(0, 0, asd["rot"]), mat=asd["mat"])
    all_objects.append(as_mesh)

# 5 Large Scorched Blast Craters
blast_craters = [
    {"name": "BlastCrater_CenterLeft", "r": 3.4, "loc": (-5.5, -2.5, 0.19)},
    {"name": "BlastCrater_CenterRight", "r": 2.8, "loc": (6.5, 3.5, 0.19)},
    {"name": "BlastCrater_SouthEntry", "r": 3.8, "loc": (2.0, -11.0, 0.19)},
    {"name": "BlastCrater_NW_Breach", "r": 3.2, "loc": (-14.0, 11.0, 0.19)},
    {"name": "BlastCrater_NE_Choke", "r": 3.0, "loc": (12.0, 10.0, 0.19)},
]
for bc in blast_craters:
    c_mesh = create_cylinder(bc["name"], bc["r"], 0.02, bc["loc"], vertices=8, mat=m_dark_charcoal)
    all_objects.append(c_mesh)

# 24 Jagged Perimeter Broken Concrete Chunks
chunk_coords = [
    (-22.0, -16.0, 0.3), (-23.5, -6.0, -0.4), (-22.5, 4.0, 0.2), (-20.5, 16.0, -0.3),
    (-8.0, 20.5, 0.4), (8.0, 20.5, -0.2), (20.5, 16.0, 0.3), (22.5, 4.0, -0.4),
    (23.5, -6.0, 0.2), (21.0, -16.0, -0.3), (-10.5, -20.5, 0.4), (10.5, -20.5, -0.2),
    (-14.0, -8.0, 0.2), (14.0, -8.0, -0.2), (0, -22.5, 0.3), (0, 21.5, -0.2),
    (-18.0, 0.0, 0.3), (18.0, 0.0, -0.3), (-8.0, 12.0, 0.15), (8.0, 12.0, -0.15),
    (-6.0, -15.0, 0.25), (6.0, -15.0, -0.25), (-15.0, -12.0, 0.3), (15.0, -12.0, -0.3)
]
for c_idx, (cx, cy, crot) in enumerate(chunk_coords):
    c_mesh = create_box(f"Arena_Chunk_{c_idx}", (2.8, 2.2, 0.18), (cx, cy, 0.10), rot=(0, 0, crot), mat=m_concrete_drab)
    all_objects.append(c_mesh)

# Charred weed tufts in perimeter cracks
for w_idx, (wx, wy) in enumerate([(-18, -4), (18, -4), (-12, 16), (12, 16), (-6, -18), (6, -18), (0, -8)]):
    weed = create_box(f"Arena_Weed_{w_idx}", (1.4, 1.4, 0.65), (wx, wy, 0.35), rot=(0, w_idx * 0.8, 0), mat=m_vines_charred)
    all_objects.append(weed)


# =========================================================================
# 2. DAMAGED COMMAND BUNKER (Pushed to North-West Flank: X = -14.0, Y = 10.0)
# =========================================================================
bunker_base = create_box("Bunker_HeavyBase", (13.5, 8.5, 1.4), (-14.0, 10.0, 0.7), mat=m_concrete_drab)
bunker_walls = create_box("Bunker_ConcreteWalls", (12.5, 7.8, 3.4), (-14.0, 10.0, 3.0), mat=m_mil_olive)
bunker_roof = create_box("Bunker_HeavyRoofDeck", (14.2, 9.2, 0.55), (-14.0, 10.0, 4.95), mat=m_concrete_drab)

# Sandbag rooftop machine gun nest
sb_roof_f = create_box("Bunker_SandbagRoofF", (12.0, 0.5, 0.7), (-14.0, 6.0, 5.55), mat=m_sandbag_tan)
sb_roof_s = create_box("Bunker_SandbagRoofS", (0.5, 7.0, 0.7), (-8.0, 10.0, 5.55), mat=m_sandbag_tan)
all_objects.extend([bunker_base, bunker_walls, bunker_roof, sb_roof_f, sb_roof_s])

# Armored blast door & observation slit facing arena (Y = 5.9)
bunker_door_frame = create_box("Bunker_BlastDoorFrame", (2.6, 0.35, 3.0), (-14.0, 5.9, 2.1), mat=m_metal_dark)
bunker_door_leaf = create_box("Bunker_BlastDoorLeaf", (2.1, 0.2, 2.7), (-14.0, 6.0, 2.1), mat=m_rust_orange)
obs_slit = create_box("Bunker_ObservationSlit", (5.2, 0.25, 0.45), (-14.0, 5.95, 3.8), mat=m_glass_dark)
all_objects.extend([bunker_door_frame, bunker_door_leaf, obs_slit])

# Rooftop Satellite Radar Dome & Long-Range Antenna
radar_pedestal = create_box("Bunker_RadarPedestal", (1.3, 1.3, 0.9), (-10.0, 11.5, 5.65), mat=m_metal_dark)
radar_dish = create_cylinder("Bunker_RadarDish", 1.2, 0.28, (-10.0, 11.5, 6.8), rot=(0.6, 0.3, -0.4), vertices=8, mat=m_mil_olive)
bunker_antenna = create_cylinder("Bunker_AntennaPole", 0.09, 4.8, (-18.5, 11.5, 7.3), rot=(0.12, -0.15, 0), vertices=4, mat=m_metal_dark)
all_objects.extend([radar_pedestal, radar_dish, bunker_antenna])


# =========================================================================
# 3. TWO FORTIFIED GUARD TOWERS (At Opposite Outer Corners)
# =========================================================================
# --- GUARD TOWER 1: South-West Corner (X = -18.0, Y = -14.0, Height = 8.5m) ---
for px, py in [(-19.5, -15.5), (-16.5, -15.5), (-19.5, -12.5), (-16.5, -12.5)]:
    col = create_cylinder(f"TowerSW_Col_{px}_{py}", 0.18, 7.5, (px, py, 3.75), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerSW_floor = create_box("TowerSW_Floor", (3.6, 3.6, 0.25), (-18.0, -14.0, 6.0), mat=m_concrete_drab)
towerSW_cabin = create_box("TowerSW_Cabin", (3.3, 3.3, 1.8), (-18.0, -14.0, 7.0), mat=m_mil_olive)
towerSW_roof = create_box("TowerSW_Roof", (4.0, 4.0, 0.25), (-18.0, -14.0, 8.0), rot=(-0.05, 0, 0.05), mat=m_rust_orange)
towerSW_light = create_cylinder("TowerSW_Searchlight", 0.32, 0.5, (-16.5, -15.0, 6.7), rot=(0.7, 0.5, 0), vertices=6, mat=m_lamp_amber)
all_objects.extend([towerSW_floor, towerSW_cabin, towerSW_roof, towerSW_light])

# --- GUARD TOWER 2: North-East Corner (X = +18.0, Y = +12.0, Height = 8.5m) ---
for px, py in [(16.5, 10.5), (19.5, 10.5), (16.5, 13.5), (19.5, 13.5)]:
    col = create_cylinder(f"TowerNE_Col_{px}_{py}", 0.18, 7.5, (px, py, 3.75), vertices=5, mat=m_metal_dark)
    all_objects.append(col)
towerNE_floor = create_box("TowerNE_Floor", (3.6, 3.6, 0.25), (18.0, 12.0, 6.0), mat=m_concrete_drab)
towerNE_cabin = create_box("TowerNE_Cabin", (3.3, 3.3, 1.8), (18.0, 12.0, 7.0), mat=m_mil_olive)
towerNE_roof = create_box("TowerNE_Roof", (4.0, 4.0, 0.25), (18.0, 12.0, 8.0), rot=(0.05, 0, -0.05), mat=m_hazard_yellow)
towerNE_siren = create_cylinder("TowerNE_SirenHorn", 0.25, 0.55, (16.5, 10.8, 6.7), rot=(0.6, -0.4, 0), vertices=6, mat=m_metal_dark)
all_objects.extend([towerNE_floor, towerNE_cabin, towerNE_roof, towerNE_siren])


# =========================================================================
# 4. WRECKED ARMORED APC (Partially Blocking Lane 1 Shoulder: X = -8.5, Y = -13.0)
# =========================================================================
apc_origin = Vector((-8.5, -13.0, 0.4))
apc_rot = Euler((0.08, -0.06, 0.55))

apc_hull_lower = create_box("APC_HullLower", (5.4, 2.5, 0.95), apc_origin + Vector((0, 0, 0.55)), rot=(0.08, -0.06, 0.55), mat=m_mil_olive)
apc_hull_upper = create_box("APC_HullUpper", (3.8, 2.3, 0.8), apc_origin + Vector((-0.2, 0, 1.35)), rot=(0.08, -0.06, 0.55), mat=m_mil_camo_dark)
apc_turret = create_cylinder("APC_TurretRing", 0.95, 0.65, apc_origin + Vector((0.4, 0, 1.95)), rot=(0.08, -0.06, 0.55), vertices=8, mat=m_metal_dark)
apc_cannon = create_cylinder("APC_CannonBarrel", 0.13, 2.6, apc_origin + Vector((1.9, -0.3, 2.05)), rot=(1.2, 0.4, 0), vertices=6, mat=m_rust_orange)
apc_armor_plate = create_box("APC_ArmorSlat", (3.0, 0.1, 0.85), apc_origin + Vector((0, 1.35, 0.85)), rot=(0.3, 0, 0.55), mat=m_rust_orange)

apc_wheel_offsets = [
    Vector((1.7, 1.35, 0.05)), Vector((1.7, -1.35, 0.05)),
    Vector((0, 1.35, 0.05)), Vector((0, -1.35, 0.05)),
    Vector((-1.7, 1.35, 0.05)), Vector((-1.7, -1.35, 0.05))
]
for w_idx, w_off in enumerate(apc_wheel_offsets):
    rot_off = w_off.copy()
    rot_off.rotate(apc_rot)
    w_mesh = create_cylinder(f"APC_Wheel_{w_idx}", 0.50, 0.35, apc_origin + rot_off, rot=(1.57, 0.55, 0), vertices=8, mat=m_tire)
    all_objects.append(w_mesh)

all_objects.extend([apc_hull_lower, apc_hull_upper, apc_turret, apc_cannon, apc_armor_plate])


# =========================================================================
# 5. STACKED SHIPPING CONTAINERS (East Perimeter Chokepoint Wall: X = +17.0)
# =========================================================================
# Lower Container 1 (Olive Green: X = 17.0, Y = -2.0)
cont1 = create_box("Container_Olive_1", (7.0, 2.6, 2.8), (17.0, -2.0, 1.5), rot=(0, 0, 0.05), mat=m_mil_olive)
# Lower Container 2 (Caution Yellow: X = 17.0, Y = 5.5)
cont2 = create_box("Container_Yellow_2", (7.0, 2.6, 2.8), (17.0, 5.5, 1.5), rot=(0, 0, -0.05), mat=m_hazard_yellow)
# Upper Container 3 Stacked Atop (Rust Orange: X = 17.0, Y = 1.5, Z = 4.2)
cont3 = create_box("Container_Rust_3", (7.0, 2.6, 2.8), (17.0, 1.5, 4.2), rot=(0, 0, 0.02), mat=m_rust_orange)
# West Container Choke Barrier (Caution Yellow: X = -18.0, Y = -2.0)
cont4 = create_box("Container_Yellow_4", (6.5, 2.6, 2.8), (-18.0, -2.0, 1.5), rot=(0, 0, 1.57), mat=m_hazard_yellow)
all_objects.extend([cont1, cont2, cont3, cont4])


# =========================================================================
# 6. COLLAPSED ENTRANCE BOOM GATE & PERIMETER CONCRETE BARRIERS
# =========================================================================
# Crushed Turnpike Gate at Lane 1 (Y = -18.0)
gate_pedestal_L = create_box("Gate_Pedestal_L", (1.2, 1.2, 1.6), (-5.0, -18.0, 0.8), mat=m_concrete_drab)
gate_pedestal_R = create_box("Gate_Pedestal_R", (1.2, 1.2, 1.6), (5.0, -18.0, 0.8), mat=m_concrete_drab)
gate_boom_snapped = create_box("Gate_BoomSnapped", (5.8, 0.2, 0.4), (-1.5, -18.0, 0.7), rot=(0, 0.25, 0.12), mat=m_hazard_yellow)
gate_boom_fallen = create_box("Gate_BoomFallen", (4.6, 0.2, 0.4), (2.8, -17.8, 0.25), rot=(0.1, 0, -0.4), mat=m_hazard_yellow)
all_objects.extend([gate_pedestal_L, gate_pedestal_R, gate_boom_snapped, gate_boom_fallen])

# Concrete Jersey Barriers framing Lane 1 and Lane 2/3
barrier_data = [
    # Lane 1 South Flanks
    {"x": -8.5, "y": -17.5, "rot": 0.35},
    {"x": -5.5, "y": -18.2, "rot": 0.05},
    {"x": 5.5, "y": -18.2, "rot": -0.05},
    {"x": 8.5, "y": -17.5, "rot": -0.35},
    # Lane 2 NW Breach Flanks
    {"x": -12.5, "y": 17.5, "rot": 0.4},
    {"x": -18.5, "y": 11.5, "rot": 1.2},
    # Lane 3 NE Choke Flanks
    {"x": 12.5, "y": 17.5, "rot": -0.4},
    {"x": 12.5, "y": -10.5, "rot": -0.2},
]
for b_idx, bd in enumerate(barrier_data):
    jb_base = create_box(f"Jersey_Base_{b_idx}", (3.0, 0.55, 0.85), (bd["x"], bd["y"], 0.28), rot=(0, 0, bd["rot"]), mat=m_concrete_drab)
    jb_top = create_box(f"Jersey_Top_{b_idx}", (2.8, 0.65, 0.45), (bd["x"], bd["y"], 0.85), rot=(0, 0, bd["rot"]), mat=m_hazard_yellow)
    all_objects.extend([jb_base, jb_top])

# Steel Anti-Tank Czech Hedgehogs at Chokepoints
hedgehog_locs = [(-7.5, -20.0), (7.5, -20.0), (-16.5, 17.5), (16.5, 17.5), (-19.0, -8.0), (19.0, -8.0)]
for h_idx, (hx, hy) in enumerate(hedgehog_locs):
    b1 = create_box(f"Hedgehog_{h_idx}_1", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(0.7, 0.7, 0), mat=m_rust_orange)
    b2 = create_box(f"Hedgehog_{h_idx}_2", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(-0.7, 0.7, 0), mat=m_rust_orange)
    b3 = create_box(f"Hedgehog_{h_idx}_3", (0.18, 0.18, 2.4), (hx, hy, 0.85), rot=(0, 0, 0.7), mat=m_metal_dark)
    all_objects.extend([b1, b2, b3])


# =========================================================================
# 7. 3 EXPLOSIVE FUEL BARRELS (Positioned at Chokepoint Edges, NOT in Center!)
# =========================================================================
exp_coords = [
    {"name": "Explosive_Barrel_1", "loc": (-10.0, 4.0, 0.7), "rot": (0, 0, 0)},     # Bunker edge
    {"name": "Explosive_Barrel_2", "loc": (12.0, 4.0, 0.7), "rot": (0, 0, 0.2)},    # Container bottleneck edge
    {"name": "Explosive_Barrel_3", "loc": (6.5, -11.0, 0.7), "rot": (0, 0, -0.15)}   # Entrance barrier edge
]
for ed in exp_coords:
    b_main = create_cylinder(ed["name"], 0.52, 1.35, ed["loc"], rot=ed["rot"], vertices=8, mat=m_faded_red)
    b_hazard = create_cylinder(f"{ed['name']}_Ring", 0.54, 0.28, (ed["loc"][0], ed["loc"][1], ed["loc"][2] + 0.1), rot=ed["rot"], vertices=8, mat=m_explosive_glow)
    all_objects.extend([b_main, b_hazard])


# =========================================================================
# 8. TATTERED DESTROYED MILITARY COMMAND TENT (South-East Flank: X = 13.5, Y = -12.0)
# =========================================================================
tent_frame1 = create_cylinder("Tent_Pole1", 0.09, 2.8, (11.5, -12.0, 1.4), rot=(0.2, 0, 0), vertices=4, mat=m_metal_dark)
tent_frame2 = create_cylinder("Tent_Pole2", 0.09, 2.6, (15.5, -12.0, 1.3), rot=(-0.3, 0.2, 0), vertices=4, mat=m_metal_dark)
tent_tarp = create_box("Tent_CollapsedCanvas", (4.2, 3.2, 0.2), (13.5, -12.0, 0.4), rot=(0.15, -0.1, 0.3), mat=m_tarp_olive)
all_objects.extend([tent_frame1, tent_frame2, tent_tarp])

# Military Supply Ammo Crates
mil_crates = [
    {"name": "MilCrate_1", "size": (1.4, 1.4, 1.2), "loc": (12.0, -14.0, 0.6), "rot": 0.2, "mat": m_mil_olive},
    {"name": "MilCrate_2", "size": (1.2, 1.2, 1.0), "loc": (12.0, -14.0, 1.7), "rot": -0.15, "mat": m_mil_camo_dark},
    {"name": "MilCrate_3", "size": (1.5, 1.0, 0.9), "loc": (-10.5, 6.5, 0.45), "rot": 0.4, "mat": m_rust_orange},
    {"name": "MilCrate_4", "size": (1.3, 1.3, 1.1), "loc": (-16.5, -9.5, 0.55), "rot": -0.25, "mat": m_mil_olive},
]
for mc in mil_crates:
    mc_obj = create_box(mc["name"], mc["size"], mc["loc"], rot=(0, 0, mc["rot"]), mat=mc["mat"])
    all_objects.append(mc_obj)


# =========================================================================
# 9. MILITARY WARNING SIGNAGE & FLOODLIGHTS
# =========================================================================
# Large Warning Sign: "RESTRICTED AREA / USE OF LETHAL FORCE" (At Entrance: X = -4.5, Y = -20.0)
sign_leg_L = create_cylinder("SignRestricted_LegL", 0.09, 3.8, (-5.8, -20.0, 1.9), vertices=4, mat=m_metal_dark)
sign_leg_R = create_cylinder("SignRestricted_LegR", 0.09, 3.8, (-3.2, -20.0, 1.9), vertices=4, mat=m_metal_dark)
sign_board = create_box("SignRestricted_Board", (2.8, 0.12, 1.6), (-4.5, -20.0, 2.9), rot=(0.08, 0, 0), mat=m_faded_red)
sign_center = create_box("SignRestricted_Center", (2.5, 0.14, 1.3), (-4.5, -20.0, 2.9), rot=(0.08, 0, 0), mat=m_hazard_yellow)
all_objects.extend([sign_leg_L, sign_leg_R, sign_board, sign_center])


# =========================================================================
# 10. PRESERVED GAMEPLAY SOCKETS (Positioned for Expanded 2x Arena)
# =========================================================================
sockets = [
    create_socket("SOCKET_PLAYER_ENTRY", (0.0, -22.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_HORDE_A", (20.0, 18.0, 0.1), (0, 0, 2.35)),     # NE Container Choke
    create_socket("SOCKET_HORDE_B", (-22.0, 18.0, 0.1), (0, 0, -2.35)),   # NW Forest Breach
    create_socket("SOCKET_HORDE_C", (0.0, 22.0, 0.1), (0, 0, 3.14)),       # North Rear Culvert
    create_socket("SOCKET_BOSS", (0.0, 8.0, 0.1), (0, 0, 3.14)),           # Arena Back
    create_socket("SOCKET_EXPLOSIVE_1", (-10.0, 4.0, 0.1), (0, 0, 0)),     # Bunker edge
    create_socket("SOCKET_EXPLOSIVE_2", (12.0, 4.0, 0.1), (0, 0, 0)),      # Container edge
    create_socket("SOCKET_EXPLOSIVE_3", (6.5, -11.0, 0.1), (0, 0, 0)),      # Entrance edge
    create_socket("SOCKET_GATE", (0.0, -18.0, 0.1), (0, 0, 0)),
    create_socket("SOCKET_BUNKER_DOOR", (-14.0, 5.9, 0.1), (0, 0, 0)),
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

print("Expanded 'MILITARY CHECKPOINT' exported successfully!")
