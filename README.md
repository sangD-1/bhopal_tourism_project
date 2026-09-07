# Bhopal Tourism Multimedia App

Stack: HTML + Tailwind CSS + JavaScript, Flask, MySQL, Leaflet/OpenStreetMap, Three.js/WebGL.

## Run
1. Run `database/schema.sql` in MySQL.
2. Install: `pip install -r requirements.txt`
3. Optional DB environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
4. Create an admin password hash with Python if desired, then insert an admin row in MySQL. Example:
   `python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('admin123'))"`
   Then insert the resulting hash into `users` with role `admin`.
5. Run: `python backend/app.py`
6. Open http://127.0.0.1:5000

The admin panel supports destination creation/editing, multiple photo uploads, YouTube links, GLB uploads, and audio uploads. Public destination pages show all media and an interactive map.

## 🌐 Live Website

[Visit Bhopal Tourism Website](https://bhopal-tourism-project.onrender.com)
