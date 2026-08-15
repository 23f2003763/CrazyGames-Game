import urllib.request
import re
import os
import time

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def fetch_folder_items(folder_id):
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            
            # Find filename and file id pairs
            # Usually: 'data-tooltip="FileName.gltf"' and IDs near it
            items = []
            
            # Extract tooltips for files
            for m in re.finditer(r'data-tooltip="([^"]+\.gltf)"', html):
                fname = m.group(1)
                pos = m.start()
                snippet = html[max(0, pos-200): min(len(html), pos+200)]
                ids = re.findall(r'[a-zA-Z0-9_-]{28,35}', snippet)
                valid_ids = [i for i in ids if not i.startswith('data-') and i != folder_id]
                if valid_ids:
                    items.append((fname, valid_ids[0]))
            
            # Also search for standard format
            matches = re.findall(r'\["([a-zA-Z0-9_-]{28,35})",\["([^"]+\.gltf)"', html)
            for fid, fname in matches:
                if (fname, fid) not in items:
                    items.append((fname, fid))
                    
            return items
    except Exception as e:
        print(f"Error fetching folder {folder_id}: {e}")
        return []

def download_file(file_id, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"Downloaded {os.path.basename(out_path)} ({len(data)} bytes)")
            return True
    except Exception as e:
        print(f"Error downloading {out_path} ({file_id}): {e}")
        return False

base_dir = os.path.abspath("public/assets/vendor/quaternius/zombie-apocalypse")

# Known folder IDs:
gltf_folders = {
    "Environment/glTF": "1GBJC9SeyXAYwhGhqaolbDgkgnzaMUMBc",
    "Vehicles/glTF": "1gU4EDvCbI5DCXBUskqYRzmps5Du3KUvF",
    "Weapons/glTF": "1QuDXe9dfk-kkrzLzUVd8GZgoWTT50Owc",
}

for subpath, folder_id in gltf_folders.items():
    print(f"\n==========================================")
    print(f"Scanning folder {subpath} (ID: {folder_id})...")
    items = fetch_folder_items(folder_id)
    print(f"Found {len(items)} items in {subpath}")
    
    out_dir = os.path.join(base_dir, subpath)
    for fname, fid in items:
        out_file = os.path.join(out_dir, fname)
        if not os.path.exists(out_file):
            download_file(fid, out_file)
            time.sleep(0.1)
        else:
            print(f"Already exists: {fname}")

# Also download texture and license
print("\nDownloading texture and license...")
download_file("1t2OBnWpp2pRV-eaV_vt6weiHN4vlEHwi", os.path.join(base_dir, "Zombie_Atlas.png"))
download_file("1580uoubj39h6sNRFo394PvNU4ozIwehi", os.path.join(base_dir, "License.txt"))

# Also copy texture into glTF folders if textures need to be in the same folder as .gltf
for sub in ["Characters/glTF", "Environment/glTF", "Vehicles/glTF", "Weapons/glTF"]:
    d = os.path.join(base_dir, sub)
    if os.path.exists(d):
        atlas_src = os.path.join(base_dir, "Zombie_Atlas.png")
        if os.path.exists(atlas_src):
            import shutil
            shutil.copy(atlas_src, os.path.join(d, "Zombie_Atlas.png"))
            print(f"Copied Zombie_Atlas.png into {sub}")

print("\nDone downloading all glTF assets!")
