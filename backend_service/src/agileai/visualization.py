import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from wordcloud import WordCloud, STOPWORDS
import re
import json
import os
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def prepare_wordcloud_data(data_frame: pd.DataFrame, field: str = "body") -> Dict[str, Any]:
    """Generate word cloud data from text field in dataframe"""
    logger.info(f"Generating word cloud data using {field}")

    if data_frame.empty or field not in data_frame.columns:
        logger.error(f"Invalid DataFrame input for word cloud: missing '{field}' column")
        return {}

    # Get text data
    _text = list(data_frame[field].dropna().values)
    
    if not _text:
        logger.warning(f"No valid {field} text for word cloud generation")
        return {}
    
    try:
        text = " ".join(_text)
        word_cloud = WordCloud(
            stopwords=STOPWORDS,
            max_words=100,
            max_font_size=90,
            collocations=False
        )
        word_cloud.generate(text)

        # Extract word frequencies
        word_freq = {}
        for (word, freq), _, _, _, _ in word_cloud.layout_:
            word_freq[word] = freq
        
        # Sort by frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Create visualization data
        visualization_data = {
            "wordcloud": {
                "words": [{"text": word, "value": freq} for word, freq in sorted_words]
            },
            "treemap": {
                "children": [{"name": word, "value": freq} for word, freq in sorted_words[:30]]
            }
        }
        
        return visualization_data
    
    except Exception as e:
        logger.error(f"Error generating word cloud data: {e}")
        return {}

def prepare_topic_modeling_data(data_frame: pd.DataFrame, field: str = "body", num_topics: int = 5) -> Dict[str, Any]:
    """Prepare data for topic modeling visualization"""
    # This is a placeholder for topic modeling data preparation
    # In a real implementation, this would generate LDA model data
    
    if data_frame.empty or field not in data_frame.columns:
        logger.error(f"Invalid DataFrame input for topic modeling: missing '{field}' column")
        return {}
    
    # Get text data
    data = [text for text in data_frame[field].dropna().values if text]
    
    if not data:
        logger.warning(f"No valid {field} text for topic modeling")
        return {}
    
    # Clean the text: remove URLs, non-alphabetic characters, extra whitespace, and convert to lower case
    cleaned_data = []
    for text in data:
        cleaned_text = re.sub(r'https?://\S+', '', text)  # remove URLs
        cleaned_text = re.sub(r'[^a-zA-Z\s]', ' ', cleaned_text)  # remove non-alphabetic characters
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # collapse multiple spaces
        cleaned_text = cleaned_text.lower().strip()
        if cleaned_text:
            cleaned_data.append(cleaned_text)
    
    if not cleaned_data:
        logger.warning("No clean text data available for topic modeling")
        return {}
    
    # In a real implementation, we would use gensim for LDA topic modeling
    # For this placeholder, we'll return some mock topic data
    
    # Create mock topic data based on word frequencies
    all_text = " ".join(cleaned_data)
    words = all_text.split()
    word_count = {}
    
    for word in words:
        if len(word) > 3 and word not in STOPWORDS:
            word_count[word] = word_count.get(word, 0) + 1
    
    top_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:100]
    
    # Create mock topics
    topics = []
    chunk_size = len(top_words) // num_topics
    
    for i in range(num_topics):
        start_idx = i * chunk_size
        end_idx = (i + 1) * chunk_size if i < num_topics - 1 else len(top_words)
        
        topic_words = top_words[start_idx:end_idx]
        topic = {
            "id": i,
            "words": [{"text": word, "value": count} for word, count in topic_words],
            "label": ", ".join([word for word, count in topic_words[:5]])
        }
        topics.append(topic)
    
    return {"topics": topics}

def prepare_repository_insights(issues_df: pd.DataFrame) -> Dict[str, Any]:
    """Generate repository insights from issues dataframe"""
    if issues_df.empty:
        return {}
    
    try:
        # Convert datetime strings to datetime objects if needed
        if isinstance(issues_df['created_at'][0], str):
            issues_df['created_at'] = pd.to_datetime(issues_df['created_at'])
        if 'closed_at' in issues_df.columns:
            closed_issues = issues_df[issues_df['closed_at'].notna()]
            if not closed_issues.empty and isinstance(closed_issues['closed_at'].iloc[0], str):
                issues_df.loc[issues_df['closed_at'].notna(), 'closed_at'] = pd.to_datetime(
                    issues_df.loc[issues_df['closed_at'].notna(), 'closed_at']
                )
        
        # Add date column for daily grouping
        issues_df['date'] = issues_df['created_at'].dt.date
        
        # State distribution
        state_counts = issues_df['state'].value_counts().to_dict()
        # Convert NumPy int64 to Python int
        state_counts = {k: int(v) for k, v in state_counts.items()}
        
        # Time to close statistics
        time_to_close_stats = {}
        if 'time_to_close' in issues_df.columns:
            closed_issues = issues_df[issues_df['time_to_close'].notna()]
            if not closed_issues.empty:
                time_to_close_stats = {
                    'mean': float(closed_issues['time_to_close'].mean() / 24),  # Convert to days and to Python float
                    'median': float(closed_issues['time_to_close'].median() / 24),
                    'min': float(closed_issues['time_to_close'].min() / 24),
                    'max': float(closed_issues['time_to_close'].max() / 24)
                }
        
        # Top contributors
        top_contributors = issues_df['user'].value_counts().head(10).to_dict()
        # Convert NumPy int64 to Python int
        top_contributors = {k: int(v) for k, v in top_contributors.items()}
        
        # Comments statistics
        comments_stats = {
            'total': int(issues_df['comments'].sum()),
            'mean': float(issues_df['comments'].mean()),
            'median': float(issues_df['comments'].median()),
            'max': int(issues_df['comments'].max())
        }
        
        # Issues over time
        issues_over_time = issues_df.groupby('date').size().reset_index()
        issues_over_time.columns = ['date', 'count']
        issues_over_time['cumulative'] = issues_over_time['count'].cumsum()
        
        # Convert date objects to strings for JSON serialization
        issues_over_time['date'] = issues_over_time['date'].astype(str)
        
        # Convert NumPy types to Python native types for JSON serialization
        def convert_to_python_types(df):
            for col in df.select_dtypes(include=['int64', 'float64']).columns:
                df[col] = df[col].astype('object')
                df[col] = df[col].apply(lambda x: int(x) if isinstance(x, pd.Int64Dtype) else float(x))
            return df
            
        issues_over_time = convert_to_python_types(issues_over_time)
        
        # Open vs Closed issues over time
        if 'state' in issues_df.columns:
            state_over_time = issues_df.groupby(['date', 'state']).size().unstack(fill_value=0)
            state_over_time = state_over_time.reset_index()
            state_over_time['date'] = state_over_time['date'].astype(str)
            state_over_time = convert_to_python_types(state_over_time)
            state_time_data = state_over_time.to_dict(orient='records')
        else:
            state_time_data = []
        
        # Day of week activity
        if isinstance(issues_df['created_at'][0], pd.Timestamp):
            issues_df['day_of_week'] = issues_df['created_at'].dt.day_name()
            issues_df['hour'] = issues_df['created_at'].dt.hour
            
            day_hour_counts = issues_df.groupby(['day_of_week', 'hour']).size().reset_index()
            day_hour_counts.columns = ['day', 'hour', 'count']
            
            # Ensure all days are in proper order
            days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day_hour_counts['day_idx'] = day_hour_counts['day'].apply(lambda x: days_order.index(x))
            day_hour_counts = day_hour_counts.sort_values(['day_idx', 'hour'])
            day_hour_counts = day_hour_counts.drop('day_idx', axis=1)
            
            day_hour_counts = convert_to_python_types(day_hour_counts)
            activity_heatmap = day_hour_counts.to_dict(orient='records')
        else:
            activity_heatmap = []
        
        return {
            'state_distribution': state_counts,
            'time_to_close_stats': time_to_close_stats,
            'top_contributors': top_contributors,
            'comments_stats': comments_stats,
            'issues_over_time': issues_over_time.to_dict(orient='records'),
            'state_over_time': state_time_data,
            'activity_heatmap': activity_heatmap
        }
    
    except Exception as e:
        logger.error(f"Error generating repository insights: {e}")
        return {}

def prepare_nomic_atlas_topics(data_frame: pd.DataFrame, field: str = "body", api_key: Optional[str] = None, dataset_name: Optional[str] = None) -> Dict[str, Any]:
    """Generate topic data using Nomic Atlas"""
    logger.info(f"Generating Nomic Atlas topic data using {field}")
    
    try:
        # Try to import nomic with a more specific error message
        try:
            import nomic
            from nomic import atlas
            import time
        except ImportError as e:
            logger.error(f"Error importing Nomic: {e}")
            return {"error": f"Nomic package not installed or incompatible: {e}. Please check your dependencies."}
        
        if api_key:
            nomic.login(api_key)
        else:
            # Try to get API key from environment variable
            api_key = os.environ.get("NOMIC_API_KEY")
            if api_key:
                nomic.login(api_key)
            else:
                logger.error("No Nomic API key provided and NOMIC_API_KEY environment variable not set")
                return {"error": "Nomic API key is required"}
        
        # Check if the dataframe is valid and contains the requested field
        if data_frame.empty:
            logger.error("Empty DataFrame provided for Nomic Atlas")
            return {"error": "Empty data provided for topic generation"}
        
        # If the requested field is not in the dataframe, try to use 'body' or 'title' as fallback
        if field not in data_frame.columns:
            logger.warning(f"Requested field '{field}' not found in data. Looking for alternatives.")
            if 'body' in data_frame.columns:
                logger.info("Using 'body' field instead")
                field = 'body'
            elif 'title' in data_frame.columns:
                logger.info("Using 'title' field instead")
                field = 'title'
            else:
                logger.error("No suitable text field found in data")
                return {"error": f"No suitable text field found. Available columns: {', '.join(data_frame.columns)}"}
        
        # Prepare documents for Nomic Atlas
        documents = []
        for i, row in data_frame.iterrows():
            if pd.notna(row.get(field)):
                # Create a clean document with only the necessary fields
                doc = {
                    'id': str(i),  # Ensure id is a string for Nomic 3.4.1
                    field: str(row.get(field, "")) if pd.notna(row.get(field)) else ""
                }
                
                # Add other fields that might be useful
                for col in data_frame.columns:
                    if col != field and col != 'labels' and pd.notna(row.get(col)):
                        try:
                            # Convert to string to ensure compatibility
                            doc[col] = str(row.get(col, ""))
                        except:
                            # Skip fields that can't be converted to string
                            pass
                
                documents.append(doc)
        
        if not documents:
            logger.warning(f"No valid {field} text for Nomic Atlas topic generation")
            return {"error": "No valid text data for topic generation"}
        
        # Create Nomic Atlas project and map
        try:
            # For Nomic 3.4.1, we need to use the correct API
            logger.info(f"Creating Nomic Atlas project with {len(documents)} documents")

            # Generate a dataset name if not provided
            if not dataset_name:
                dataset_name = f'issues_analysis_{int(time.time())}'

            logger.info(f"Using dataset name: {dataset_name}")

            # Create a project (this will load existing dataset if it exists with the same name)
            try:
                project = atlas.map_data(
                    data=documents,
                    id_field='id',
                    indexed_field=field,
                    description=f'Repository Issues Analysis',
                    identifier=dataset_name,
                )
            except json.JSONDecodeError as json_err:
                logger.error(f"JSON decode error when creating Nomic Atlas project: {json_err}")
                return {"error": f"Failed to parse Nomic API response. This may be a temporary API issue. Please try again."}
            except Exception as api_err:
                logger.error(f"Error calling Nomic Atlas API: {api_err}")
                return {"error": f"Nomic API error: {str(api_err)}"}
            
            # Get the map
            atlas_map = project.maps[0]
            
            # Wait for topics to be generated
            # This can take some time for larger datasets
            max_wait_time = 300  # Maximum wait time in seconds (5 minutes)
            wait_interval = 5    # Check every 5 seconds
            start_time = time.time()
            
            logger.info("Waiting for Nomic Atlas topics to be generated...")
            
            # Initialize topic data structure
            topic_data = {
                "topics": [],
                "topic_hierarchy": {},
                "topic_counts": {},
                "topic_groups": {},
                "status": "processing"
            }
            
            # Poll for topic availability
            while time.time() - start_time < max_wait_time:
                try:
                    # Check if topics are available
                    if hasattr(atlas_map, 'topics') and atlas_map.topics is not None:
                        # Check if topics dataframe is available and has data
                        if hasattr(atlas_map.topics, 'df') and atlas_map.topics.df is not None and not atlas_map.topics.df.empty:
                            logger.info("Nomic Atlas topics are now available")
                            
                            # Convert topics dataframe to records
                            topic_data["topics"] = atlas_map.topics.df.to_dict(orient='records')
                            
                            # Get topic hierarchy
                            if hasattr(atlas_map.topics, 'hierarchy') and atlas_map.topics.hierarchy is not None:
                                topic_data["topic_hierarchy"] = atlas_map.topics.hierarchy
                            
                            # Add topic counts for different depths
                            for depth in range(1, 4):  # Depths 1, 2, 3
                                depth_col = f"topic_depth_{depth}"
                                if hasattr(atlas_map.topics, 'df') and depth_col in atlas_map.topics.df.columns:
                                    topic_counts = atlas_map.topics.df[depth_col].value_counts().to_dict()
                                    topic_data["topic_counts"][depth_col] = topic_counts
                            
                            # Add topic groups
                            for depth in range(1, 4):  # Depths 1, 2, 3
                                depth_col = f"topic_depth_{depth}"
                                # Only try to get topic groups if we have topic counts for this depth
                                if depth_col in topic_data["topic_counts"]:
                                    try:
                                        if hasattr(atlas_map.topics, 'group_by_topic'):
                                            topic_groups = atlas_map.topics.group_by_topic(depth)
                                            # Convert tuple keys to strings if needed
                                            if isinstance(topic_groups, dict):
                                                processed_groups = {}
                                                for key, value in topic_groups.items():
                                                    # Convert tuple key to string
                                                    str_key = str(key) if isinstance(key, tuple) else key
                                                    # Convert any tuples in the value to strings
                                                    if isinstance(value, (list, tuple)):
                                                        value = [str(v) if isinstance(v, tuple) else v for v in value]
                                                    processed_groups[str_key] = value
                                                topic_data["topic_groups"][f"depth_{depth}"] = processed_groups
                                            else:
                                                logger.warning(f"Topic groups for depth {depth} is not a dictionary")
                                    except Exception as e:
                                        logger.warning(f"Could not get topic groups for depth {depth}: {e}")
                                        # Add empty groups for this depth to maintain structure
                                        topic_data["topic_groups"][f"depth_{depth}"] = {}
                            
                            # Ensure all data is JSON serializable
                            try:
                                # Test JSON serialization
                                json.dumps(topic_data)
                            except TypeError as e:
                                logger.error(f"Topic data contains non-serializable values: {e}")
                                # Create a clean version with only serializable data
                                clean_data = {
                                    "topics": topic_data.get("topics", []),
                                    "topic_counts": topic_data.get("topic_counts", {}),
                                    "topic_groups": topic_data.get("topic_groups", {}),
                                    "status": "complete",
                                    "warning": "Some topic data was removed due to serialization issues"
                                }
                                topic_data = clean_data
                            
                            # Update status to complete
                            topic_data["status"] = "complete"
                            break
                except Exception as e:
                    # Check if this is the "Dataset is locked" error
                    if "Dataset is locked for state access" in str(e):
                        logger.info(f"Dataset is locked, waiting... ({int(time.time() - start_time)}s elapsed)")
                        # This is expected, just continue waiting
                        pass
                    else:
                        logger.warning(f"Error checking topics: {e}")
                
                # Wait before checking again
                time.sleep(wait_interval)
            
            # Check if we timed out
            if topic_data["status"] == "processing":
                logger.warning("Timed out waiting for Nomic Atlas topics to be generated")
                topic_data["status"] = "timeout"
                topic_data["message"] = "Timed out waiting for topics to be generated. Try again later or with a smaller dataset."
            
            # Final safety check to ensure data is serializable
            try:
                return json.loads(json.dumps(topic_data))  # This ensures we have a fully serializable object
            except Exception as e:
                logger.error(f"Final serialization check failed: {e}")
                return {
                    "status": "error",
                    "message": "Topic data generated but could not be serialized",
                    "topics": [],
                    "topic_counts": {},
                    "topic_groups": {}
                }
        except Exception as e:
            # Check if this is the "Dataset is locked" error
            if "Dataset is locked for state access" in str(e):
                logger.info("Dataset is locked for state access. Returning processing status.")
                return {
                    "status": "processing",
                    "message": "Dataset is being processed by Nomic Atlas. Please try again in a few minutes."
                }
            else:
                logger.error(f"Error in Nomic Atlas processing: {e}")
                return {"error": f"Error in Nomic Atlas processing: {e}"}
    
    except ImportError as e:
        logger.error(f"Error importing Nomic: {e}")
        return {"error": f"Nomic package not installed: {e}"}
    except Exception as e:
        logger.error(f"Error generating Nomic Atlas topic data: {e}")
        return {"error": f"Error generating topic data: {e}"} 