import os
import gdown

base_dir = os.path.abspath("public/assets/vendor/quaternius/zombie-apocalypse")
os.makedirs(base_dir, exist_ok=True)

items = {
    "Environment": "1U9VtfiBxE2LKiVJRr5zYyhA-bEnzwCHb",
    "Vehicles": "1Iu76beKQlI9yBUdV494E7hZrDZz_7gI1",
    "Weapons": "1eQcl6ta9Ju__QrngNsKw8vU4NpZzgoYZ",
}

for folder_name, folder_id in items.items():
    dest = os.path.join(base_dir, folder_name)
    os.makedirs(dest, exist_ok=True)
    print(f"\n==========================================")
    print(f"Downloading {folder_name} (ID: {folder_id}) to {dest}...")
    try:
        gdown.download_folder(id=folder_id, output=dest, quiet=False, use_cookies=False)
    except Exception as e:
        print(f"Error downloading {folder_name}: {e}")

# Single files
files = {
    "License.txt": "1580uoubj39h6sNRFo394PvNU4ozIwehi",
    "Zombie_Atlas.png": "1t2OBnWpp2pRV-eaV_vt6weiHN4vlEHwi"
}

for file_name, file_id in files.items():
    dest = os.path.join(base_dir, file_name)
    print(f"Downloading file {file_name}...")
    try:
        gdown.download(id=file_id, output=dest, quiet=False, fuzzy=True)
    except Exception as e:
        print(f"Error downloading file {file_name}: {e}")

print("\nDone downloading Quaternius Zombie Apocalypse Kit!")
