from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = ""
    rentcast_api_key: str = ""
    use_seed_data: bool = True
    port: int = 8000
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""
    site_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
