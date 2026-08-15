import bpy
import math
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

# ------------------------------------------------------------
# MATERIALS
# ------------------------------------------------------------

def mat(name, color, rough=0.8, metal=0.0, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)

    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")

    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal

    if emission:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1)
            bsdf.inputs["Emission Strength"].default_value = 2.0

    return m


CONCRETE = mat("Concrete", (0.34, 0.36, 0.31), 0.95)
CONCRETE_LIGHT = mat("ConcreteLight", (0.47, 0.46, 0.39), 0.9)
OLIVE = mat("MilitaryOlive", (0.19, 0.31, 0.12), 0.82)
DARK = mat("CharcoalMetal", (0.08, 0.10, 0.09), 0.72, 0.35)
RUST = mat("RustOrange", (0.55, 0.19, 0.06), 0.86, 0.1)
YELLOW = mat("HazardYellow", (0.92, 0.63, 0.06), 0.68)
RED = mat("WarningRed", (0.63, 0.08, 0.04), 0.72)
GLASS = mat("WindowDark", (0.025, 0.055, 0.045), 0.35)
SANDBAG = mat("Sandbag", (0.46, 0.38, 0.23), 0.98)
LAMP = mat(
    "WarningLamp",
    (0.95, 0.35, 0.06),
    0.4,
    emission=(1.0, 0.18, 0.03)
)


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def cube(name, loc, scale, material, rot=(0,0,0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)

    o = bpy.context.object
    o.name = name
    o.scale = scale

    bpy.ops.object.transform_apply(
        location=False,
        rotation=False,
        scale=True
    )

    o.data.materials.append(material)

    if bevel > 0:
        mod = o.modifiers.new("SoftEdges", "BEVEL")
        mod.width = bevel
        mod.segments = 2

    return o


def cyl(name, loc, radius, depth, material, verts=10, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=rot
    )

    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)

    return o


def sandbag(name, x, y, z, rot=0):
    return cube(
        name,
        (x,y,z),
        (0.75, 0.34, 0.28),
        SANDBAG,
        (0,0,rot),
        0.16
    )


# ------------------------------------------------------------
# MAIN MASS
# ------------------------------------------------------------

# Wide bunker base
cube(
    "HeroBunker_Base",
    (0,0,0.55),
    (7.8,5.0,0.55),
    CONCRETE_LIGHT,
    bevel=0.25
)

# Main body
cube(
    "HeroBunker_Body",
    (0,0,2.3),
    (7.1,4.45,1.9),
    OLIVE,
    bevel=0.22
)

# Heavy roof
cube(
    "HeroBunker_Roof",
    (0,0,4.45),
    (7.8,5.05,0.42),
    CONCRETE_LIGHT,
    bevel=0.18
)

# Oversized roof lip for silhouette
cube(
    "HeroBunker_RoofLip",
    (0,-0.15,4.75),
    (8.2,5.25,0.23),
    CONCRETE,
    bevel=0.12
)

# ------------------------------------------------------------
# FRONT FACADE
# ------------------------------------------------------------

# Recessed dark entrance
cube(
    "HeroBunker_DoorVoid",
    (0,-4.5,2.0),
    (1.65,0.18,1.65),
    DARK
)

# Blast door offset/partially open
cube(
    "HeroBunker_BlastDoor",
    (1.45,-4.72,1.95),
    (1.25,0.18,1.55),
    RUST,
    (0,0,-0.17),
    0.12
)

# Strong observation slit
cube(
    "HeroBunker_Window",
    (-3.6,-4.53,2.65),
    (2.0,0.15,0.42),
    GLASS,
    bevel=0.08
)

# Window armor hood
cube(
    "HeroBunker_WindowHood",
    (-3.6,-4.7,3.25),
    (2.35,0.52,0.18),
    CONCRETE_LIGHT,
    (0.12,0,0),
    0.08
)

# Hazard entrance columns
cube(
    "HeroBunker_HazardL",
    (-1.95,-4.72,1.45),
    (0.28,0.16,1.25),
    YELLOW
)

cube(
    "HeroBunker_HazardR",
    (1.95,-4.72,1.45),
    (0.28,0.16,1.25),
    YELLOW
)

# ------------------------------------------------------------
# DAMAGE
# ------------------------------------------------------------

# Collapsed roof corner
cube(
    "HeroBunker_DamageChunkA",
    (6.55,3.85,4.75),
    (1.6,1.15,0.32),
    CONCRETE,
    (0.22,-0.12,0.20)
)

cube(
    "HeroBunker_DamageChunkB",
    (6.7,4.35,3.7),
    (0.9,0.75,0.5),
    CONCRETE_LIGHT,
    (0.35,0.2,-0.2)
)

# Burn scar
cube(
    "HeroBunker_BurnScar",
    (5.2,-4.48,2.2),
    (1.25,0.07,1.0),
    DARK,
    (0,0,0.12)
)

# ------------------------------------------------------------
# ROOFTOP COMMAND SILHOUETTE
# ------------------------------------------------------------

# Radar platform
cube(
    "HeroBunker_RadarBase",
    (-2.7,0.8,5.25),
    (1.25,1.25,0.35),
    DARK,
    bevel=0.12
)

# Radar stalk
cyl(
    "HeroBunker_RadarPole",
    (-2.7,0.8,6.25),
    0.16,
    1.9,
    DARK,
    8
)

# Stylized radar dish
cyl(
    "HeroBunker_RadarDish",
    (-2.7,0.8,7.15),
    1.15,
    0.24,
    OLIVE,
    12,
    (math.radians(55),0,math.radians(20))
)

# Tall antenna
cyl(
    "HeroBunker_Antenna",
    (3.8,1.5,7.0),
    0.10,
    5.2,
    DARK,
    6,
    (0.05,-0.08,0)
)

# Antenna orange tip
cyl(
    "HeroBunker_AntennaTip",
    (3.8,1.5,9.65),
    0.16,
    0.35,
    LAMP,
    8
)

# ------------------------------------------------------------
# SANDBAG FIGHTING POSITION
# ------------------------------------------------------------

for i in range(7):
    sandbag(
        f"RoofSandbagFront_{i}",
        -4.6 + i*1.45,
        -3.9,
        5.15,
        0.03*(i%2)
    )

for i in range(4):
    sandbag(
        f"RoofSandbagSide_{i}",
        -5.25,
        -2.8 + i*1.35,
        5.15,
        math.radians(90)
    )

# ------------------------------------------------------------
# EXTERIOR DETAILS
# ------------------------------------------------------------

# warning lamps
for x in (-2.4, 2.4):
    cyl(
        f"DoorLamp_{x}",
        (x,-4.82,3.6),
        0.22,
        0.30,
        LAMP,
        8,
        (math.radians(90),0,0)
    )

# ventilation boxes
cube(
    "HeroBunker_VentA",
    (1.4,1.6,5.15),
    (0.85,0.65,0.45),
    DARK,
    bevel=0.08
)

cube(
    "HeroBunker_VentB",
    (0.1,2.25,5.1),
    (0.55,0.55,0.38),
    RUST,
    (0,0,0.22),
    0.08
)

# Side reinforcement ribs
for x in (-5.8, -3.0, 3.0, 5.8):
    cube(
        f"HeroBunker_Rib_{x}",
        (x,4.45,2.4),
        (0.22,0.35,1.8),
        CONCRETE_LIGHT
    )

# ------------------------------------------------------------
# GAMEPLAY SOCKET
# ------------------------------------------------------------

empty = bpy.data.objects.new("SOCKET_BUNKER_DOOR", None)
empty.empty_display_type = "PLAIN_AXES"
empty.location = (0,-6.0,0.1)
bpy.context.scene.collection.objects.link(empty)

# ------------------------------------------------------------
# EXPORT
# ------------------------------------------------------------

os.makedirs("public/models", exist_ok=True)

bpy.ops.object.select_all(action="SELECT")

bpy.ops.export_scene.gltf(
    filepath=os.path.abspath("public/models/hero_military_bunker.glb"),
    export_format="GLB",
    use_selection=True,
    export_apply=True
)

print("hero_military_bunker.glb exported")
