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

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
