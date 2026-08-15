import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Clear existing objects
bpy.ops.wm.read_factory_settings(use_empty=True)

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

# Materials for vehicles
m_van_blue = create_material("Mat_VanBlue", (0.18, 0.48, 0.72, 1.0), roughness=0.6, metallic=0.2)
m_van_rust = create_material("Mat_VanRust", (0.58, 0.24, 0.14, 1.0), roughness=0.85, metallic=0.25)
m_police_white = create_material("Mat_PoliceWhite", (0.92, 0.94, 0.95, 1.0), roughness=0.5, metallic=0.2)
m_police_black = create_material("Mat_PoliceBlack", (0.12, 0.13, 0.15, 1.0), roughness=0.6, metallic=0.3)
m_police_blue = create_material("Mat_PoliceBlue", (0.10, 0.35, 0.85, 1.0), roughness=0.4, emission=(0.10, 0.35, 0.85, 1.0), emission_strength=1.5)
m_police_red = create_material("Mat_PoliceRed", (0.92, 0.15, 0.10, 1.0), roughness=0.4, emission=(0.92, 0.15, 0.10, 1.0), emission_strength=1.5)
m_metal_dark = create_material("Mat_MetalDark", (0.18, 0.20, 0.22, 1.0), roughness=0.6, metallic=0.5)
m_metal_rust = create_material("Mat_MetalRust", (0.55, 0.22, 0.12, 1.0), roughness=0.85, metallic=0.25)
m_glass_broken = create_material("Mat_GlassBroken", (0.35, 0.85, 0.90, 1.0), roughness=0.2, alpha=0.5)
m_dark_void = create_material("Mat_DarkVoid", (0.06, 0.07, 0.08, 1.0), roughness=0.95)
m_tire = create_material("Mat_Tire", (0.14, 0.15, 0.16, 1.0), roughness=0.92)
m_wood = create_material("Mat_Wood", (0.54, 0.35, 0.18, 1.0), roughness=0.88)

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

all_objects = []

# =========================================================================
# VEHICLE 1: ABANDONED DELIVERY VAN WITH OPEN DOORS & CARGO CRATES
# Origin at (0, 0, 0)
# =========================================================================
van_group = []
# Chassis & Lower Body
van_base = create_box("Van_Chassis", (4.8, 2.2, 0.8), (0, 0, 0.55), mat=m_metal_dark)
# Front Cabin
van_cabin = create_box("Van_Cabin", (1.8, 2.1, 1.4), (1.4, 0, 1.55), mat=m_van_blue)
# Windshield
van_windshield = create_box("Van_Windshield", (0.8, 1.9, 0.9), (2.1, 0, 1.6), rot=(0, 0.35, 0), mat=m_glass_broken)
# Front Bumper & Grille
van_bumper = create_box("Van_BumperF", (0.4, 2.3, 0.4), (2.4, 0, 0.4), mat=m_metal_rust)
van_grille = create_box("Van_Grille", (0.1, 1.6, 0.5), (2.45, 0, 0.85), mat=m_metal_dark)
# Rear Cargo Box (Tall box with open back)
van_cargo = create_box("Van_CargoBox", (3.2, 2.2, 1.8), (-0.9, 0, 1.75), mat=m_van_blue)
van_cargo_rust = create_box("Van_CargoRust", (3.22, 2.22, 0.8), (-0.9, 0, 1.3), mat=m_van_rust)
# Open Dark Cargo Interior Void
van_cargo_void = create_box("Van_CargoVoid", (2.8, 1.9, 1.6), (-0.9, 0, 1.75), mat=m_dark_void)
# Open Rear Doors (Left & Right swung open)
van_door_L = create_box("Van_RearDoorL", (0.1, 1.0, 1.6), (-2.6, 1.1, 1.75), rot=(0, 0, 1.3), mat=m_van_blue)
van_door_R = create_box("Van_RearDoorR", (0.1, 1.0, 1.6), (-2.6, -1.1, 1.75), rot=(0, 0, -1.2), mat=m_van_blue)
# Cargo crates spilling out back
crate1 = create_box("Van_Crate1", (0.8, 0.8, 0.8), (-1.2, 0.3, 1.25), rot=(0, 0, 0.2), mat=m_wood)
crate2 = create_box("Van_Crate2", (0.7, 0.7, 0.7), (-2.2, -0.2, 0.45), rot=(0.1, 0.2, 0.5), mat=m_wood)
crate3 = create_box("Van_Crate3", (0.8, 0.8, 0.8), (-3.1, 0.4, 0.4), rot=(0, 0, -0.3), mat=m_wood)

# 4 Sunken Flat Tires
van_wheels = [
    Vector((1.4, 1.15, 0.32)), Vector((1.4, -1.15, 0.32)),
    Vector((-1.4, 1.15, 0.32)), Vector((-1.4, -1.15, 0.32))
]
for idx, wpos in enumerate(van_wheels):
    w = create_cylinder(f"Van_Wheel_{idx}", 0.42, 0.26, wpos, rot=(1.57, 0, 0), vertices=8, mat=m_tire)
    van_group.append(w)

van_group.extend([van_base, van_cabin, van_windshield, van_bumper, van_grille, van_cargo, van_cargo_rust, van_cargo_void, van_door_L, van_door_R, crate1, crate2, crate3])


# =========================================================================
# VEHICLE 2: ABANDONED POLICE / PATROL CRUISER
# Positioned at offset (+12, 0, 0)
# =========================================================================
cop_group = []
cop_origin = Vector((12.0, 0, 0))

# Chassis & Lower Body (Black & White retro cruiser)
cop_body_lower = create_box("Cop_BodyLower", (4.6, 2.1, 0.75), cop_origin + Vector((0, 0, 0.5)), mat=m_police_black)
cop_door_panels = create_box("Cop_WhiteDoors", (2.2, 2.15, 0.7), cop_origin + Vector((0, 0, 0.52)), mat=m_police_white)
# Cabin & Roof
cop_cabin = create_box("Cop_Cabin", (2.4, 1.8, 0.75), cop_origin + Vector((-0.2, 0, 1.2)), mat=m_police_black)
cop_roof = create_box("Cop_RoofWhite", (2.45, 1.85, 0.1), cop_origin + Vector((-0.2, 0, 1.58)), mat=m_police_white)
# Broken Windshield
cop_windshield = create_box("Cop_Windshield", (0.9, 1.7, 0.65), cop_origin + Vector((0.8, 0, 1.2)), rot=(0, 0.4, 0), mat=m_glass_broken)
# Heavy Bull-bar / Push Bumper on Front
cop_bullbar = create_box("Cop_BullBar", (0.35, 2.0, 0.65), cop_origin + Vector((2.4, 0, 0.5)), mat=m_metal_dark)
cop_hood_dented = create_box("Cop_HoodDented", (1.4, 1.9, 0.12), cop_origin + Vector((1.4, 0, 0.9)), rot=(0.08, -0.15, 0), mat=m_police_black)
# Rooftop Emergency Lightbar (Red & Blue flashing pods)
lightbar_base = create_box("Cop_LightbarBase", (0.3, 1.6, 0.1), cop_origin + Vector((-0.2, 0, 1.68)), mat=m_metal_dark)
light_red = create_box("Cop_LightRed", (0.28, 0.65, 0.2), cop_origin + Vector((-0.2, -0.45, 1.78)), mat=m_police_red)
light_blue = create_box("Cop_LightBlue", (0.28, 0.65, 0.2), cop_origin + Vector((-0.2, 0.45, 1.78)), mat=m_police_blue)
# One missing wheel propped on concrete cinderblocks
cop_wheels = [
    Vector((1.3, 1.1, 0.32)), Vector((1.3, -1.1, 0.32)),
    Vector((-1.3, 1.1, 0.32)) # Rear right wheel missing!
]
for idx, wpos in enumerate(cop_wheels):
    w = create_cylinder(f"Cop_Wheel_{idx}", 0.38, 0.24, cop_origin + wpos, rot=(1.57, 0, 0), vertices=8, mat=m_tire)
    cop_group.append(w)
# Cinderblock under rear right wheel
cinderblock = create_box("Cop_Cinderblock", (0.5, 0.5, 0.35), cop_origin + Vector((-1.3, -1.1, 0.2)), rot=(0, 0, 0.2), mat=m_metal_dark)

cop_group.extend([cop_body_lower, cop_door_panels, cop_cabin, cop_roof, cop_windshield, cop_bullbar, cop_hood_dented, lightbar_base, light_red, light_blue, cinderblock])

all_objects = van_group + cop_group

# Export
bpy.ops.object.select_all(action='DESELECT')
for obj in all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_objects[0]

output_dir = os.path.abspath(r"public/models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "approach_vehicles.glb")

print(f"Exporting {len(all_objects)} objects to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)

print("Approach Vehicles GLB generated successfully!")
