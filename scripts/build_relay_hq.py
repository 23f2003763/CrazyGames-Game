import bpy
import bmesh
import math
import os
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.6, metalness=0.2, emissive=None, emissive_intensity=1.0, alpha=1.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if 'Alpha' in bsdf.inputs:
            bsdf.inputs['Alpha'].default_value = alpha
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

def build_relay_hq():
    reset_scene()

    mat_wall = get_or_create_material("HQ_WallMat", (0.22, 0.26, 0.28), roughness=0.7, metalness=0.3)
    mat_wall_fade = get_or_create_material("HQ_WallFadeMat", (0.24, 0.28, 0.30), roughness=0.7, metalness=0.3)
    mat_roof = get_or_create_material("HQ_RoofFadeMat", (0.16, 0.18, 0.20), roughness=0.6, metalness=0.4)
    mat_floor = get_or_create_material("HQ_FloorMat", (0.28, 0.25, 0.22), roughness=0.8, metalness=0.1)
    mat_metal_dark = get_or_create_material("HQ_DarkMetal", (0.12, 0.14, 0.16), roughness=0.4, metalness=0.8)
    mat_cyan_screen = get_or_create_material("HQ_ScreenGlow", (0.0, 0.85, 1.0), roughness=0.2, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=3.5)
    mat_accent_orange = get_or_create_material("HQ_OrangeAccent", (0.85, 0.38, 0.08), roughness=0.5, metalness=0.2)

    root = bpy.data.objects.new("RELAY_HQ_ROOT", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. Foundation & Interior Floor
    create_box("INTERIOR_FLOOR", (8.4, 6.2, 0.15), location=(0, 0, 0.075), mat=mat_floor, parent=root)
    create_box("Porch_Step", (2.8, 1.2, 0.12), location=(0, -3.6, 0.06), mat=mat_metal_dark, parent=root)

    # 2. Solid Structural Walls (East, West, North, and South Doorway Posts)
    create_box("WALL_SOLID_N", (8.4, 0.35, 3.2), location=(0, 2.95, 1.6), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_W", (0.35, 5.8, 3.2), location=(-4.05, 0, 1.6), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_E", (0.35, 5.8, 3.2), location=(4.05, 0, 1.6), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_S_L", (3.0, 0.35, 3.2), location=(-2.6, -2.95, 1.6), mat=mat_wall, parent=root)
    create_box("WALL_SOLID_S_R", (3.0, 0.35, 3.2), location=(2.6, -2.95, 1.6), mat=mat_wall, parent=root)
    create_box("DOORWAY_LINTEL", (2.4, 0.35, 0.6), location=(0, -2.95, 2.9), mat=mat_wall, parent=root)

    # 3. Fade Groups: Roof and Camera-Facing Southern Front Wall Upper Segment
    roof_group = bpy.data.objects.new("ROOF_FADE", None)
    roof_group.parent = root
    bpy.context.scene.collection.objects.link(roof_group)
    create_box("Roof_Slab_Main", (9.0, 6.8, 0.25), location=(0, 0, 3.3), mat=mat_roof, parent=roof_group)
    create_box("Roof_Overhang", (9.2, 7.0, 0.12), location=(0, 0, 3.4), mat=mat_metal_dark, parent=roof_group)

    wall_fade_group = bpy.data.objects.new("WALL_FADE_CAMERA", None)
    wall_fade_group.parent = root
    bpy.context.scene.collection.objects.link(wall_fade_group)
    create_box("Wall_Fade_S_Upper_L", (2.9, 0.36, 1.4), location=(-2.6, -2.95, 2.3), mat=mat_wall_fade, parent=wall_fade_group)
    create_box("Wall_Fade_S_Upper_R", (2.9, 0.36, 1.4), location=(2.6, -2.95, 2.3), mat=mat_wall_fade, parent=wall_fade_group)

    # 4. Interior Workstation, Terminal Console & Furniture
    interior_group = bpy.data.objects.new("INTERIOR_PROPS", None)
    interior_group.parent = root
    bpy.context.scene.collection.objects.link(interior_group)

    # Mara Workstation Desk (North-East corner)
    create_box("Desk_Workbench", (2.6, 1.1, 0.85), location=(2.4, 2.1, 0.425), mat=mat_metal_dark, parent=interior_group)
    create_box("Terminal_Console_Screen", (1.2, 0.25, 0.65), location=(2.4, 2.4, 1.15), rotation=(-0.25, 0, 0), mat=mat_cyan_screen, parent=interior_group)
    create_box("Terminal_Keyboard", (0.8, 0.4, 0.08), location=(2.4, 1.9, 0.88), mat=mat_accent_orange, parent=interior_group)

    # Radio Rack & Comms Array Tower (North-West corner)
    create_box("Radio_Rack_Unit", (1.2, 1.6, 2.4), location=(-2.9, 1.9, 1.2), mat=mat_metal_dark, parent=interior_group)
    create_box("Radio_Dials_Screen", (0.9, 0.1, 0.45), location=(-2.9, 1.1, 1.5), mat=mat_cyan_screen, parent=interior_group)

    # Tool Bench & Shelving (West Wall)
    create_box("Storage_Shelf_Unit", (0.8, 2.4, 2.2), location=(-3.4, -0.6, 1.1), mat=mat_metal_dark, parent=interior_group)

    # 5. Exterior Details
    create_box("Ext_Antenna_Mast_Mount", (0.4, 0.4, 2.8), location=(3.8, 2.8, 2.4), mat=mat_metal_dark, parent=root)
    create_box("Ext_Power_Box", (0.6, 0.4, 1.1), location=(-3.2, -3.1, 0.6), mat=mat_accent_orange, parent=root)

    # 6. Authored Physical Collider Markers (Scanned by ColliderRegistry)
    # North Wall
    create_box("COL_BOX_WALL_N", (8.4, 0.45, 3.2), location=(0, 2.95, 1.6), mat=None, parent=root)
    # East Wall
    create_box("COL_BOX_WALL_E", (0.45, 5.8, 3.2), location=(4.05, 0, 1.6), mat=None, parent=root)
    # West Wall
    create_box("COL_BOX_WALL_W", (0.45, 5.8, 3.2), location=(-4.05, 0, 1.6), mat=None, parent=root)
    # South Wall Left & Right (Doorway gap between X: -1.1 .. 1.1)
    create_box("COL_BOX_WALL_S_LEFT", (3.0, 0.45, 3.2), location=(-2.6, -2.95, 1.6), mat=None, parent=root)
    create_box("COL_BOX_WALL_S_RIGHT", (3.0, 0.45, 3.2), location=(2.6, -2.95, 1.6), mat=None, parent=root)
    # Interior props
    create_box("COL_BOX_CONSOLE", (2.6, 1.2, 1.2), location=(2.4, 2.1, 0.6), mat=None, parent=root)
    create_box("COL_BOX_WORKBENCH", (1.2, 1.8, 2.4), location=(-2.9, 1.9, 1.2), mat=None, parent=root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/world", exist_ok=True)
    out_path = os.path.abspath("public/models/world/relay_hq.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Relay HQ with Collider Markers to {out_path}")

if __name__ == '__main__':
    build_relay_hq()
