import bpy
import bmesh
import math
import os
import random
from mathutils import Vector, Euler

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def get_or_create_material(name, color, roughness=0.8, metalness=0.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
    return mat

def create_foliage_cluster(name, radius, location, scale_vec=(1,1,1), mat=None, parent=None, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=radius,
        location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(scale_vec)
    bpy.ops.object.transform_apply(scale=True)
    
    # Slight organic vertex jitter for stylized silhouette
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    random.seed(int(abs(location[0]*100 + location[2]*50)))
    for v in bm.verts:
        jitter = (Vector((random.random()-0.5, random.random()-0.5, random.random()-0.5))) * (radius * 0.18)
        v.co += jitter
    bm.to_mesh(obj.data)
    bm.free()

    # Flat shading
    for poly in obj.data.polygons:
        poly.use_smooth = False
        
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def create_tapered_trunk(name, base_r, top_r, height, location=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=8,
        radius1=base_r,
        radius2=top_r,
        depth=height,
        location=(location[0], location[1], location[2] + height / 2)
    )
    obj = bpy.context.active_object
    obj.name = name
    for poly in obj.data.polygons:
        poly.use_smooth = False
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def build_tree_set():
    reset_scene()

    # Materials
    mat_wood = get_or_create_material("Tree_BarkWood", (0.28, 0.20, 0.14), roughness=0.88)
    mat_pine_dark = get_or_create_material("Tree_PineDark", (0.16, 0.32, 0.18), roughness=0.82)
    mat_pine_light = get_or_create_material("Tree_PineLight", (0.24, 0.42, 0.22), roughness=0.80)
    mat_broadleaf_green = get_or_create_material("Tree_FoliageGreen", (0.28, 0.48, 0.20), roughness=0.80)
    mat_broadleaf_autumn = get_or_create_material("Tree_FoliageAutumn", (0.68, 0.42, 0.12), roughness=0.82)
    mat_dead_wood = get_or_create_material("Tree_DeadBark", (0.22, 0.18, 0.16), roughness=0.92)

    master_root = bpy.data.objects.new("StylizedTreeSet", None)
    bpy.context.scene.collection.objects.link(master_root)

    # -------------------------------------------------------------------------
    # 1. Pine_A (Tall Majestic Evergreen, Height ~9.5m)
    # -------------------------------------------------------------------------
    p_a = bpy.data.objects.new("Pine_A", None)
    bpy.context.scene.collection.objects.link(p_a)
    p_a.parent = master_root
    p_a.location = Vector((-12, 0, 0))

    create_tapered_trunk("Trunk_PineA", 0.35, 0.12, 9.0, (0, 0, 0), mat=mat_wood, parent=p_a)
    create_foliage_cluster("Tier1_PineA", 2.2, (0, 0, 3.8), scale_vec=(1.0, 1.0, 0.75), mat=mat_pine_dark, parent=p_a)
    create_foliage_cluster("Tier2_PineA", 1.8, (0, 0, 5.8), scale_vec=(1.0, 1.0, 0.75), mat=mat_pine_light, parent=p_a)
    create_foliage_cluster("Tier3_PineA", 1.3, (0, 0, 7.6), scale_vec=(0.95, 0.95, 0.85), mat=mat_pine_dark, parent=p_a)
    create_foliage_cluster("Top_PineA", 0.7, (0, 0, 9.2), scale_vec=(0.8, 0.8, 1.2), mat=mat_pine_light, parent=p_a)

    # -------------------------------------------------------------------------
    # 2. Pine_B (Medium Slender Evergreen, Height ~7.0m)
    # -------------------------------------------------------------------------
    p_b = bpy.data.objects.new("Pine_B", None)
    bpy.context.scene.collection.objects.link(p_b)
    p_b.parent = master_root
    p_b.location = Vector((-6, 0, 0))

    create_tapered_trunk("Trunk_PineB", 0.28, 0.10, 6.8, (0, 0, 0), mat=mat_wood, parent=p_b)
    create_foliage_cluster("Tier1_PineB", 1.7, (0, 0, 3.0), scale_vec=(1.0, 1.0, 0.7), mat=mat_pine_dark, parent=p_b)
    create_foliage_cluster("Tier2_PineB", 1.35, (0, 0, 4.8), scale_vec=(1.0, 1.0, 0.75), mat=mat_pine_light, parent=p_b)
    create_foliage_cluster("Top_PineB", 0.75, (0, 0, 6.4), scale_vec=(0.85, 0.85, 1.1), mat=mat_pine_dark, parent=p_b)

    # -------------------------------------------------------------------------
    # 3. Pine_C (Compact Dense Mountain Pine, Height ~5.2m)
    # -------------------------------------------------------------------------
    p_c = bpy.data.objects.new("Pine_C", None)
    bpy.context.scene.collection.objects.link(p_c)
    p_c.parent = master_root
    p_c.location = Vector((0, 0, 0))

    create_tapered_trunk("Trunk_PineC", 0.24, 0.08, 5.0, (0, 0, 0), mat=mat_wood, parent=p_c)
    create_foliage_cluster("Tier1_PineC", 1.5, (0, 0, 2.2), scale_vec=(1.1, 1.1, 0.65), mat=mat_pine_light, parent=p_c)
    create_foliage_cluster("Tier2_PineC", 1.15, (0, 0, 3.7), scale_vec=(1.0, 1.0, 0.7), mat=mat_pine_dark, parent=p_c)
    create_foliage_cluster("Top_PineC", 0.65, (0, 0, 4.9), scale_vec=(0.9, 0.9, 1.0), mat=mat_pine_light, parent=p_c)

    # -------------------------------------------------------------------------
    # 4. Broadleaf_A (Spreading Oak, Clustered Canopy Masses, Height ~6.8m)
    # -------------------------------------------------------------------------
    b_a = bpy.data.objects.new("Broadleaf_A", None)
    bpy.context.scene.collection.objects.link(b_a)
    b_a.parent = master_root
    b_a.location = Vector((6, 0, 0))

    create_tapered_trunk("Trunk_BroadA", 0.38, 0.22, 3.4, (0, 0, 0), mat=mat_wood, parent=b_a)
    # Organic clustered canopy blobs
    create_foliage_cluster("CanopyMain_BA", 2.2, (0, 0, 5.2), scale_vec=(1.2, 1.1, 0.9), mat=mat_broadleaf_green, parent=b_a)
    create_foliage_cluster("CanopyLeft_BA", 1.5, (-1.2, 0.4, 4.6), scale_vec=(1.0, 0.9, 0.8), mat=mat_broadleaf_green, parent=b_a)
    create_foliage_cluster("CanopyRight_BA", 1.4, (1.3, -0.3, 4.8), scale_vec=(0.9, 1.0, 0.85), mat=mat_broadleaf_autumn, parent=b_a)
    create_foliage_cluster("CanopyTop_BA", 1.2, (0.2, 0.2, 6.2), scale_vec=(0.9, 0.9, 0.8), mat=mat_broadleaf_green, parent=b_a)

    # -------------------------------------------------------------------------
    # 5. Broadleaf_B (Slender Birch/Ash, Height ~6.0m)
    # -------------------------------------------------------------------------
    b_b = bpy.data.objects.new("Broadleaf_B", None)
    bpy.context.scene.collection.objects.link(b_b)
    b_b.parent = master_root
    b_b.location = Vector((12, 0, 0))

    create_tapered_trunk("Trunk_BroadB", 0.25, 0.12, 4.0, (0, 0, 0), mat=mat_wood, parent=b_b)
    create_foliage_cluster("Canopy_BB1", 1.5, (0, 0, 4.6), scale_vec=(1.0, 1.0, 1.1), mat=mat_broadleaf_green, parent=b_b)
    create_foliage_cluster("Canopy_BB2", 1.1, (0.5, -0.4, 5.4), scale_vec=(0.9, 0.9, 0.9), mat=mat_broadleaf_autumn, parent=b_b)

    # -------------------------------------------------------------------------
    # 6. DeadTree_A (Gnarled Snapped Trunk with Broken Limbs, Height ~5.0m)
    # -------------------------------------------------------------------------
    d_a = bpy.data.objects.new("DeadTree_A", None)
    bpy.context.scene.collection.objects.link(d_a)
    d_a.parent = master_root
    d_a.location = Vector((-6, 8, 0))

    create_tapered_trunk("Trunk_DeadA", 0.32, 0.16, 4.8, (0, 0, 0), mat=mat_dead_wood, parent=d_a)
    # Branch stubs
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.1, depth=1.6, location=(-0.5, 0, 3.4), rotation=(0, 0.8, -0.3))
    b1 = bpy.context.active_object
    b1.name = "Branch_DeadA1"
    b1.data.materials.append(mat_dead_wood)
    b1.parent = d_a

    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.08, depth=1.4, location=(0.6, 0.2, 4.0), rotation=(0.4, -0.7, 0.5))
    b2 = bpy.context.active_object
    b2.name = "Branch_DeadA2"
    b2.data.materials.append(mat_dead_wood)
    b2.parent = d_a

    # -------------------------------------------------------------------------
    # 7. DeadTree_B (Stump & Shattered Trunk, Height ~3.2m)
    # -------------------------------------------------------------------------
    d_b = bpy.data.objects.new("DeadTree_B", None)
    bpy.context.scene.collection.objects.link(d_b)
    d_b.parent = master_root
    d_b.location = Vector((6, 8, 0))

    create_tapered_trunk("Trunk_DeadB", 0.36, 0.18, 3.2, (0, 0, 0), mat=mat_dead_wood, parent=d_b)

    # Export
    out_path = os.path.abspath("public/models/world/tree_set.glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_apply=False
    )
    print(f"Exported stylized tree set to {out_path}")

if __name__ == '__main__':
    build_tree_set()
