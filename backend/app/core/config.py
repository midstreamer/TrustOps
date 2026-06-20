from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_PROJECT_ROOT = _BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_ROOT / ".env"),
            str(_PROJECT_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://trustops:trustops@localhost:5432/trustops"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = ""
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    webhook_api_key: str = "dev-webhook-key-change-in-production"
    sentinel_api_key: str = ""
    app_version: str = "0.2.1-pilot-admin"
    deployment_mode: str = "local-demo"
    max_evidence_file_mb: int = 10
    evidence_storage_path: str = "storage/evidence"


settings = Settings()
