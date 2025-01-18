import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "devin_tasks")
    
    DEVIN_API_URL = os.getenv("DEVIN_API_URL", "https://api.devin.ai/v1/sessions")
    DEVIN_API_KEY = os.getenv("DEVIN_API_KEY")
    
    JIRA = {
       "domain": os.getenv("JIRA_DOMAIN", "your-domain.atlassian.net"),
       "email": os.getenv("JIRA_EMAIL"),
       "api_token": os.getenv("JIRA_API_TOKEN")
    }
    
    LINEAR = {
        "api_token": os.getenv("LINEAR_API_TOKEN")
    }
    
    GITHUB = {
        "api_token": os.getenv("GITHUB_TOKEN")
    }

    # Integration filters
    FILTERS = {
        "jira": {
            "trigger_mention": "@devin",
            "prompt_template": """
            User Prompt: {comment}
            Issue Summary: {issue_summary}
            Issue Description: {issue_description}
            """,
        },
        "linear": {
            "trigger_mention": "@devin",
            "prompt_template": """
            User Prompt: {comment}
            Issue Title: {issue_title}
            Issue Description: {issue_description}
            """,
        },
        "github": {
            "trigger_mention": "@devin-ai-integration",
            "prompt_template": """
            Issue URL: {url}
            User Prompt: {comment}
            Issue: {issue}
            """,
        },
    }
