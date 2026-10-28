import pytest
from app.core.security import create_access_token

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "Deccan Mission High School" in data["service"]

def test_login_success(client, seeded_data):
    # Test admin login
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin_test",
        "password": "TestPass123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["username"] == "admin_test"
    # Ensure cookie was set
    assert "dmhs_session" in res.cookies

def test_login_invalid_password(client, seeded_data):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin_test",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert "Invalid username/email or password" in res.json()["message"]

def test_get_current_user_me(client, seeded_data):
    token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["username"] == "admin_test"
    assert data["role"] == "ADMIN"
    assert data["school_name"] == "Deccan Mission High School"

def test_logout(client, seeded_data):
    token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )
    res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert "Successfully signed out" in res.json()["message"]
