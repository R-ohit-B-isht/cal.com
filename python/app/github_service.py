from app.devin_service import trigger_devin_session
from flask import current_app
from typing import Optional, Dict
import requests
from datetime import datetime
from pymongo import MongoClient

class GitHubAPI:
    def __init__(self, api_token: str):
        
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {api_token}",
        }
    
    def add_comment(self, issue_url: str, body: str) -> Optional[Dict]:
        
        url = f"{issue_url}/comments"
        
        try:
            response = requests.post(
                url,
                headers=self.headers,
                json={"body": body}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error adding comment: {e}")
            return None

def handle_github_webhook(data):
    action = data.get("action","")
    issue_url = data.get("issue", {}).get("url", "")
    comment_body = data.get("comment", {}).get("body", "")
    issue_title = data.get("issue", {}).get("title", "")
    issue_body = data.get("issue", {}).get("body", "")
    issue=issue_title+'\n'+issue_body
    filters = current_app.config["FILTERS"]["github"]

    if filters["trigger_mention"] in comment_body and action == "created" :
        api_token = current_app.config["GITHUB"]["api_token"]
        github_client = GitHubAPI(api_token)
        
        prompt = filters["prompt_template"].format(url=issue_url,comment=comment_body,issue=issue)
        
        devin_response = trigger_devin_session(prompt)
        comment = "Devin Session Link : " + devin_response.get("url","🥲 Sorry No URL generated")
        if not github_client.add_comment(issue_url, comment):
            print("Failed to post comment to GitHub")
        
        # Create task in MongoDB
        client = MongoClient(current_app.config["MONGODB_URI"])
        db = client[current_app.config["MONGODB_DB"]]
        
        new_task = {
            "title": issue_title,
            "description": issue_body,
            "status": "To-Do",
            "integration": "github",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "devinSessionUrl": devin_response.get("url"),
            "sourceUrl": issue_url
        }
        
        db.tasks.insert_one(new_task)
        client.close()
        
        return devin_response
    return {"message": "No action triggered for GitHub."}
