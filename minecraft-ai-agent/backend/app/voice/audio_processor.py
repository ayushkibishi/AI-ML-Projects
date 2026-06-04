import os
import logging
from gtts import gTTS
from backend.app.config import settings

logger = logging.getLogger("Voice")

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False
    logger.warning("SpeechRecognition package not available. Speech to Text is restricted to web speech APIs.")

class AudioProcessor:
    def __init__(self):
        self.tts_dir = "datasets/voice/cache"
        os.makedirs(self.tts_dir, exist_ok=True)
        
        # Initialize pyttsx3 offline TTS (optional fallback)
        self.offline_engine = None
        try:
            import pyttsx3
            self.offline_engine = pyttsx3.init()
            self.offline_engine.setProperty('rate', settings.VOICE_RATE)
            self.offline_engine.setProperty('volume', settings.VOICE_VOLUME)
            logger.info("pyttsx3 offline TTS engine initialized.")
        except Exception as e:
            logger.warning(f"Could not load pyttsx3 offline TTS engine: {e}")

    def text_to_speech(self, text: str, filename: str = "speech.mp3") -> str:
        """
        Converts text to an audio file. First tries gTTS (online, human-like voice)
        and falls back to pyttsx3 offline synthesizer.
        Returns the absolute file path of the generated audio.
        """
        output_path = os.path.join(self.tts_dir, filename)
        
        # Try gTTS first (higher quality voice)
        try:
            tts = gTTS(text=text, lang='en')
            tts.save(output_path)
            logger.info(f"gTTS successfully generated speech file at {output_path}")
            return output_path
        except Exception as e:
            logger.warning(f"gTTS generation failed: {e}. Attempting offline pyttsx3 synthesis...")
            
        # Fallback to offline synthesis
        if self.offline_engine:
            try:
                # pyttsx3 can write to file on Windows
                self.offline_engine.save_to_file(text, output_path)
                self.offline_engine.runAndWait()
                logger.info(f"pyttsx3 offline TTS successfully generated speech file at {output_path}")
                return output_path
            except Exception as e2:
                logger.error(f"pyttsx3 synthesis failed: {e2}")
                
        # If all else fails, create an empty dummy file or return none
        with open(output_path, "wb") as f:
            f.write(b"")
        return output_path

    def transcribe_audio_file(self, audio_file_path: str) -> str:
        """
        Transcribes an uploaded audio file using SpeechRecognition.
        """
        if not HAS_SR:
            return "Error: SpeechRecognition dependencies are not configured on the backend."
            
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(audio_file_path) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                logger.info(f"Transcribed audio file: '{text}'")
                return text
        except Exception as e:
            logger.error(f"Speech recognition transcription failed: {e}")
            return f"Error: Could not transcribe audio. ({e})"
