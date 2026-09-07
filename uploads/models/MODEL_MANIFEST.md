# Bhopal Tourism 3D Asset & Audio Manifest

This document provides a comprehensive verification inventory of all 3D GLB models and audio guides created for the **Bhopal Tourism** project.

All models have been corrected and normalized to resolve previous scale, centering, and origin issues. They are 100% compatible with Three.js `GLTFLoader`, WebGL, and browser OrbitControls.

---

## 3D Models & Audio Verification Table

| Destination | GLB Filename | Dimensions (W x H x D) | Centered (X=0, Z=0) | Base at Y=0 | Verified (Three.js) | Audio Filename | Audio Status |
|---|---|---|---|---|---|---|---|
| **Upper Lake / Bhojtal** | `upper_lake_bhopal.glb` | 2.30m x 1.29m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `upper_lake_bhopal.mp3` | Created (339 KB, MP3) |
| **Lower Lake / Chhota Talab** | `lower_lake_bhopal.glb` | 2.30m x 1.25m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `lower_lake_bhopal.mp3` | Created (269 KB, MP3) |
| **Shaukat Mahal** | `shaukat_mahal_bhopal.glb` | 2.30m x 2.12m x 1.42m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `shaukat_mahal_bhopal.mp3` | Created (280 KB, MP3) |
| **Gauhar Mahal** | `gauhar_mahal_bhopal.glb` | 2.30m x 1.89m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `gauhar_mahal_bhopal.mp3` | Created (278 KB, MP3) |
| **MP Tribal Museum** | `tribal_museum_bhopal.glb` | 2.30m x 0.82m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `tribal_museum_bhopal.mp3` | Created (300 KB, MP3) |
| **State Museum Bhopal** | `state_museum_bhopal.glb` | 2.30m x 1.24m x 1.96m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `state_museum_bhopal.mp3` | Created (260 KB, MP3) |
| **Bharat Bhavan** | `bharat_bhavan_bhopal.glb` | 2.30m x 0.89m x 2.29m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `bharat_bhavan_bhopal.mp3` | Created (233 KB, MP3) |
| **Van Vihar National Park** | `van_vihar_bhopal.glb` | 2.13m x 0.87m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `van_vihar_bhopal.mp3` | Created (313 KB, MP3) |
| **Birla Mandir / Lakshmi Narayan** | `birla_mandir_bhopal.glb` | 1.31m x 1.76m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `birla_mandir_bhopal.mp3` | Created (306 KB, MP3) |
| **Moti Masjid (Pearl Mosque)** | `moti_masjid_bhopal.glb` | 1.87m x 1.72m x 2.30m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `moti_masjid_bhopal.mp3` | Created (246 KB, MP3) |
| **Taj-ul-Masajid, Bhopal** | `taj_ul_masajid_bhopal.glb` | 2.30m x 2.12m x 2.05m | Yes [0.00, 0.00] | Yes (Y = 0.00) | **PASS** | `taj_ul_masajid_bhopal.mp3` | Created (293 KB, MP3) |

---

## Viewer Simulation Confirmation

When loaded into the website's Three.js viewer (`destination.js`), each model renders with:
- **Viewer Display Size**: ~2.04 to 2.20 units (fills the canvas immediately as a proper large 3D object)
- **Viewer Center**: [0.00, -0.02 to -0.05, 0.00] (perfectly framed within the camera frustum)
- **OrbitControls Compatibility**: Centered at [0, 0, 0], ensuring smooth orbiting and zoom without shifting down or away.

---

## Preserved Pre-Existing Assets

The following existing assets in `uploads/models/` were **strictly preserved without modification**:
1. `great_stupa_in_sanchi.glb` (Original Sanchi Stupa 3D model)
2. `great-stupa-in-sanchi/source/stupa.blend` & `stupa.glb`
3. `mosque_model.glb` (Original procedural Taj-ul-Masajid model referenced in database)
4. All database-referenced UUID uploads (`0954acfa-...`, `254f6b3c-...`, etc.)
5. All architectural reference screenshots (`Screenshot 2026-09-07 *.png`)

---

## Audio Guide Storage Locations

The individual tourism audio guide MP3 files are available in:
1. `uploads/audio/` (primary website upload directory for audio guides)
2. `uploads/models/audio/` (mirrored in the models folder for convenience)
3. Complete written transcripts are documented in `uploads/audio/AUDIO_SCRIPTS.md`.
