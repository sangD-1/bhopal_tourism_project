import os
import uuid
from urllib.parse import urlparse, parse_qs

from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    session,
    send_from_directory
)

import mysql.connector
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from backend.config import Config
from db import execute_query, ensure_schema_columns


# ==================================================
# FLASK APP
# ==================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FRONTEND_FOLDER = os.path.join(
    BASE_DIR,
    "frontend",
    "templates"
)

app = Flask(
    __name__,
    template_folder=FRONTEND_FOLDER,
    static_folder=None
)

app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY


# ==================================================
# STATIC CSS / JS
# ==================================================

ALLOWED_STATIC_EXTENSIONS = (
    ".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"
)


@app.route("/static/<path:filename>", endpoint="static")
def serve_static(filename):

    clean_name = filename
    if clean_name.startswith("css/"):
        clean_name = clean_name[4:]
    elif clean_name.startswith("js/"):
        clean_name = clean_name[3:]

    # Direct file in frontend templates folder
    direct_path = os.path.join(FRONTEND_FOLDER, clean_name)
    if os.path.exists(direct_path):
        return send_from_directory(FRONTEND_FOLDER, clean_name)

    # Subdirectory within frontend folder
    nested_path = os.path.join(FRONTEND_FOLDER, filename)
    if os.path.exists(nested_path):
        return send_from_directory(FRONTEND_FOLDER, filename)

    # Image fallback from upload photos if requested
    if clean_name.startswith("images/") or clean_name.startswith("photos/"):
        photo_name = os.path.basename(clean_name)
        candidate = os.path.join(PHOTO_FOLDER, photo_name)
        if os.path.exists(candidate):
            return send_from_directory(PHOTO_FOLDER, photo_name)

    if not clean_name.lower().endswith(ALLOWED_STATIC_EXTENSIONS):
        return "File not found", 404

    return send_from_directory(FRONTEND_FOLDER, clean_name)


# ==================================================
# UPLOAD FOLDERS
# ==================================================

PHOTO_FOLDER = os.path.join(
    Config.UPLOAD_FOLDER,
    "photos"
)

MODEL_FOLDER = os.path.join(
    Config.UPLOAD_FOLDER,
    "models"
)

AUDIO_FOLDER = os.path.join(
    Config.UPLOAD_FOLDER,
    "audio"
)

os.makedirs(PHOTO_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER, exist_ok=True)


# ==================================================
# ALLOWED FILE TYPES
# ==================================================

ALLOWED_PHOTOS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

ALLOWED_MODELS = {
    "glb"
}

ALLOWED_AUDIO = {
    "mp3",
    "wav",
    "ogg",
    "m4a"
}


# ==================================================
# HELPER FUNCTIONS
# ==================================================

def allowed_file(filename, extensions):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in extensions
    )


def admin_required():
    return session.get("role") == "admin"


def make_unique_filename(filename):

    filename = secure_filename(filename)

    extension = ""

    if "." in filename:
        extension = "." + filename.rsplit(".", 1)[1].lower()

    return str(uuid.uuid4()) + extension


def youtube_embed_url(url):
    """
    Convert common YouTube URLs into embed URLs.

    Supported:
    https://www.youtube.com/watch?v=VIDEO_ID
    https://youtu.be/VIDEO_ID
    https://www.youtube.com/embed/VIDEO_ID
    https://www.youtube.com/shorts/VIDEO_ID
    """

    if not url:
        return None

    url = url.strip()

    try:
        parsed = urlparse(url)
    except Exception:
        return None

    hostname = parsed.netloc.lower()

    # Remove www.
    if hostname.startswith("www."):
        hostname = hostname[4:]

    video_id = None

    # ----------------------------------------------
    # youtube.com
    # ----------------------------------------------

    if hostname in (
        "youtube.com",
        "m.youtube.com"
    ):

        query = parse_qs(parsed.query)

        # /watch?v=XXXX
        if parsed.path == "/watch" and "v" in query:
            video_id = query["v"][0]

        # /embed/XXXX
        elif parsed.path.startswith("/embed/"):
            video_id = parsed.path.split("/embed/", 1)[1]
            video_id = video_id.split("/", 1)[0]

        # /shorts/XXXX
        elif parsed.path.startswith("/shorts/"):
            video_id = parsed.path.split("/shorts/", 1)[1]
            video_id = video_id.split("/", 1)[0]

    # ----------------------------------------------
    # youtu.be
    # ----------------------------------------------

    elif hostname == "youtu.be":

        video_id = parsed.path.strip("/")

        if "/" in video_id:
            video_id = video_id.split("/", 1)[0]

    if not video_id:
        return None

    return f"https://www.youtube.com/embed/{video_id}"


def upload_url(file_path):
    """
    Convert database relative path:

        photos/example.jpg

    into browser URL:

        /uploads/photos/example.jpg
    """

    if not file_path:
        return None

    return f"/uploads/{file_path}"


# ==================================================
# FRONTEND PAGES
# ==================================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/destination/<int:destination_id>")
def destination_page(destination_id):

    return render_template(
        "destination.html",
        destination_id=destination_id
    )


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/admin")
def admin_page():

    if not admin_required():
        return render_template("login.html")

    return render_template("admin.html")


# ==================================================
# DATABASE TEST
# ==================================================

@app.route("/test-db")
def test_db():

    try:

        connection = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE
        )

        if connection.is_connected():

            cursor = connection.cursor()

            cursor.execute("SELECT 1")

            result = cursor.fetchone()

            cursor.close()
            connection.close()

            return f"MySQL connected successfully! Result: {result[0]}"

    except mysql.connector.Error as e:

        return f"MySQL connection failed: {e}"

    return "MySQL connection failed"


# ==================================================
# STATIC UPLOAD FILES
# ==================================================

@app.route("/uploads/<path:filename>")
def uploaded_file(filename):

    return send_from_directory(
        Config.UPLOAD_FOLDER,
        filename
    )


# ==================================================
# AUTHENTICATION
# ==================================================

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request",
            "error": "Invalid request"
        }), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required",
            "error": "Email and password are required"
        }), 400

    user = execute_query(
        """
        SELECT
            id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE email = %s
        """,
        (email,),
        fetchone=True
    )

    if not user:

        return jsonify({
            "success": False,
            "message": "Invalid email or password",
            "error": "Invalid email or password"
        }), 401

    try:

        password_valid = check_password_hash(
            user["password_hash"],
            password
        )

    except Exception:

        password_valid = False

    if not password_valid:

        return jsonify({
            "success": False,
            "message": "Invalid email or password",
            "error": "Invalid email or password"
        }), 401

    session.clear()

    session["user_id"] = user["id"]
    session["name"] = user["name"]
    session["email"] = user["email"]
    session["role"] = user["role"]

    return jsonify({
        "success": True,
        "message": "Login successful",
        "role": user["role"]
    })


@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request",
            "error": "Invalid request"
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Name, email, and password are required",
            "error": "Name, email, and password are required"
        }), 400

    existing_user = execute_query(
        """
        SELECT id
        FROM users
        WHERE email = %s
        """,
        (email,),
        fetchone=True
    )

    if existing_user:
        return jsonify({
            "success": False,
            "message": "An account with this email already exists",
            "error": "An account with this email already exists"
        }), 400

    hashed_password = generate_password_hash(password)

    user_id = execute_query(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (%s, %s, %s, 'user')
        """,
        (name, email, hashed_password)
    )

    session.clear()
    session["user_id"] = user_id
    session["name"] = name
    session["email"] = email
    session["role"] = "user"

    return jsonify({
        "success": True,
        "message": "Account created successfully",
        "role": "user"
    })


@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out"
    })


@app.route("/api/session", methods=["GET"])
def current_session():

    return jsonify({
        "logged_in": "user_id" in session,
        "user_id": session.get("user_id"),
        "name": session.get("name"),
        "role": session.get("role")
    })


# ==================================================
# STATS & GALLERY
# ==================================================

@app.route("/api/admin/stats", methods=["GET"])
def get_stats():

    d_count = execute_query("SELECT COUNT(*) AS total FROM destinations", fetchone=True)
    p_count = execute_query("SELECT COUNT(*) AS total FROM photos", fetchone=True)
    v_count = execute_query("SELECT COUNT(*) AS total FROM videos", fetchone=True)
    m_count = execute_query("SELECT COUNT(*) AS total FROM models_3d", fetchone=True)
    a_count = execute_query("SELECT COUNT(*) AS total FROM audio_guides", fetchone=True)
    u_count = execute_query("SELECT COUNT(*) AS total FROM users", fetchone=True)

    return jsonify({
        "success": True,
        "destinations": d_count["total"] if d_count else 0,
        "photos": p_count["total"] if p_count else 0,
        "videos": v_count["total"] if v_count else 0,
        "models": m_count["total"] if m_count else 0,
        "audio": a_count["total"] if a_count else 0,
        "users": u_count["total"] if u_count else 0
    })


@app.route("/api/gallery", methods=["GET"])
def get_gallery():

    photos = execute_query(
        """
        SELECT
            p.id,
            p.destination_id,
            p.title,
            p.file_path,
            p.created_at,
            d.name AS destination_name
        FROM photos p
        LEFT JOIN destinations d ON p.destination_id = d.id
        ORDER BY p.id DESC
        """,
        fetch=True
    ) or []

    for photo in photos:
        photo["url"] = upload_url(photo["file_path"])

    return jsonify({
        "success": True,
        "photos": photos
    })


# ==================================================
# DESTINATIONS - GET ALL
# ==================================================

def assign_smart_category(dest_name, current_category=None):
    if current_category and current_category.strip():
        return current_category.strip()

    name_lower = (dest_name or "").lower()
    if any(w in name_lower for w in ["lake", "dam", "kerwa", "kaliasot", "vihar", "nature", "park", "garden", "sanctuary"]):
        return "Lakes & Nature"
    if any(w in name_lower for w in ["masjid", "temple", "mandir", "church", "cathedral", "gurudwara", "mosque"]):
        return "Religious"
    if any(w in name_lower for w in ["museum", "bhavan", "manav", "sangrahalaya", "science", "tribal"]):
        return "Museums"
    if any(w in name_lower for w in ["fort", "mahal", "palace", "bhojeshwar", "archaeol", "gate", "heritage"]):
        return "Heritage"
    if any(w in name_lower for w in ["bazaar", "market", "chowk", "food", "cuisine", "taste"]):
        return "Food & Culture"
    return "Heritage"


@app.route("/api/destinations", methods=["GET"])
def get_destinations():

    search_query = request.args.get("q", "").strip()
    category_filter = request.args.get("category", "").strip()

    # Try full select, fallback gracefully if some columns don't exist yet
    destinations = None
    try:
        destinations = execute_query(
            """
            SELECT
                id,
                name,
                short_description,
                description,
                latitude,
                longitude,
                category,
                timings,
                entry_fee,
                best_time,
                created_at
            FROM destinations
            ORDER BY name
            """,
            fetch=True
        )
    except Exception:
        destinations = execute_query(
            """
            SELECT
                id,
                name,
                short_description,
                description,
                latitude,
                longitude,
                created_at
            FROM destinations
            ORDER BY name
            """,
            fetch=True
        )

    destinations = destinations or []

    # Fetch all photos once and map to destinations
    photos = execute_query(
        """
        SELECT
            id,
            destination_id,
            title,
            file_path
        FROM photos
        ORDER BY id ASC
        """,
        fetch=True
    ) or []

    photos_map = {}
    for p in photos:
        p["url"] = upload_url(p["file_path"])
        photos_map.setdefault(p["destination_id"], []).append(p)

    # Attach photos, image_url, and ensure category
    for d in destinations:
        dest_photos = photos_map.get(d["id"], [])
        d["photos"] = dest_photos
        d["image_url"] = dest_photos[0]["url"] if dest_photos else None
        d["category"] = assign_smart_category(d.get("name"), d.get("category"))
        if not d.get("timings"):
            d["timings"] = "9:00 AM - 6:00 PM"
        if not d.get("entry_fee"):
            d["entry_fee"] = "Free / Nominal"
        if not d.get("best_time"):
            d["best_time"] = "October to March"

    # In-memory filter for search
    if search_query:
        q_low = search_query.lower()
        destinations = [
            d for d in destinations
            if q_low in (d.get("name") or "").lower()
            or q_low in (d.get("short_description") or "").lower()
            or q_low in (d.get("category") or "").lower()
        ]

    # In-memory filter for category
    if category_filter and category_filter.lower() != "all":
        destinations = [
            d for d in destinations
            if d.get("category", "").lower() == category_filter.lower()
        ]

    return jsonify({
        "success": True,
        "destinations": destinations
    })


# ==================================================
# DESTINATION - GET SINGLE
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>",
    methods=["GET"]
)
def get_destination(destination_id):

    destination = None
    try:
        destination = execute_query(
            """
            SELECT
                id,
                name,
                short_description,
                description,
                latitude,
                longitude,
                category,
                timings,
                entry_fee,
                best_time
            FROM destinations
            WHERE id = %s
            """,
            (destination_id,),
            fetchone=True
        )
    except Exception:
        destination = execute_query(
            """
            SELECT
                id,
                name,
                short_description,
                description,
                latitude,
                longitude
            FROM destinations
            WHERE id = %s
            """,
            (destination_id,),
            fetchone=True
        )

    if not destination:

        return jsonify({
            "success": False,
            "message": "Destination not found"
        }), 404

    destination["category"] = assign_smart_category(
        destination.get("name"), destination.get("category")
    )
    if not destination.get("timings"):
        destination["timings"] = "9:00 AM - 6:00 PM"
    if not destination.get("entry_fee"):
        destination["entry_fee"] = "Free / Nominal"
    if not destination.get("best_time"):
        destination["best_time"] = "October to March"

    photos = execute_query(
        """
        SELECT
            id,
            title,
            file_path
        FROM photos
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    videos = execute_query(
        """
        SELECT
            id,
            title,
            youtube_url
        FROM videos
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    models = execute_query(
        """
        SELECT
            id,
            title,
            file_path
        FROM models_3d
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    audio = execute_query(
        """
        SELECT
            id,
            title,
            language,
            file_path
        FROM audio_guides
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    # Add browser URLs for uploaded files
    for photo in photos or []:
        photo["url"] = upload_url(photo["file_path"])

    for model in models or []:
        model["url"] = upload_url(model["file_path"])

    for item in audio or []:
        item["url"] = upload_url(item["file_path"])

    # Convert YouTube URLs
    for video in videos or []:
        video["embed_url"] = youtube_embed_url(video["youtube_url"])

    destination["photos"] = photos or []
    destination["videos"] = videos or []
    destination["models_3d"] = models or []
    destination["audio_guides"] = audio or []

    # Get related destinations
    related = execute_query(
        """
        SELECT id, name, short_description
        FROM destinations
        WHERE id != %s
        LIMIT 3
        """,
        (destination_id,),
        fetch=True
    ) or []

    for item in related:
        item_photo = execute_query(
            "SELECT file_path FROM photos WHERE destination_id = %s LIMIT 1",
            (item["id"],),
            fetchone=True
        )
        item["image_url"] = upload_url(item_photo["file_path"]) if item_photo else None

    destination["related"] = related

    return jsonify({
        "success": True,
        "destination": destination
    })


# ==================================================
# ADD DESTINATION
# ==================================================

@app.route(
    "/api/destinations",
    methods=["POST"]
)
def add_destination():

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request"
        }), 400

    name = data.get("name", "").strip()

    short_description = data.get(
        "short_description",
        ""
    ).strip()

    description = data.get(
        "description",
        ""
    ).strip()

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not name:

        return jsonify({
            "success": False,
            "message": "Destination name is required"
        }), 400

    if latitude is None or longitude is None:

        return jsonify({
            "success": False,
            "message": "Latitude and longitude are required"
        }), 400

    category = data.get("category", "Heritage").strip()
    timings = data.get("timings", "").strip()
    entry_fee = data.get("entry_fee", "").strip()
    best_time = data.get("best_time", "").strip()

    destination_id = None
    try:
        destination_id = execute_query(
            """
            INSERT INTO destinations
            (name, short_description, description, latitude, longitude, category, timings, entry_fee, best_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (name, short_description, description, latitude, longitude, category, timings, entry_fee, best_time)
        )
    except Exception:
        destination_id = execute_query(
            """
            INSERT INTO destinations
            (name, short_description, description, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (name, short_description, description, latitude, longitude)
        )

    return jsonify({
        "success": True,
        "message": "Destination added",
        "id": destination_id
    })


# ==================================================
# UPDATE DESTINATION
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>",
    methods=["PUT"]
)
def update_destination(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request"
        }), 400

    name = data.get("name", "").strip()

    short_description = data.get(
        "short_description",
        ""
    ).strip()

    description = data.get(
        "description",
        ""
    ).strip()

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    category = data.get("category", "Heritage").strip()
    timings = data.get("timings", "").strip()
    entry_fee = data.get("entry_fee", "").strip()
    best_time = data.get("best_time", "").strip()

    if not name:

        return jsonify({
            "success": False,
            "message": "Destination name is required"
        }), 400

    if latitude is None or longitude is None:

        return jsonify({
            "success": False,
            "message": "Latitude and longitude are required"
        }), 400

    destination = execute_query(
        """
        SELECT id
        FROM destinations
        WHERE id = %s
        """,
        (destination_id,),
        fetchone=True
    )

    if not destination:

        return jsonify({
            "success": False,
            "message": "Destination not found"
        }), 404

    try:
        execute_query(
            """
            UPDATE destinations
            SET
                name = %s,
                short_description = %s,
                description = %s,
                latitude = %s,
                longitude = %s,
                category = %s,
                timings = %s,
                entry_fee = %s,
                best_time = %s
            WHERE id = %s
            """,
            (
                name,
                short_description,
                description,
                latitude,
                longitude,
                category,
                timings,
                entry_fee,
                best_time,
                destination_id
            )
        )
    except Exception:
        execute_query(
            """
            UPDATE destinations
            SET
                name = %s,
                short_description = %s,
                description = %s,
                latitude = %s,
                longitude = %s
            WHERE id = %s
            """,
            (
                name,
                short_description,
                description,
                latitude,
                longitude,
                destination_id
            )
        )

    return jsonify({
        "success": True,
        "message": "Destination updated"
    })


# ==================================================
# DELETE DESTINATION
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>",
    methods=["DELETE"]
)
def delete_destination(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    destination = execute_query(
        """
        SELECT id
        FROM destinations
        WHERE id = %s
        """,
        (destination_id,),
        fetchone=True
    )

    if not destination:

        return jsonify({
            "success": False,
            "message": "Destination not found"
        }), 404

    execute_query(
        """
        DELETE FROM destinations
        WHERE id = %s
        """,
        (destination_id,)
    )

    return jsonify({
        "success": True,
        "message": "Destination deleted"
    })


# ==================================================
# GET PHOTOS
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/photos",
    methods=["GET"]
)
def get_photos(destination_id):

    photos = execute_query(
        """
        SELECT
            id,
            title,
            file_path
        FROM photos
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    for photo in photos or []:
        photo["url"] = upload_url(
            photo["file_path"]
        )

    return jsonify({
        "success": True,
        "photos": photos or []
    })


# ==================================================
# UPLOAD PHOTO
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/photos",
    methods=["POST"]
)
def upload_photo(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "message": "Photo file is required"
        }), 400

    file = request.files["file"]

    if file.filename == "":

        return jsonify({
            "success": False,
            "message": "No file selected"
        }), 400

    if not allowed_file(
        file.filename,
        ALLOWED_PHOTOS
    ):

        return jsonify({
            "success": False,
            "message": "Only JPG, JPEG, PNG and WEBP files allowed"
        }), 400

    filename = make_unique_filename(
        file.filename
    )

    file.save(
        os.path.join(
            PHOTO_FOLDER,
            filename
        )
    )

    title = request.form.get(
        "title",
        ""
    ).strip()

    relative_path = f"photos/{filename}"

    photo_id = execute_query(
        """
        INSERT INTO photos
        (
            destination_id,
            title,
            file_path
        )
        VALUES (%s, %s, %s)
        """,
        (
            destination_id,
            title,
            relative_path
        )
    )

    return jsonify({
        "success": True,
        "message": "Photo uploaded",
        "id": photo_id,
        "file_path": relative_path,
        "url": upload_url(relative_path)
    })


# ==================================================
# GET VIDEOS
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/videos",
    methods=["GET"]
)
def get_videos(destination_id):

    videos = execute_query(
        """
        SELECT
            id,
            title,
            youtube_url
        FROM videos
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    for video in videos or []:

        video["embed_url"] = youtube_embed_url(
            video["youtube_url"]
        )

    return jsonify({
        "success": True,
        "videos": videos or []
    })


# ==================================================
# ADD YOUTUBE VIDEO
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/videos",
    methods=["POST"]
)
def add_video(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    data = request.get_json(silent=True)

    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request"
        }), 400

    title = data.get(
        "title",
        ""
    ).strip()

    youtube_url = data.get(
        "youtube_url",
        ""
    ).strip()

    if not youtube_url:

        return jsonify({
            "success": False,
            "message": "YouTube URL is required"
        }), 400

    embed_url = youtube_embed_url(
        youtube_url
    )

    if not embed_url:

        return jsonify({
            "success": False,
            "message": "Invalid YouTube URL"
        }), 400

    video_id = execute_query(
        """
        INSERT INTO videos
        (
            destination_id,
            title,
            youtube_url
        )
        VALUES (%s, %s, %s)
        """,
        (
            destination_id,
            title,
            youtube_url
        )
    )

    return jsonify({
        "success": True,
        "message": "Video added",
        "id": video_id,
        "embed_url": embed_url
    })


# ==================================================
# GET 3D MODELS
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/models",
    methods=["GET"]
)
def get_models(destination_id):

    models = execute_query(
        """
        SELECT
            id,
            title,
            file_path
        FROM models_3d
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    for model in models or []:

        model["url"] = upload_url(
            model["file_path"]
        )

    return jsonify({
        "success": True,
        "models": models or []
    })


# ==================================================
# UPLOAD 3D MODEL
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/models",
    methods=["POST"]
)
def upload_model(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "message": "GLB file is required"
        }), 400

    file = request.files["file"]

    if file.filename == "":

        return jsonify({
            "success": False,
            "message": "No file selected"
        }), 400

    if not allowed_file(
        file.filename,
        ALLOWED_MODELS
    ):

        return jsonify({
            "success": False,
            "message": "Only .glb files are allowed"
        }), 400

    filename = make_unique_filename(
        file.filename
    )

    file.save(
        os.path.join(
            MODEL_FOLDER,
            filename
        )
    )

    title = request.form.get(
        "title",
        ""
    ).strip()

    relative_path = f"models/{filename}"

    model_id = execute_query(
        """
        INSERT INTO models_3d
        (
            destination_id,
            title,
            file_path
        )
        VALUES (%s, %s, %s)
        """,
        (
            destination_id,
            title,
            relative_path
        )
    )

    return jsonify({
        "success": True,
        "message": "3D model uploaded",
        "id": model_id,
        "file_path": relative_path,
        "url": upload_url(relative_path)
    })


# ==================================================
# GET AUDIO GUIDES
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/audio",
    methods=["GET"]
)
def get_audio(destination_id):

    audio = execute_query(
        """
        SELECT
            id,
            title,
            language,
            file_path
        FROM audio_guides
        WHERE destination_id = %s
        ORDER BY id DESC
        """,
        (destination_id,),
        fetch=True
    )

    for item in audio or []:

        item["url"] = upload_url(
            item["file_path"]
        )

    return jsonify({
        "success": True,
        "audio": audio or []
    })


# ==================================================
# UPLOAD AUDIO GUIDE
# ==================================================

@app.route(
    "/api/destinations/<int:destination_id>/audio",
    methods=["POST"]
)
def upload_audio(destination_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "message": "Audio file is required"
        }), 400

    file = request.files["file"]

    if file.filename == "":

        return jsonify({
            "success": False,
            "message": "No file selected"
        }), 400

    if not allowed_file(
        file.filename,
        ALLOWED_AUDIO
    ):

        return jsonify({
            "success": False,
            "message": "Allowed audio formats: MP3, WAV, OGG, M4A"
        }), 400

    filename = make_unique_filename(
        file.filename
    )

    file.save(
        os.path.join(
            AUDIO_FOLDER,
            filename
        )
    )

    title = request.form.get(
        "title",
        ""
    ).strip()

    language = request.form.get(
        "language",
        "English"
    ).strip()

    relative_path = f"audio/{filename}"

    audio_id = execute_query(
        """
        INSERT INTO audio_guides
        (
            destination_id,
            title,
            language,
            file_path
        )
        VALUES (%s, %s, %s, %s)
        """,
        (
            destination_id,
            title,
            language,
            relative_path
        )
    )

    return jsonify({
        "success": True,
        "message": "Audio guide uploaded",
        "id": audio_id,
        "file_path": relative_path,
        "url": upload_url(relative_path)
    })


# ==================================================
# DELETE PHOTO
# ==================================================

@app.route(
    "/api/photos/<int:photo_id>",
    methods=["DELETE"]
)
def delete_photo(photo_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    photo = execute_query(
        """
        SELECT file_path
        FROM photos
        WHERE id = %s
        """,
        (photo_id,),
        fetchone=True
    )

    if not photo:

        return jsonify({
            "success": False,
            "message": "Photo not found"
        }), 404

    file_path = os.path.join(
        Config.UPLOAD_FOLDER,
        photo["file_path"]
    )

    if os.path.exists(file_path):

        os.remove(file_path)

    execute_query(
        """
        DELETE FROM photos
        WHERE id = %s
        """,
        (photo_id,)
    )

    return jsonify({
        "success": True,
        "message": "Photo deleted"
    })


# ==================================================
# DELETE VIDEO
# ==================================================

@app.route(
    "/api/videos/<int:video_id>",
    methods=["DELETE"]
)
def delete_video(video_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    video = execute_query(
        """
        SELECT id
        FROM videos
        WHERE id = %s
        """,
        (video_id,),
        fetchone=True
    )

    if not video:

        return jsonify({
            "success": False,
            "message": "Video not found"
        }), 404

    execute_query(
        """
        DELETE FROM videos
        WHERE id = %s
        """,
        (video_id,)
    )

    return jsonify({
        "success": True,
        "message": "Video deleted"
    })


# ==================================================
# DELETE 3D MODEL
# ==================================================

@app.route(
    "/api/models/<int:model_id>",
    methods=["DELETE"]
)
def delete_model(model_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    model = execute_query(
        """
        SELECT file_path
        FROM models_3d
        WHERE id = %s
        """,
        (model_id,),
        fetchone=True
    )

    if not model:

        return jsonify({
            "success": False,
            "message": "Model not found"
        }), 404

    file_path = os.path.join(
        Config.UPLOAD_FOLDER,
        model["file_path"]
    )

    if os.path.exists(file_path):

        os.remove(file_path)

    execute_query(
        """
        DELETE FROM models_3d
        WHERE id = %s
        """,
        (model_id,)
    )

    return jsonify({
        "success": True,
        "message": "3D model deleted"
    })


# ==================================================
# DELETE AUDIO
# ==================================================

@app.route(
    "/api/audio/<int:audio_id>",
    methods=["DELETE"]
)
def delete_audio(audio_id):

    if not admin_required():

        return jsonify({
            "success": False,
            "message": "Admin login required"
        }), 401

    audio = execute_query(
        """
        SELECT file_path
        FROM audio_guides
        WHERE id = %s
        """,
        (audio_id,),
        fetchone=True
    )

    if not audio:

        return jsonify({
            "success": False,
            "message": "Audio not found"
        }), 404

    file_path = os.path.join(
        Config.UPLOAD_FOLDER,
        audio["file_path"]
    )

    if os.path.exists(file_path):

        os.remove(file_path)

    execute_query(
        """
        DELETE FROM audio_guides
        WHERE id = %s
        """,
        (audio_id,)
    )

    return jsonify({
        "success": True,
        "message": "Audio deleted"
    })


# ==================================================
# RUN SERVER
# ==================================================

if __name__ == "__main__":

    try:
        ensure_schema_columns()
    except Exception as e:
        print("Schema init notice:", e)

    print("---------------------------------------")
    print("Bhopal Tourism Application")
    print("---------------------------------------")
    print("Server: http://127.0.0.1:5000")
    print("---------------------------------------")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )