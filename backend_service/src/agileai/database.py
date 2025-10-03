import sqlite3
import json
import logging
import pandas as pd
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import os
import re
from modal import Volume
import contextlib
import sqlite_vec

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Get volume path from common module
from .common import VOLUME_DIR, DB_PATH, get_db_conn, serialize

@contextlib.contextmanager
def get_db_connection():
    """Context manager for database connections to ensure they are properly closed"""
    conn = None
    try:
        conn = get_db_conn(DB_PATH)
        yield conn
    finally:
        if conn:
            try:
                conn.close()
                logger.debug("Database connection closed successfully")
            except Exception as e:
                logger.error(f"Error closing database connection: {e}")

def init_db():
    """Initialize the database with required tables"""
    logger.info("Initializing database")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Create repository_data table to store cached data
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS repository_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT NOT NULL UNIQUE,
            repo_info TEXT NOT NULL,
            last_updated TIMESTAMP NOT NULL
        )
        ''')
        
        # Create issues table to store cached issues data
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS repository_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT NOT NULL UNIQUE,
            issues_data TEXT NOT NULL,
            last_updated TIMESTAMP NOT NULL
        )
        ''')
        
        # Create visualization_cache table to store prepared visualization data
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS visualization_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT NOT NULL,
            visualization_type TEXT NOT NULL,
            data TEXT NOT NULL,
            last_updated TIMESTAMP NOT NULL,
            UNIQUE(repo_name, visualization_type)
        )
        ''')
        
        # Create issues table for individual issues with embeddings
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY,
            repo_name TEXT NOT NULL,
            issue_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            state TEXT NOT NULL,
            author TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP,
            labels TEXT,
            UNIQUE(repo_name, issue_number)
        )
        ''')
        
        # Create vector table for issue embeddings
        cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_issues USING vec0(
            id INTEGER PRIMARY KEY,
            embedding FLOAT[1536]
        );
        ''')
        
        conn.commit()
    
    logger.info("Database initialization complete")

def save_repository_info(repo_name: str, repo_info: Dict[str, Any]):
    """Save repository info to the database cache"""
    logger.info(f"Saving repository info for {repo_name}")
    
    # Import NumpyJSONEncoder from main.py
    from .main import NumpyJSONEncoder
    
    # Convert dict to JSON using custom encoder
    repo_info_json = json.dumps(repo_info, cls=NumpyJSONEncoder)
    now = datetime.now().isoformat()
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Upsert repository data
        cursor.execute('''
        INSERT INTO repository_data (repo_name, repo_info, last_updated)
        VALUES (?, ?, ?)
        ON CONFLICT(repo_name) DO UPDATE SET
            repo_info = excluded.repo_info,
            last_updated = excluded.last_updated
        ''', (repo_name, repo_info_json, now))
        
        conn.commit()
    
    logger.info(f"Repository info saved for {repo_name}")

def get_repository_info(repo_name: str, max_age_hours: int = 24) -> Optional[Dict[str, Any]]:
    """Get repository info from the database cache if it exists and is not too old"""
    logger.info(f"Getting repository info for {repo_name} from cache")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get repository data
        cursor.execute('''
        SELECT repo_info, last_updated 
        FROM repository_data 
        WHERE repo_name = ?
        ''', (repo_name,))
        
        row = cursor.fetchone()
    
    if not row:
        logger.info(f"No cached data found for {repo_name}")
        return None
    
    repo_info_json, last_updated_str = row
    last_updated = datetime.fromisoformat(last_updated_str)
    
    # Check if data is too old
    if datetime.now() - last_updated > timedelta(hours=max_age_hours):
        logger.info(f"Cached data for {repo_name} is too old")
        return None
    
    try:
        return json.loads(repo_info_json)
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON data for {repo_name}")
        return None

def save_repository_issues(repo_name: str, issues_data: List[Dict[str, Any]]):
    """Save repository issues to the database cache"""
    logger.info(f"Saving repository issues for {repo_name}")
    
    # Import NumpyJSONEncoder from main.py
    from .main import NumpyJSONEncoder
    
    # Convert data to JSON using custom encoder
    issues_data_json = json.dumps(issues_data, cls=NumpyJSONEncoder)
    now = datetime.now().isoformat()
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Upsert issues data
        cursor.execute('''
        INSERT INTO repository_issues (repo_name, issues_data, last_updated)
        VALUES (?, ?, ?)
        ON CONFLICT(repo_name) DO UPDATE SET
            issues_data = excluded.issues_data,
            last_updated = excluded.last_updated
        ''', (repo_name, issues_data_json, now))
        
        conn.commit()
    
    logger.info(f"Repository issues saved for {repo_name}")

def get_repository_issues(repo_name: str, max_age_hours: int = 24) -> Optional[List[Dict[str, Any]]]:
    """Get repository issues from the database cache if they exist and are not too old"""
    logger.info(f"Getting repository issues for {repo_name} from cache")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get issues data
        cursor.execute('''
        SELECT issues_data, last_updated 
        FROM repository_issues 
        WHERE repo_name = ?
        ''', (repo_name,))
        
        row = cursor.fetchone()
    
    if not row:
        logger.info(f"No cached issues found for {repo_name}")
        return None
    
    issues_data_json, last_updated_str = row
    last_updated = datetime.fromisoformat(last_updated_str)
    
    # Check if data is too old
    if datetime.now() - last_updated > timedelta(hours=max_age_hours):
        logger.info(f"Cached issues for {repo_name} are too old")
        return None
    
    try:
        issues_data = json.loads(issues_data_json)

        # Defensive cache read: handle legacy caches where list items may be JSON strings
        if isinstance(issues_data, list) and len(issues_data) > 0:
            # Check if first item is a string that looks like JSON
            first_item = issues_data[0]
            if isinstance(first_item, str) and first_item.strip().startswith('{'):
                # Likely double-encoded, decode each item
                logger.warning(f"Detected double-encoded issues cache for {repo_name}, normalizing...")
                normalized = []
                for idx, item in enumerate(issues_data):
                    if isinstance(item, str):
                        try:
                            normalized.append(json.loads(item))
                        except Exception as e:
                            logger.warning(f"Failed to decode item {idx} in cache for {repo_name}: {e}")
                    else:
                        normalized.append(item)
                return normalized

        return issues_data
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON issues data for {repo_name}")
        return None

def save_visualization_data(repo_name: str, visualization_type: str, data: Dict[str, Any]):
    """Save visualization data to the database cache"""
    logger.info(f"Saving {visualization_type} visualization for {repo_name}")
    
    # Import NumpyJSONEncoder from main.py
    from .main import NumpyJSONEncoder
    
    # Convert data to JSON using custom encoder
    data_json = json.dumps(data, cls=NumpyJSONEncoder)
    now = datetime.now().isoformat()
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Upsert visualization data
        cursor.execute('''
        INSERT INTO visualization_cache (repo_name, visualization_type, data, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(repo_name, visualization_type) DO UPDATE SET
            data = excluded.data,
            last_updated = excluded.last_updated
        ''', (repo_name, visualization_type, data_json, now))
        
        conn.commit()
    
    logger.info(f"{visualization_type} visualization saved for {repo_name}")

def get_visualization_data(repo_name: str, visualization_type: str, max_age_hours: int = 24) -> Optional[Dict[str, Any]]:
    """Get visualization data from the cache if it exists and is not too old"""
    logger.info(f"Getting {visualization_type} visualization for {repo_name} from cache")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get visualization data
        cursor.execute('''
        SELECT data, last_updated 
        FROM visualization_cache 
        WHERE repo_name = ? AND visualization_type = ?
        ''', (repo_name, visualization_type))
        
        row = cursor.fetchone()
    
    if not row:
        logger.info(f"No cached {visualization_type} visualization found for {repo_name}")
        return None
    
    data_json, last_updated_str = row
    last_updated = datetime.fromisoformat(last_updated_str)
    
    # Check if data is too old
    if datetime.now() - last_updated > timedelta(hours=max_age_hours):
        logger.info(f"Cached {visualization_type} visualization for {repo_name} is too old")
        return None
    
    try:
        return json.loads(data_json)
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON visualization data for {repo_name}")
        return None

def save_issues_with_embeddings(repo_name: str, issues_data: List[Dict[str, Any]]):
    """Save individual issues to the database and generate embeddings"""
    from openai import OpenAI
    import os
    
    # Handle case where issues_data might be a string (from corrupted cache)
    if isinstance(issues_data, str):
        try:
            issues_data = json.loads(issues_data)
        except (json.JSONDecodeError, TypeError):
            logger.error(f"Invalid issues_data format for {repo_name}: expected list, got {type(issues_data)}")
            return
    
    if not isinstance(issues_data, list):
        logger.error(f"Invalid issues_data format for {repo_name}: expected list, got {type(issues_data)}")
        return

    # Normalize per-item: handle legacy caches where items may be JSON strings
    normalized = []
    for idx, item in enumerate(issues_data):
        if isinstance(item, str):
            try:
                item = json.loads(item)
            except Exception as e:
                logger.warning(f"Skipping non-JSON issue at index {idx} for {repo_name}: {type(item)} - {e}")
                continue
        if not isinstance(item, dict):
            logger.warning(f"Skipping non-dict issue at index {idx} for {repo_name}: {type(item)}")
            continue
        normalized.append(item)
    issues_data = normalized

    logger.info(f"Saving {len(issues_data)} issues with embeddings for {repo_name}")
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        for issue in issues_data:
            issue_id = issue.get('id') or issue.get('issue_id')
            issue_number = issue.get('number') or issue.get('issue_number')
            title = issue.get('title', '')
            body = issue.get('body', '')
            state = issue.get('state', 'open')

            raw_user = issue.get('user') or issue.get('author')
            if isinstance(raw_user, dict):
                author = raw_user.get('login', '')
            else:
                author = raw_user or ''

            created_at = issue.get('created_at', '')
            updated_at = issue.get('updated_at', '')

            labels_data = issue.get('labels', [])
            if isinstance(labels_data, str):
                labels = labels_data
            else:
                labels = json.dumps(labels_data)

            if issue_id is None or issue_number is None:
                logger.warning(
                    "Skipping issue without id/number when storing embeddings: repo=%s payload_keys=%s",
                    repo_name,
                    list(issue.keys())
                )
                continue
            
            # Check if issue already exists
            cursor.execute("SELECT id FROM issues WHERE repo_name = ? AND issue_number = ?", 
                         (repo_name, issue_number))
            
            if cursor.fetchone() is None:
                # Insert issue
                cursor.execute('''
                INSERT INTO issues (id, repo_name, issue_number, title, body, state, author, created_at, updated_at, labels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (issue_id, repo_name, issue_number, title, body, state, author, created_at, updated_at, labels))
                
                # Generate embedding for combined title and body
                content = f"{title}\n\n{body}" if body else title
                if content and content.strip():
                    try:
                        embedding = client.embeddings.create(
                            model="text-embedding-ada-002", 
                            input=content
                        ).data[0].embedding
                        
                        cursor.execute('''
                        INSERT INTO vec_issues (id, embedding)
                        VALUES (?, ?)
                        ''', (issue_id, serialize(embedding)))
                        
                    except Exception as e:
                        logger.error(f"Failed to create embedding for issue {issue_number}: {e}")
        
        conn.commit()
    
    logger.info(f"Issues with embeddings saved for {repo_name}")

def similarity_search_issues(repo_name: str, query: str, top_k: int = 15):
    """Search for similar issues using vector similarity"""
    from openai import OpenAI
    import os
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Generate query embedding
        query_embedding = client.embeddings.create(
            model="text-embedding-ada-002", 
            input=query
        ).data[0].embedding
        query_bytes = serialize(query_embedding)
        
        # Search for similar issues
        results = cursor.execute('''
        SELECT
            vec_issues.id,
            distance,
            issues.repo_name,
            issues.issue_number,
            issues.title,
            issues.body,
            issues.state,
            issues.author,
            issues.created_at,
            issues.labels
        FROM vec_issues
        LEFT JOIN issues ON vec_issues.id = issues.id
        WHERE embedding MATCH ? AND k = ? AND issues.repo_name = ?
        ORDER BY distance
        ''', [query_bytes, top_k, repo_name]).fetchall()
    
    return results

def execute_sql_query_on_issues(repo_name: str, sql_query: str):
    """Execute SQL query on the issues table"""
    logger.info(f"Executing SQL query on issues for {repo_name}: {sql_query}")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            sanitized_query = sql_query.strip().rstrip(';')

            if not sanitized_query:
                result = {
                    "error": "Empty SQL query provided.",
                    "query": sql_query
                }
                return result

            if not sanitized_query.lower().startswith("select"):
                result = {
                    "error": "Only SELECT statements are allowed.",
                    "query": sanitized_query
                }
                return result

            if ';' in sanitized_query:
                result = {
                    "error": "Multiple SQL statements are not allowed.",
                    "query": sanitized_query
                }
                return result

            # Build a temporary table scoped to the requested repository
            cursor.execute("DROP TABLE IF EXISTS issues_filtered")
            cursor.execute(
                "CREATE TEMP TABLE issues_filtered AS "
                "SELECT * FROM issues WHERE repo_name = ?",
                (repo_name,)
            )

            # Rewrite any reference to the issues table so it uses the filtered data
            filtered_query = re.sub(r'\bissues\b', 'issues_filtered', sanitized_query, flags=re.IGNORECASE)

            rows = cursor.execute(filtered_query).fetchall()

            column_names = [description[0] for description in cursor.description]

            result = {
                "columns": column_names,
                "rows": rows,
                "query": filtered_query
            }
        except Exception as e:
            logger.error(f"SQL query execution failed: {e}")
            result = {
                "error": str(e),
                "query": sql_query
            }
        finally:
            try:
                cursor.execute("DROP TABLE IF EXISTS issues_filtered")
            except Exception as drop_error:
                logger.warning(f"Unable to drop temporary issues_filtered table: {drop_error}")

        return result
