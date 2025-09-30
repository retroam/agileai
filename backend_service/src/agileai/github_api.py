import logging
import warnings
import requests
import pandas as pd
import datetime
import os
from typing import Dict, List, Optional, Tuple, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def get_github_token() -> Optional[str]:
    """Get GitHub token from environment variables."""
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        logger.info("GitHub token found in environment variables")
        return token
    else:
        logger.info("No GitHub token found in environment variables")
        return None

def get_info(repo: str, github_token: Optional[str] = None) -> Dict[str, int]:
    """Fetch repository information from GitHub API."""
    # Use provided token or get from environment
    token = github_token or get_github_token()
    
    logger.info(f"Fetching info for repository: {repo}")
    url = f"https://api.github.com/repos/{repo}"
    
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
        logger.info("Using GitHub token for authentication")
    else:
        logger.info("No GitHub token available. Making unauthenticated request for repo info.")
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Check rate limits
        remaining = response.headers.get('X-RateLimit-Remaining')
        logger.debug(f"Rate limit remaining: {remaining}")
        if remaining and int(remaining) < 10:
            msg = f"Low GitHub API rate limit remaining: {remaining}"
            logger.warning(msg)
            warnings.warn(msg, UserWarning)
        
        data = response.json()
        return {
            "num_pull_requests": data["open_issues_count"],
            "num_contributors": data["subscribers_count"],
            "num_stargazers": data["stargazers_count"]
        }
    
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error fetching repo info: {e}")
        warnings.warn(f"HTTP error occurred: {e}", UserWarning)
        return {}
    except KeyError as e:
        logger.error(f"Missing key in response data: {e}")
        warnings.warn(f"Unexpected API response format: {e}", UserWarning)
        return {}

def get_issues(repo: str, github_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve issue data from GitHub API with pagination support."""
    # Use provided token or get from environment
    token = github_token or get_github_token()
    
    logger.info(f"Fetching issues for {repo}")
    
    headers = {}
    if token:
        logger.info("Using GitHub token for authentication")
        headers["Authorization"] = f"token {token}"
    else:
        logger.info("No GitHub token available. Making unauthenticated request for issues.")
    
    data = []
    next_url = f"https://api.github.com/repos/{repo}/issues?state=all&per_page=100"
    
    try:
        while next_url:
            logger.debug(f"Fetching page: {next_url}")
            response = requests.get(next_url, headers=headers)
            response.raise_for_status()
            
            # Process current page
            page_data, parse_errors = _process_issues_page(response.json())
            data.extend(page_data)
            
            if parse_errors:
                logger.warning(f"Encountered {parse_errors} parsing errors in current page")
            
            # Get next page URL
            next_url = _get_next_page_url(response.headers.get('link', ''))
            
        logger.info(f"Retrieved {len(data)} total issues")
        return data
    
    except requests.exceptions.HTTPError as e:
        logger.error(f"Failed to fetch issues: {e}")
        warnings.warn(f"HTTP error occurred: {e}", UserWarning)
        return []

def _process_issues_page(issues: List[Dict]) -> Tuple[List[Dict], int]:
    """Process a page of issues and return (data, error_count)."""
    page_data = []
    error_count = 0
    
    for issue in issues:
        try:
            created_at = _parse_gh_date(issue.get("created_at"))
            closed_at = _parse_gh_date(issue.get("closed_at"))
            
            # Convert datetime objects to ISO format strings for JSON serialization
            created_at_str = created_at.isoformat() if created_at else None
            closed_at_str = closed_at.isoformat() if closed_at else None
            
            time_to_close = _calculate_time_diff(created_at, closed_at)
            
            item = {
                "id": issue.get("id"),
                "number": issue.get("number"),
                "title": issue["title"],
                "body": issue.get("body", ""),
                "state": issue["state"],
                "user": issue["user"]["login"],
                "comments": issue["comments"],
                "labels": [label["name"] for label in issue.get("labels", [])],
                "created_at": created_at_str,
                "updated_at": issue.get("updated_at"),
                "closed_at": closed_at_str,
                "time_to_close": time_to_close,
                "html_url": issue.get("html_url")
            }
            page_data.append(item)
        except KeyError as e:
            logger.warning(f"Skipping issue with missing field: {e}")
            error_count += 1
        except Exception as e:
            logger.error(f"Unexpected error processing issue: {e}")
            error_count += 1
    
    return page_data, error_count

def _parse_gh_date(date_str: Optional[str]) -> Optional[datetime.datetime]:
    """Parse GitHub date string into datetime object."""
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, TypeError) as e:
        logger.error(f"Failed to parse date {date_str}: {e}")
        return None

def _calculate_time_diff(start: Optional[datetime.datetime], end: Optional[datetime.datetime]) -> Optional[float]:
    """Calculate time difference in hours between two datetimes."""
    if not start or not end:
        return None
    try:
        return (end - start).total_seconds() / 3600
    except TypeError as e:
        logger.error(f"Invalid date comparison: {e}")
        return None

def _get_next_page_url(link_header: Optional[str]) -> Optional[str]:
    """Extract next page URL from GitHub link header."""
    if not link_header:
        return None
    
    for link in link_header.split(", "):
        if 'rel="next"' in link:
            return link[link.index("<")+1:link.index(">")]
    return None 
