# my_mongo.py
from pymongo import MongoClient
import os

# MongoDB connection details
# MONGO_URI = "mongodb://localhost:27017/"
MONGO_URI = os.getenv("MONGO_URI")


DATABASE_NAME = "mutual_fund_chatbot"     # Name of your database
COLLECTION_NAME = "chat_history"          # Name of your collection

# Initialize MongoDB client and specify database and collection
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

def save_chat(chat_data):
    """
    Saves a chat message to MongoDB.

    Parameters:
    - chat_data (dict): A dictionary containing 'user_id', 'role', and 'content'.
    """
    collection.insert_one(chat_data)
    print(f"Chat saved to MongoDB: {chat_data}")

def fetch_chat(user_id):
    """
    Fetches chat history for a specific user from MongoDB.

    Parameters:
    - user_id (str): The user's unique identifier.

    Returns:
    - List[dict]: A list of chat messages.
    """
    chats = list(collection.find({"user_id": user_id}, {"_id": 0}))
    return chats

def clear_chat_history(user_id=None):
    """
    Clears chat history from MongoDB.

    Parameters:
    - user_id (str, optional): If provided, clears history for the specific user.
    If None, clears the entire collection.
    """
    if user_id:
        collection.delete_many({"user_id": user_id})
        print(f"Cleared chat history for user: {user_id}")
    else:
        collection.delete_many({})
        print("Cleared entire chat history.")