import os
import re

class SentimentAnalyzer:
    def __init__(self):
        self.pipeline = None
        self.initialized = False
        
        # We will attempt to load the HuggingFace transformers model.
        # DistilBERT SST-2 is fast, lightweight (~260MB), and accurate.
        try:
            from transformers import pipeline
            print("Attempting to load HuggingFace Transformers pipeline for sentiment analysis...")
            # Specify framework='tf' to use TensorFlow
            self.pipeline = pipeline("sentiment-analysis", 
                                     model="distilbert-base-uncased-finetuned-sst-2-english", 
                                     framework="tf")
            self.initialized = True
            print("HuggingFace Transformers model loaded successfully.")
        except Exception as e:
            print(f"Transformers load failed or skipped: {e}. Falling back to lexicon-based sentiment analysis.")
            self.initialized = False

    def analyze(self, text: str) -> dict:
        """
        Analyzes the sentiment of a movie review text.
        Returns:
            dict: { "positive": float, "negative": float, "neutral": float, "sentiment": str }
        """
        if not text or not text.strip():
            return {"positive": 0.0, "negative": 0.0, "neutral": 1.0, "sentiment": "neutral"}
            
        if self.initialized and self.pipeline is not None:
            try:
                # Run the model
                results = self.pipeline(text[:512]) # limit input length to fit BERT max token limit
                result = results[0]
                
                label = result['label'] # 'POSITIVE' or 'NEGATIVE'
                score = float(result['score']) # confidence score (usually close to 1)
                
                # To extract positive, negative, and neutral:
                # DistilBERT is binary, but we can model a neutral score by measuring how close the classification is to 50/50.
                # If confidence is low, neutral score is higher.
                if label == 'POSITIVE':
                    positive = score
                    negative = 1.0 - score
                else:
                    negative = score
                    positive = 1.0 - score
                    
                # Introduce a neutral component based on boundary margin
                # e.g., if positive score is between 0.4 and 0.6, we shift some weight to neutral
                difference = abs(positive - negative)
                if difference < 0.3:
                    neutral = 1.0 - difference
                    # Normalize scores
                    total = positive + negative + neutral
                    positive /= total
                    negative /= total
                    neutral /= total
                else:
                    neutral = 0.0
                    
                # Determine overall label
                if positive > negative and positive > neutral:
                    sentiment = "positive"
                elif negative > positive and negative > neutral:
                    sentiment = "negative"
                else:
                    sentiment = "neutral"
                    
                return {
                    "positive": round(positive, 4),
                    "negative": round(negative, 4),
                    "neutral": round(neutral, 4),
                    "sentiment": sentiment,
                    "engine": "Transformers (BERT)"
                }
            except Exception as e:
                print(f"Error during Transformers inference: {e}. Using fallback analyzer.")
                
        return self._lexicon_fallback(text)

    def _lexicon_fallback(self, text: str) -> dict:
        """
        Fast lexicon-based sentiment analyzer.
        Matches positive and negative emotional words.
        """
        text = text.lower()
        
        positive_words = {
            'great', 'good', 'excellent', 'amazing', 'love', 'loved', 'beautiful', 'wonderful', 
            'best', 'favorite', 'awesome', 'masterpiece', 'brilliant', 'entertaining', 'classic', 
            'nice', 'fun', 'enjoyed', 'must-watch', 'fantastic', 'superb', 'perfect', 'stellar'
        }
        
        negative_words = {
            'bad', 'worst', 'terrible', 'awful', 'hate', 'hated', 'boring', 'waste', 'disappointing', 
            'disappointed', 'dreadful', 'stupid', 'crap', 'garbage', 'poor', 'lame', 'sucked', 
            'rubbish', 'fail', 'predictable', 'dull', 'annoying', 'horrible', 'flat', 'cliche'
        }
        
        # Tokenize simply
        words = re.findall(r'\b\w+\b', text)
        if not words:
            return {"positive": 0.0, "negative": 0.0, "neutral": 1.0, "sentiment": "neutral", "engine": "Lexicon (Fallback)"}
            
        pos_count = sum(1 for w in words if w in positive_words)
        neg_count = sum(1 for w in words if w in negative_words)
        
        total_matched = pos_count + neg_count
        total_words = len(words)
        
        if total_matched == 0:
            return {"positive": 0.1, "negative": 0.1, "neutral": 0.8, "sentiment": "neutral", "engine": "Lexicon (Fallback)"}
            
        # Sentiment calculation
        pos_ratio = pos_count / total_matched
        neg_ratio = neg_count / total_matched
        
        # Calculate how opinionated the text is (higher ratio of emotion words to total words = less neutral)
        intensity = min(1.0, (total_matched / total_words) * 5) # Scale factor
        
        neutral = 1.0 - intensity
        positive = pos_ratio * intensity
        negative = neg_ratio * intensity
        
        # Normalize
        total = positive + negative + neutral
        positive /= total
        negative /= total
        neutral /= total
        
        if positive > negative + 0.1:
            sentiment = "positive"
        elif negative > positive + 0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
            
        return {
            "positive": round(positive, 4),
            "negative": round(negative, 4),
            "neutral": round(neutral, 4),
            "sentiment": sentiment,
            "engine": "Lexicon (Fallback)"
        }

if __name__ == "__main__":
    analyzer = SentimentAnalyzer()
    print("Testing 'This is the best movie I have ever seen!'")
    print(analyzer.analyze("This is the best movie I have ever seen!"))
    print("\nTesting 'I absolutely hated this waste of time, complete garbage.'")
    print(analyzer.analyze("I absolutely hated this waste of time, complete garbage."))
    print("\nTesting 'It was an okay movie, nothing special but not bad.'")
    print(analyzer.analyze("It was an okay movie, nothing special but not bad."))
