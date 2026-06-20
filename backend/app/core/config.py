from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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
    app_version: str = "0.2.0-operational-pilot"
    deployment_mode: str = "local-demo"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
