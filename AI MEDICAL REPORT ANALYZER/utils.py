def simple_summary(text):
    sentences = text.split(".")
    return ". ".join(sentences[:4]) + "..."
