/**
 * WorldScale.js: Single authoritative world scale reference (1 World Unit = 1 Meter).
 * All scene geometry, buildings, vehicles, and props must be calibrated relative to PLAYER_HEIGHT (1.8m).
 */
export const WORLD_SCALE = {
  // 1 unit = 1 meter
  UNIT_TO_METERS: 1.0,

  // Character Targets
  PLAYER_HEIGHT: 1.80,         // Canonical survivor character height (1.75m - 1.85m)
  PLAYER_RADIUS: 0.40,         // Cylinder collision radius for hero
  ZOMBIE_HEIGHT: 1.80,         // Standard zombie walker height

  // Architecture & Buildings
  DOOR_HEIGHT: 2.30,           // 2.2m - 2.5m (1.25x player height)
  DOOR_WIDTH: 1.10,            // 1.0m - 1.2m (fits 1 player comfortably)
  NORMAL_ROOM_HEIGHT: 2.80,    // 2.7m - 3.2m
  GATE_WIDTH: 4.50,            // 4.0m - 5.0m (fits 3-4 players / vehicles)
  FENCE_HEIGHT: 1.80,          // 1.5m - 2.2m (chest to head height)

  // Vehicles (from Quaternius standard proportions)
  CAR_LENGTH: 4.50,            // 3.5m - 4.8m
  CAR_WIDTH: 2.00,             // 1.8m - 2.2m
  CAR_HEIGHT: 1.55,            // 1.4m - 1.8m
  TRUCK_LENGTH: 5.40,          // 5.0m - 6.0m
  TRUCK_HEIGHT: 2.70,          // 2.5m - 3.0m

  // Highway & Infrastructure
  ROAD_LANE_WIDTH: 3.50,       // 3.2m - 3.8m per lane
  ROAD_TOTAL_WIDTH: 8.0,       // 2 lanes + shoulders
  FUEL_PUMP_HEIGHT: 1.50,      // 1.3m - 1.7m (chest height of survivor)
  BARRIER_HEIGHT: 0.85,        // 0.7m - 1.0m (hip to waist height)
  CRATE_SIZE: 0.75,            // 0.5m - 1.0m
  PALLET_HEIGHT: 0.15,         // ~15cm ground clearance

  // Camera Framing Calibration (at 1920x1080)
  CAMERA: {
    FOV: 38,                   // 36° - 42° clean isometric telephoto feel
    PITCH_DEG: 50,             // ~50° downward angle
    YAW_DEG: 45,               // Standard 45° isometric yaw
    DISTANCE: 23.5,            // 20 - 26 units distance gives ~90-100px character height on 1080p
    DISTANCE_MIN: 19.0,
    DISTANCE_MAX: 30.0,
    TARGET_LEAD_Z: 2.0,        // Forward tracking offset framing player ~57% down screen
  }
};
