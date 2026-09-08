import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool
from backend.config import Config


# ==================================================
# DATABASE CONNECTION POOL
# ==================================================

try:
    db_pool = MySQLConnectionPool(
        pool_name="bhopal_pool",
        pool_size=5,
        pool_reset_session=True,
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DATABASE
    )
    print("Database connection pool created successfully")

except Error as e:
    print("Database pool creation error:", e)
    db_pool = None


def get_db_connection():
    try:
        if db_pool is None:
            return None

        return db_pool.get_connection()

    except Error as e:
        print("Database connection error:", e)
        return None


def execute_query(query, params=None, fetch=False, fetchone=False):
    connection = get_db_connection()

    if connection is None:
        return None

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)

        cursor.execute(query, params or ())

        if fetch:
            result = cursor.fetchall()

        elif fetchone:
            result = cursor.fetchone()

        else:
            connection.commit()
            result = cursor.lastrowid

        return result

    except Error as e:
        print("SQL Error:", e)

        try:
            connection.rollback()
        except Exception:
            pass

        return None

    finally:
        if cursor:
            cursor.close()

        connection.close()


def ensure_schema_columns():
    """Ensure optional columns exist in destinations table without breaking existing data."""

    connection = get_db_connection()

    if not connection:
        return False

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute("SHOW COLUMNS FROM destinations")

        existing_cols = {
            row[0].lower()
            if isinstance(row, (list, tuple))
            else row["Field"].lower()
            for row in cursor.fetchall()
        }

        migrations = [
            (
                "category",
                "ALTER TABLE destinations ADD COLUMN category VARCHAR(100) DEFAULT 'Heritage'"
            ),
            (
                "timings",
                "ALTER TABLE destinations ADD COLUMN timings VARCHAR(150) DEFAULT '9:00 AM - 6:00 PM'"
            ),
            (
                "entry_fee",
                "ALTER TABLE destinations ADD COLUMN entry_fee VARCHAR(100) DEFAULT 'Free'"
            ),
            (
                "best_time",
                "ALTER TABLE destinations ADD COLUMN best_time VARCHAR(150) DEFAULT 'October to March'"
            )
        ]

        for col_name, sql in migrations:

            if col_name not in existing_cols:

                try:
                    cursor.execute(sql)
                    connection.commit()

                except Exception as col_err:
                    print(
                        f"Notice: Could not add column {col_name}: {col_err}"
                    )

        return True

    except Exception as err:
        print("Schema verification note:", err)
        return False

    finally:

        try:
            if cursor:
                cursor.close()

            connection.close()

        except Exception:
            pass