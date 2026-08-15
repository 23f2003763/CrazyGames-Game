import os
import gdown

base_dir = os.path.abspath("public/assets/vendor/quaternius/zombie-apocalypse")

targets = [
    ("Environment/glTF", "1GBJC9SeyXAYwhGhqaolbDgkgnzaMUMBc"),
    ("Vehicles/glTF", "1gU4EDvCbI5DCXBUskqYRzmps5Du3KUvF"),
    ("Weapons/glTF", "1QuDXe9dfk-kkrzLzUVd8GZgoWTT50Owc"),
    ("Environment/FBX", "1VvZDkZYU3UZ2r8fA3BUcEpQGxXKP70SU"),
    ("Vehicles/FBX", "1wwStZozfAamZV76sB0PY6aAGUb3EGxdj"),
    ("Weapons/FBX", "18eGFT6PlkyFRfED0EVkcfTxgOVm778Dv"),
]

for subpath, fid in targets:
    out_dir = os.path.join(base_dir, subpath)
    os.makedirs(out_dir, exist_ok=True)
    print(f"\n==========================================")
    print(f"Downloading {subpath} (ID: {fid})...")
    try:
        gdown.download_folder(id=fid, output=out_dir, quiet=False, use_cookies=False)
    except Exception as e:
        print(f"Error downloading {subpath}: {e}")

# Download texture and license
texture_id = "1t2OBnWpp2pRV-eaV_vt6weiHN4vlEHwi"
try:
    gdown.download(id=texture_id, output=os.path.join(base_dir, "Zombie_Atlas.png"), quiet=False)
except Exception as e:
    print(f"Error downloading texture: {e}")

license_id = "1580uoubj39h6sNRFo394PvNU4ozIwehi"
try:
    gdown.download(id=license_id, output=os.path.join(base_dir, "License.txt"), quiet=False)
except Exception as e:
    print(f"Error downloading license: {e}")

print("\nFinished downloading all glTF, FBX, and textures!")
