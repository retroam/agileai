import pathlib
import os
import sqlite3
import sqlite_vec
import struct
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modal import App, Image, Secret, Volume
from dotenv import load_dotenv, find_dotenv

# First try to load from current directory
dotenv_path = find_dotenv(usecwd=True)
if dotenv_path:
    load_dotenv(dotenv_path)
    print(f"Loaded environment variables from {dotenv_path}")
else:
    # Then try to load from the module directory
    module_env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(module_env_path):
        load_dotenv(module_env_path)
        print(f"Loaded environment variables from module directory: {module_env_path}")
    else:
        print("No .env file found. Environment variables will not be loaded.")

DB_FILENAME = "template.db"
VOLUME_DIR = "/cache-vol"
DB_PATH = pathlib.Path(VOLUME_DIR, DB_FILENAME)
volume = Volume.from_name("sqlite-db-vol", create_if_missing=True)

image = Image.debian_slim().pip_install_from_pyproject("pyproject.toml")

# Create secrets for Modal from multiple possible sources
secrets = [Secret.from_dotenv()]

# Also add individual secrets if they exist in the environment
if os.environ.get("GITHUB_TOKEN"):
    github_secret = Secret.from_dict({"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]})
    secrets.append(github_secret)
    print("Added GitHub token from environment to Modal secrets")

# Add Nomic API key if it exists in the environment
if os.environ.get("NOMIC_API_KEY"):
    nomic_secret = Secret.from_dict({"NOMIC_API_KEY": os.environ["NOMIC_API_KEY"]})
    secrets.append(nomic_secret)
    print("Added Nomic API key from environment to Modal secrets")

app = App(name="starter_template", secrets=secrets, image=image)

# Create a FastAPI instance here so it can be shared across modules
fastapi_app = FastAPI()

# Configure CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # This will be your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# AI CONSTANTS
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "decide_approach",
            "description": "Decide whether to use similarity search (RAG) or to run a SQL query over the GitHub issues DB.",
            "parameters": {
                "type": "object",
                "properties": {
                    "approach": {
                        "type": "string",
                        "enum": ["rag", "sql"],
                        "description": "Which approach to use? 'rag' or 'sql'."
                    },
                    "sql_query": {
                        "type": "string",
                        "description": "If 'sql' approach, the SQL to be executed."
                    }
                },
                "required": ["approach"]
            }
        },
    },
]

def serialize(vector: List[float]) -> bytes:
    """Serializes a list of floats into a compact 'raw bytes' format."""
    return struct.pack(f"{len(vector)}f", *vector)

def get_db_conn(db_path):
    """Get database connection with sqlite_vec loaded"""
    conn = sqlite3.connect(db_path)
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn