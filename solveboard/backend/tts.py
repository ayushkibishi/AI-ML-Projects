import os
import hashlib
from gtts import gTTS

AUDIO_DIR = "uploads/audio"

def generate_speech(text: str) -> str:
    """
    Converts text to speech, saves it in a static directory,
    and returns the relative path of the MP3 file.
    Uses MD5 of the text to cache files and avoid redundant TTS API calls.
    """
    os.makedirs(AUDIO_DIR, exist_ok=True)
    
    # Generate unique filename based on hash of text to cache files
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    filename = f"{text_hash}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    if not os.path.exists(filepath):
        try:
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(filepath)
        except Exception as e:
            print(f"Error generating TTS: {e}")
            return ""
            
    # Return relative URL path
    return f"/static/audio/{filename}"
