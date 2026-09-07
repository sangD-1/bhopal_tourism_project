from werkzeug.security import generate_password_hash
from db import execute_query


ADMIN_NAME = "Bhopal Tourism Admin"
ADMIN_EMAIL = "admin@bhopal.local"
ADMIN_PASSWORD = "admin123"


password_hash = generate_password_hash(
    ADMIN_PASSWORD
)


existing_user = execute_query(
    """
    SELECT id
    FROM users
    WHERE email = %s
    """,
    (ADMIN_EMAIL,),
    fetchone=True
)


if existing_user:

    execute_query(
        """
        UPDATE users
        SET
            name = %s,
            password_hash = %s,
            role = 'admin'
        WHERE email = %s
        """,
        (
            ADMIN_NAME,
            password_hash,
            ADMIN_EMAIL
        )
    )

    print("Admin account updated successfully.")

else:

    execute_query(
        """
        INSERT INTO users
        (
            name,
            email,
            password_hash,
            role
        )
        VALUES (%s, %s, %s, 'admin')
        """,
        (
            ADMIN_NAME,
            ADMIN_EMAIL,
            password_hash
        )
    )

    print("Admin account created successfully.")


print()
print("===================================")
print("ADMIN LOGIN")
print("===================================")
print("Email    :", ADMIN_EMAIL)
print("Password :", ADMIN_PASSWORD)
print("===================================")