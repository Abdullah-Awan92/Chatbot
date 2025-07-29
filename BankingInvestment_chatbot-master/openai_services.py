import os
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv();

def call_openai(messages):
    client = OpenAI()
    response = client.chat.completions.create(
        temperature=0,
        model="gpt-4o-mini",
        messages=messages
    )
    return response.choices[0].message.content