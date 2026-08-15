# Quaternius Zombie Apocalypse Kit — Asset Inventory

Comprehensive inventory of official CC0 game-ready assets available in `public/assets/vendor/quaternius/zombie-apocalypse/`.

## 1. Playable Survivor Candidates & Rigged Characters
All survivor characters share the unified 20-animation skeletal rig with standardized bone hierarchy (`CharacterArmature`, `Root`, `Head`, etc.).

| Character File | Gender / Archetype | Description | Primary Use Case |
| :--- | :--- | :--- | :--- |
| `Characters/glTF/Characters_Shaun.gltf` | Male (Ryder) | Rugged survivor in brown/teal jacket, cap, boots | **PRIMARY PLAYABLE HERO (Ryder)** |
| `Characters/glTF/Characters_Matt.gltf` | Male (Bearded) | Veteran survivor in combat vest & boots | Companion / Veteran NPC |
| `Characters/glTF/Characters_Lis.gltf` | Female (Scout) | Swift scout with ponytail, survival jacket | Playable Hero (Female) / Scout NPC |
| `Characters/glTF/Characters_Sam.gltf` | Female (Tech) | Scavenger with beanie & survival gear | Engineer / Scavenger NPC |

### Animation Clips (20 Available on All Characters)
- **Locomotion**: `Idle`, `Walk`, `Run`, `Idle_Gun`, `Walk_Gun`, `Run_Gun`
- **Agility & Evasion**: `Duck` (used for roll/dodge/crouch), `Jump`, `Jump_Idle`, `Jump_Land`
- **Melee & Attack**: `Punch`, `Slash`, `Stab`, `Run_Slash`, `Run_Stab`
- **Reactions & State**: `HitReact`, `Death`
- **Gestures**: `Wave`, `Yes`, `No`

---

## 2. Enemy Models (Zombies)
| Enemy File | Type | Archetype |
| :--- | :--- | :--- |
| `Characters/glTF/Zombie_Basic.gltf` | Standard Zombie | Fast/Standard Walker |
| `Characters/glTF/Zombie_Chubby.gltf` | Tank / Brute | Heavy health pool / High impact |
| `Characters/glTF/Zombie_Arm.gltf` | One-Armed Runner | Agile flanker |
| `Characters/glTF/Zombie_Ribcage.gltf` | Torso Crawler | Ground-level ambush crawler |

---

## 3. Companions & Wildlife
| File | Type | Description |
| :--- | :--- | :--- |
| `Characters/glTF/Characters_GermanShepherd.gltf` | Dog Companion | Guard dog / Tracker |
| `Characters/glTF/Characters_Pug.gltf` | Dog Companion | Camp pet |

---

## 4. Vehicles
| Vehicle File | Category | Real Dimensions (L × W × H) | Role |
| :--- | :--- | :--- | :--- |
| `Vehicles/glTF/Vehicle_Pickup.gltf` | Utility Truck | 5.26m × 2.71m × 1.88m | Abandoned civilian vehicle |
| `Vehicles/glTF/Vehicle_Pickup_Armored.gltf` | Armored Utility | 5.59m × 2.98m × 2.10m | Survivor convoy vehicle |
| `Vehicles/glTF/Vehicle_Sports.gltf` | Civilian Coupe | 5.66m × 2.67m × 1.86m | Highway wreck |
| `Vehicles/glTF/Vehicle_Sports_Armored.gltf` | Reinforced Coupe | 5.66m × 2.95m × 1.86m | Raider wreck |
| `Vehicles/glTF/Vehicle_Truck.gltf` | Heavy Hauler | 5.26m × 2.71m × 2.88m | Delivery truck |
| `Vehicles/glTF/Vehicle_Truck_Armored.gltf` | Military Hauler | 5.59m × 2.98m × 2.90m | Military convoy transport |

---

## 5. Environmental Props, Structures & Barricades
| Prop File | Real Dimensions (L × W × H) | Placement Area |
| :--- | :--- | :--- |
| `Environment/glTF/Container_Red.gltf` | 5.71m × 2.56m × 2.60m | Fortifications, checkpoint walls, roadblock |
| `Environment/glTF/Container_Green.gltf` | 5.71m × 2.56m × 2.60m | Fortifications, storage compound |
| `Environment/glTF/TrafficBarrier_1.gltf` | 1.56m × 0.88m × 1.11m | Highway turnoff roadblock, perimeter defenses |
| `Environment/glTF/TrafficBarrier_2.gltf` | 1.56m × 0.78m × 0.80m | Cracked road flank barrier |
| `Environment/glTF/PlasticBarrier.gltf` | 1.04m × 0.33m × 0.60m | Fuel forecourt cordon, lane markings |
| `Environment/glTF/TrafficCone_1.gltf` | 0.52m × 0.52m × 0.67m | Road hazards, forecourt pumps |
| `Environment/glTF/TrafficCone_2.gltf` | 0.60m × 0.60m × 0.74m | Work area cordon |
| `Environment/glTF/Barrel.gltf` | 0.70m × 0.70m × 1.14m | Fuel storage, explosive hazard props |
| `Environment/glTF/Pallet.gltf` | 0.89m × 1.22m × 0.14m | Relay workshop, cargo spills |
| `Environment/glTF/Pallet_Broken.gltf` | 0.92m × 1.22m × 0.16m | Roadside debris, ruined camp |
| `Environment/glTF/CinderBlock.gltf` | 0.47m × 0.21m × 0.23m | Makeshift barricades, sign supports |
| `Environment/glTF/Chest.gltf` | 0.64m × 0.48m × 0.41m | Lootable survivor cache |
| `Environment/glTF/Chest_Special.gltf` | 0.85m × 0.48m × 0.41m | High-tier weapon cache |
| `Environment/glTF/StreetLights.gltf` | 0.36m × 2.93m × 6.64m | Highway lighting & gas station approach |
| `Environment/glTF/TownSign.gltf` | 5.98m × 1.74m × 5.35m | Highway junction overhead signage |
| `Environment/glTF/WaterTower.gltf` | 2.65m × 2.71m × 9.38m | Landmark background silo / water tower |
| `Environment/glTF/TrashBag_1.gltf` | 0.50m × 0.50m × 0.56m | Roadside garbage clusters |
| `Environment/glTF/TrashBag_2.gltf` | 0.91m × 0.52m × 0.53m | Gas station alley debris |
| `Environment/glTF/Wheels_Stack.gltf` | 0.66m × 0.57m × 0.61m | Repair garage, roadblock anchor |
| `Environment/glTF/Couch.gltf` | 3.01m × 1.21m × 1.24m | Campfire relaxation zone, outpost shelter |

---

## 6. Weapons & Sockets
| Weapon File | Type | Hand Socket |
| :--- | :--- | :--- |
| `Weapons/glTF/Axe.gltf` | Melee | `RightHand` / `LeftHand` |
| `Weapons/glTF/WoodenBat_Barbed.gltf` | Melee | `RightHand` |
| `Weapons/glTF/WoodenBat_Saw.gltf` | Melee | `RightHand` |
| `Weapons/glTF/Knife.gltf` | Melee | `RightHand` |
| `Weapons/glTF/Spear.gltf` | Melee (Reach) | `RightHand` |
| `Weapons/glTF/Pistol.gltf` | Sidearm | `RightHand` |
| `Weapons/glTF/Shotgun.gltf` | Long Gun | `RightHand` |
| `Weapons/glTF/Rifle.gltf` | Long Gun | `RightHand` |
| `Weapons/glTF/SMG.gltf` | Compact Auto | `RightHand` |
