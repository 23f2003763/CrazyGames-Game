import bpy
import bmesh
import math
import os
from mathutils import Vector

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def create_material(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

def create_emissive_material(name, color, strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Emission Color'].default_value = color
    bsdf.inputs['Emission Strength'].default_value = strength
    return mat

def add_empty_marker(name, location, scale=(0.25, 0.25, 0.25)):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.5
    empty.location = location
    empty.scale = scale
    bpy.context.scene.collection.objects.link(empty)
    return empty

def create_cube(name, location, scale, material):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if material:
        obj.data.materials.append(material)
    return obj

def build_relay_operations():
    reset_scene()
    
    # Materials
    mat_concrete = create_material("mat_concrete", (0.65, 0.62, 0.58, 1.0), roughness=0.9)
    mat_dark_metal = create_material("mat_dark_metal", (0.25, 0.25, 0.28, 1.0), roughness=0.4, metallic=0.8)
    mat_rust = create_material("mat_rust", (0.55, 0.30, 0.15, 1.0), roughness=0.85)
    mat_floor = create_material("mat_floor", (0.40, 0.38, 0.35, 1.0), roughness=0.95)
    mat_equipment = create_material("mat_equipment", (0.30, 0.35, 0.32, 1.0), roughness=0.6, metallic=0.5)
    mat_screen = create_emissive_material("mat_screen", (0.05, 0.25, 0.30, 1.0), strength=2.0)
    mat_wood = create_material("mat_wood", (0.45, 0.30, 0.18, 1.0), roughness=0.85)
    mat_warning = create_material("mat_warning", (0.9, 0.5, 0.05, 1.0), roughness=0.7)
    
    # Base configuration
    # Interior: 11x9 footprint
    # Ops room: 6x5, Workshop: 5x4, Airlock: 3x3
    # Origin at center of the floor

    # Floor
    create_cube("Floor", (0, 0, -0.1), (5.5, 4.5, 0.1), mat_floor)
    
    # Exterior Walls (Thickness 0.35m)
    # North wall
    create_cube("Wall_N", (0, 4.5, 1.4), (5.5, 0.175, 1.4), mat_concrete)
    # East wall
    create_cube("Wall_E", (5.5, 0, 1.4), (0.175, 4.5, 1.4), mat_concrete)
    # West wall
    create_cube("Wall_W", (-5.5, 0, 1.4), (0.175, 4.5, 1.4), mat_concrete)
    # South wall (with door gap)
    create_cube("Wall_S_Left_wall_fade", (-3.5, -4.5, 1.4), (2.0, 0.175, 1.4), mat_concrete)
    create_cube("Wall_S_Right_wall_fade", (2.5, -4.5, 1.4), (3.0, 0.175, 1.4), mat_concrete)
    # Door Header
    create_cube("Door_Header", (-1.0, -4.5, 2.5), (0.5, 0.175, 0.3), mat_concrete)

    # Interior Walls
    # Ops room (West side) vs Workshop (East side) vs Airlock (South-West)
    create_cube("Wall_Int_1", (-1.5, 0, 1.4), (0.1, 4.5, 1.4), mat_concrete) # Divides ops and workshop
    create_cube("Wall_Int_2", (-3.5, -1.5, 1.4), (2.0, 0.1, 1.4), mat_concrete) # Divides ops and airlock
    
    # Roof (Angled)
    roof = create_cube("Roof", (0, 0, 2.9), (5.8, 4.8, 0.1), mat_dark_metal)
    # Slightly angle the roof
    roof.rotation_euler[0] = 0.05

    # Canopy
    create_cube("Canopy", (-1.0, -5.0, 2.6), (1.5, 0.5, 0.05), mat_dark_metal)
    
    # Windows (Boxes acting as frames)
    create_cube("Window_E1", (5.6, 2.0, 1.5), (0.1, 0.8, 0.5), mat_rust)
    create_cube("Window_E2", (5.6, -2.0, 1.5), (0.1, 0.8, 0.5), mat_rust)
    create_cube("Window_W", (-5.6, 1.0, 1.5), (0.1, 1.0, 0.5), mat_rust)

    # Roof Antenna & Vents
    create_cube("Roof_Vent", (2.0, 2.0, 3.2), (0.5, 0.5, 0.3), mat_equipment)
    create_cube("Antenna_Base", (-3.0, -2.0, 3.1), (0.4, 0.4, 0.1), mat_dark_metal)
    antenna = create_cube("Antenna_Pole", (-3.0, -2.0, 4.1), (0.05, 0.05, 1.0), mat_dark_metal)
    create_cube("Antenna_Indicator", (-3.0, -2.0, 5.1), (0.1, 0.1, 0.1), mat_warning)
    
    # Ops Room Equipment (North-West)
    # Desk
    create_cube("Desk", (-3.5, 3.0, 0.4), (1.2, 0.5, 0.4), mat_wood)
    # Signal Terminal
    create_cube("Signal_Terminal", (-3.5, 4.0, 1.2), (1.0, 0.3, 1.2), mat_equipment)
    create_cube("Signal_Screen", (-3.5, 3.8, 1.5), (0.8, 0.05, 0.5), mat_screen)
    # Monitors
    create_cube("Monitor_1", (-4.0, 3.2, 0.9), (0.3, 0.1, 0.2), mat_screen)
    create_cube("Monitor_2", (-3.0, 3.2, 0.9), (0.3, 0.1, 0.2), mat_screen)
    
    # Workshop Equipment (East side)
    create_cube("Workbench", (3.0, 2.0, 0.5), (1.5, 0.6, 0.5), mat_wood)
    create_cube("Generator", (3.5, 3.5, 0.6), (0.8, 0.6, 0.6), mat_equipment)
    create_cube("Shelves", (4.5, 0.0, 1.0), (0.4, 1.5, 1.0), mat_dark_metal)
    
    # Airlock Equipment (South-West)
    create_cube("Locker_1", (-4.5, -3.5, 1.0), (0.3, 0.3, 1.0), mat_equipment)
    create_cube("Locker_2", (-3.8, -3.5, 1.0), (0.3, 0.3, 1.0), mat_equipment)
    create_cube("Crate", (-2.5, -3.0, 0.4), (0.4, 0.4, 0.4), mat_warning)

    # EXTERNAL DETAILS
    create_cube("Power_Cabinet", (-5.6, -2.0, 1.0), (0.2, 0.5, 0.8), mat_equipment)
    
    # Empty Markers (Sockets, Cameras, Targets, Collisions)
    
    # Sockets
    add_empty_marker("SOCKET_MARA", (-3.5, 2.0, 0)) # standing position in Ops room
    add_empty_marker("SOCKET_PLAYER_DOOR_ENTRY", (-1.0, -3.5, 0))
    add_empty_marker("SOCKET_SIGNAL_CONSOLE", (-3.5, 3.0, 0))
    add_empty_marker("SOCKET_WORKBENCH", (3.0, 1.0, 0))

    # Cameras
    add_empty_marker("CAM_OPEN_ANTENNA", (-5.0, -4.0, 1.0))
    add_empty_marker("CAM_OPEN_CONSOLE", (-1.5, 2.5, 1.5))
    add_empty_marker("CAM_OPEN_MARA", (-1.5, 1.0, 1.5))
    add_empty_marker("CAM_DIALOGUE", (-2.5, 1.5, 1.6))
    add_empty_marker("CAM_CONSOLE_INTERACT", (-3.5, 1.5, 1.7))

    # Targets
    add_empty_marker("TARGET_ANTENNA", (-3.0, -2.0, 4.0))
    add_empty_marker("TARGET_SIGNAL_CONSOLE", (-3.5, 3.8, 1.5))
    add_empty_marker("TARGET_MARA", (-3.5, 2.0, 1.6))

    # Collision Boxes (Scaled appropriately)
    add_empty_marker("COL_BOX_WALL_N", (0, 4.5, 1.4), scale=(5.5, 0.175, 1.4))
    add_empty_marker("COL_BOX_WALL_E", (5.5, 0, 1.4), scale=(0.175, 4.5, 1.4))
    add_empty_marker("COL_BOX_WALL_W", (-5.5, 0, 1.4), scale=(0.175, 4.5, 1.4))
    add_empty_marker("COL_BOX_WALL_S_LEFT", (-3.5, -4.5, 1.4), scale=(2.0, 0.175, 1.4))
    add_empty_marker("COL_BOX_WALL_S_RIGHT", (2.5, -4.5, 1.4), scale=(3.0, 0.175, 1.4))
    add_empty_marker("COL_BOX_CONSOLE", (-3.5, 4.0, 1.2), scale=(1.0, 0.3, 1.2))
    add_empty_marker("COL_BOX_WORKBENCH", (3.0, 2.0, 0.5), scale=(1.5, 0.6, 0.5))

def export_glb(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_materials='EXPORT',
        export_extras=True
    )

if __name__ == "__main__":
    build_relay_operations()
    export_glb(os.path.abspath("public/models/world/relay_operations.glb"))
