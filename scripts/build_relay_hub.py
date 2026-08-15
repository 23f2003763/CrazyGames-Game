import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.name = "TheRelay_Scene"

# =============================================================================
# MATERIALS PALETTE (Stylized PBR / FlatShading)
# =============================================================================
def make_mat(name, hex_color, roughness=0.85, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    
    # sRGB hex to linear conversion
    r = ((hex_color >> 16) & 0xff) / 255.0
    g = ((hex_color >> 8) & 0xff) / 255.0
    b = (hex_color & 0xff) / 255.0
    
    # Approximate gamma to linear
    bsdf.inputs['Base Color'].default_value = (r**2.2, g**2.2, b**2.2, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    return mat

MAT_CABIN_WALL = make_mat("Mat_CabinWall", 0x5a4432, 0.9)       # Weathered dark timber
MAT_WOOD_TRIM  = make_mat("Mat_WoodTrim", 0x3e2c1e, 0.85)       # Dark walnut trim
MAT_ROOF       = make_mat("Mat_Roof", 0x4a4f54, 0.75, 0.15)      # Corrugated zinc roof
MAT_CONCRETE   = make_mat("Mat_Concrete", 0x767876, 0.95)       # Foundation slab
MAT_DOOR       = make_mat("Mat_Door", 0x7a3a22, 0.8)            # Red-brown cabin door
MAT_GLASS      = make_mat("Mat_Glass", 0x22363b, 0.2, 0.8)       # Dark reflective window
MAT_STEEL      = make_mat("Mat_Steel", 0x363a3e, 0.6, 0.7)       # Radio tower galvanized steel
MAT_RUST_METAL = make_mat("Mat_RustMetal", 0x723e26, 0.85, 0.3)  # Weathered sheet metal
MAT_FENCE_WOOD = make_mat("Mat_FenceWood", 0x685542, 0.9)       # Palisade logs
MAT_YELLOW_ACC = make_mat("Mat_YellowAcc", 0xdba228, 0.6)       # Generator / warning accent
MAT_RED_ACC    = make_mat("Mat_RedAcc", 0xb23424, 0.6)          # Jerry cans / beacon lamp
MAT_STONE_FIRE = make_mat("Mat_StoneFire", 0x4e5052, 0.95)      # Fire ring stones

# Root Collection
col = bpy.context.collection

# =============================================================================
# HELPER PRIMITIVE BUILDERS
# =============================================================================
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

# Root Object for the entire location
relay_group = bpy.data.objects.new("TheRelay_Root", None)
col.objects.link(relay_group)

# =============================================================================
# 1. MAIN RANGER STATION / SURVIVOR CABIN (True Scale: 7.2m x 5.6m, Wall H: 2.8m)
# =============================================================================
cabin_grp = bpy.data.objects.new("Cabin_Building", None)
cabin_grp.location = Vector((-3.5, -4.5, 0)) # Offset from center
cabin_grp.parent = relay_group
col.objects.link(cabin_grp)

# Concrete foundation plinth (0.25m high)
add_box("Cabin_Foundation", (7.4, 6.0, 0.25), (0, 0, 0.125), MAT_CONCRETE, parent=cabin_grp)

# Main timber walls (Width 6.8m, Depth 5.4m, Height 2.8m)
add_box("Cabin_MainWalls", (6.8, 5.4, 2.8), (0, 0, 1.65), MAT_CABIN_WALL, parent=cabin_grp)

# Front Porch Deck (Width 7.0m, Depth 1.8m, Height 0.25m)
add_box("Cabin_PorchDeck", (7.0, 1.8, 0.25), (0, 3.4, 0.125), MAT_WOOD_TRIM, parent=cabin_grp)

# Porch Timber Steps (Width 2.2m, Depth 0.8m, Height 0.12m)
add_box("Cabin_PorchSteps", (2.2, 0.8, 0.12), (0, 4.4, 0.06), MAT_WOOD_TRIM, parent=cabin_grp)

# Porch Support Posts (4 pillars, Height 2.7m)
for px in [-3.1, -1.0, 1.0, 3.1]:
    add_box(f"Cabin_PorchPost_{px}", (0.18, 0.18, 2.7), (px, 4.1, 1.45), MAT_WOOD_TRIM, parent=cabin_grp)

# Porch Roof Beam (Width 7.2m, Height 0.22m)
add_box("Cabin_PorchBeam", (7.2, 0.25, 0.22), (0, 4.1, 2.8), MAT_WOOD_TRIM, parent=cabin_grp)

# Pitched Roof Main (Gable roof: Width 7.4m, Depth 6.2m, Height 1.4m)
# Create parametric prism for roof
bm = bmesh.new()
# 6 vertices for triangular prism
v0 = bm.verts.new((-3.8, -3.2, 2.9))
v1 = bm.verts.new(( 3.8, -3.2, 2.9))
v2 = bm.verts.new(( 0.0, -3.2, 4.3))
v3 = bm.verts.new((-3.8,  4.4, 2.9)) # Overhanging porch
v4 = bm.verts.new(( 3.8,  4.4, 2.9))
v5 = bm.verts.new(( 0.0,  4.4, 4.3))

bm.faces.new((v0, v1, v2))       # Back triangle
bm.faces.new((v3, v5, v4))       # Front triangle
bm.faces.new((v0, v2, v5, v3))   # Left slope
bm.faces.new((v1, v4, v5, v2))   # Right slope
bm.faces.new((v0, v3, v4, v1))   # Bottom base

mesh_roof = bpy.data.meshes.new("Cabin_RoofMesh")
bm.to_mesh(mesh_roof)
bm.free()
roof_obj = bpy.data.objects.new("Cabin_PitchedRoof", mesh_roof)
roof_obj.data.materials.append(MAT_ROOF)
roof_obj.parent = cabin_grp
col.objects.link(roof_obj)

# Cabin Front Entrance Door (Width 1.1m, Height 2.3m, Depth 0.12m)
add_box("Cabin_FrontDoor", (1.1, 0.12, 2.3), (0, 2.71, 1.3), MAT_DOOR, parent=cabin_grp)
add_box("Cabin_DoorFrame", (1.26, 0.16, 2.42), (0, 2.71, 1.36), MAT_WOOD_TRIM, parent=cabin_grp)

# Front Windows (2 large framed windows on either side of door)
for wx in [-2.0, 2.0]:
    add_box(f"Cabin_WindowGlass_{wx}", (1.4, 0.08, 1.3), (wx, 2.71, 1.6), MAT_GLASS, parent=cabin_grp)
    add_box(f"Cabin_WindowFrame_{wx}", (1.52, 0.14, 1.42), (wx, 2.71, 1.6), MAT_WOOD_TRIM, parent=cabin_grp)
    # Window shutters
    add_box(f"Cabin_ShutterL_{wx}", (0.35, 0.10, 1.35), (wx - 0.9, 2.73, 1.6), MAT_WOOD_TRIM, parent=cabin_grp)
    add_box(f"Cabin_ShutterR_{wx}", (0.35, 0.10, 1.35), (wx + 0.9, 2.73, 1.6), MAT_WOOD_TRIM, parent=cabin_grp)

# Stove Chimney Pipe on Roof
add_cylinder("Cabin_Chimney", 0.16, 1.6, (-2.2, -1.2, 4.3), MAT_RUST_METAL, parent=cabin_grp)

# Modest "THE RELAY" carved sign on porch beam (Width 2.2m, Height 0.45m - does not block camera!)
add_box("Cabin_Signboard", (2.2, 0.08, 0.45), (0, 4.22, 2.85), MAT_WOOD_TRIM, parent=cabin_grp)
add_box("Cabin_SignAccent", (2.0, 0.10, 0.06), (0, 4.22, 2.7), MAT_YELLOW_ACC, parent=cabin_grp)

# =============================================================================
# 2. RADIO COMMUNICATIONS TOWER (Galvanized Lattice Mast, Height: 11.5m)
# =============================================================================
tower_grp = bpy.data.objects.new("RadioTower_Station", None)
tower_grp.location = Vector((-8.5, -6.5, 0))
tower_grp.parent = relay_group
col.objects.link(tower_grp)

# Concrete base footing
add_box("Tower_Footing", (2.2, 2.2, 0.4), (0, 0, 0.2), MAT_CONCRETE, parent=tower_grp)

# 4 Corner steel upright legs (tapered inward slightly)
for lx in [-0.85, 0.85]:
    for lz in [-0.85, 0.85]:
        add_cylinder(f"Tower_Leg_{lx}_{lz}", 0.06, 11.2, (lx*0.8, lz*0.8, 5.8), MAT_STEEL, vertices=6, parent=tower_grp)

# Horizontal and X-braces across 5 vertical tiers
for tier in range(5):
    tz = 1.2 + tier * 2.1
    # Perimeter square ring
    add_box(f"Tower_Ring_{tier}", (1.5 - tier*0.1, 1.5 - tier*0.1, 0.08), (0, 0, tz), MAT_STEEL, parent=tower_grp)
    # Diagonal braces
    add_box(f"Tower_Diag1_{tier}", (1.7 - tier*0.1, 0.06, 0.06), (0, 0, tz + 0.9), MAT_STEEL, rot=(0.4, 0, 0), parent=tower_grp)
    add_box(f"Tower_Diag2_{tier}", (0.06, 1.7 - tier*0.1, 0.06), (0, 0, tz + 0.9), MAT_STEEL, rot=(0, 0.4, 0), parent=tower_grp)

# Top antenna mast & flashing beacon
add_cylinder("Tower_AntennaMast", 0.04, 3.5, (0, 0, 12.2), MAT_STEEL, vertices=6, parent=tower_grp)
add_cylinder("Tower_BeaconLamp", 0.12, 0.25, (0, 0, 13.8), MAT_RED_ACC, vertices=8, parent=tower_grp)

# Dish antenna attached to mid-mast
add_cylinder("Tower_Dish", 0.7, 0.15, (0.8, 0, 7.5), MAT_STEEL, rot=(0, math.pi/2, 0), vertices=10, parent=tower_grp)

# =============================================================================
# 3. FORTIFIED PERIMETER FENCE & WIDE VEHICLE/PLAYER GATE
# =============================================================================
fence_grp = bpy.data.objects.new("Compound_Perimeter", None)
fence_grp.parent = relay_group
col.objects.link(fence_grp)

# North & West perimeter palisade wall segments (Height 2.0m, log diameter ~0.2m)
# West flank wall: X = -10.5, Y = -9.0 .. 6.0
for wy in range(-9, 7, 2):
    add_box(f"Fence_West_{wy}", (0.22, 2.05, 2.1), (-10.5, wy, 1.05), MAT_FENCE_WOOD, parent=fence_grp)
    add_box(f"Fence_WestTrim_{wy}", (0.28, 2.0, 0.15), (-10.5, wy, 1.7), MAT_RUST_METAL, parent=fence_grp)

# North back wall: Y = -9.0, X = -10.5 .. 8.0
for nx in range(-10, 9, 2):
    add_box(f"Fence_North_{nx}", (2.05, 0.22, 2.1), (nx, -9.0, 1.05), MAT_FENCE_WOOD, parent=fence_grp)
    add_box(f"Fence_NorthTrim_{nx}", (2.0, 0.28, 0.15), (nx, -9.0, 1.7), MAT_RUST_METAL, parent=fence_grp)

# East flank wall: X = 8.5, Y = -9.0 .. 6.0
for ey in range(-9, 7, 2):
    add_box(f"Fence_East_{ey}", (0.22, 2.05, 2.1), (8.5, ey, 1.05), MAT_FENCE_WOOD, parent=fence_grp)

# South Front Wall with WIDE 4.5m GATE OPENING
# Left gate flank wall: X = -10.5 .. -2.4, Y = 6.0
add_box("Fence_SouthLeft_1", (4.0, 0.24, 2.1), (-6.5, 6.0, 1.05), MAT_FENCE_WOOD, parent=fence_grp)
add_box("Fence_SouthLeft_2", (4.0, 0.24, 2.1), (-2.5, 6.0, 1.05), MAT_FENCE_WOOD, parent=fence_grp)

# Right gate flank wall: X = 2.4 .. 8.5, Y = 6.0
add_box("Fence_SouthRight_1", (3.0, 0.24, 2.1), (4.0, 6.0, 1.05), MAT_FENCE_WOOD, parent=fence_grp)
add_box("Fence_SouthRight_2", (3.0, 0.24, 2.1), (7.0, 6.0, 1.05), MAT_FENCE_WOOD, parent=fence_grp)

# Fortified Gate Posts (Heavy log columns on either side of 4.5m opening)
add_cylinder("Gate_Post_Left", 0.24, 3.2, (-2.3, 6.0, 1.6), MAT_WOOD_TRIM, parent=fence_grp)
add_cylinder("Gate_Post_Right", 0.24, 3.2, (2.3, 6.0, 1.6), MAT_WOOD_TRIM, parent=fence_grp)

# Gate Overhead Timber Lintel (Height 3.1m - vehicles and players easily pass underneath!)
add_box("Gate_OverheadLintel", (5.2, 0.35, 0.3), (0, 6.0, 3.1), MAT_WOOD_TRIM, parent=fence_grp)

# Swing Gates Propped Open outward at 45°
add_box("Gate_Wing_Left", (2.1, 0.12, 2.0), (-2.8, 6.8, 1.0), MAT_RUST_METAL, rot=(0, 0, 0.65), parent=fence_grp)
add_box("Gate_Wing_Right", (2.1, 0.12, 2.0), (2.8, 6.8, 1.0), MAT_RUST_METAL, rot=(0, 0, -0.65), parent=fence_grp)

# =============================================================================
# 4. SURVIVOR LIVING AREA (Campfire, Benches, Water Cistern)
# =============================================================================
camp_grp = bpy.data.objects.new("Survivor_CampfireZone", None)
camp_grp.location = Vector((4.5, -2.0, 0))
camp_grp.parent = relay_group
col.objects.link(camp_grp)

# Circular stone fire ring (Diameter 1.2m)
for a in range(8):
    ang = a * (math.pi / 4)
    sx = math.cos(ang) * 0.6
    sy = math.sin(ang) * 0.6
    add_box(f"Fire_Stone_{a}", (0.25, 0.22, 0.18), (sx, sy, 0.09), MAT_STONE_FIRE, parent=camp_grp)

# Charred wood logs inside pit
add_box("Fire_Log_1", (0.7, 0.16, 0.14), (0, 0, 0.08), MAT_WOOD_TRIM, rot=(0, 0, 0.4), parent=camp_grp)
add_box("Fire_Log_2", (0.65, 0.14, 0.14), (0, 0, 0.14), MAT_WOOD_TRIM, rot=(0, 0, -0.7), parent=camp_grp)

# Sitting Log Benches (Height 0.45m, Width 1.8m)
add_box("Camp_Bench_1", (1.8, 0.4, 0.42), (0, 1.5, 0.21), MAT_WOOD_TRIM, parent=camp_grp)
add_box("Camp_Bench_2", (0.4, 1.6, 0.42), (-1.5, 0, 0.21), MAT_WOOD_TRIM, parent=camp_grp)

# Heavy Water Tank Cistern on Timber Stand (Height 2.2m, Diameter 1.3m)
add_cylinder("Camp_WaterTank", 0.65, 1.6, (6.8, -6.2, 1.4), MAT_STEEL, vertices=10, parent=relay_group)
add_box("Camp_WaterStand", (1.5, 1.5, 0.6), (6.8, -6.2, 0.3), MAT_WOOD_TRIM, parent=relay_group)

# =============================================================================
# 5. GENERATOR & WORKSHOP CORNER
# =============================================================================
work_grp = bpy.data.objects.new("Workshop_Zone", None)
work_grp.location = Vector((-7.5, 2.0, 0))
work_grp.parent = relay_group
col.objects.link(work_grp)

# Heavy Diesel Generator Unit (Width 1.4m, Depth 0.9m, Height 1.1m)
add_box("Generator_Body", (1.4, 0.9, 1.0), (0, 0, 0.5), MAT_YELLOW_ACC, parent=work_grp)
add_box("Generator_Base", (1.5, 1.0, 0.14), (0, 0, 0.07), MAT_STEEL, parent=work_grp)
add_cylinder("Generator_Exhaust", 0.06, 1.2, (0.4, 0.25, 1.2), MAT_RUST_METAL, parent=work_grp)

# Sturdy Wooden Worktable (Width 2.0m, Depth 0.85m, Height 0.9m)
add_box("Worktable_Top", (2.0, 0.85, 0.1), (0, 2.2, 0.9), MAT_WOOD_TRIM, parent=work_grp)
for tx in [-0.85, 0.85]:
    for ty in [1.9, 2.5]:
        add_box(f"Worktable_Leg_{tx}_{ty}", (0.12, 0.12, 0.85), (tx, ty, 0.425), MAT_WOOD_TRIM, parent=work_grp)

# Jerry Cans on table & ground
add_box("JerryCan_1", (0.35, 0.18, 0.42), (-0.4, 2.2, 1.15), MAT_RED_ACC, parent=work_grp)
add_box("JerryCan_2", (0.35, 0.18, 0.42), (0.7, 0.9, 0.21), MAT_RED_ACC, parent=work_grp)

# =============================================================================
# 6. DYNAMIC SPAWN PLAYER MARKER
# =============================================================================
spawn_obj = bpy.data.objects.new("SPAWN_PLAYER", None)
# Positioned inside open courtyard with direct unobstructed view towards exit gate
spawn_obj.location = Vector((0.0, 2.5, 0.0))
spawn_obj.parent = relay_group
col.objects.link(spawn_obj)

# =============================================================================
# 7. COLLIDERS (Accurate Invisible Bounding Boxes)
# =============================================================================
def add_collider_box(name, size, pos, parent=relay_group):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0,0,0))
    cobj = bpy.context.active_object
    cobj.name = f"COL_BOX_{name}"
    cobj.scale = Vector(size)
    cobj.location = Vector(pos)
    cobj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return cobj

# Cabin Main Building Blocker (7.2m x 5.8m)
add_collider_box("Cabin_Building", (7.2, 5.8, 3.5), (-3.5, -4.5, 1.75))

# Radio Tower Footing Blocker (2.2m x 2.2m)
add_collider_box("RadioTower", (2.2, 2.2, 4.0), (-8.5, -6.5, 2.0))

# West Perimeter Fence Blocker
add_collider_box("Fence_West", (0.5, 16.0, 2.5), (-10.5, -1.0, 1.25))

# North Perimeter Fence Blocker
add_collider_box("Fence_North", (19.0, 0.5, 2.5), (-1.0, -9.0, 1.25))

# East Perimeter Fence Blocker
add_collider_box("Fence_East", (0.5, 16.0, 2.5), (8.5, -1.0, 1.25))

# South Front Fence - Left Flank
add_collider_box("Fence_South_Left", (8.0, 0.5, 2.5), (-6.5, 6.0, 1.25))

# South Front Fence - Right Flank
add_collider_box("Fence_South_Right", (6.0, 0.5, 2.5), (5.5, 6.0, 1.25))

# Generator Blocker
add_collider_box("Generator", (1.6, 1.1, 1.4), (-7.5, 2.0, 0.7))

# Water Cistern Blocker
add_collider_box("WaterTank", (1.6, 1.6, 2.5), (6.8, -6.2, 1.25))

# =============================================================================
# EXPORT GLB
# =============================================================================
out_path = os.path.abspath("public/models/relay_hub.glb")
os.makedirs(os.path.dirname(out_path), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_yup=True
)

print(f"SUCCESS: The Relay Hub exported to {out_path}")
