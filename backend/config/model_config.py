import os
from google.generativeai import configure, GenerativeModel
import google.generativeai as genai

# Configure API key - support both GOOGLE_API_KEY and GEMINI_API_KEY
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if api_key:
    # Ensure GOOGLE_API_KEY is set in environment as well for other libraries
    os.environ["GOOGLE_API_KEY"] = api_key.strip('"')
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# Define model name for ADK Agent
# ADK Agent expects a model name string, not a GenerativeModel object
gemini_flash_model = 'gemini-2.5-flash'
