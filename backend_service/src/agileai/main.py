import sqlite3
from modal import asgi_app
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
from typing import Dict, List, Optional, Any
import json
from pydantic import BaseModel
import logging
import numpy as np
from fastapi.responses import JSONResponse, HTMLResponse
import gensim
from gensim.utils import simple_preprocess
from gensim.parsing.preprocessing import STOPWORDS
import pyLDAvis
import pyLDAvis.gensim_models
import re
from datetime import datetime, timedelta
# Fix for the fork() warning
os.environ['JOBLIB_START_METHOD'] = 'forkserver'

from .common import DB_PATH, VOLUME_DIR, app, fastapi_app, volume, TOOLS
from .github_api import get_info, get_issues
from .database import (
    init_db, 
    get_repository_info, 
    save_repository_info,
    get_repository_issues,
    save_repository_issues,
    get_visualization_data,
    save_visualization_data,
    save_issues_with_embeddings,
    similarity_search_issues,
    execute_sql_query_on_issues
)
from .visualization import (
    prepare_wordcloud_data,
    prepare_topic_modeling_data,
    prepare_repository_insights,
    prepare_nomic_atlas_topics
)

# Custom JSON encoder to handle NumPy types
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super(NumpyJSONEncoder, self).default(obj)

# Custom response class that uses the NumpyJSONEncoder
class CustomJSONResponse(JSONResponse):
    def render(self, content):
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            cls=NumpyJSONEncoder,
        ).encode("utf-8")

# Initialize database on startup
@app.function(
    volumes={VOLUME_DIR: volume},
)
def init_database():
    """Initialize the SQLite database with required tables."""
    volume.reload()
    init_db()
    volume.commit()

@app.function(
    volumes={VOLUME_DIR: volume},
)
@asgi_app()
def fastapi_entrypoint():
    # Initialize database on startup
    init_database.remote()
    return fastapi_app

# Configure CORS for all origins (update this for production)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type"],
)

# Override the default response class
fastapi_app.default_response_class = CustomJSONResponse

# Models
class RepositoryAnalysisRequest(BaseModel):
    repo: str
    github_token: Optional[str] = None
    force_refresh: bool = False  # New parameter to force API refresh

class NomicApiKeyRequest(BaseModel):
    repo: str
    github_token: Optional[str] = None
    force_refresh: bool = False
    nomic_api_key: Optional[str] = None
    field: str = "body"
    dataset_name: Optional[str] = None

class ChatRequest(BaseModel):
    repo: str
    query: str
    github_token: Optional[str] = None

# API Endpoints
@fastapi_app.get("/")
def read_root():
    return {"message": "GitHub Repository Analyzer API"}

@fastapi_app.get("/api/repository/{repo:path}")
async def get_repository_info_api(repo: str, force_refresh: bool = False, github_token: Optional[str] = None):
    """Get repository info with option to force refresh"""
    print(f"GET /api/repository/{repo} - force_refresh: {force_refresh}")
    logger = logging.getLogger(__name__)
    logger.info(f"Getting repository info for {repo}, force_refresh: {force_refresh}")
    
    # Check cache first if not forcing refresh
    volume.reload()
    if not force_refresh:
        cached_info = get_repository_info(repo)
        if cached_info:
            logger.info(f"Returning cached info for {repo}")
            return {"status": "success", "data": cached_info, "source": "cache"}
    
    # If force refresh or not in cache, fetch from GitHub API
    try:
        logger.info(f"Fetching fresh data from GitHub API for {repo}")
        print(f"Fetching data from GitHub API for {repo}")
        repo_info = get_info(repo, github_token)
        
        if not repo_info:
            error_msg = f"Repository {repo} not found or API error"
            logger.error(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        # Save to cache
        save_repository_info(repo, repo_info)
        volume.commit()
        logger.info(f"Successfully fetched and cached info for {repo}")
        
        return {"status": "success", "data": repo_info, "source": "api"}
    
    except Exception as e:
        error_msg = f"Error fetching repository info: {str(e)}"
        logger.error(error_msg)
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@fastapi_app.get("/api/insights/{repo:path}")
async def get_repository_insights_api(repo: str, force_refresh: bool = False, github_token: Optional[str] = None):
    """Get repository insights with option to force refresh"""
    print(f"GET /api/insights/{repo} - force_refresh: {force_refresh}")
    logger = logging.getLogger(__name__)
    logger.info(f"Getting insights for {repo}, force_refresh: {force_refresh}")
    
    # Get issues (either from cache or fresh)
    issues_data = await get_issues_data(repo, force_refresh, github_token)
    
    # Check visualization cache
    volume.reload()
    if not force_refresh:
        cached_insights = get_visualization_data(repo, "insights")
        if cached_insights:
            logger.info(f"Returning cached insights for {repo}")
            return {"status": "success", "data": cached_insights, "source": "cache"}
    
    # Generate insights
    try:
        logger.info(f"Generating fresh insights for {repo}")
        insights = prepare_repository_insights(issues_data)
        
        # Save to cache
        save_visualization_data(repo, "insights", insights)
        volume.commit()
        logger.info(f"Successfully generated and cached insights for {repo}")
        
        return {"status": "success", "data": insights, "source": "generated"}
    
    except Exception as e:
        error_msg = f"Error generating repository insights: {str(e)}"
        logger.error(error_msg)
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@fastapi_app.get("/api/issues/{repo:path}")
async def get_repository_issues_api(repo: str, force_refresh: bool = False, github_token: Optional[str] = None):
    """Get repository issues with option to force refresh"""
    print(f"GET /api/issues/{repo} - force_refresh: {force_refresh}")
    return await get_issues_data(repo, force_refresh, github_token)

async def get_issues_data(repo: str, force_refresh: bool = False, github_token: Optional[str] = None):
    """Helper function to get issues data"""
    logger = logging.getLogger(__name__)
    logger.info(f"Getting issues for {repo}, force_refresh: {force_refresh}")
    
    # Check cache first if not forcing refresh
    volume.reload()
    if not force_refresh:
        cached_issues = get_repository_issues(repo)
        if cached_issues:
            cache_is_complete = True
            for issue in cached_issues:
                if not isinstance(issue, dict) or issue.get("id") is None or issue.get("number") is None:
                    cache_is_complete = False
                    break

            if cache_is_complete:
                logger.info(f"Returning cached issues for {repo}")
                return {"status": "success", "data": cached_issues, "source": "cache"}

            logger.warning(
                "Cached issues for %s are missing required identifiers; fetching fresh data.",
                repo,
            )

    # If force refresh or not in cache, fetch from GitHub API
    try:
        logger.info(f"Fetching fresh issues from GitHub API for {repo}")
        print(f"Fetching issues from GitHub API for {repo}")
        issues = get_issues(repo, github_token)
        
        # Save to cache
        save_repository_issues(repo, issues)
        volume.commit()
        logger.info(f"Successfully fetched and cached {len(issues)} issues for {repo}")
        
        return {"status": "success", "data": issues, "source": "api"}
    
    except Exception as e:
        error_msg = f"Error fetching repository issues: {str(e)}"
        logger.error(error_msg)
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

# Original analyze endpoints for backward compatibility
@fastapi_app.post("/analyze/repo")
async def analyze_repository(req: RepositoryAnalysisRequest):
    """Analyze a GitHub repository and return its basic information"""
    return await get_repository_info_api(req.repo, req.force_refresh, req.github_token)

@fastapi_app.post("/analyze/issues")
async def analyze_issues(req: RepositoryAnalysisRequest):
    """Analyze issues from a GitHub repository"""
    return await get_repository_issues_api(req.repo, req.force_refresh, req.github_token)

@fastapi_app.post("/visualize/wordcloud")
async def get_wordcloud(req: RepositoryAnalysisRequest, field: str = Query("body")):
    """Generate wordcloud data from repository issues"""
    repo = req.repo
    github_token = req.github_token
    
    # Check visualization cache first
    volume.reload()
    visualization_type = f"wordcloud_{field}"
    cached_data = get_visualization_data(repo, visualization_type)
    
    if cached_data:
        return {"status": "success", "data": cached_data, "source": "cache"}
    
    # If not in cache, get issues and generate wordcloud
    try:
        # First check if issues are in cache
        issues_data = get_repository_issues(repo)
        
        if not issues_data:
            # Fetch issues from GitHub API
            issues_data = get_issues(repo, github_token)
            
            if not issues_data:
                raise HTTPException(status_code=404, detail=f"No issues found for repository {repo}")
            
            # Save issues to cache
            save_repository_issues(repo, issues_data)
        
        # Create pandas DataFrame from issues data
        issues_df = pd.DataFrame(issues_data)
        
        # Generate wordcloud data
        wordcloud_data = prepare_wordcloud_data(issues_df, field)
        
        if not wordcloud_data:
            raise HTTPException(status_code=404, detail=f"Not enough text data for wordcloud visualization")
        
        # Save visualization to cache
        save_visualization_data(repo, visualization_type, wordcloud_data)
        volume.commit()
        
        return {"status": "success", "data": wordcloud_data, "source": "generated"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating wordcloud: {str(e)}")

@fastapi_app.post("/visualize/topics")
async def get_topics(req: RepositoryAnalysisRequest, field: str = Query("body")):
    """Generate topic modeling data from repository issues"""
    repo = req.repo
    github_token = req.github_token
    
    # Check visualization cache first
    volume.reload()
    visualization_type = f"topics_{field}"
    cached_data = get_visualization_data(repo, visualization_type)
    
    if cached_data:
        return {"status": "success", "data": cached_data, "source": "cache"}
    
    # If not in cache, get issues and generate topics
    try:
        # First check if issues are in cache
        issues_data = get_repository_issues(repo)
        
        if not issues_data:
            # Fetch issues from GitHub API
            issues_data = get_issues(repo, github_token)
            
            if not issues_data:
                raise HTTPException(status_code=404, detail=f"No issues found for repository {repo}")
            
            # Save issues to cache
            save_repository_issues(repo, issues_data)
        
        # Create pandas DataFrame from issues data
        issues_df = pd.DataFrame(issues_data)
        
        # Generate topic modeling data
        topic_data = prepare_topic_modeling_data(issues_df, field)
        
        if not topic_data:
            raise HTTPException(status_code=404, detail=f"Not enough text data for topic modeling")
        
        # Save visualization to cache
        save_visualization_data(repo, visualization_type, topic_data)
        volume.commit()
        
        return {"status": "success", "data": topic_data, "source": "generated"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating topics: {str(e)}")

@fastapi_app.post("/visualize/insights")
async def get_insights(req: RepositoryAnalysisRequest):
    """Generate repository insights from issues data"""
    repo = req.repo
    github_token = req.github_token
    
    # Check visualization cache first
    volume.reload()
    visualization_type = "insights"
    cached_data = get_visualization_data(repo, visualization_type)
    
    if cached_data:
        return {"status": "success", "data": cached_data, "source": "cache"}
    
    # If not in cache, get issues and generate insights
    try:
        # First check if issues are in cache
        issues_data = get_repository_issues(repo)
        
        if not issues_data:
            # Fetch issues from GitHub API
            issues_data = get_issues(repo, github_token)
            
            if not issues_data:
                raise HTTPException(status_code=404, detail=f"No issues found for repository {repo}")
            
            # Save issues to cache
            save_repository_issues(repo, issues_data)
        
        # Create pandas DataFrame from issues data
        issues_df = pd.DataFrame(issues_data)
        
        # Generate repository insights
        insights_data = prepare_repository_insights(issues_df)
        
        if not insights_data:
            raise HTTPException(status_code=404, detail=f"Could not generate insights from repository data")
        
        # Save visualization to cache
        save_visualization_data(repo, visualization_type, insights_data)
        volume.commit()
        
        return {"status": "success", "data": insights_data, "source": "generated"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@fastapi_app.get("/cache/status/{repo:path}")
async def check_cache_status(repo: str):
    """Check cache status for a repository"""
    logger = logging.getLogger(__name__)
    logger.info(f"Checking cache status for {repo}")
    
    # Reload volume before accessing the database
    try:
        volume.reload()
    except Exception as e:
        logger.error(f"Error reloading volume: {e}")
        # Continue anyway, as we might still be able to access the database
    
    # Check if repository info is cached
    repo_info_cached = get_repository_info(repo, max_age_hours=24) is not None
    
    # Check if issues are cached
    issues_cached = get_repository_issues(repo, max_age_hours=24) is not None
    
    # Check what visualizations are cached
    cached_visualizations = {}
    
    # Standard visualizations
    for viz_type in ["wordcloud_body", "wordcloud_title", "topics_body", "topics_title", "insights"]:
        cached_visualizations[viz_type] = get_visualization_data(repo, viz_type) is not None
    
    # Nomic Atlas topics
    for field in ["body", "title"]:
        viz_type = f"nomic_atlas_topics_{field}"
        # Use the 1-week cache expiration for Nomic Atlas data
        cached_data = get_visualization_data(repo, viz_type, max_age_hours=168)
        
        # Only consider it cached if it's complete (not in processing or timeout state)
        if cached_data and isinstance(cached_data, dict):
            if cached_data.get("status") == "complete" or "status" not in cached_data:
                cached_visualizations[viz_type] = True
            else:
                cached_visualizations[viz_type] = False
        else:
            cached_visualizations[viz_type] = False
    
    # Add a simplified key for frontend compatibility
    cached_visualizations["nomic_atlas_topics"] = (
        cached_visualizations.get("nomic_atlas_topics_body", False) or 
        cached_visualizations.get("nomic_atlas_topics_title", False)
    )
    
    return {
        "repo": repo,
        "repo_info_cached": repo_info_cached,
        "issues_cached": issues_cached,
        "visualizations_cached": cached_visualizations
    }

@fastapi_app.delete("/api/cache/{repo:path}")
async def clear_cache(repo: str):
    """Clear all cached data for a repository for testing"""
    logger = logging.getLogger(__name__)
    logger.info(f"Clearing cache for {repo}")
    print(f"Clearing cache for {repo}")
    
    try:
        # Connect to the database
        volume.reload()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Delete repo info
        cursor.execute("DELETE FROM repository_data WHERE repo_name = ?", (repo,))
        logger.info(f"Deleted repository data for {repo}")
        
        # Delete issues
        cursor.execute("DELETE FROM repository_issues WHERE repo_name = ?", (repo,))
        logger.info(f"Deleted repository issues for {repo}")
        
        # Delete visualization data
        cursor.execute("DELETE FROM visualization_cache WHERE repo_name = ?", (repo,))
        logger.info(f"Deleted visualization data for {repo}")
        
        # Commit changes
        conn.commit()
        conn.close()
        volume.commit()
        
        return {"status": "success", "message": f"Cache cleared for {repo}"}
    except Exception as e:
        error_msg = f"Error clearing cache: {str(e)}"
        logger.error(error_msg)
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@fastapi_app.post("/cache/status")
async def check_cache_status_post(req: RepositoryAnalysisRequest):
    """Check cache status for a repository (POST version)"""
    return await check_cache_status(req.repo)

@fastapi_app.post("/cache/clear")
async def clear_cache_post(req: RepositoryAnalysisRequest):
    """Clear all cached data for a repository (POST version)"""
    return await clear_cache(req.repo)

@fastapi_app.post("/visualize/ldavis")
async def post_ldavis(req: RepositoryAnalysisRequest, field: str = Query("body")):
    """Generate and return pyLDAvis visualization for repository issues (POST method)"""
    return await get_ldavis(req.repo, field, req.force_refresh, req.github_token)

@fastapi_app.get("/visualize/ldavis")
async def get_ldavis(repo: str, field: str = Query("body"), force_refresh: bool = False, github_token: Optional[str] = None):
    """Generate and return pyLDAvis visualization for repository issues"""
    # Check visualization cache first (optional - you might want to always regenerate)
    volume.reload()
    visualization_type = f"ldavis_{field}"
    cached_data = get_visualization_data(repo, visualization_type)
    
    if cached_data and not force_refresh:
        # For HTML response, we need to wrap the cached html in a proper response
        return HTMLResponse(content=cached_data, status_code=200)
    
    # If not in cache or forcing refresh, get issues and generate visualization
    try:
        logging.info(f"Generating LDA visualization for repository: '{repo}' with field: '{field}'")
        # First check if issues are in cache
        issues_data = get_repository_issues(repo)
        
        if not issues_data:
            # Fetch issues from GitHub API
            logging.info(f"Fetching issues from GitHub API for repository: '{repo}'")
            issues_data = get_issues(repo, github_token)
            
            if not issues_data:
                raise HTTPException(status_code=404, detail=f"No issues found for repository {repo}")
            
            # Save issues to cache
            save_repository_issues(repo, issues_data)
        
        # Create pandas DataFrame from issues data
        issues_df = pd.DataFrame(issues_data)
        
        # Add repo column to dataframe to ensure it's available for the visualization
        issues_df['repo'] = repo
        logging.info(f"Added 'repo' column to dataframe with value: '{repo}'")
        
        # Generate pyLDAvis visualization - explicitly pass the repo name
        html_data = generate_ldavis_html(issues_df, field, repo)
        
        if not html_data:
            raise HTTPException(status_code=404, detail=f"Not enough text data for LDA visualization")
        
        # Save visualization to cache
        save_visualization_data(repo, visualization_type, html_data)
        volume.commit()
        
        return HTMLResponse(
            content=html_data, 
            status_code=200,
            headers={"Content-Type": "text/html; charset=utf-8"}
        )
    
    except Exception as e:
        logging.error(f"Error generating LDA visualization: {str(e)}")
        # Return a user-friendly error page instead of an exception
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head><title>LDA Visualization Error</title></head>
        <body>
            <div style="color:red; text-align:center; padding:20px;">
                <h2>Error Generating Visualization</h2>
                <p>There was an error processing the data: {str(e)}</p>
                <p>Please try again or check your data.</p>
                <p><small>Repository: {repo}, Field: {field}</small></p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(
            content=error_html,
            status_code=500,
            headers={"Content-Type": "text/html; charset=utf-8"}
        )

def generate_ldavis_html(issues_df: pd.DataFrame, field: str = "body", repo_name: str = None) -> str:
    """Generate pyLDAvis HTML visualization from issues dataframe"""
    try:
        if field not in issues_df.columns:
            logging.error(f"Invalid field for LDA visualization: {field}")
            return ""
    
        # Ensure we have a valid repository name
        if not repo_name:
            logging.warning("Repository name not provided as parameter, attempting to extract from dataframe")
            try:
                if 'repo' in issues_df.columns and not issues_df.empty:
                    repo_name = issues_df.iloc[0]['repo']
                    logging.info(f"Successfully extracted repo name from dataframe: '{repo_name}'")
                else:
                    logging.warning("Repository name not available in dataframe")
                    repo_name = "unknown_repo"  # Fallback name
                    logging.info(f"Using fallback repo name: '{repo_name}'")
            except Exception as e:
                logging.warning(f"Could not extract repo name from dataframe: {str(e)}")
                repo_name = "unknown_repo"  # Fallback name
                logging.info(f"Using fallback repo name due to error: '{repo_name}'")
        else:
            logging.info(f"Using provided repository name: '{repo_name}'")
    
        # Use the selected field for topic modeling
        data = [text for text in issues_df[field].tolist() if text and isinstance(text, str)]
        
        if not data or len(data) < 5:  # Need at least a few documents for meaningful topics
            logging.warning(f"Not enough {field} data available for LDA visualization (found {len(data)} valid entries)")
            return ""
    
        # Clean the text: remove URLs, non-alphabetic characters, extra whitespace, convert to lower case
        logging.info(f"Processing {len(data)} documents for LDA visualization")
        cleaned_data = []
        for text in data:
            try:
                cleaned_text = re.sub(r'https?://\S+', '', text)  # remove URLs
                cleaned_text = re.sub(r'[^a-zA-Z\s]', ' ', cleaned_text)  # remove non-alphabetic characters
                cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # collapse multiple spaces
                cleaned_text = cleaned_text.lower().strip()
                if len(cleaned_text) > 10:  # Only keep if there's meaningful content
                    cleaned_data.append(cleaned_text)
            except Exception as e:
                logging.warning(f"Error cleaning text: {str(e)}")
                continue
        
        if len(cleaned_data) < 5:
            logging.warning(f"Not enough cleaned text data for LDA (only {len(cleaned_data)} documents after processing)")
            return ""
    
        # Preprocess texts: tokenize and remove stopwords
        logging.info("Tokenizing and preprocessing texts for LDA")
        processed_texts = []
        for text in cleaned_data:
            try:
                tokens = [word for word in simple_preprocess(text) if word not in STOPWORDS and len(word) > 3]
                if tokens:
                    processed_texts.append(tokens)
            except Exception as e:
                logging.warning(f"Error processing tokens: {str(e)}")
                continue
        
        if len(processed_texts) < 5 or not any(processed_texts):
            logging.warning(f"Not enough processed texts for LDA (only {len(processed_texts)} valid documents)")
            return ""
    
        # Create a dictionary and corpus for LDA
        logging.info("Creating dictionary and corpus for LDA model")
        dictionary = gensim.corpora.Dictionary(processed_texts)
        
        # Filter extremes to improve quality (optional)
        dictionary.filter_extremes(no_below=2, no_above=0.9)
        
        corpus = [dictionary.doc2bow(text) for text in processed_texts]
        
        if not corpus or len(corpus) < 5:
            logging.warning(f"Insufficient corpus size for LDA: {len(corpus)} documents")
            return ""
    
        # Build the LDA model
        num_topics = min(5, len(corpus) // 5) if len(corpus) > 10 else 2
        logging.info(f"Building LDA model with {num_topics} topics")
        lda_model = gensim.models.ldamodel.LdaModel(
            corpus, num_topics=num_topics, id2word=dictionary, 
            passes=15, alpha='auto', eta='auto', random_state=42
        )
        
        # Store corpus and dictionary for later use
        lda_model.corpus = corpus  # Store corpus in the model
        lda_model.dictionary = dictionary  # Store dictionary in the model
    
        # Prepare the visualization
        logging.info("Preparing LDAvis visualization")
        lda_vis = pyLDAvis.gensim_models.prepare(lda_model, corpus, dictionary)
        
        # Also save the structured topic data to use in the frontend
        save_topic_data(lda_vis, lda_model, dictionary, field, repo_name)
        
        # Create HTML with CDNJS resources to ensure it works in any environment
        logging.info("Generating HTML for visualization")
        html_string = pyLDAvis.prepared_data_to_html(
            lda_vis,
            d3_url="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js",
            ldavis_url="https://cdn.jsdelivr.net/gh/bmabey/pyLDAvis@2.1.2/pyLDAvis/js/ldavis.v1.0.0.js",
            ldavis_css_url="https://cdn.jsdelivr.net/gh/bmabey/pyLDAvis@2.1.2/pyLDAvis/css/ldavis.css",
            template_type="general",
            visid=f"ldavis_{field}_{hash(str(corpus))%10000}"
        )
        
        # Create a more robust HTML document with better error handling
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>LDA Topic Visualization</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
                #loading {{ display: none; text-align: center; padding: 20px; }}
                #error {{ display: none; color: red; text-align: center; padding: 20px; }}
                #ldavis_container {{ opacity: 0; transition: opacity 0.5s; }}
            </style>
        </head>
        <body>
            <div id="loading">Loading visualization...</div>
            <div id="error">Error loading visualization. Please refresh the page.</div>
            {html_string}
            <script>
                // Ensure proper loading and error handling
                window.onload = function() {{
                    console.log("Page loaded, checking LDAvis status...");
                    setTimeout(function() {{
                        var loading = document.getElementById('loading');
                        var error = document.getElementById('error');
                        var container = document.getElementById('ldavis_container');
                        
                        if (typeof LDAvis === 'object' && container) {{
                            console.log('LDAvis loaded successfully');
                            loading.style.display = 'none';
                            error.style.display = 'none';
                            container.style.opacity = '1';
                            
                            // Force resize event to ensure proper rendering
                            window.dispatchEvent(new Event('resize'));
                        }} else {{
                            console.error('LDAvis loading issue detected');
                            loading.style.display = 'none';
                            error.style.display = 'block';
                        }}
                    }}, 1000);
                }};
                
                // Show loading indicator initially
                document.getElementById('loading').style.display = 'block';
            </script>
        </body>
        </html>
        """
        
        return full_html
    except Exception as e:
        logging.error(f"Error preparing LDA visualization: {str(e)}")
        # Return an error HTML page that will trigger the onLoad event in the iframe
        return f"""
        <!DOCTYPE html>
        <html>
        <head><title>LDA Visualization Error</title></head>
        <body>
            <div style="color:red; text-align:center; padding:20px;">
                <h2>Error Generating Visualization</h2>
                <p>There was an error processing the data: {str(e)}</p>
                <p>Please try again or check your data.</p>
            </div>
        </body>
        </html>
        """

def save_topic_data(lda_vis, lda_model, dictionary, field, repo):
    """Extract and save topic data from pyLDAvis for use in the frontend"""
    try:
        # Ensure we have a valid repo name
        if not repo:
            logging.error("Missing repository name for save_topic_data")
            repo = "unknown_repo"  # Use a fallback instead of returning None
            logging.info(f"Using fallback repository name: '{repo}'")
        else:
            logging.info(f"Saving topic data for repository: '{repo}' using field: '{field}'")
        
        # Extract topic information
        topic_data = []
        num_topics_to_extract = lda_model.num_topics
        logging.info(f"Extracting {num_topics_to_extract} topics for repository: '{repo}'")
        
        # Get topic coordinates and sizes from pyLDAvis
        mds_coords = lda_vis.topic_coordinates
        logging.info(f"Got MDS coordinates with shape: {mds_coords.shape}")
        
        # Get vocabulary - handle both old and new pyLDAvis API versions
        try:
            if hasattr(lda_vis, 'vocab'):
                vocab = lda_vis.vocab
                logging.info("Using legacy vocab attribute")
            elif hasattr(lda_vis, 'token') and hasattr(lda_vis.token, 'vocab'):
                vocab = lda_vis.token.vocab
                logging.info("Using token.vocab attribute")
            else:
                # Fallback to dictionary vocabulary
                vocab = [dictionary[id] for id in range(len(dictionary))]
                logging.info("Using fallback dictionary vocabulary")
            
            logging.info(f"Successfully loaded vocabulary with {len(vocab)} terms")
        except Exception as e:
            logging.error(f"Error accessing vocabulary: {str(e)}")
            raise
        
        # Get term frequencies - handle both old and new pyLDAvis API versions
        try:
            if hasattr(lda_vis, 'term_frequency'):
                term_frequency = lda_vis.term_frequency
                logging.info("Using legacy term_frequency attribute")
            elif hasattr(lda_vis, 'token') and hasattr(lda_vis.token, 'term_frequency'):
                term_frequency = lda_vis.token.term_frequency
                logging.info("Using token.term_frequency attribute")
            else:
                # Compute term frequencies from the corpus
                logging.info("Computing term frequencies from corpus")
                term_frequency = np.zeros(len(vocab))
                if hasattr(lda_model, 'corpus'):
                    for doc in lda_model.corpus:
                        for term_id, freq in doc:
                            term_frequency[term_id] += freq
                else:
                    # If no corpus stored, compute from the current corpus
                    for doc in corpus:
                        for term_id, freq in doc:
                            term_frequency[term_id] += freq
                logging.info(f"Computed term frequencies for {len(term_frequency)} terms")
            
            logging.info(f"Successfully loaded term frequencies for {len(term_frequency)} terms")
        except Exception as e:
            logging.error(f"Error accessing term frequencies: {str(e)}")
            raise
        
        for topic_id in range(num_topics_to_extract):
            logging.info(f"Processing topic {topic_id}")
            
            # Get topic info from pyLDAvis DataFrame if available
            topic_words = []
            if hasattr(lda_vis, 'topic_info'):
                # Filter topic_info for this topic
                topic_terms = lda_vis.topic_info[lda_vis.topic_info['Category'] == f'Topic{topic_id + 1}']
                if not topic_terms.empty:
                    logging.info(f"Found {len(topic_terms)} terms for topic {topic_id} in topic_info")
                    for _, row in topic_terms.iterrows():
                        try:
                            topic_words.append({
                                "text": str(row['Term']),  # Ensure term is string
                                "value": float(row['Freq']) if 'Freq' in row else 1.0,  # Term frequency in topic
                                "probability": float(row['logprob']) if 'logprob' in row else 0.0,  # Log probability
                                "loglift": float(row['loglift']) if 'loglift' in row else 0.0  # Log lift (distinctiveness)
                            })
                        except Exception as e:
                            logging.warning(f"Error processing topic term: {str(e)}")
                            continue
            
            # If no topic_info or if we couldn't get words, fall back to LDA model's show_topic
            if not topic_words:
                logging.info(f"Using fallback topic words for topic {topic_id}")
                try:
                    top_terms = lda_model.show_topic(topic_id, topn=10)
                    # Add additional safety check for correct tuple format
                    for term_tuple in top_terms:
                        try:
                            # Handle different versions of gensim that might return different formats
                            if isinstance(term_tuple, tuple) and len(term_tuple) == 2:
                                word, prob = term_tuple
                            elif isinstance(term_tuple, tuple) and len(term_tuple) > 2:
                                # If tuple has more than 2 values, explicitly extract first two
                                word, prob = term_tuple[0], term_tuple[1]
                            elif isinstance(term_tuple, dict):
                                # Handle dictionary format some gensim versions might return
                                word = term_tuple.get('term', '')
                                prob = term_tuple.get('probability', 0.0)
                            else:
                                logging.warning(f"Unexpected term format: {term_tuple}")
                                continue
                                
                            # Get the frequency information from LDAvis if available
                            term_freq = 0
                            try:
                                term_index = vocab.index(word)
                                term_freq = int(term_frequency[term_index])
                            except (ValueError, IndexError, AttributeError) as e:
                                logging.debug(f"Could not get frequency for word '{word}': {str(e)}")
                                term_freq = int(max(1, prob * 1000))  # Use probability-based fallback
                            
                            topic_words.append({
                                "text": str(word),  # Ensure it's a string
                                "value": term_freq,
                                "probability": float(prob)  # Ensure it's a float
                            })
                        except Exception as e:
                            logging.warning(f"Error processing term tuple {term_tuple}: {str(e)}")
                            continue
                except Exception as e:
                    logging.error(f"Error getting topic terms for topic {topic_id}: {str(e)}")
                    # Add some dummy words so visualization can continue
                    topic_words.append({
                        "text": f"topic_{topic_id}_term",
                        "value": 10,
                        "probability": 0.1
                    })
            
            # Create formatted topic label with probabilities
            formatted_label = " + ".join([f"{word['probability']:.3f}*\"{word['text']}\"" for word in topic_words[:5]])
            
            # Get the topic weight/prevalence if available
            topic_weight = 1.0
            try:
                if hasattr(lda_vis, 'topic_info') and 'Freq' in lda_vis.topic_info.columns:
                    # Get the topic frequency from pyLDAvis if available
                    topic_info = lda_vis.topic_info[lda_vis.topic_info['Category'] == 'Topic' + str(topic_id + 1)]
                    if not topic_info.empty:
                        topic_weight = float(topic_info['Freq'].iloc[0])
                elif hasattr(lda_model, 'get_topic_dist'):
                    # Or try to get it directly from the model
                    dist = lda_model.get_topic_dist()
                    topic_weight = float(dist[topic_id]) if topic_id < len(dist) else 1.0
            except Exception as e:
                logging.debug(f"Could not get topic weight: {str(e)}")
            
            # Create a formatted topic description like in the logs
            topic_description = f"topic #{topic_id} ({topic_weight:.3f}): {formatted_label}"
            logging.info(topic_description)
            
            # Get topic coordinates from pyLDAvis
            x = float(mds_coords.iloc[topic_id]['x'])
            y = float(mds_coords.iloc[topic_id]['y'])
            
            topic_data.append({
                "id": topic_id,
                "words": topic_words,
                "label": ", ".join([word["text"] for word in topic_words[:5]]),
                "formatted_description": topic_description,  # Add the formatted description with probabilities
                "weight": topic_weight,
                "x": x,  # Add x coordinate
                "y": y,  # Add y coordinate
                "size": topic_weight  # Use topic weight as size
            })
        
        # Get term information - we already have vocab and term_frequency from above
        terms = list(vocab)
        term_frequency_list = [float(f) for f in term_frequency]
        topic_term_dists = []
        
        logging.info(f"Got {len(terms)} terms and {len(term_frequency_list)} term frequencies")
        
        # Get topic-term distributions for each topic
        for topic_id in range(num_topics_to_extract):
            dist = []
            for term_id in range(len(terms)):
                try:
                    # Get probability from the model - handle the case where term might not appear in topic
                    term_topics = lda_model.get_term_topics(term_id, minimum_probability=0)
                    # term_topics is a list of (topic_id, probability) tuples
                    prob = 0.0
                    for t_id, t_prob in term_topics:
                        if t_id == topic_id:
                            prob = t_prob
                            break
                    dist.append(float(prob))
                except (IndexError, KeyError, TypeError) as e:
                    logging.debug(f"Error getting probability for term {term_id} in topic {topic_id}: {str(e)}")
                    dist.append(0.0)
            topic_term_dists.append(dist)
        
        logging.info(f"Generated topic-term distributions with shape: {len(topic_term_dists)}x{len(topic_term_dists[0]) if topic_term_dists else 0}")
        
        # Create the complete visualization data
        vis_data = {
            "topics": topic_data,
            "terms": terms,
            "term_frequency": term_frequency_list,
            "topic_term_dists": topic_term_dists
        }
        
        # Save this data to cache for later use
        visualization_type = f"topics_from_ldavis_{field}"
        logging.info(f"Saving {len(topic_data)} topics for repository: '{repo}'")
        
        # Log the data structure before saving
        logging.info(f"Visualization data contains: {list(vis_data.keys())}")
        logging.info(f"Number of topics: {len(vis_data['topics'])}")
        logging.info(f"Number of terms: {len(vis_data['terms'])}")
        
        save_visualization_data(repo, visualization_type, json.dumps(vis_data, cls=NumpyJSONEncoder))
        return vis_data
        
    except Exception as e:
        logging.error(f"Error saving topic data: {str(e)} for repository: '{repo}'")
        # Try to save a minimal version with just the error
        try:
            if repo:  # Only try to save if we have a repo name
                visualization_type = f"topics_from_ldavis_{field}"
                error_data = {"error": str(e), "topics": [], "terms": [], "term_frequency": [], "topic_term_dists": []}
                save_visualization_data(repo, visualization_type, json.dumps(error_data, cls=NumpyJSONEncoder))
                logging.info(f"Saved error data for repository: '{repo}'")
        except Exception as inner_e:
            logging.error(f"Failed to save error data: {str(inner_e)}")
        return None

@fastapi_app.get("/visualize/topics-from-ldavis")
async def get_topics_from_ldavis(repo: str, field: str = Query("body"), force_refresh: bool = False, github_token: Optional[str] = None):
    """Get topic data extracted from pyLDAvis"""
    try:
        logging.info(f"Getting topics from LDAvis for repo: {repo}, field: {field}")
        volume.reload()
        visualization_type = f"topics_from_ldavis_{field}"
        cached_data = get_visualization_data(repo, visualization_type)
        
        if cached_data and not force_refresh:
            logging.info("Found cached topic data")
            # Parse the cached data to ensure it's valid JSON
            try:
                parsed_data = json.loads(cached_data)
                logging.info(f"Cached data contains: {list(parsed_data.keys())}")
                return CustomJSONResponse(content=parsed_data)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing cached data: {e}")
                # If cached data is invalid, continue to regenerate
                force_refresh = True
        
        # If we need to generate the data, we'll use the ldavis endpoint which will save the topic data 
        # through the save_topic_data function
        logging.info(f"No cached topic data found or force refresh requested for repository: '{repo}', generating new data")
        # This will generate the LDA visualization and also save topic data 
        await get_ldavis(repo, field, force_refresh=True, github_token=github_token)
        
        # Now try to get the saved topic data
        cached_data = get_visualization_data(repo, visualization_type)
        
        if not cached_data:
            # If we still don't have data, return a fallback with empty topics
            logging.warning(f"Failed to generate topic data for repository: '{repo}'")
            return {"topics": [], "error": "Failed to generate topic data"}
        
        try:
            parsed_data = json.loads(cached_data)
            logging.info(f"Generated data contains: {list(parsed_data.keys())}")
            return CustomJSONResponse(content=parsed_data)
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing generated data: {e}")
            return {"topics": [], "error": f"Invalid topic data format: {str(e)}"}
            
    except Exception as e:
        logging.error(f"Error getting topics from LDAvis: {str(e)} for repository: '{repo}'")
        # Return empty topics list in case of error
        return {"topics": [], "error": str(e)}

@fastapi_app.post("/visualize/nomic-atlas-topics")
async def get_nomic_atlas_topics(req: NomicApiKeyRequest):
    """Generate topic data using Nomic Atlas"""
    repo = req.repo
    field = req.field
    force_refresh = req.force_refresh
    github_token = req.github_token
    nomic_api_key = req.nomic_api_key
    dataset_name = req.dataset_name
    
    # Set visualization type for caching
    visualization_type = f"nomic_atlas_topics_{field}"
    
    # Use a 1-week (168 hours) cache expiration for Nomic Atlas data
    cache_expiration_hours = 168  # 7 days * 24 hours
    
    # Check cache first if not forcing refresh
    if not force_refresh:
        cached_data = get_visualization_data(repo, visualization_type, max_age_hours=cache_expiration_hours)
        if cached_data:
            # If the cached data is in "processing" state, we should refresh it if it's older than 1 hour
            if isinstance(cached_data, dict) and cached_data.get("status") == "processing":
                # Get the last updated time from the database
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('''
                SELECT last_updated 
                FROM visualization_cache 
                WHERE repo_name = ? AND visualization_type = ?
                ''', (repo, visualization_type))
                row = cursor.fetchone()
                conn.close()
                
                if row:
                    last_updated_str = row[0]
                    last_updated = datetime.fromisoformat(last_updated_str)
                    # If processing state is older than 1 hour, refresh it
                    if datetime.now() - last_updated > timedelta(hours=1):
                        logging.info(f"Cached Nomic Atlas data for {repo} is in processing state for more than 1 hour, refreshing...")
                        force_refresh = True
                    else:
                        return cached_data
                else:
                    return cached_data
            else:
                return cached_data
    
    # Get issues data
    issues_response = await get_issues_data(repo, force_refresh, github_token)
    if not issues_response:
        raise HTTPException(status_code=404, detail=f"No issues found for repository: {repo}")
    
    # Extract the actual issues data from the response
    if isinstance(issues_response, dict) and 'data' in issues_response:
        issues_data = issues_response['data']
    else:
        issues_data = issues_response
    
    if not issues_data:
        raise HTTPException(status_code=404, detail=f"No issues data found for repository: {repo}")

    # Convert to DataFrame
    issues_df = pd.DataFrame(issues_data)

    # Generate Nomic Atlas topic data
    topic_data = prepare_nomic_atlas_topics(issues_df, field, nomic_api_key, dataset_name)

    # Check if there was an error
    if "error" in topic_data:
        raise HTTPException(status_code=500, detail=topic_data["error"])

    # Save to cache
    save_visualization_data(repo, visualization_type, topic_data)

    return topic_data

@fastapi_app.post("/chat/ask")
async def chat_with_issues(req: ChatRequest):
    """
    Chat endpoint that uses OpenAI function calling to decide whether to:
    1) Do RAG (similarity search on GitHub issues)
    2) Generate & execute SQL queries on issues
    """
    from openai import OpenAI
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    repo = req.repo
    user_query = req.query
    github_token = req.github_token
    
    if not user_query:
        raise HTTPException(status_code=400, detail="No query provided.")
    
    # Ensure we have issues data with embeddings
    volume.reload()
    issues_response = await get_issues_data(repo, False, github_token)
    if not issues_response:
        raise HTTPException(status_code=404, detail=f"No issues found for repository: {repo}")
    
    # Extract issues data
    if isinstance(issues_response, dict) and 'data' in issues_response:
        issues_data = issues_response['data']
    else:
        issues_data = issues_response
    
    # Store issues with embeddings if not already done
    try:
        save_issues_with_embeddings(repo, issues_data)
        volume.commit()
    except Exception as e:
        logging.error(f"Error saving issues with embeddings: {e}")
        # Continue anyway, might be already stored
    
    # System message for the AI
    system_message = {
        "role": "system",
        "content": f"""
        You are a helpful assistant analyzing GitHub issues for the repository '{repo}'. You can answer user questions using either:

        1) RAG-based similarity search (when the user wants to find issues similar to their query or wants content-based answers)
        2) Generating a SQL query for structured data analysis (when the user wants statistics, counts, or structured information)

        The issues table has the following schema:
        - id: unique issue ID
        - repo_name: repository name
        - issue_number: GitHub issue number  
        - title: issue title
        - body: issue description/body
        - state: 'open' or 'closed'
        - author: GitHub username who created the issue
        - created_at: timestamp when issue was created
        - updated_at: timestamp when issue was last updated
        - labels: JSON array of label names

        Choose the best approach for the user's question. For content-based questions about what issues discuss, use RAG. For statistics and structured queries, use SQL.
        """
    }
    
    user_message = {
        "role": "user", 
        "content": user_query
    }
    messages = [system_message, user_message]
    
    # Ask the model to decide approach
    try:
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=TOOLS,
            tool_choice={"type": "function", "function": {"name": "decide_approach"}}
        )
        completion_message = completion.choices[0].message
        messages.append(completion_message)
        tool_calls = completion_message.tool_calls
        
        if not tool_calls:
            raise HTTPException(status_code=500, detail="No function call was produced. Could not proceed.")

        selected_approach: Optional[str] = None
        
        for tool_call in tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)
            approach = fn_args.get("approach", "rag")
            
            if approach == "rag":
                selected_approach = "rag"
                # Do similarity search
                search_results = similarity_search_issues(repo, user_query)
                
                # Format results for the AI
                formatted_results = []
                for result in search_results:
                    issue_id, distance, repo_name, issue_number, title, body, state, author, created_at, labels = result
                    formatted_results.append({
                        "issue_number": issue_number,
                        "title": title,
                        "body": body[:500] + "..." if body and len(body) > 500 else body,  # Truncate long bodies
                        "state": state,
                        "author": author,
                        "created_at": created_at,
                        "labels": json.loads(labels) if labels else [],
                        "similarity_distance": distance
                    })
                
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool", 
                    "name": fn_name,
                    "content": f"Similar issues found: {json.dumps(formatted_results, indent=2)}"
                })
                
            elif approach == "sql":
                selected_approach = "sql"
                # Execute SQL query
                sql_query = fn_args.get("sql_query", "")
                if not sql_query.strip():
                    raise HTTPException(status_code=500, detail="No SQL query provided by the AI.")
                
                sql_results = execute_sql_query_on_issues(repo, sql_query)
                
                if sql_results.get("error"):
                    tool_content = f"SQL Query Error: {json.dumps(sql_results, indent=2)}"
                else:
                    tool_content = f"SQL Query Results: {json.dumps(sql_results, indent=2)}"

                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": fn_name, 
                    "content": tool_content
                })
            
            else:
                raise HTTPException(status_code=500, detail="Unknown approach returned by AI.")

        # Get final response from AI
        final_response = client.chat.completions.create(
            model="gpt-4",
            messages=messages
        )
        messages.append(final_response.choices[0].message)

        return {
            "status": "success",
            "data": {
                "answer": final_response.choices[0].message.content,
                "approach": selected_approach,
                "chat_history": messages
            }
        }

    except Exception as e:
        logging.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@fastapi_app.get("/chat/test/{repo:path}")  
async def test_embeddings(repo: str):
    """Test endpoint to verify embeddings are working"""
    volume.reload()
    
    # Test similarity search with a simple query
    try:
        results = similarity_search_issues(repo, "bug", top_k=5)
        return {
            "repo": repo,
            "test_query": "bug", 
            "results_count": len(results),
            "sample_results": [
                {
                    "issue_number": result[3],
                    "title": result[4],
                    "distance": result[1]
                } for result in results[:3]
            ]
        }
    except Exception as e:
        return {"error": str(e)}

@fastapi_app.get("/visualize/nomic-atlas-topics")
async def get_nomic_atlas_topics_get(
    repo: str,
    field: str = Query("body"),
    force_refresh: bool = False,
    github_token: Optional[str] = None,
    nomic_api_key: Optional[str] = None,
    dataset_name: Optional[str] = None
):
    """Generate topic data using Nomic Atlas (GET endpoint)"""
    # Set visualization type for caching
    visualization_type = f"nomic_atlas_topics_{field}"
    
    # Use a 1-week (168 hours) cache expiration for Nomic Atlas data
    cache_expiration_hours = 168  # 7 days * 24 hours
    
    # Check cache first if not forcing refresh
    if not force_refresh:
        cached_data = get_visualization_data(repo, visualization_type, max_age_hours=cache_expiration_hours)
        if cached_data:
            # If the cached data is in "processing" state, we should refresh it if it's older than 1 hour
            if isinstance(cached_data, dict) and cached_data.get("status") == "processing":
                # Get the last updated time from the database
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('''
                SELECT last_updated 
                FROM visualization_cache 
                WHERE repo_name = ? AND visualization_type = ?
                ''', (repo, visualization_type))
                row = cursor.fetchone()
                conn.close()
                
                if row:
                    last_updated_str = row[0]
                    last_updated = datetime.fromisoformat(last_updated_str)
                    # If processing state is older than 1 hour, refresh it
                    if datetime.now() - last_updated > timedelta(hours=1):
                        logging.info(f"Cached Nomic Atlas data for {repo} is in processing state for more than 1 hour, refreshing...")
                        force_refresh = True
                    else:
                        return cached_data
                else:
                    return cached_data
            else:
                return cached_data
    
    # Get issues data
    issues_response = await get_issues_data(repo, force_refresh, github_token)
    if not issues_response:
        raise HTTPException(status_code=404, detail=f"No issues found for repository: {repo}")
    
    # Extract the actual issues data from the response
    if isinstance(issues_response, dict) and 'data' in issues_response:
        issues_data = issues_response['data']
    else:
        issues_data = issues_response
    
    if not issues_data:
        raise HTTPException(status_code=404, detail=f"No issues data found for repository: {repo}")

    # Convert to DataFrame
    issues_df = pd.DataFrame(issues_data)

    # Generate Nomic Atlas topic data
    topic_data = prepare_nomic_atlas_topics(issues_df, field, nomic_api_key, dataset_name)

    # Check if there was an error
    if "error" in topic_data:
        raise HTTPException(status_code=500, detail=topic_data["error"])

    # Save to cache
    save_visualization_data(repo, visualization_type, topic_data)

    return topic_data
