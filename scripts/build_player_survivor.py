import bpy
import math

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    for collection in [bpy.data.meshes, bpy.data.materials, bpy.data.objects]:
        for item in collection:
            collection.remove(item)

def create_material(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
    return mat

def create_box(name, parent, location, size, offset, material):
    bpy.ops.mesh.primitive_cube_add(size=1, enter_editmode=False, align='WORLD', location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    
    # Apply offset in edit mode
    bpy.ops.object.mode_set(mode='EDIT')
    import bmesh
    bm = bmesh.from_edit_mesh(obj.data)
    for v in bm.verts:
        v.co[0] = v.co[0] * size[0] + offset[0]
        v.co[1] = v.co[1] * size[1] + offset[1]
        v.co[2] = v.co[2] * size[2] + offset[2]
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Set flat shading
    for poly in obj.data.polygons:
        poly.use_smooth = False
        
    obj.data.materials.append(material)
    
    # Set location (pivot)
    obj.location = location
    
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
        
    return obj

def create_empty(name, parent, location):
    bpy.ops.object.empty_add(type='PLAIN_AXES', align='WORLD', location=location)
    obj = bpy.context.active_object
    obj.name = name
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj

def build_character():
    clean_scene()
    
    # Materials
    mat_jacket = create_material("Mat_Jacket", (0.05, 0.2, 0.15, 1.0)) # Dark teal/olive
    mat_trousers = create_material("Mat_Trousers", (0.1, 0.1, 0.1, 1.0)) # Dark gray
    mat_skin = create_material("Mat_Skin", (0.8, 0.5, 0.4, 1.0))
    mat_scarf = create_material("Mat_Scarf", (0.8, 0.2, 0.05, 1.0))
    mat_boots = create_material("Mat_Boots", (0.05, 0.03, 0.02, 1.0))
    mat_pack = create_material("Mat_Pack", (0.3, 0.2, 0.1, 1.0))
    
    # PLAYER_ROOT
    root = create_empty("PLAYER_ROOT", None, (0, 0, 0))
    
    # SHADOW_SOCKET
    shadow_socket = create_empty("SHADOW_SOCKET", root, (0, 0, 0.05))
    
    # TORSO
    torso = create_box("TORSO", root, (0, 0, 1.0), (0.5, 0.35, 0.5), (0, 0, 0.25), mat_jacket)
    
    # SCARF
    scarf = create_box("SCARF", torso, (0, 0, 1.5), (0.55, 0.4, 0.1), (0, -0.05, 0.05), mat_scarf)
    
    # HEAD
    head = create_box("HEAD", torso, (0, 0, 1.55), (0.35, 0.35, 0.4), (0, -0.05, 0.2), mat_skin)
    
    # BACKPACK
    backpack = create_box("BACKPACK", torso, (0, 0.175, 1.3), (0.4, 0.25, 0.5), (0, 0.125, 0), mat_pack)
    
    # ARMS
    arm_l = create_box("ARM_L", torso, (0.35, 0, 1.45), (0.18, 0.18, 0.4), (0, 0, -0.2), mat_jacket)
    forearm_l = create_box("FOREARM_L", arm_l, (0.35, 0, 1.05), (0.15, 0.15, 0.4), (0, 0, -0.2), mat_skin)
    socket_l = create_empty("HAND_L_SOCKET", forearm_l, (0.35, 0, 0.65))
    
    arm_r = create_box("ARM_R", torso, (-0.35, 0, 1.45), (0.18, 0.18, 0.4), (0, 0, -0.2), mat_jacket)
    forearm_r = create_box("FOREARM_R", arm_r, (-0.35, 0, 1.05), (0.15, 0.15, 0.4), (0, 0, -0.2), mat_skin)
    socket_r = create_empty("HAND_R_SOCKET", forearm_r, (-0.35, 0, 0.65))
    
    # LEGS (Parented to ROOT)
    leg_l = create_box("LEG_L", root, (0.15, 0, 1.0), (0.2, 0.2, 0.5), (0, 0, -0.25), mat_trousers)
    boot_l = create_box("BOOT_L", leg_l, (0.15, 0, 0.5), (0.22, 0.28, 0.5), (0, -0.04, -0.25), mat_boots)
    
    leg_r = create_box("LEG_R", root, (-0.15, 0, 1.0), (0.2, 0.2, 0.5), (0, 0, -0.25), mat_trousers)
    boot_r = create_box("BOOT_R", leg_r, (-0.15, 0, 0.5), (0.22, 0.28, 0.5), (0, -0.04, -0.25), mat_boots)
    
    # Export GLB
    output_path = bpy.path.abspath("//../public/models/player_survivor.glb")
    # if running from root, just use absolute path
    import os
    output_path = os.path.join(os.getcwd(), "public", "models", "player_survivor.glb")
    
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"Exported to {output_path}")

if __name__ == "__main__":
    build_character()
