import re
import os
import urllib.request
import gdown

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download(fid, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    url = f"https://drive.google.com/uc?export=download&id={fid}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            with open(path, "wb") as f:
                f.write(data)
            print(f"Downloaded {os.path.basename(path)} ({len(data)} bytes)")
    except Exception as e:
        print(f"Error {path}: {e}")

# Let's inspect Environment glTF folder using gdown's internal functions
env_gltf_fid = "1GBJC9SeyXAYwhGhqaolbDgkgnzaMUMBc"
print("Scanning Environment glTF folder via gdown...")
try:
    # Use gdown folder scraping
    import gdown.download_folder as gdf
    # Let's inspect folder url
    folder_url = f"https://drive.google.com/drive/folders/{env_gltf_fid}"
    # Let's test gdown.download on individual files
except Exception as e:
    print("gdown import:", e)

# Parse from task logs if available
log_paths = [
    r"C:\Users\notle\.gemini\antigravity\brain\c00d0b07-7a4c-4f49-8305-c9e304f9c9ee\.system_generated\tasks\task-1078.log",
    r"C:\Users\notle\.gemini\antigravity\brain\c00d0b07-7a4c-4f49-8305-c9e304f9c9ee\.system_generated\tasks\task-1094.log"
]

all_files = []
for lp in log_paths:
    if os.path.exists(lp):
        with open(lp, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                m = re.search(r'Processing file ([a-zA-Z0-9_-]{28,35})\s+([a-zA-Z0-9_.-]+)', line)
                if m:
                    fid, fname = m.groups()
                    all_files.append((fid, fname))

print(f"Found {len(all_files)} files from previous logs:")
base = os.path.abspath("public/assets/vendor/quaternius/zombie-apocalypse")

for fid, fname in set(all_files):
    if fname.endswith(".gltf"):
        if "Vehicle" in fname:
            target = os.path.join(base, "Vehicles", "glTF", fname)
        elif fname in ["Axe.gltf", "Guitar.gltf", "Knife.gltf", "Pistol.gltf", "Rifle.gltf", "Shotgun.gltf", "SMG.gltf", "Spear.gltf", "WoodenBat_Barbed.gltf", "WoodenBat_Saw.gltf"]:
            target = os.path.join(base, "Weapons", "glTF", fname)
        else:
            target = os.path.join(base, "Environment", "glTF", fname)
        
        if not os.path.exists(target):
            download(fid, target)
        else:
            print(f"Already have: {fname}")
