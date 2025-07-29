import os
from openai_services import call_openai
from chromadb_services import retriever, load_mutual_fund_data
from my_mongo import save_chat, fetch_chat

PROMPT = """
You are an expert mutual fund advisor. Your task is to recommend the best mutual fund investment based on the user's preferences and the given data.

If the user's investment goals and preferences are not provided, you should politely ask the user to specify their investment goals, such as desired risk level, return expectations, investment horizon, and any other relevant criteria.

Consider the following criteria when making a recommendation:
- Risk Profile (e.g., High, Medium, Low)
- Asset Under Management (e.g., high AUM indicates stability)
- Net Asset Value (NAV) (e.g., high NAV indicates strong growth)
- Return Month to Date (e.g., for short-term gains)
- Return Year to Date (e.g., for long-term gains)
- Management Fee (e.g., lower fees are preferred for cost-conscious users)
- Total Expense Ratio (e.g., lower ratios are better for maximizing returns)
- Price Mechanism (e.g., Forward, Backward)

Once the user provides their investment goals, analyze the data and recommend the most suitable mutual fund. 
If necessary, ask follow-up questions to clarify their preferences.

Always ensure to have a friendly and engaging conversation, guiding the user to make informed investment decisions.
"""

# Load data if ChromaDB does not exist
if not os.path.exists("./chromaDB"):
    print("ChromaDB not found. Loading mutual fund data.")
    load_mutual_fund_data()
else:
    print("ChromaDB already exists. Skipping data loading.")

def mutual_fund_bot(question, user_id):
    # Fetch chat history
    history = fetch_chat(user_id)
    clean_history = []
    if len(history) > 0:
        for item in history:
            clean_history.append(
                {
                    "role": item["role"],
                    "content": item["content"]
                }
            )

    # Retrieve relevant documents
    docs = retriever(question)
    print(f"Number of documents retrieved: {len(docs)}")
    if len(docs) == 0:
        print("No documents retrieved from ChromaDB.")
    texts = []
    for doc in docs:
        texts.append(doc.page_content)
    combine_text = "\n\n".join(texts)

    # Construct messages
    messages = [
        {"role": "system", "content": PROMPT},
        # Include the mutual fund data in the system context
        {"role": "system", "content": f"Here is the mutual fund data you can use:\n{combine_text}"}
    ]
    messages.extend(clean_history)
    messages.append({"role": "user", "content": question})

    # Call OpenAI API
    response = call_openai(messages)

    # Save chat history
    user_chat = {"user_id": user_id, "role": "user", "content": question}
    save_chat(user_chat)
    ai_chat = {"user_id": user_id, "role": "assistant", "content": response}
    save_chat(ai_chat)

    return response

if __name__ == "__main__":
    while True:
        question = input("Ask a Question (or type 'exit' to quit): ")
        if question.lower() == "exit":
            break
        response = mutual_fund_bot(question, "faizan")
        print("\nAssistant:", response, "\n")

#  change 