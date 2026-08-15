import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.name = "OctaneMart_Scene"

# =============================================================================
# MATERIALS PALETTE (Stylized PBR / FlatShading)
# =============================================================================
def make_mat(name, hex_color, roughness=0.85, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    
    r = ((hex_color >> 16) & 0xff) / 255.0
    g = ((hex_color >> 8) & 0xff) / 255.0
    b = (hex_color & 0xff) / 255.0
    
    bsdf.inputs['Base Color'].default_value = (r**2.2, g**2.2, b**2.2, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    return mat

MAT_STUCCO_WALL = make_mat("Mat_StuccoWall", 0xb8b4a8, 0.92)      # Off-white weathered commercial stucco
MAT_TRIM_RED    = make_mat("Mat_TrimRed", 0xad3224, 0.75, 0.1)    # Octane commercial red brand stripe
MAT_TRIM_TEAL   = make_mat("Mat_TrimTeal", 0x26686e, 0.75, 0.1)   # Octane teal accent band
MAT_CANOPY_ROOF = make_mat("Mat_CanopyRoof", 0x3d4348, 0.7, 0.3)  # Dark canopy sheet metal
MAT_CONCRETE    = make_mat("Mat_Concrete", 0x6e7275, 0.95)        # Island curb / foundation
MAT_PUMP_BODY   = make_mat("Mat_PumpBody", 0x9a3622, 0.65, 0.2)   # Vintage red fuel dispenser
MAT_PUMP_PANEL  = make_mat("Mat_PumpPanel", 0x1e2428, 0.4, 0.6)  # Pump meter / dark glass
MAT_STEEL_COL   = make_mat("Mat_SteelCol", 0x484e54, 0.6, 0.5)    # Canopy steel columns
MAT_DOOR_FRAME  = make_mat("Mat_DoorFrame", 0x32363a, 0.5, 0.7)  # Anodized aluminum door
MAT_GLASS       = make_mat("Mat_Glass", 0x182a30, 0.2, 0.8)       # Storefront display window
MAT_ROOF_HVAC   = make_mat("Mat_RoofHVAC", 0x585d62, 0.65, 0.6)   # Rooftop metal vents
MAT_YELLOW_ACC  = make_mat("Mat_YellowAcc", 0xe2a826, 0.6)        # Price totem / bollards

col = bpy.context.collection

def add_box(name, size, pos, mat, rot=(0,0,0), parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0,0,0))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    obj.rotation_euler = Euler(rot)
    obj.location = Vector(pos)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def add_cylinder(name, radius, depth, pos, mat, rot=(0,0,0), vertices=12, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=(0,0,0))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = Euler(rot)
    obj.location = Vector(pos)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

# Root Object
station_group = bpy.data.objects.new("OctaneMart_Root", None)
col.objects.link(station_group)

# =============================================================================
# 1. CONVENIENCE STORE (True Metric: 10.5m W x 7.0m D x 3.2m H, Parapet 3.6m)
# =============================================================================
store_grp = bpy.data.objects.new("Store_Building", None)
# Offset behind the fuel forecourt (North)
store_grp.location = Vector((0, -8.5, 0))
store_grp.parent = station_group
col.objects.link(store_grp)

# Foundation Plinth
add_box("Store_Foundation", (10.8, 7.4, 0.2), (0, 0, 0.1), MAT_CONCRETE, parent=store_grp)

# Main Commercial Walls (Width 10.5m, Depth 7.0m, Height 3.4m)
add_box("Store_MainWalls", (10.5, 7.0, 3.4), (0, 0, 1.8), MAT_STUCCO_WALL, parent=store_grp)

# Parapet Roof Cap & Brand Trim Bands
add_box("Store_ParapetCap", (10.7, 7.2, 0.35), (0, 0, 3.55), MAT_TRIM_RED, parent=store_grp)
add_box("Store_BrandStripeRed", (10.6, 7.1, 0.25), (0, 0, 3.2), MAT_TRIM_RED, parent=store_grp)
add_box("Store_BrandStripeTeal", (10.55, 7.05, 0.15), (0, 0, 2.95), MAT_TRIM_TEAL, parent=store_grp)

# Commercial Front Entrance Door (Width 1.2m, Height 2.4m)
add_box("Store_EntranceDoor", (1.2, 0.1, 2.4), (-2.8, 3.52, 1.3), MAT_DOOR_FRAME, parent=store_grp)
add_box("Store_DoorGlass", (0.9, 0.08, 1.8), (-2.8, 3.53, 1.4), MAT_GLASS, parent=store_grp)

# Storefront Display Windows (2 large panoramic display windows)
# Left Window: X = 0.6, Width 2.8m, Height 2.1m
add_box("Store_WindowL", (2.8, 0.1, 2.1), (0.6, 3.52, 1.55), MAT_GLASS, parent=store_grp)
add_box("Store_WindowFrameL", (2.95, 0.14, 2.25), (0.6, 3.52, 1.55), MAT_DOOR_FRAME, parent=store_grp)

# Right Window: X = 3.8, Width 2.4m, Height 2.1m
add_box("Store_WindowR", (2.4, 0.1, 2.1), (3.8, 3.52, 1.55), MAT_GLASS, parent=store_grp)
add_box("Store_WindowFrameR", (2.55, 0.14, 2.25), (3.8, 3.52, 1.55), MAT_DOOR_FRAME, parent=store_grp)

# Rooftop HVAC Unit & Exhaust Fan
add_box("Store_HVAC_Unit", (2.2, 1.6, 1.1), (2.5, -1.5, 4.1), MAT_ROOF_HVAC, parent=store_grp)
add_cylinder("Store_HVAC_Fan", 0.5, 0.2, (2.5, -1.5, 4.7), MAT_STEEL_COL, parent=store_grp)
add_box("Store_RoofVent", (0.8, 0.8, 0.7), (-3.2, 1.0, 3.9), MAT_ROOF_HVAC, parent=store_grp)

# Modest "OCTANE MART" Signboard above entrance (Width 3.6m, Height 0.65m)
add_box("Store_Signboard", (3.6, 0.12, 0.65), (-0.5, 3.58, 2.65), MAT_TRIM_RED, parent=store_grp)
add_box("Store_SignAccent", (3.4, 0.14, 0.08), (-0.5, 3.58, 2.35), MAT_YELLOW_ACC, parent=store_grp)

# Ice Cooler Machine next to entrance
add_box("Store_IceCooler", (1.6, 0.9, 1.3), (-4.2, 3.8, 0.75), MAT_ROOF_HVAC, parent=store_grp)

# =============================================================================
# 2. FUEL PUMP CANOPY & ISLAND (Canopy W: 11.0m x D: 5.8m, Clearance H: 3.8m)
# =============================================================================
canopy_grp = bpy.data.objects.new("Pump_CanopyZone", None)
canopy_grp.location = Vector((0, 2.5, 0)) # Forecourt position
canopy_grp.parent = station_group
col.objects.link(canopy_grp)

# Concrete Pump Island Curb (Length 8.5m, Width 1.4m, Height 0.2m)
add_box("Canopy_IslandCurb", (8.5, 1.4, 0.2), (0, 0, 0.1), MAT_CONCRETE, parent=canopy_grp)

# 2 Steel Support Columns (Height 3.9m, Box 0.45m x 0.45m)
for cx in [-3.2, 3.2]:
    add_box(f"Canopy_Column_{cx}", (0.45, 0.45, 3.9), (cx, 0, 2.05), MAT_STEEL_COL, parent=canopy_grp)
    # Concrete impact base
    add_box(f"Canopy_ColBase_{cx}", (0.7, 0.7, 0.7), (cx, 0, 0.35), MAT_CONCRETE, parent=canopy_grp)

# Overhead Canopy Roof Deck (Width 11.0m, Depth 5.8m, Thickness 0.6m at Y = 4.2m)
add_box("Canopy_RoofSlab", (11.0, 5.8, 0.6), (0, 0, 4.2), MAT_CANOPY_ROOF, parent=canopy_grp)
add_box("Canopy_FasciaRed", (11.1, 5.9, 0.35), (0, 0, 4.25), MAT_TRIM_RED, parent=canopy_grp)
add_box("Canopy_FasciaTeal", (11.05, 5.85, 0.15), (0, 0, 3.95), MAT_TRIM_TEAL, parent=canopy_grp)

# 3 Dual-Sided Fuel Dispensers (Height 1.55m, Width 0.85m, Depth 0.55m)
for i, px in enumerate([-2.0, 0.0, 2.0]):
    disp_name = f"Fuel_Dispenser_{i+1}"
    add_box(f"{disp_name}_Body", (0.85, 0.55, 1.45), (px, 0, 0.925), MAT_PUMP_BODY, parent=canopy_grp)
    # Analog meter / nozzle display
    add_box(f"{disp_name}_PanelF", (0.7, 0.08, 0.5), (px, 0.26, 1.2), MAT_PUMP_PANEL, parent=canopy_grp)
    add_box(f"{disp_name}_PanelB", (0.7, 0.08, 0.5), (px, -0.26, 1.2), MAT_PUMP_PANEL, parent=canopy_grp)
    # Pump top brand sign
    add_box(f"{disp_name}_Cap", (0.88, 0.58, 0.12), (px, 0, 1.68), MAT_TRIM_TEAL, parent=canopy_grp)

# Yellow Crash Bollard Posts at island ends
for bx in [-4.0, 4.0]:
    for by in [-0.45, 0.45]:
        add_cylinder(f"Bollard_{bx}_{by}", 0.1, 0.9, (bx, by, 0.55), MAT_YELLOW_ACC, parent=canopy_grp)

# =============================================================================
# 3. ROADSIDE PRICE TOTEM SIGN (Height 5.2m, Width 1.8m)
# =============================================================================
sign_grp = bpy.data.objects.new("Roadside_SignZone", None)
sign_grp.location = Vector((-6.5, 9.5, 0)) # Road shoulder turnoff
sign_grp.parent = station_group
col.objects.link(sign_grp)

# Concrete base plinth
add_box("Sign_Plinth", (2.0, 1.0, 0.3), (0, 0, 0.15), MAT_CONCRETE, parent=sign_grp)

# Dual Steel Pylons
add_box("Sign_PylonL", (0.16, 0.16, 5.0), (-0.75, 0, 2.6), MAT_STEEL_COL, parent=sign_grp)
add_box("Sign_PylonR", (0.16, 0.16, 5.0), ( 0.75, 0, 2.6), MAT_STEEL_COL, parent=sign_grp)

# Main "OCTANE" Brand Board (Height 2.4m, Width 1.8m)
add_box("Sign_Board", (1.8, 0.25, 2.4), (0, 0, 4.0), MAT_TRIM_RED, parent=sign_grp)
add_box("Sign_PricePanel", (1.6, 0.28, 1.2), (0, 0, 3.4), MAT_PUMP_PANEL, parent=sign_grp)
add_box("Sign_TopTrim", (1.9, 0.3, 0.2), (0, 0, 5.2), MAT_YELLOW_ACC, parent=sign_grp)

# =============================================================================
# 4. COLLIDERS (Accurate Invisible Bounding Boxes)
# =============================================================================
def add_collider_box(name, size, pos, parent=station_group):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0,0,0))
    cobj = bpy.context.active_object
    cobj.name = f"COL_BOX_{name}"
    cobj.scale = Vector(size)
    cobj.location = Vector(pos)
    cobj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return cobj

# Convenience Store Main Blocker (10.6m x 7.2m x 4.0m)
add_collider_box("Store_MainBuilding", (10.6, 7.2, 4.0), (0, -8.5, 2.0))

# Pump Island Blocker (8.6m x 1.5m x 2.2m)
add_collider_box("Pump_Island", (8.6, 1.5, 2.2), (0, 2.5, 1.1))

# Canopy Left Column Blocker
add_collider_box("Canopy_ColL", (0.8, 0.8, 4.0), (-3.2, 2.5, 2.0))

# Canopy Right Column Blocker
add_collider_box("Canopy_ColR", (0.8, 0.8, 4.0), (3.2, 2.5, 2.0))

# Roadside Totem Sign Blocker
add_collider_box("Roadside_Sign", (2.0, 1.0, 5.5), (-6.5, 9.5, 2.75))

# =============================================================================
# EXPORT GLB
# =============================================================================
out_path = os.path.abspath("public/models/abandoned_gas_station.glb")
os.makedirs(os.path.dirname(out_path), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True
)

print(f"SUCCESS: Octane Mart Gas Station exported to {out_path}")
