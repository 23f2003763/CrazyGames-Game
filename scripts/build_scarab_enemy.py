import bpy
import bmesh
import math
import os
import random
from mathutils import Vector, Matrix

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.5, metalness=0.8, emissive=None, emissive_intensity=1.0):
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

def create_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_scarab_enemy():
    reset_scene()

    # Materials
    mat_graphite = get_or_create_material("Scarab_GraphiteArmor", (0.12, 0.13, 0.15), roughness=0.45, metalness=0.85)
    mat_bronze = get_or_create_material("Scarab_ChassisJoints", (0.24, 0.22, 0.20), roughness=0.6, metalness=0.7)
    mat_core_red = get_or_create_material("Scarab_LatticeCore", (1.0, 0.08, 0.18), roughness=0.2, metalness=0.1, emissive=(1.0, 0.05, 0.15), emissive_intensity=4.5)
    mat_eye = get_or_create_material("Scarab_SensorEye", (1.0, 0.85, 0.2), roughness=0.1, metalness=0.0, emissive=(1.0, 0.7, 0.1), emissive_intensity=5.0)

    # Master Root for the Scarab
    scarab_root = bpy.data.objects.new("SCARAB_ROOT", None)
    bpy.context.scene.collection.objects.link(scarab_root)

    # 1. Main Chassis & Core Shell (Faceted hexagonal body)
    chassis = create_box("Chassis", (0.7, 0.8, 0.32), location=(0, 0, 0.42), mat=mat_graphite, parent=scarab_root)
    
    # 2. Angular Upper Armored Carapace Plates
    create_box("Carapace_Left", (0.32, 0.75, 0.14), location=(-0.2, -0.05, 0.58), rotation=(0.1, -0.15, 0.05), mat=mat_graphite, parent=scarab_root)
    create_box("Carapace_Right", (0.32, 0.75, 0.14), location=(0.2, -0.05, 0.58), rotation=(0.1, 0.15, -0.05), mat=mat_graphite, parent=scarab_root)
    create_box("Carapace_Back", (0.55, 0.35, 0.12), location=(0.0, -0.38, 0.52), rotation=(-0.2, 0, 0), mat=mat_graphite, parent=scarab_root)

    # 3. Glowing Lattice Core (Exposed between upper carapace seams)
    core = create_box("LatticeCore", (0.18, 0.45, 0.12), location=(0.0, 0.0, 0.52), mat=mat_core_red, parent=scarab_root)

    # 4. Front Sensor Head & Scanning Eye Lens
    head = create_box("SensorHead", (0.38, 0.28, 0.22), location=(0.0, 0.48, 0.40), rotation=(0.12, 0, 0), mat=mat_graphite, parent=scarab_root)
    eye = create_cylinder("SensorEye", 0.07, 0.08, location=(0.0, 0.62, 0.40), rotation=(math.pi/2, 0, 0), mat=mat_eye, parent=scarab_root)
    
    # Mandibles / Arc Blades
    create_box("Mandible_L", (0.05, 0.28, 0.04), location=(-0.14, 0.62, 0.34), rotation=(0, 0, -0.3), mat=mat_core_red, parent=scarab_root)
    create_box("Mandible_R", (0.05, 0.28, 0.04), location=(0.14, 0.62, 0.34), rotation=(0, 0, 0.3), mat=mat_core_red, parent=scarab_root)

    # 5. Articulated Mechanical Legs (4 Heavy Legs with Hip + Knee + Claw)
    leg_positions = [
        ("Leg_FL", (-0.35,  0.30),  0.4),  # Front Left
        ("Leg_FR", ( 0.35,  0.30), -0.4),  # Front Right
        ("Leg_BL", (-0.38, -0.28),  0.8),  # Back Left
        ("Leg_BR", ( 0.38, -0.28), -0.8)   # Back Right
    ]

    for leg_name, (lx, ly), leg_yaw in leg_positions:
        hip = create_box(f"{leg_name}_Hip", (0.14, 0.14, 0.14), location=(lx, ly, 0.38), mat=mat_bronze, parent=scarab_root)
        
        # Upper limb (stretches outwards/upwards)
        sign = 1 if lx > 0 else -1
        thigh = create_box(f"{leg_name}_Thigh", (0.08, 0.32, 0.08), 
                           location=(lx + sign * 0.18, ly + math.sin(leg_yaw)*0.1, 0.48), 
                           rotation=(0.3, sign * -0.6, leg_yaw * 0.5), 
                           mat=mat_graphite, parent=scarab_root)
        
        # Lower limb (tapers down to ground contact claw)
        shin = create_box(f"{leg_name}_Shin", (0.06, 0.06, 0.48), 
                          location=(lx + sign * 0.35, ly + math.sin(leg_yaw)*0.18, 0.24), 
                          rotation=(-0.2, sign * 0.4, 0), 
                          mat=mat_bronze, parent=scarab_root)
        
        # Ground foot claw
        create_box(f"{leg_name}_Foot", (0.08, 0.14, 0.04), 
                   location=(lx + sign * 0.42, ly + math.sin(leg_yaw)*0.22, 0.02), 
                   rotation=(0, 0, 0), 
                   mat=mat_graphite, parent=scarab_root)

    # Apply flat shading across all meshes
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    # Export to GLB
    os.makedirs("public/models/enemies", exist_ok=True)
    out_path = os.path.abspath("public/models/enemies/scarab.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported Scarab Machine Enemy to {out_path}")

if __name__ == '__main__':
    build_scarab_enemy()
