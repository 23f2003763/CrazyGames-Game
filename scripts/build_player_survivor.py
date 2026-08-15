import bpy
import os
import math
from mathutils import Vector, Matrix

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def make_material(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if 'Base Color' in bsdf.inputs:
            bsdf.inputs['Base Color'].default_value = color
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bsdf.inputs:
            bsdf.inputs['Metallic'].default_value = metallic
    return mat

def create_cylinder(name, radius1, radius2, depth, loc, mat_name=None, vertices=12):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat_name and mat_name in mats:
        obj.data.materials.append(mats[mat_name])
    bpy.ops.object.shade_flat()
    return obj

def create_cube(name, scale, loc, mat_name=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat_name and mat_name in mats:
        obj.data.materials.append(mats[mat_name])
    bpy.ops.object.shade_flat()
    return obj

def create_sphere(name, radius, loc, mat_name=None, segments=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat_name and mat_name in mats:
        obj.data.materials.append(mats[mat_name])
    bpy.ops.object.shade_flat()
    return obj

def create_empty(name, loc):
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
    obj = bpy.context.active_object
    obj.name = name
    return obj

def move_origin(obj, new_origin_world):
    saved_cursor = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = new_origin_world
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = saved_cursor

def parent_to(child, parent):
    child.parent = parent

def build_player():
    clear_scene()

    global mats
    mats = {
        # Warm readable stylized palette
        "Skin": make_material("Skin", (0.92, 0.65, 0.48, 1), roughness=0.7),
        "Hair": make_material("Hair", (0.16, 0.10, 0.06, 1), roughness=0.85),
        "Eyebrows": make_material("Eyebrows", (0.08, 0.04, 0.02, 1), roughness=0.9),
        "Jacket": make_material("Jacket", (0.08, 0.28, 0.32, 1), roughness=0.75),      # Dark teal survivor jacket
        "Undershirt": make_material("Undershirt", (0.85, 0.82, 0.76, 1), roughness=0.9),
        "Scarf": make_material("Scarf", (0.92, 0.36, 0.08, 1), roughness=0.8),         # Saturated burnt-orange scarf
        "Pants": make_material("Pants", (0.28, 0.34, 0.20, 1), roughness=0.85),        # Olive cargo pants
        "Boots": make_material("Boots", (0.12, 0.13, 0.14, 1), roughness=0.7),        # Charcoal rugged boots
        "Gloves": make_material("Gloves", (0.18, 0.18, 0.20, 1), roughness=0.8),
        "Belt": make_material("Belt", (0.16, 0.10, 0.06, 1), roughness=0.85),
        "Buckle": make_material("Buckle", (0.88, 0.72, 0.18, 1), roughness=0.4, metallic=0.6), # Brass accent
        "Backpack": make_material("Backpack", (0.38, 0.28, 0.18, 1), roughness=0.85),
        "Bedroll": make_material("Bedroll", (0.52, 0.48, 0.36, 1), roughness=0.9),
        "Armor": make_material("Armor", (0.42, 0.46, 0.50, 1), roughness=0.5, metallic=0.3),
        "KneePad": make_material("KneePad", (0.14, 0.15, 0.16, 1), roughness=0.8),
    }

    # Root
    player_root = create_empty("PLAYER_ROOT", (0, 0, 0))

    # Hips (Origin at hip center z = 1.05)
    hips = create_cube("HIPS", (0.34, 0.24, 0.18), (0, 0, 1.05), "Pants")
    move_origin(hips, (0, 0, 1.05))
    parent_to(hips, player_root)

    # Belt with buckle and side pouches
    belt = create_cube("Belt", (0.36, 0.26, 0.06), (0, 0, 1.12), "Belt")
    parent_to(belt, hips)
    buckle = create_cube("Buckle", (0.08, 0.04, 0.08), (0, 0.14, 1.12), "Buckle")
    parent_to(buckle, hips)
    pouch_r = create_cube("Pouch_R", (0.1, 0.08, 0.12), (0.18, 0.08, 1.10), "Belt")
    parent_to(pouch_r, hips)
    pouch_l = create_cube("Pouch_L", (0.08, 0.08, 0.10), (-0.18, 0.04, 1.10), "Belt")
    parent_to(pouch_l, hips)

    # Torso (Tapered jacket, origin at waist joint z = 1.14)
    torso = create_cylinder("TORSO", radius1=0.18, radius2=0.24, depth=0.48, loc=(0, 0, 1.38), mat_name="Jacket")
    torso.scale = (1.0, 0.72, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_origin(torso, (0, 0, 1.14))
    parent_to(torso, hips)

    # Undershirt neck reveal
    shirt_top = create_cube("Undershirt_Top", (0.16, 0.14, 0.12), (0, 0.04, 1.58), "Undershirt")
    parent_to(shirt_top, torso)

    # Burnt Orange Scarf (Voluminous and chunky, wraps neck and flows slightly back)
    scarf_collar = create_cylinder("SCARF", radius1=0.16, radius2=0.20, depth=0.18, loc=(0, 0, 1.62), mat_name="Scarf")
    parent_to(scarf_collar, torso)
    scarf_knot = create_sphere("Scarf_Knot", 0.08, (0.08, 0.16, 1.60), "Scarf")
    parent_to(scarf_knot, torso)
    scarf_tail = create_cube("Scarf_Tail", (0.12, 0.06, 0.26), (0.10, -0.16, 1.50), "Scarf")
    scarf_tail.rotation_euler = (0.3, 0, 0.2)
    parent_to(scarf_tail, torso)

    # Stylized Head & Hair (Origin at neck base z = 1.64)
    head = create_sphere("HEAD", 0.18, (0, 0, 1.80), "Skin")
    head.scale = (0.95, 1.0, 1.1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_origin(head, (0, 0, 1.64))
    parent_to(head, torso)

    # Nose & Eyebrows
    nose = create_sphere("Nose", 0.04, (0, 0.18, 1.80), "Skin")
    parent_to(nose, head)
    eb_l = create_cube("Eyebrow_L", (0.06, 0.02, 0.02), (0.07, 0.16, 1.86), "Eyebrows")
    eb_l.rotation_euler = (0, 0, 0.12)
    parent_to(eb_l, head)
    eb_r = create_cube("Eyebrow_R", (0.06, 0.02, 0.02), (-0.07, 0.16, 1.86), "Eyebrows")
    eb_r.rotation_euler = (0, 0, -0.12)
    parent_to(eb_r, head)

    # Chunky Hair
    hair_top = create_sphere("HAIR", 0.20, (0, -0.02, 1.86), "Hair")
    hair_top.scale = (1.02, 1.05, 0.95)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    parent_to(hair_top, head)
    hair_bang = create_sphere("Hair_Bang", 0.08, (0.06, 0.14, 1.90), "Hair")
    parent_to(hair_bang, head)

    # Left Shoulder Armor Pad (Asymmetric rugged survivor look)
    shoulder_pad = create_sphere("SHOULDER_ARMOR", 0.13, (0.28, 0, 1.52), "Armor")
    shoulder_pad.scale = (1.1, 0.9, 0.8)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    parent_to(shoulder_pad, torso)

    # Backpack & Bedroll
    backpack = create_cube("BACKPACK", (0.28, 0.18, 0.34), (0, -0.20, 1.40), "Backpack")
    parent_to(backpack, torso)
    bedroll = create_cylinder("Bedroll", radius1=0.09, radius2=0.09, depth=0.32, loc=(0, -0.22, 1.62), mat_name="Bedroll", vertices=8)
    bedroll.rotation_euler = (0, 1.5708, 0)
    parent_to(bedroll, backpack)

    # Left Arm (Shoulder pivot z = 1.50)
    arm_l = create_cylinder("ARM_L", radius1=0.07, radius2=0.08, depth=0.28, loc=(0.28, 0, 1.38), mat_name="Jacket")
    move_origin(arm_l, (0.28, 0, 1.50))
    parent_to(arm_l, torso)

    forearm_l = create_cylinder("FOREARM_L", radius1=0.06, radius2=0.07, depth=0.26, loc=(0.28, 0, 1.14), mat_name="Skin")
    move_origin(forearm_l, (0.28, 0, 1.27))
    parent_to(forearm_l, arm_l)

    hand_l = create_sphere("HAND_L", 0.08, (0.28, 0, 0.98), "Gloves")
    move_origin(hand_l, (0.28, 0, 1.01))
    parent_to(hand_l, forearm_l)
    
    hand_l_socket = create_empty("HAND_L_SOCKET", (0.28, 0, 0.94))
    parent_to(hand_l_socket, hand_l)

    # Right Arm (Shoulder pivot z = 1.50)
    arm_r = create_cylinder("ARM_R", radius1=0.07, radius2=0.08, depth=0.28, loc=(-0.28, 0, 1.38), mat_name="Jacket")
    move_origin(arm_r, (-0.28, 0, 1.50))
    parent_to(arm_r, torso)

    forearm_r = create_cylinder("FOREARM_R", radius1=0.06, radius2=0.07, depth=0.26, loc=(-0.28, 0, 1.14), mat_name="Skin")
    move_origin(forearm_r, (-0.28, 0, 1.27))
    parent_to(forearm_r, arm_r)

    hand_r = create_sphere("HAND_R", 0.08, (-0.28, 0, 0.98), "Gloves")
    move_origin(hand_r, (-0.28, 0, 1.01))
    parent_to(hand_r, forearm_r)

    hand_r_socket = create_empty("HAND_R_SOCKET", (-0.28, 0, 0.94))
    parent_to(hand_r_socket, hand_r)

    # Left Leg (Hip pivot z = 0.96)
    leg_l = create_cylinder("LEG_L", radius1=0.09, radius2=0.11, depth=0.44, loc=(0.14, 0, 0.74), mat_name="Pants")
    move_origin(leg_l, (0.14, 0, 0.96))
    parent_to(leg_l, hips)

    knee_l = create_cube("KneePad_L", (0.12, 0.10, 0.12), (0.14, 0.08, 0.52), "KneePad")
    parent_to(knee_l, leg_l)

    # Left Boot (Knee pivot z = 0.52)
    boot_l = create_cylinder("BOOT_L", radius1=0.11, radius2=0.09, depth=0.42, loc=(0.14, 0, 0.31), mat_name="Boots")
    move_origin(boot_l, (0.14, 0, 0.52))
    parent_to(boot_l, leg_l)

    boot_l_foot = create_cube("BOOT_L_FOOT", (0.18, 0.30, 0.14), (0.14, 0.07, 0.07), "Boots")
    parent_to(boot_l_foot, boot_l)

    # Right Leg (Hip pivot z = 0.96)
    leg_r = create_cylinder("LEG_R", radius1=0.09, radius2=0.11, depth=0.44, loc=(-0.14, 0, 0.74), mat_name="Pants")
    move_origin(leg_r, (-0.14, 0, 0.96))
    parent_to(leg_r, hips)

    knee_r = create_cube("KneePad_R", (0.12, 0.10, 0.12), (-0.14, 0.08, 0.52), "KneePad")
    parent_to(knee_r, leg_r)

    # Right Boot (Knee pivot z = 0.52)
    boot_r = create_cylinder("BOOT_R", radius1=0.11, radius2=0.09, depth=0.42, loc=(-0.14, 0, 0.31), mat_name="Boots")
    move_origin(boot_r, (-0.14, 0, 0.52))
    parent_to(boot_r, leg_r)

    boot_r_foot = create_cube("BOOT_R_FOOT", (0.18, 0.30, 0.14), (-0.14, 0.07, 0.07), "Boots")
    parent_to(boot_r_foot, boot_r)

    # Measure bounds and normalize to TARGET_PLAYER_HEIGHT = 2.1
    bpy.context.view_layer.update()
    
    min_z = float('inf')
    max_z = float('-inf')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for corner in obj.bound_box:
                world_corner = obj.matrix_world @ Vector(corner)
                if world_corner.z < min_z:
                    min_z = world_corner.z
                if world_corner.z > max_z:
                    max_z = world_corner.z

    current_height = max_z - min_z
    TARGET_PLAYER_HEIGHT = 2.1
    scale_factor = TARGET_PLAYER_HEIGHT / current_height

    player_root.scale = (scale_factor, scale_factor, scale_factor)
    bpy.context.view_layer.update()

    min_z = float('inf')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for corner in obj.bound_box:
                world_corner = obj.matrix_world @ Vector(corner)
                if world_corner.z < min_z:
                    min_z = world_corner.z

    for child in player_root.children:
        child.location.z -= (min_z / scale_factor)

    bpy.context.view_layer.update()

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    export_path = os.path.abspath("public/models/player_survivor.glb")
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=export_path, export_format='GLB', use_selection=False)
    print(f"Exported Ryder to {export_path}")

if __name__ == "__main__":
    build_player()
