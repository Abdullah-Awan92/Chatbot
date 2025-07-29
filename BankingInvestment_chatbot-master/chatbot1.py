import os
from chromadb_services import retriever, load_mutual_fund_data
from my_mongo import save_chat, fetch_chat
from langchain import PromptTemplate, LLMChain
from langchain.chat_models import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# Ensure mutual fund data is loaded
if not os.path.exists("./chromaDB"):
    load_mutual_fund_data()

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def mutual_fund_bot(user_id):
    llm = ChatOpenAI(model='gpt-4o-mini')
    template = """
    You are an expert mutual fund advisor. Using the following data:
    {data}

    Provide a detailed answer to the user's question:
    {question}
    """
    prompt = PromptTemplate(template=template, input_variables=["data", "question"])

    while True:
        question = input("Ask a Question (or type 'exit' to quit): ")
        if question.lower() == "exit":
            break

        # Fetch chat history from MongoDB
        history = fetch_chat(user_id)
        clean_history = []

        if len(history) > 0:
            for item in history:
                if item['role'] == 'assistant':
                    role = 'assistant'
                else:
                    role = 'user'
                clean_history.append(
                    {
                        "role": role,
                        "content": item["content"]
                    }
                )

        # Retrieve relevant documents
        docs = retriever(question)
        combined_data = format_docs(docs)

        # Prepare the prompt
        formatted_prompt = prompt.format(data=combined_data, question=question)

        # Combine chat history and new question
        messages = clean_history + [{"role": "user", "content": formatted_prompt}]

        # Get response from the LLM
        response = llm(messages)

        print("\nAssistant:", response.content)
        print("\n")

        # Save chat history to MongoDB
        user_chat = {"user_id": user_id, "role": "user", "content": question}
        save_chat(user_chat)
        ai_chat = {"user_id": user_id, "role": "assistant", "content": response.content}
        save_chat(ai_chat)

if __name__ == "__main__":
    mutual_fund_bot(user_id="faizan")
    