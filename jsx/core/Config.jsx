/**
 * BolasPro v5.0 - Configuration Module
 * Central configuration object containing all constants
 */

var Config = {
    NAME: "BolasPro",
    VERSION: "5.0.0",
    
    /** Anchor point ratios [x, y] for positions 1-9 */
    ANCHORS: {
        1: [0, 0],     2: [0.5, 0],   3: [1, 0],
        4: [0, 0.5],   5: [0.5, 0.5], 6: [1, 0.5],
        7: [0, 1],     8: [0.5, 1],   9: [1, 1]
    },
    
    /** After Effects property match names */
    AE: {
        EFFECTS: "ADBE Effect Parade",
        SLIDER: "ADBE Slider Control",
        SLIDER_VAL: "ADBE Slider Control-0001",
        CHECKBOX: "ADBE Checkbox Control",
        CHECKBOX_VAL: "ADBE Checkbox Control-0001",
        TRANSFORM: "ADBE Transform Group",
        ANCHOR: "ADBE Anchor Point",
        POSITION: "ADBE Position",
        ROTATION: "ADBE Rotate Z",
        ROTATION_X: "ADBE Rotate X",
        ROTATION_Y: "ADBE Rotate Y",
        ORIENTATION: "ADBE Orientation"
    },
    
    /** Effect names used by BolasPro */
    EFFECTS: {
        ID: "BolasPro ID",
        TARGET_ID: "BolasPro Target ID",
        SNAG_POINT: "BolasPro - Snag Point",
        PREY_ANCHOR: "BolasPro - Prey Anchor",
        LOCK_ORIENTATION: "BolasPro - Lock Orientation",
        OFFSET_X: "BolasPro - Offset X",
        OFFSET_Y: "BolasPro - Offset Y",
        OFFSET_Z: "BolasPro - Offset Z",
        POSITION_DELAY: "BolasPro - Position Delay",
        ROTATION_DELAY: "BolasPro - Rotation Delay"
    },
    
    /** Cache settings */
    CACHE: {
        MAX_AGE: 1000,
        ENABLED: true
    }
};
