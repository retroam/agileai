import os
from dotenv import load_dotenv, find_dotenv

# Use find_dotenv to locate the .env file
dotenv_path = find_dotenv(usecwd=True)
if dotenv_path:
    load_dotenv(dotenv_path)
    print(f"Loaded environment variables from {dotenv_path}")
else:
    # Try to load from module directory
    module_env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(module_env_path):
        load_dotenv(module_env_path)
        print(f"Loaded environment variables from module directory: {module_env_path}")

def main() -> None:
    print("Hello from agileai!")
