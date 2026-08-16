import bpy
import bmesh
import math
import os
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.6, metalness=0.2, emissive=None, emissive_intensity=1.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if emissive:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
                bsdf.inputs['Emission Strength'].default_value = emissive_intensity
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = (*emissive, 1.0)
    return mat

def create_box(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_repeater():
    reset_scene()

    mat_metal = get_or_create_material("Rep_DarkMetal", (0.16, 0.18, 0.22), roughness=0.5, metalness=0.85)
    mat_wall = get_or_create_material("Rep_Wall", (0.24, 0.27, 0.30), roughness=0.7, metalness=0.2)
    mat_wall_fade = get_or_create_material("Rep_WallFade", (0.25, 0.28, 0.31), roughness=0.7, metalness=0.2)
    mat_roof = get_or_create_material("Rep_RoofFade", (0.15, 0.16, 0.18), roughness=0.6, metalness=0.5)
    mat_floor = get_or_create_material("Rep_Floor", (0.22, 0.20, 0.18), roughness=0.8, metalness=0.1)
    mat_red_dormant = get_or_create_material("Rep_RedDormant", (0.8, 0.15, 0.1), roughness=0.2, metalness=0.1, emissive=(0.8, 0.15, 0.1), emissive_intensity=2.0)
    mat_cyan_power = get_or_create_material("Rep_CyanPower", (0.0, 0.9, 1.0), roughness=0.1, metalness=0.1, emissive=(0.0, 0.9, 1.0), emissive_intensity=4.0)

    root = bpy.data.objects.new("REPEATER_SITE_ROOT", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Repeater Tower Structure (Height: ~12m)
    tower_base_pos = (-3.5, 3.0, 0)
    create_cylinder("Tower_Base_Plinth", 1.4, 0.4, location=(-3.5, 3.0, 0.2), mat=mat_metal, parent=root)
    create_cylinder("Tower_Mast_Shaft", 0.35, 12.0, location=(-3.5, 3.0, 6.2), mat=mat_metal, parent=root)

    # 3 Segmented Power Rings on Tower
    for idx, z in enumerate([3.5, 6.5, 9.5]):
        create_cylinder(f"Tower_Power_Ring_{idx+1}", 0.75, 0.35, location=(-3.5, 3.0, z), mat=mat_red_dormant, parent=root)

    # Communications Dish at Mast Top
    create_cylinder("Tower_Dish_Cap", 1.8, 0.15, location=(-3.5, 3.0, 12.0), rotation=(0.35, 0, 0), mat=mat_metal, parent=root)

    # 2. Enterable Technical Terminal Hut (4.5m x 3.8m x 2.8m)
    hut_pos = (1.8, 0, 0)
    create_box("INTERIOR_FLOOR", (4.5, 3.8, 0.15), location=(1.8, 0, 0.075), mat=mat_floor, parent=root)

    # Solid Walls (North, East, West, South Doorway Posts)
    create_box("WALL_SOLID_N", (4.5, 0.3, 2.8), location=(1.8, 1.75, 1.4), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_E", (0.3, 3.4, 2.8), location=(3.9, 0, 1.4), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_W", (0.3, 3.4, 2.8), location=(-0.3, 0, 1.4), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_S_L", (1.4, 0.3, 2.8), location=(0.55, -1.75, 1.4), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_S_R", (1.4, 0.3, 2.8), location=(3.05, -1.75, 1.4), mat=mat_wall, parent=root)
    create_box("DOORWAY_LINTEL", (1.7, 0.3, 0.5), location=(1.8, -1.75, 2.55), mat=mat_wall, parent=root)

    # Fade Groups: Roof and Camera Wall
    roof_group = bpy.data.objects.new("ROOF_FADE", None)
    roof_group.parent = root
    bpy.context.scene.collection.objects.link(roof_group)
    create_box("Hut_Roof_Slab", (5.0, 4.3, 0.22), location=(1.8, 0, 2.9), mat=mat_roof, parent=roof_group)

    wall_fade_group = bpy.data.objects.new("WALL_FADE_CAMERA", None)
    wall_fade_group.parent = root
    bpy.context.scene.collection.objects.link(wall_fade_group)
    create_box("Wall_Fade_S_Upper", (4.5, 0.32, 1.2), location=(1.8, -1.75, 2.0), mat=mat_wall_fade, parent=wall_fade_group)

    # Interior Repeater Console Terminal
    interior_group = bpy.data.objects.new("INTERIOR_PROPS", None)
    interior_group.parent = root
    bpy.context.scene.collection.objects.link(interior_group)

    create_box("Terminal_Console_Base", (1.6, 0.9, 0.85), location=(1.8, 1.1, 0.425), mat=mat_metal, parent=interior_group)
    create_box("REPEATER_CONSOLE_SCREEN", (1.1, 0.2, 0.65), location=(1.8, 1.35, 1.15), rotation=(-0.25, 0, 0), mat=mat_red_dormant, parent=interior_group)
    create_box("Shard_Socket_Slot", (0.25, 0.15, 0.12), location=(1.8, 0.95, 0.88), mat=mat_cyan_power, parent=interior_group)

    # Power conduits linking Hut to Tower
    create_cylinder("Power_Conduit_Pipe", 0.08, 3.8, location=(-0.8, 1.5, 0.15), rotation=(0, math.pi/2, 0.4), mat=mat_metal, parent=root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/repeater_site.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Repeater Site to {out_path}")

if __name__ == '__main__':
    build_repeater()
