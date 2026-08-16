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

def create_faceted_hull(name, size, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, taper=0.7, bevel=0.08):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
        if v.co.z > 0:
            v.co.x *= taper
            v.co.y *= taper
            
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, profile=0.7)
    
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)
    
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_armored_panel(name, width, height, thickness=0.06, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= width
        v.co.y *= thickness
        v.co.z *= height
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.02, segments=1)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_joint_cylinder(name, radius, depth, location=(0,0,0), rotation=(0,0,0), mat=None, parent=None, vertices=12):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=vertices, radius1=radius, radius2=radius, depth=depth)
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_lattice_wrecks():
    reset_scene()

    mat_armor = get_or_create_material("Lattice_ArmorDark", (0.13, 0.14, 0.17), roughness=0.5, metalness=0.85)
    mat_bronze = get_or_create_material("Lattice_JointAlloy", (0.28, 0.24, 0.18), roughness=0.6, metalness=0.75)
    mat_damaged_chassis = get_or_create_material("Lattice_DamagedChassis", (0.18, 0.17, 0.16), roughness=0.8, metalness=0.6)
    mat_orange_trim = get_or_create_material("Lattice_HazardOrange", (0.85, 0.42, 0.08), roughness=0.6, metalness=0.2)
    mat_dead_core = get_or_create_material("Lattice_DeadCore", (0.1, 0.08, 0.08), roughness=0.9, metalness=0.1)
    mat_flicker_core = get_or_create_material("Lattice_FlickerCore", (0.8, 0.05, 0.1), roughness=0.2, metalness=0.2, emissive=(0.9, 0.05, 0.1), emissive_intensity=3.0)
    mat_arc_spark = get_or_create_material("Lattice_ArcCoreBroken", (0.1, 0.8, 1.0), roughness=0.1, metalness=0.1, emissive=(0.0, 0.85, 1.0), emissive_intensity=4.0)

    master_root = bpy.data.objects.new("Lattice_Wreck_Kit", None)
    bpy.context.scene.collection.objects.link(master_root)

    # 1. SurveyBot_Wreck
    survey_root = bpy.data.objects.new("SurveyBot_Wreck", None)
    bpy.context.scene.collection.objects.link(survey_root)
    survey_root.parent = master_root
    survey_root.location = Vector((-6, 0, 0))

    create_faceted_hull("Survey_MainHull", (2.2, 1.8, 0.7), location=(0, 0, 0.45), rotation=(0.15, -0.22, 0.3), mat=mat_armor, parent=survey_root, taper=0.85, bevel=0.12)
    create_faceted_hull("Survey_InnerFrame", (1.2, 1.0, 0.4), location=(0.1, -0.1, 0.55), rotation=(0.15, -0.22, 0.3), mat=mat_damaged_chassis, parent=survey_root, taper=0.9, bevel=0.04)
    create_faceted_hull("Survey_CoreBlock", (0.6, 0.6, 0.35), location=(0.15, -0.05, 0.6), rotation=(0.2, -0.18, 0.35), mat=mat_flicker_core, parent=survey_root, taper=0.95, bevel=0.03)
    create_joint_cylinder("Survey_HipL1", 0.22, 0.3, location=(-0.9, 0.8, 0.35), rotation=(0.4, 0.6, 0.2), mat=mat_bronze, parent=survey_root)
    create_joint_cylinder("Survey_HipR1", 0.22, 0.3, location=(0.9, 0.7, 0.25), rotation=(-0.3, -0.5, 0.1), mat=mat_bronze, parent=survey_root)
    create_armored_panel("Survey_LegLimb_1", 0.25, 1.4, thickness=0.12, location=(-1.4, 0.9, 0.2), rotation=(0.1, 0.4, 0.7), mat=mat_armor, parent=survey_root)
    create_armored_panel("Survey_LegLimb_2", 0.22, 1.1, thickness=0.10, location=(1.3, -0.6, 0.1), rotation=(0.7, -0.2, -0.5), mat=mat_armor, parent=survey_root)
    create_armored_panel("Survey_DetachedPlate", 0.6, 0.8, thickness=0.05, location=(0.8, 1.2, 0.04), rotation=(0, 0, 0.4), mat=mat_orange_trim, parent=survey_root)

    # 2. MaintenanceBot_Wreck
    maint_root = bpy.data.objects.new("MaintenanceBot_Wreck", None)
    bpy.context.scene.collection.objects.link(maint_root)
    maint_root.parent = master_root
    maint_root.location = Vector((-2, 0, 0))

    create_faceted_hull("Maint_Hull", (1.4, 1.1, 0.5), location=(0, 0, 0.3), rotation=(-0.1, 0.2, -0.4), mat=mat_armor, parent=maint_root, taper=0.75, bevel=0.08)
    create_joint_cylinder("Maint_NeckJoint", 0.16, 0.25, location=(0, 0.55, 0.28), rotation=(math.pi/3, 0, 0), mat=mat_bronze, parent=maint_root)
    create_faceted_hull("Maint_BrokenHead", (0.5, 0.4, 0.3), location=(0.05, 0.8, 0.18), rotation=(0.4, 0.3, -0.2), mat=mat_armor, parent=maint_root, taper=0.8, bevel=0.04)
    create_armored_panel("Maint_BentArm", 0.18, 0.9, thickness=0.08, location=(-0.6, 0.2, 0.15), rotation=(0.2, 0.6, -0.8), mat=mat_damaged_chassis, parent=maint_root)
    create_armored_panel("Maint_ArmorFlap", 0.4, 0.5, thickness=0.04, location=(0.4, -0.4, 0.32), rotation=(-0.5, 0.4, 0.1), mat=mat_orange_trim, parent=maint_root)

    # 3. SensorHead_Wreck
    sensor_root = bpy.data.objects.new("SensorHead_Wreck", None)
    bpy.context.scene.collection.objects.link(sensor_root)
    sensor_root.parent = master_root
    sensor_root.location = Vector((2, 0, 0))

    create_faceted_hull("Sensor_Housing", (0.6, 0.7, 0.45), location=(0, 0, 0.22), rotation=(0.2, -0.3, 0.5), mat=mat_armor, parent=sensor_root, taper=0.85, bevel=0.05)
    create_joint_cylinder("Sensor_LensRing", 0.18, 0.1, location=(0.15, 0.25, 0.25), rotation=(0.3, 0.6, 0.2), mat=mat_bronze, parent=sensor_root)
    create_joint_cylinder("Sensor_BrokenEye", 0.14, 0.04, location=(0.18, 0.28, 0.26), rotation=(0.3, 0.6, 0.2), mat=mat_dead_core, parent=sensor_root)
    create_armored_panel("Sensor_AntennaFin", 0.08, 0.5, thickness=0.03, location=(-0.25, -0.15, 0.32), rotation=(-0.4, 0.2, 0.1), mat=mat_damaged_chassis, parent=sensor_root)

    # 4. MachineArm_Wreck
    arm_root = bpy.data.objects.new("MachineArm_Wreck", None)
    bpy.context.scene.collection.objects.link(arm_root)
    arm_root.parent = master_root
    arm_root.location = Vector((5, 0, 0))

    create_joint_cylinder("Arm_BasePivot", 0.24, 0.35, location=(0, 0, 0.18), rotation=(0, 0, math.pi/2), mat=mat_bronze, parent=arm_root)
    create_armored_panel("Arm_UpperBeam", 0.22, 1.2, thickness=0.12, location=(0.5, 0.1, 0.28), rotation=(0.1, 0.3, -0.6), mat=mat_armor, parent=arm_root)
    create_joint_cylinder("Arm_ElbowJoint", 0.18, 0.28, location=(0.95, 0.2, 0.38), rotation=(0.4, 0.2, 0), mat=mat_bronze, parent=arm_root)
    create_armored_panel("Arm_ForearmBeam", 0.18, 1.0, thickness=0.10, location=(1.35, 0.15, 0.22), rotation=(-0.2, -0.4, -0.4), mat=mat_damaged_chassis, parent=arm_root)
    create_armored_panel("Arm_Claw1", 0.08, 0.35, thickness=0.04, location=(1.75, 0.05, 0.14), rotation=(0.2, -0.2, -0.2), mat=mat_armor, parent=arm_root)
    create_armored_panel("Arm_Claw2", 0.08, 0.35, thickness=0.04, location=(1.78, 0.22, 0.12), rotation=(-0.3, -0.2, -0.4), mat=mat_armor, parent=arm_root)

    # 5. ArcCore_Broken
    core_root = bpy.data.objects.new("ArcCore_Broken", None)
    bpy.context.scene.collection.objects.link(core_root)
    core_root.parent = master_root
    core_root.location = Vector((8, 0, 0))

    create_faceted_hull("Core_Case", (0.7, 0.7, 0.6), location=(0, 0, 0.3), rotation=(0.1, 0.1, 0.2), mat=mat_damaged_chassis, parent=core_root, taper=0.9, bevel=0.06)
    create_joint_cylinder("Core_EmitterPillar", 0.15, 0.45, location=(0, 0, 0.45), rotation=(0, 0, 0), mat=mat_arc_spark, parent=core_root)
    create_armored_panel("Core_ShatteredLid", 0.4, 0.4, thickness=0.05, location=(0.35, 0.15, 0.55), rotation=(0.6, -0.3, 0.2), mat=mat_orange_trim, parent=core_root)
    create_armored_panel("Core_ScatterPiece1", 0.2, 0.25, thickness=0.03, location=(-0.5, 0.4, 0.02), rotation=(0, 0, 0.8), mat=mat_armor, parent=core_root)
    create_armored_panel("Core_ScatterPiece2", 0.15, 0.3, thickness=0.03, location=(0.4, -0.5, 0.02), rotation=(0, 0, -0.5), mat=mat_armor, parent=core_root)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            for p in obj.data.polygons:
                p.use_smooth = False

    os.makedirs("public/models/lattice", exist_ok=True)
    out_path = os.path.abspath("public/models/lattice/lattice_wrecks.glb")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Successfully exported Lattice Wrecks Kit to {out_path}")

if __name__ == '__main__':
    build_lattice_wrecks()
