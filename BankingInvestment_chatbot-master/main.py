# main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llm import mutual_fund_bot
from my_mongo import save_chat, fetch_chat

app = FastAPI()

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request and Response models
class ChatRequest(BaseModel):
    message: str
    user_id: str

class ChatResponse(BaseModel):
    response: str

class HistoryResponse(BaseModel):
    user_id: str
    role: str
    content: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_message = request.message
    user_id = request.user_id
    
    # Process the message using your chatbot
    bot_response = mutual_fund_bot(user_message, user_id)
    
    # Save user message and bot response to the database
    save_chat({"user_id": user_id, "role": "user", "content": user_message})
    save_chat({"user_id": user_id, "role": "assistant", "content": bot_response})
    
    return ChatResponse(response=bot_response)

@app.get("/chat_history", response_model=list[HistoryResponse])
async def chat_history(user_id: str):
    history = fetch_chat(user_id)
    return history

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
