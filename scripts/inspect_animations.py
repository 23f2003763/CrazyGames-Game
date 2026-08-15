import json
import os

base_dir = "public/assets/vendor/quaternius/zombie-apocalypse"

def inspect_gltf(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        data = json.load(f)
    
    animations = []
    if 'animations' in data:
        for a in data['animations']:
            animations.append(a.get('name', 'unnamed'))
            
    nodes = []
    if 'nodes' in data:
        for n in data['nodes']:
            if 'name' in n:
                nodes.append(n['name'])
                
    meshes = []
    if 'meshes' in data:
        for m in data['meshes']:
            meshes.append(m.get('name', 'unnamed'))
            
    return animations, nodes, meshes

for char in ["Characters_Shaun.gltf", "Characters_Matt.gltf", "Characters_Lis.gltf", "Characters_Sam.gltf"]:
    p = os.path.join(base_dir, "Characters", "glTF", char)
    if os.path.exists(p):
        anims, nodes, meshes = inspect_gltf(p)
        print(f"\n=== {char} ===")
        print(f"Animations ({len(anims)}):", anims)
        print(f"Meshes ({len(meshes)}):", meshes)
        print(f"Bones / Key Nodes:", [n for n in nodes if 'Armature' in n or 'Bone' in n or 'Root' in n or 'Hand' in n or 'Head' in n][:10])
