import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Helper function to create materials
def create_material(name, color, roughness=0.8, metallic=0.0, alpha=1.0, emission=None, emission_strength=1.0):
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
# VIBRANT CARTOON STYLIZED POST-APOCALYPTIC PALETTE
# =========================================================================
m_concrete = create_material("Mat_Concrete", (0.36, 0.38, 0.34, 1.0), roughness=0.9)
m_concrete_light = create_material("Mat_ConcreteLight", (0.48, 0.49, 0.44, 1.0), roughness=0.88)
m_asphalt = create_material("Mat_Asphalt", (0.20, 0.21, 0.23, 1.0), roughness=0.92)
m_yellow_stripe = create_material("Mat_YellowStripe", (0.94, 0.74, 0.10, 1.0), roughness=0.55)
m_rust = create_material("Mat_Rust", (0.65, 0.24, 0.08, 1.0), roughness=0.85, metallic=0.25)
m_rebar = create_material("Mat_Rebar", (0.16, 0.18, 0.20, 1.0), roughness=0.7, metallic=0.5)
m_car_red = create_material("Mat_CarRed", (0.76, 0.18, 0.12, 1.0), roughness=0.5, metallic=0.2)
m_car_teal = create_material("Mat_CarTeal", (0.18, 0.44, 0.52, 1.0), roughness=0.55, metallic=0.25)
m_truck_white = create_material("Mat_TruckWhite", (0.78, 0.80, 0.82, 1.0), roughness=0.65)
m_timber = create_material("Mat_Timber", (0.48, 0.34, 0.20, 1.0), roughness=0.95)
m_metal_corrugated = create_material("Mat_MetalCorrugated", (0.35, 0.38, 0.40, 1.0), roughness=0.75, metallic=0.35)
m_glass_dark = create_material("Mat_GlassDark", (0.05, 0.08, 0.10, 1.0), roughness=0.2, alpha=0.9)
m_tire = create_material("Mat_Tire", (0.12, 0.13, 0.14, 1.0), roughness=0.95)

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

print("Building 'THE BROKEN SPAN' Highway Bridge Landmark...")

all_objects = []

# =========================================================================
# 1. STANDING WEST BRIDGE SPAN (X = -18.0 to -4.0, Z = 3.6m above bed)
# =========================================================================
# West Abutment
abutment_w = create_box("Bridge_Abutment_West", (5.0, 8.4, 4.2), (-18.0, 0, 1.8), mat=m_concrete)
# Main Standing Deck
deck_w = create_box("Bridge_Standing_Deck", (14.0, 7.6, 1.1), (-11.0, 0, 3.8), mat=m_concrete_light)
# Asphalt Road Surface on Deck
asphalt_w = create_box("Bridge_Standing_Asphalt", (14.0, 6.8, 0.12), (-11.0, 0, 4.4), mat=m_asphalt)
# Yellow Highway Centerlines
for sx in [-16.0, -12.5, -9.0, -5.5]:
    stripe = create_box(f"Bridge_StripeW_{sx}", (2.2, 0.35, 0.04), (sx, 0, 4.48), mat=m_yellow_stripe)
    all_objects.append(stripe)

# Concrete Parapet Curbs (North and South sides)
curb_w_n = create_box("Bridge_CurbW_N", (14.0, 0.45, 0.65), (-11.0, 3.6, 4.65), mat=m_concrete)
curb_w_s = create_box("Bridge_CurbW_S", (14.0, 0.45, 0.65), (-11.0, -3.6, 4.65), mat=m_concrete)
# Damaged Steel Guardrails
rail_w_n = create_box("Bridge_GuardrailW_N", (12.5, 0.12, 0.55), (-11.8, 3.6, 5.25), mat=m_rust)
rail_w_s = create_box("Bridge_GuardrailW_S", (11.0, 0.12, 0.55), (-12.5, -3.6, 5.25), mat=m_rust)
all_objects.extend([abutment_w, deck_w, asphalt_w, curb_w_n, curb_w_s, rail_w_n, rail_w_s])

# Snapped Jagged Rebar Spikes protruding from the standing deck ledge (X = -4.0)
rebar_offsets = [
    (0.6, 2.5, 0.1), (0.9, 1.2, -0.2), (0.4, 0.2, 0.15), (0.8, -1.0, -0.1),
    (0.5, -2.2, 0.2), (1.1, -3.0, -0.15)
]
for r_idx, (ro_x, ro_y, ro_z) in enumerate(rebar_offsets):
    spike = create_cylinder(f"Bridge_Rebar_{r_idx}", 0.05, 1.4, (-3.4 + ro_x * 0.4, ro_y, 3.7 + ro_z), rot=(0.2, 1.5, 0.3), vertices=4, mat=m_rebar)
    all_objects.append(spike)


# =========================================================================
# 2. COLLAPSED EAST BRIDGE SPAN (Resting Tilted in Riverbed: X = -3.0 to 14.0)
# =========================================================================
# East Abutment
abutment_e = create_box("Bridge_Abutment_East", (5.0, 8.4, 3.8), (17.5, 0, 1.6), mat=m_concrete)
all_objects.append(abutment_e)

# Collapsed Deck Section (length ~15.5m, tilted ~18° into the riverbed)
col_origin = Vector((5.5, 0, 2.0))
col_rot = Euler((0.05, 0.32, -0.04))

deck_collapsed = create_box("Bridge_Collapsed_Deck", (15.5, 7.4, 1.0), col_origin, rot=(0.05, 0.32, -0.04), mat=m_concrete_light)
asphalt_collapsed = create_box("Bridge_Collapsed_Asphalt", (15.5, 6.6, 0.12), col_origin + Vector((0, 0, 0.55)), rot=(0.05, 0.32, -0.04), mat=m_asphalt)
curb_col_n = create_box("Bridge_Collapsed_CurbN", (15.5, 0.45, 0.6), col_origin + Vector((0, 3.5, 0.75)), rot=(0.05, 0.32, -0.04), mat=m_concrete)
curb_col_s = create_box("Bridge_Collapsed_CurbS", (15.5, 0.45, 0.6), col_origin + Vector((0, -3.5, 0.75)), rot=(0.05, 0.32, -0.04), mat=m_concrete)
rail_col_s = create_box("Bridge_Collapsed_RailS", (13.0, 0.12, 0.5), col_origin + Vector((-0.5, -3.5, 1.25)), rot=(0.05, 0.32, -0.04), mat=m_rust)
all_objects.extend([deck_collapsed, asphalt_collapsed, curb_col_n, curb_col_s, rail_col_s])

# Shattered concrete chunks under collapsed deck
for ch_idx, (ch_x, ch_y) in enumerate([(-2.5, -2.5), (-1.8, 1.5), (-3.2, 0.5), (3.0, -3.8), (4.5, 3.5)]):
    chunk = create_box(f"Bridge_Rubble_{ch_idx}", (1.6, 1.3, 0.8), (ch_x, ch_y, 0.4), rot=(0.3, 0.2, ch_idx * 0.7), mat=m_concrete)
    all_objects.append(chunk)


# =========================================================================
# 3. HEAVY BRIDGE SUPPORT PILLARS (In River Channel)
# =========================================================================
pier_w = create_cylinder("Bridge_Pier_West", 1.4, 4.2, (-4.5, -1.8, 1.8), vertices=8, mat=m_concrete)
pier_cap_w = create_box("Bridge_PierCap_West", (3.2, 6.5, 0.7), (-4.5, 0, 3.2), mat=m_concrete)
pier_e = create_cylinder("Bridge_Pier_East", 1.4, 3.5, (6.5, 1.8, 1.4), vertices=8, mat=m_concrete)
pier_cap_e = create_box("Bridge_PierCap_East", (3.2, 6.5, 0.7), (6.5, 0, 2.4), rot=(0, 0, 0.15), mat=m_concrete)
all_objects.extend([pier_w, pier_cap_w, pier_e, pier_cap_e])


# =========================================================================
# 4. WRECKED VEHICLES (Storytelling Set-Pieces)
# =========================================================================
# Hero Crashed Red Sedan on Standing Deck (pinned at snapped edge)
car_w_origin = Vector((-6.5, -1.4, 4.45))
car_w_rot = Euler((0.08, -0.05, 0.45))

car_w_body = create_box("Car_Standing_Body", (3.8, 1.8, 0.9), car_w_origin + Vector((0, 0, 0.45)), rot=(0.08, -0.05, 0.45), mat=m_car_red)
car_w_cabin = create_box("Car_Standing_Cabin", (2.2, 1.6, 0.7), car_w_origin + Vector((-0.2, 0, 1.15)), rot=(0.08, -0.05, 0.45), mat=m_glass_dark)
car_w_hood = create_box("Car_Standing_HoodCrushed", (1.2, 1.6, 0.4), car_w_origin + Vector((1.4, 0, 0.55)), rot=(0.2, 0.1, 0.45), mat=m_rust)
all_objects.extend([car_w_body, car_w_cabin, car_w_hood])

for wi, (wx, wy) in enumerate([(1.2, 0.95), (1.2, -0.95), (-1.2, 0.95), (-1.2, -0.95)]):
    cw = create_cylinder(f"Car_Standing_Wheel_{wi}", 0.35, 0.22, car_w_origin + Vector((wx, wy, 0.3)), rot=(1.57, 0.45, 0), vertices=8, mat=m_tire)
    all_objects.append(cw)

# Fallen Teal Car below in Riverbed (partially submerged)
car_b_origin = Vector((-0.8, 2.2, 0.55))
car_b_rot = Euler((0.35, -0.4, 1.2))

car_b_body = create_box("Car_Fallen_Body", (3.6, 1.7, 0.85), car_b_origin, rot=(0.35, -0.4, 1.2), mat=m_car_teal)
car_b_cabin = create_box("Car_Fallen_Cabin", (2.0, 1.5, 0.65), car_b_origin + Vector((0, 0, 0.6)), rot=(0.35, -0.4, 1.2), mat=m_glass_dark)
all_objects.extend([car_b_body, car_b_cabin])

# Abandoned Cargo Delivery Truck on East Approach Road (X = 18.5, Y = 0.8)
truck_origin = Vector((18.5, 0.8, 2.1))
truck_cab = create_box("Truck_East_Cab", (2.2, 2.2, 2.0), truck_origin + Vector((1.2, 0, 1.0)), rot=(0, 0, 0.12), mat=m_truck_white)
truck_box = create_box("Truck_East_CargoBox", (3.8, 2.4, 2.4), truck_origin + Vector((-1.6, 0, 1.3)), rot=(0, 0, 0.12), mat=m_rust)
truck_doors = create_box("Truck_East_OpenDoor", (0.1, 1.1, 2.1), truck_origin + Vector((-3.6, 0.9, 1.3)), rot=(0, 0.8, 0.12), mat=m_rust)
all_objects.extend([truck_cab, truck_box, truck_doors])


# =========================================================================
# 5. IMPROVISED SURVIVOR CROSSING (Planks & Scaffolding Footbridge)
# =========================================================================
cross_planks = [
    {"pos": (0.0, -1.2, 1.15), "size": (3.4, 0.9, 0.12), "rot": (0.08, 0.05, 0.2)},
    {"pos": (2.8, -1.6, 1.45), "size": (3.2, 0.85, 0.12), "rot": (-0.05, 0.1, -0.15)},
    {"pos": (5.4, -2.0, 1.75), "size": (3.0, 0.8, 0.12), "rot": (0.05, -0.08, 0.1)},
    {"pos": (-2.6, -0.8, 0.95), "size": (3.2, 0.85, 0.12), "rot": (0.1, 0.05, 0.25)},
]
for pi, pd in enumerate(cross_planks):
    plank = create_box(f"Survivor_Plank_{pi}", pd["size"], pd["pos"], rot=pd["rot"], mat=m_timber)
    all_objects.append(plank)

# Corrugated metal ramp plate
metal_ramp = create_box("Survivor_MetalRamp", (2.4, 1.2, 0.06), (-1.2, -1.0, 1.05), rot=(0.1, 0.15, -0.3), mat=m_metal_corrugated)
all_objects.append(metal_ramp)


# =========================================================================
# 6. LARGE CORRUGATED DRAINAGE PIPE CULVERT (North Embankment: X = -7.5, Y = 8.5)
# =========================================================================
pipe_culvert = create_cylinder("Culvert_DrainagePipe", 0.9, 4.5, (-7.5, 8.5, 1.1), rot=(1.35, 0.2, 0), vertices=8, mat=m_metal_corrugated)
pipe_rim = create_cylinder("Culvert_DrainageRim", 1.02, 0.4, (-7.5, 6.4, 0.8), rot=(1.35, 0.2, 0), vertices=8, mat=m_rust)
all_objects.extend([pipe_culvert, pipe_rim])


# =========================================================================
# 7. GAMEPLAY & EXPLORATION SOCKETS (Empties in Hierarchy)
# =========================================================================
sockets = [
    create_socket("SOCKET_ENTRY_A", (-22.0, 0.0, 3.8)),
    create_socket("SOCKET_ENTRY_B", (22.0, 0.0, 2.0)),
    create_socket("SOCKET_AMBUSH_A", (-7.5, 7.5, 0.4)),
    create_socket("SOCKET_AMBUSH_B", (6.0, -9.0, 0.3)),
    create_socket("SOCKET_LOOT", (17.5, 0.8, 2.2)),
    create_socket("SOCKET_CUTSCENE_CAMERA", (-10.0, -14.0, 7.5)),
    create_socket("SOCKET_INTERACTION_CROSSING", (0.0, -1.2, 1.2)),
]
all_objects.extend(sockets)

# Select all and export
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "broken_span.glb")

print(f"Exporting {len(all_objects)} objects/sockets to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("'THE BROKEN SPAN' exported successfully!")
