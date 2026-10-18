import asyncio
import sys
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi import HTTPException

import server


def test_reviews_fallback_when_credentials_missing():
    """Verify endpoint gracefully falls back to community archive when Google keys are missing."""
    async def run():
        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", ""),
            patch.object(server, "GOOGLE_PLACE_ID", ""),
        ):
            server._reviews_cache = {"timestamp": 0.0, "data": None}
            res = await server.get_reviews(source="auto", refresh=True)

            assert res["source_mode"] == "community"
            assert res["is_live_google"] is False
            assert res["google_configured"] is False
            assert res["rating"] is None
            assert res["user_ratings_total"] is None
            assert "COMMUNITY" in res["attribution"].upper()
            assert len(res["reviews"]) >= 5
            # Ensure no fake star ratings on community reviews
            for rev in res["reviews"]:
                assert rev.get("rating") is None

    asyncio.run(run())


def test_reviews_explicit_community_source():
    """Verify source=community always returns community dispatches even if Google is configured."""
    async def run():
        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", "mock-key"),
            patch.object(server, "GOOGLE_PLACE_ID", "mock-place-id"),
        ):
            server._reviews_cache = {"timestamp": 0.0, "data": None}
            res = await server.get_reviews(source="community", refresh=True)

            assert res["source_mode"] == "community"
            assert res["is_live_google"] is False
            assert res["google_configured"] is True
            assert res["rating"] is None

    asyncio.run(run())


def test_reviews_google_places_success_and_normalization():
    """Verify Google Places API (New) returns normalized review objects with ratings and avatars."""
    mock_places_response = {
        "id": "places/ChIJtest123",
        "displayName": {"text": "NALAYAK STUDIOS HQ", "languageCode": "en"},
        "rating": 4.9,
        "userRatingCount": 38,
        "googleMapsUri": "https://maps.google.com/?cid=12345",
        "reviews": [
            {
                "name": "places/ChIJtest123/reviews/r1",
                "relativePublishTimeDescription": "2 weeks ago",
                "rating": 5,
                "text": {
                    "text": "Best heavyweight boxy tee I have ever bought in India. The GSM is legitimate and collar doesn't sag.",
                    "languageCode": "en"
                },
                "originalText": {
                    "text": "Best heavyweight boxy tee I have ever bought in India. The GSM is legitimate and collar doesn't sag.",
                    "languageCode": "en"
                },
                "authorAttribution": {
                    "displayName": "Aman Verma",
                    "uri": "https://maps.google.com/contrib/123",
                    "photoUri": "https://lh3.googleusercontent.com/a-/test-photo"
                },
                "publishTime": "2026-10-01T12:00:00Z"
            },
            {
                "name": "places/ChIJtest123/reviews/r2",
                "relativePublishTimeDescription": "a month ago",
                "rating": 5,
                "text": {
                    "text": "Brutal styling, prompt delivery to Bandra. Will definitely order the trench coat next.",
                    "languageCode": "en"
                },
                "authorAttribution": {
                    "displayName": "Rhea S",
                    "uri": "https://maps.google.com/contrib/456",
                    "photoUri": None
                },
                "publishTime": "2026-09-15T10:00:00Z"
            }
        ]
    }

    async def run():
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = mock_places_response

        fake_client = AsyncMock()
        fake_client.get.return_value = fake_response

        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", "test-secret-key-12345"),
            patch.object(server, "GOOGLE_PLACE_ID", "ChIJtest123"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client
            server._reviews_cache = {"timestamp": 0.0, "data": None}

            res = await server.get_reviews(source="auto", refresh=True)

            assert res["source_mode"] == "google"
            assert res["is_live_google"] is True
            assert res["google_configured"] is True
            assert res["place_name"] == "NALAYAK STUDIOS HQ"
            assert res["rating"] == 4.9
            assert res["user_ratings_total"] == 38
            assert res["attribution"] == "Powered by Google"
            assert len(res["reviews"]) == 2

            r1 = res["reviews"][0]
            assert r1["author"] == "Aman Verma"
            assert r1["initials"] == "AV"
            assert r1["rating"] == 5
            assert r1["avatar_url"] == "https://lh3.googleusercontent.com/a-/test-photo"
            assert "HEAVYWEIGHT BOXY TEE" in r1["highlight"]
            assert r1["attribution_url"] == "https://maps.google.com/?cid=12345"

            r2 = res["reviews"][1]
            assert r2["author"] == "Rhea S"
            assert r2["initials"] == "RS"
            assert r2["avatar_url"] is None

            # Verify call header had API key and FieldMask
            call_kwargs = fake_client.get.call_args.kwargs
            assert call_kwargs["headers"]["X-Goog-Api-Key"] == "test-secret-key-12345"
            assert "X-Goog-FieldMask" in call_kwargs["headers"]

            # Key must NOT appear in the response payload
            assert "test-secret-key-12345" not in str(res)

    asyncio.run(run())


def test_reviews_fallback_on_google_api_error_or_timeout():
    """Verify endpoint falls back safely when Google Places API responds with 403 or times out."""
    async def run():
        # Scenario 1: HTTP 403 Forbidden
        fake_response_403 = MagicMock()
        fake_response_403.status_code = 403
        fake_response_403.json.return_value = {"error": {"message": "API key not valid."}}

        fake_client = AsyncMock()
        fake_client.get.return_value = fake_response_403

        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", "bad-key"),
            patch.object(server, "GOOGLE_PLACE_ID", "ChIJbad"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client
            server._reviews_cache = {"timestamp": 0.0, "data": None}

            res = await server.get_reviews(source="auto", refresh=True)

            assert res["source_mode"] == "community"
            assert res["is_live_google"] is False
            assert len(res["reviews"]) >= 5

        # Scenario 2: Network Connection / Timeout Exception
        fake_client_error = AsyncMock()
        fake_client_error.get.side_effect = TimeoutError("Request timed out")

        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", "timeout-key"),
            patch.object(server, "GOOGLE_PLACE_ID", "ChIJtimeout"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client_error
            server._reviews_cache = {"timestamp": 0.0, "data": None}

            res = await server.get_reviews(source="auto", refresh=True)

            assert res["source_mode"] == "community"
            assert res["is_live_google"] is False
            assert len(res["reviews"]) >= 5

    asyncio.run(run())


def test_reviews_fallback_on_empty_google_reviews():
    """Verify endpoint falls back to community archive if Google place has 0 reviews."""
    mock_empty_places_response = {
        "id": "places/ChIJempty",
        "displayName": {"text": "NALAYAK NEW STORE"},
        "reviews": []
    }

    async def run():
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = mock_empty_places_response

        fake_client = AsyncMock()
        fake_client.get.return_value = fake_response

        with (
            patch.object(server, "GOOGLE_PLACES_API_KEY", "valid-key"),
            patch.object(server, "GOOGLE_PLACE_ID", "ChIJempty"),
            patch.object(server._httpx, "AsyncClient") as client_class,
        ):
            client_class.return_value.__aenter__.return_value = fake_client
            server._reviews_cache = {"timestamp": 0.0, "data": None}

            res = await server.get_reviews(source="auto", refresh=True)

            assert res["source_mode"] == "community"
            assert res["is_live_google"] is False
            assert len(res["reviews"]) >= 5

    asyncio.run(run())


def test_reviews_caching_and_bypass():
    """Verify TTL caching prevents redundant API calls and refresh=true bypasses cache."""
    cached_payload = {
        "source_mode": "google",
        "is_live_google": True,
        "google_configured": True,
        "place_id": "ChIJcache",
        "place_name": "NALAYAK",
        "reviews": [{"id": "r1", "author": "Tester"}],
    }

    async def run():
        server._reviews_cache = {
            "timestamp": time.time(),
            "data": cached_payload,
        }

        # Call without refresh -> should return cached: True
        res = await server.get_reviews(source="auto", refresh=False)
        assert res["cached"] is True
        assert res["place_id"] == "ChIJcache"

    asyncio.run(run())


def test_reviews_cache_purge_endpoint():
    """Verify /api/reviews/purge-cache authenticates via X-Admin-Key and flushes cache."""
    async def run():
        server._reviews_cache = {
            "timestamp": time.time(),
            "data": {"some": "data"},
        }

        # Unauthorized attempt without key
        with pytest.raises(HTTPException) as exc:
            await server.purge_reviews_cache(admin_key=None)
        assert exc.value.status_code == 401

        # Unauthorized attempt with wrong key
        with pytest.raises(HTTPException) as exc:
            await server.purge_reviews_cache(admin_key="wrong-key")
        assert exc.value.status_code == 401

        # Authorized attempt
        with patch.dict(server.os.environ, {"ADMIN_KEY": "test-admin-secret"}):
            purge_res = await server.purge_reviews_cache(admin_key="test-admin-secret")
            assert purge_res["purged"] is True
            assert server._reviews_cache["data"] is None
            assert server._reviews_cache["timestamp"] == 0.0

    asyncio.run(run())
