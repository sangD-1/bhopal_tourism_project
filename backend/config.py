import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "bhopal-tourism-secret-key")

    MYSQL_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    MYSQL_USER = os.environ.get("DB_USER", "root")
    MYSQL_PASSWORD = os.environ.get("DB_PASSWORD", "sangeeta1234+-")
    MYSQL_DATABASE = os.environ.get("DB_DATABASE", "defaultdb")
    MYSQL_PORT = int(os.environ.get("DB_PORT", 3306))

    UPLOAD_FOLDER = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "uploads"
    )

    MAX_CONTENT_LENGTH = 100 * 1024 * 1024