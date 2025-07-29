import os
import shutil
import json
from dotenv import load_dotenv

# Updated imports to address deprecation warnings
from langchain.vectorstores import Chroma 
from langchain.embeddings import OpenAIEmbeddings 
from langchain.schema import Document

load_dotenv()

def load_chunks(docs):
    embeddings = OpenAIEmbeddings(
        model='text-embedding-ada-002'
    )
    if os.path.exists("./chromaDB"):
        shutil.rmtree("./chromaDB")
        print("Existing ChromaDB directory removed.")

    vectorstore = Chroma(
        embedding_function=embeddings,
        collection_name="mutualfundscollection",
        persist_directory="./chromaDB"
    )

    vectorstore.add_documents(docs)
    vectorstore.persist()
    print(f"Documents added to ChromaDB: {len(docs)} documents")

def load_mutual_fund_data():
    with open('./mutual_funds_data.json', 'r') as f:
        data = json.load(f)

    # Convert each mutual fund dictionary to a Document object
    docs = [Document(page_content=str(fund), metadata={}) for fund in data]

    load_chunks(docs)

def retriever(question: str):
    embeddings = OpenAIEmbeddings(
        model='text-embedding-ada-002'
    )
    vectorstore = Chroma(
        embedding_function=embeddings,
        collection_name="mutualfundscollection",
        persist_directory="./chromaDB"
    )

    # Create a retriever from the vectorstore
    retriever = vectorstore.as_retriever()

    # Retrieve documents relevant to the question
    docs = retriever.get_relevant_documents(question)
    return docs

if __name__ == "__main__":
    load_mutual_fund_data()
