import google.generativeai as genai
from app.config import settings

class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.initialized = False
        self.model = None
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Use gemini-1.5-flash or gemini-pro (gemini-1.5-flash is fast and recommended)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.initialized = True
                print("Gemini API client initialized successfully.")
            except Exception as e:
                print(f"Failed to initialize Gemini API client: {e}. Falling back to Rule-Based Chat Assistant.")
        else:
            print("Gemini API key is not configured. Falling back to Rule-Based Chat Assistant.")

    async def chat(self, user_message: str, watchlist: list = None, chat_history: list = None) -> str:
        """
        Sends a query to Gemini, injecting the user's watchlist context.
        :param user_message: The message sent by the user.
        :param watchlist: List of dictionaries representing user's watchlist movies.
        :param chat_history: List of previous messages (optional).
        """
        watchlist = watchlist or []
        watchlist_str = ", ".join([f"'{m.get('title')}'" for m in watchlist[:10]]) or "empty"
        
        system_instructions = (
            "You are CineMate, an intelligent, enthusiastic AI movie assistant. "
            "You help users discover movies, discuss plots, actors, and directors. "
            f"The user's current watchlist contains: {watchlist_str}. "
            "Refer to their watchlist when appropriate to personalize suggestions. "
            "Keep your responses concise (under 150 words), engaging, and format movie titles in **bold**."
        )
        
        if self.initialized and self.model:
            try:
                # Combine instructions and message
                # For simplicity, we create a single prompt combining context + user message
                prompt = (
                    f"System Instructions: {system_instructions}\n\n"
                    f"User Message: {user_message}\n"
                    "Assistant Response:"
                )
                
                # Run generate content asynchronously using executor or call it synchronously inside async block
                # Since SDK is block-based, we call it in a standard way
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                print(f"Gemini API execution error: {e}. Using mock chatbot.")
                
        # --- Rule-Based Mock Chatbot Fallback ---
        return self._generate_mock_chat_response(user_message, watchlist)

    def _generate_mock_chat_response(self, message: str, watchlist: list) -> str:
        msg_lower = message.lower()
        watchlist_titles = [m.get('title') for m in watchlist[:5]]
        watchlist_hint = f" Since you have **{watchlist_titles[0]}** in your list, you might love these!" if watchlist_titles else ""
        
        if "action" in msg_lower:
            return (
                f"I love action movies!{watchlist_hint} Here are a few high-octane recommendations you should check out:\n\n"
                "1. **The Dark Knight** (2008) - A gritty masterpiece of superhero realism.\n"
                "2. **Mad Max: Fury Road** (2015) - A non-stop, visual action spectacle.\n"
                "3. **Die Hard** (1988) - The ultimate action classic.\n\n"
                "Do any of these catch your interest, or are you looking for something specific?"
            )
        elif "sci-fi" in msg_lower or "science fiction" in msg_lower or "space" in msg_lower:
            return (
                f"Sci-fi is great for expanding minds!{watchlist_hint} Check these out:\n\n"
                "1. **Interstellar** (2014) - Beautiful space travel and father-daughter bonds.\n"
                "2. **The Matrix** (1999) - A mind-bending look at virtual reality and rebellion.\n"
                "3. **Blade Runner 2049** (2017) - Visually stunning cyberpunk noir.\n\n"
                "Would you like to explore time travel, alien encounters, or dystopian worlds?"
            )
        elif "comedy" in msg_lower or "funny" in msg_lower:
            return (
                "Need a good laugh? I highly recommend these comedies:\n\n"
                "1. **Superbad** (2007) - Hilarious coming-of-age comedy.\n"
                "2. **The Grand Budapest Hotel** (2014) - Quirky, artistic humor by Wes Anderson.\n"
                "3. **Monty Python and the Holy Grail** (1975) - Surreal, timeless comedy.\n\n"
                "Let me know if you prefer romantic comedies or slapstick humor!"
            )
        elif "similar to" in msg_lower or "like" in msg_lower:
            # Try to extract what movie they are asking about
            return (
                "That's a fantastic film! If you like movies of that style, you will definitely enjoy:\n\n"
                "1. **Inception** (2010) - Complex dream heist sequences.\n"
                "2. **Shutter Island** (2010) - Mind-bending psychological thriller.\n"
                "3. **The Prestige** (2006) - Mystery and rivalry between magicians.\n\n"
                "I hope you find these thrilling! Let me know if you want details on any of them."
            )
        else:
            watchlist_text = f" I see you're interested in {', '.join([f'**{t}**' for t in watchlist_titles])}." if watchlist_titles else ""
            return (
                f"Hello! I am CineMate, your AI movie guide.{watchlist_text} "
                "I can recommend films by genre (try asking for **action** or **sci-fi** movies), "
                "find titles similar to your favorites, or search for movies. "
                "How can I help you find your next watch tonight?"
            )

gemini_client = GeminiClient()
