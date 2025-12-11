import os
from google.generativeai import configure, GenerativeModel
import google.generativeai as genai

# Configure API key
if os.getenv("GOOGLE_API_KEY"):
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Define model name for ADK Agent
# ADK Agent expects a model name string, not a GenerativeModel object
gemini_flash_model = 'gemini-2.5-flash'
