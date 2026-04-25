import os
import json
from google import genai
from google.genai import types
import requests
from django.conf import settings

def get_client():
    return genai.Client(api_key=settings.GOOGLE_API_KEY)

def generate_skill_analysis(skill_name, description):
    """
    Uses Gemini to generate tags and suggest a skill level.
    """
    if not settings.GOOGLE_API_KEY:
        return {"tags": ["AI-Offline"], "level": "Unknown", "refined_description": description}

    client = get_client()
    prompt = f"""
    Analyze the following skill submission for a platform called NeuroPass.
    NeuroPass helps informal workers in Africa verify their skills.
    
    Skill Name: {skill_name}
    Description: {description}
    
    Provide:
    1. A list of 3-5 relevant tags (e.g., "Web Development", "Carpentry", "Manual Labor").
    2. A suggested skill level (Beginner, Intermediate, Expert).
    3. A slightly refined, more professional version of the description.
    
    Format the output as JSON with keys: 'tags', 'level', 'refined_description'.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"tags": [], "level": "Pending Review", "refined_description": description}

def text_to_speech_yarngpt(text, speaker="Idera", language="english"):
    """
    Uses YarnGPT API for Text-to-Speech (Nigerian accent).
    """
    if not settings.YARNGPT_API_KEY:
        return None
        
    url = f"{settings.YARNGPT_API_URL}/tts"
    headers = {
        "Authorization": f"Bearer {settings.YARNGPT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try primary speaker, fallback to Emma if 500
    for voice in [speaker, "Emma"]:
        payload = {
            "text": text,
            "voice": voice,
            "response_format": "mp3"
        }
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                return resp.content
            print(f"YarnGPT Voice {voice} Error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"YarnGPT Request Error: {e}")
            
    return None

def speech_to_text_yarngpt(audio_content):
    """
    Uses YarnGPT API for Speech-to-Text (Nigerian accent).
    """
    if not settings.YARNGPT_API_KEY:
        return "STT feature requires YarnGPT API Key."
        
    url = f"{settings.YARNGPT_API_URL}/asr"
    headers = {
        "Authorization": f"Bearer {settings.YARNGPT_API_KEY}",
    }
    files = {"file": audio_content}
    
    try:
        resp = requests.post(url, files=files, headers=headers)
        resp.raise_for_status()
        return resp.json().get("text", "")
    except Exception as e:
        print(f"YarnGPT STT Error: {e}")
        return ""
