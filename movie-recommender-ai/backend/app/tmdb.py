

import httpx
import numpy as np
from app.config import settings

# Curated Unsplash images for movie genres to ensure beautiful posters in mock mode
GENRE_POSTERS = {
    "action": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=60", # Dark action/explosion
    "adventure": "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=500&auto=format&fit=crop&q=60", # Mountains/backpacking
    "animation": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60", # Colorful abstract
    "children": "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=500&auto=format&fit=crop&q=60", # Cute teddy/balloon
    "comedy": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=60", # Theatre seats/popcorn
    "crime": "https://images.unsplash.com/photo-1453733190148-c44698c265f8?w=500&auto=format&fit=crop&q=60", # Detective/foggy street
    "documentary": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&auto=format&fit=crop&q=60", # Projector light
    "drama": "https://images.unsplash.com/photo-1478812954026-9c750f0e89fc?w=500&auto=format&fit=crop&q=60", # Moody face silhouette
    "fantasy": "https://images.unsplash.com/photo-1519074069444-1ba4e6663104?w=500&auto=format&fit=crop&q=60", # Magical forest
    "film-noir": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60", # Rain coat shadow
    "horror": "https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=500&auto=format&fit=crop&q=60", # Spooky house/mist
    "musical": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=60", # Stage lights/concert
    "mystery": "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=500&auto=format&fit=crop&q=60", # Foggy bridge
    "romance": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=60", # Holding hands
    "sci-fi": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60", # Space/cyberpunk
    "thriller": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=60", # Running shadow/alley
    "war": "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&auto=format&fit=crop&q=60", # Military helmet/sunset
    "western": "https://images.unsplash.com/photo-1533240332313-0db49b439ad3?w=500&auto=format&fit=crop&q=60", # Desert/cactus/cowboy hat
    "default": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60" # Cinema hall
}

MOCK_DETAILS_DATABASE = {
    1: {
        "overview": "A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.",
        "runtime": 81,
        "imdb_rating": 8.3,
        "trailer_url": "https://www.youtube.com/embed/CxwJrzEdw1U",
        "cast": "Tom Hanks, Tim Allen, Don Rickles"
    },
    2: {
        "overview": "When two kids find and play a magical board game, they release a man trapped in it for decades - and a host of dangers that can only be stopped by finishing the game.",
        "runtime": 104,
        "imdb_rating": 7.0,
        "trailer_url": "https://www.youtube.com/embed/eTjHssT5yqg",
        "cast": "Robin Williams, Kirsten Dunst, Bonnie Hunt"
    },
    3: {
        "overview": "John and Max resolve their differences with their new neighbor, a lovely Italian woman who opens a restaurant in their town.",
        "runtime": 101,
        "imdb_rating": 6.7,
        "trailer_url": "https://www.youtube.com/embed/fA3D7mZ3uK4",
        "cast": "Walter Matthau, Jack Lemmon, Sophia Loren"
    },
    47: {
        "overview": "Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motifs.",
        "runtime": 127,
        "imdb_rating": 8.6,
        "trailer_url": "https://www.youtube.com/embed/znmZoVkCjI0",
        "cast": "Morgan Freeman, Brad Pitt, Kevin Spacey"
    },
    50: {
        "overview": "A sole survivor tells of the twisty events leading up to a horrific gun battle on a boat, which began when five criminals met at a seemingly random police lineup.",
        "runtime": 106,
        "imdb_rating": 8.5,
        "trailer_url": "https://www.youtube.com/embed/9MjV47Y074E",
        "cast": "Kevin Spacey, Gabriel Byrne, Chazz Palminteri"
    },
    110: {
        "overview": "Scottish warrior William Wallace leads his countrymen in a rebellion to free his homeland from the tyranny of King Edward I of England.",
        "runtime": 178,
        "imdb_rating": 8.3,
        "trailer_url": "https://www.youtube.com/embed/1NJO0xWg5EM",
        "cast": "Mel Gibson, Sophie Marceau, Patrick McGoohan"
    },
    260: {
        "overview": "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station, while also attempting to rescue Princess Leia from the mysterious Darth Vader.",
        "runtime": 121,
        "imdb_rating": 8.6,
        "trailer_url": "https://www.youtube.com/embed/1g3_CFmnU7k",
        "cast": "Mark Hamill, Harrison Ford, Carrie Fisher"
    },
    318: {
        "overview": "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
        "runtime": 142,
        "imdb_rating": 9.3,
        "trailer_url": "https://www.youtube.com/embed/PLl99DlL6b4",
        "cast": "Tim Robbins, Morgan Freeman, Bob Gunton"
    },
    593: {
        "overview": "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer, a madman who skins his victims.",
        "runtime": 118,
        "imdb_rating": 8.6,
        "trailer_url": "https://www.youtube.com/embed/W6Mm8Sbe__o",
        "cast": "Jodie Foster, Anthony Hopkins, Lawrence A. Bonney"
    },
    2571: {
        "overview": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
        "runtime": 136,
        "imdb_rating": 8.7,
        "trailer_url": "https://www.youtube.com/embed/vKQi3bBA1y8",
        "cast": "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss"
    },
    7153: {
        "overview": "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.",
        "runtime": 201,
        "imdb_rating": 9.0,
        "trailer_url": "https://www.youtube.com/embed/r5X-hFf6Bwo",
        "cast": "Elijah Wood, Viggo Mortensen, Ian McKellen"
    },
    58559: {
        "overview": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        "runtime": 152,
        "imdb_rating": 9.0,
        "trailer_url": "https://www.youtube.com/embed/LDG9bisJEaI",
        "cast": "Christian Bale, Heath Ledger, Aaron Eckhart"
    },
    79132: {
        "overview": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project.",
        "runtime": 148,
        "imdb_rating": 8.8,
        "trailer_url": "https://www.youtube.com/embed/YoHD9XEInc0",
        "cast": "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page"
    },
    109487: {
        "overview": "When Earth becomes uninhabitable, a team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
        "runtime": 169,
        "imdb_rating": 8.7,
        "trailer_url": "https://www.youtube.com/embed/zSWdZVtXT7E",
        "cast": "Matthew McConaughey, Anne Hathaway, Jessica Chastain"
    }
}

class TMDBClient:
    def __init__(self):
        self.tmdb_key = settings.TMDB_API_KEY
        self.omdb_key = settings.OMDB_API_KEY
        self.has_keys = bool(self.tmdb_key)

    async def fetch_metadata(self, movie_id: int, title: str, genres_list: list = None, tmdb_id: int = None, imdb_id: int = None) -> dict:
        """
        Fetches movie details from TMDB / OMDb. Fallback to mock generation if keys are missing.
        """
        # If API keys are set, try fetching real data
        if self.has_keys:
            try:
                # Use tmdb_id if available, otherwise search by title
                async with httpx.AsyncClient(timeout=5.0) as client:
                    data = {}
                    
                    # 1. Resolve TMDB details
                    if tmdb_id:
                        tmdb_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={self.tmdb_key}&append_to_response=videos,credits"
                        r = await client.get(tmdb_url)
                        if r.status_code == 200:
                            data = r.json()
                            
                    if not data: # Search by Title
                        search_url = f"https://api.themoviedb.org/3/search/movie?api_key={self.tmdb_key}&query={httpx.URLEscape(title)}"
                        r = await client.get(search_url)
                        if r.status_code == 200:
                            results = r.json().get("results", [])
                            if results:
                                first_id = results[0]["id"]
                                details_url = f"https://api.themoviedb.org/3/movie/{first_id}?api_key={self.tmdb_key}&append_to_response=videos,credits"
                                r_det = await client.get(details_url)
                                if r_det.status_code == 200:
                                    data = r_det.json()

                    if data:
                        # Extract fields
                        poster_path = data.get("poster_path")
                        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                        
                        overview = data.get("overview", "")
                        runtime = data.get("runtime", 120)
                        rating = data.get("vote_average", 7.0)
                        
                        # Get trailer URL
                        videos = data.get("videos", {}).get("results", [])
                        trailer_url = None
                        for v in videos:
                            if v.get("type") == "Trailer" and v.get("site") == "YouTube":
                                trailer_url = f"https://www.youtube.com/embed/{v.get('key')}"
                                break
                        if not trailer_url and videos:
                            trailer_url = f"https://www.youtube.com/embed/{videos[0].get('key')}"
                            
                        # Cast
                        cast_members = data.get("credits", {}).get("cast", [])[:3]
                        cast = ", ".join([c.get("name", "") for c in cast_members])
                        
                        return {
                            "poster_url": poster_url or self._get_fallback_poster(genres_list),
                            "overview": overview,
                            "runtime": runtime,
                            "imdb_rating": rating,
                            "trailer_url": trailer_url,
                            "cast": cast or "N/A"
                        }
            except Exception as e:
                print(f"Error fetching from TMDB for {title}: {e}. Falling back to Mock.")

        # --- High Fidelity Mock Fallback ---
        return self._generate_mock_metadata(movie_id, title, genres_list)

    def _get_fallback_poster(self, genres_list: list) -> str:
        if not genres_list:
            return GENRE_POSTERS["default"]
        # Find matching genre poster
        for g in genres_list:
            g_low = g.lower()
            if g_low in GENRE_POSTERS:
                return GENRE_POSTERS[g_low]
        return GENRE_POSTERS["default"]

    def _generate_mock_metadata(self, movie_id: int, title: str, genres_list: list = None) -> dict:
        """
        Generates simulated movie details.
        """
        # Check if we have hardcoded details for this famous MovieLens ID
        if movie_id in MOCK_DETAILS_DATABASE:
            details = MOCK_DETAILS_DATABASE[movie_id].copy()
            details["poster_url"] = self._get_fallback_poster(genres_list)
            return details
            
        # Dynamic generation for missing ones
        genres_str = ", ".join(genres_list) if genres_list else "Drama"
        overview = f"A captivating {genres_str} film that explores high-stakes drama and character evolution, delivering a memorable cinematic experience centered around '{title}'."
        
        # Consistent pseudo-random details based on movie_id
        np.random.seed(movie_id)
        runtime = int(np.random.randint(85, 175))
        rating = round(float(np.random.uniform(5.5, 8.9)), 1)
        
        # standard fallback trailer (interstellar trailer as a beautiful video fallback)
        trailer_url = "https://www.youtube.com/embed/zSWdZVtXT7E"
        
        cast_options = ["Michael Caine", "Jessica Chastain", "Liam Neeson", "Scarlett Johansson", "Robert Downey Jr.", "Florence Pugh", "Cillian Murphy", "Emma Stone"]
        cast = ", ".join(list(np.random.choice(cast_options, size=3, replace=False)))
        
        return {
            "poster_url": self._get_fallback_poster(genres_list),
            "overview": overview,
            "runtime": runtime,
            "imdb_rating": rating,
            "trailer_url": trailer_url,
            "cast": cast
        }

tmdb_client = TMDBClient()
