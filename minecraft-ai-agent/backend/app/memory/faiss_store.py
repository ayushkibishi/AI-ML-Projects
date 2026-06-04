import os
import json
import numpy as np
from typing import Dict, List, Any, Optional
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

class FAISSMemoryStore:
    def __init__(self, persist_directory: str = "datasets/memory/faiss_db"):
        self.persist_directory = persist_directory
        # Use a lightweight sentence-transformer embedding model that runs entirely locally
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Load or initialize vector store
        self.vector_store = self._load_or_create_db()
        
    def _load_or_create_db(self) -> FAISS:
        if os.path.exists(os.path.join(self.persist_directory, "index.faiss")):
            print(f"Loading existing FAISS index from {self.persist_directory}")
            try:
                return FAISS.load_local(
                    self.persist_directory, 
                    self.embeddings, 
                    allow_dangerous_deserialization=True  # Required for loading local pickle files
                )
            except Exception as e:
                print(f"Error loading FAISS database: {e}. Creating new database...")
                
        # Initialize an empty vector DB with a dummy placeholder document
        placeholder_doc = Document(
            page_content="Initial memory store marker",
            metadata={"type": "system", "label": "marker", "x": 0, "y": 0, "z": 0}
        )
        vector_store = FAISS.from_documents([placeholder_doc], self.embeddings)
        os.makedirs(self.persist_directory, exist_ok=True)
        vector_store.save_local(self.persist_directory)
        return vector_store

    def save_memory(self, label: str, x: float, y: float, z: float, description: str, category: str = "location"):
        """
        Saves a location memory with coordinates and details into the vector store.
        """
        # Formulate document text representing this memory
        content = f"Memory: {label}. Category: {category}. Description: {description} located at coordinates X={x:.1f}, Y={y:.1f}, Z={z:.1f}"
        
        metadata = {
            "label": label,
            "category": category,
            "x": float(x),
            "y": float(y),
            "z": float(z),
            "description": description
        }
        
        doc = Document(page_content=content, metadata=metadata)
        self.vector_store.add_documents([doc])
        self.vector_store.save_local(self.persist_directory)
        print(f"Saved memory to FAISS: {label} @ [{x:.1f}, {y:.1f}, {z:.1f}] - {description}")

    def query_memory(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """
        Queries FAISS for memory matches related to the text string.
        """
        results = self.vector_store.similarity_search(query, k=k)
        memories = []
        for doc in results:
            # Skip system placeholder markers
            if doc.metadata.get("type") == "system":
                continue
            memories.append({
                "label": doc.metadata.get("label"),
                "category": doc.metadata.get("category"),
                "x": doc.metadata.get("x"),
                "y": doc.metadata.get("y"),
                "z": doc.metadata.get("z"),
                "description": doc.metadata.get("description"),
                "distance": 0.0,  # similarity metrics can be extracted if needed
                "summary": doc.page_content
            })
        return memories

    def get_all_memories(self) -> List[Dict[str, Any]]:
        """
        Fetches all stored memories by scanning the document store.
        """
        memories = []
        doc_store = self.vector_store.docstore._dict
        for doc_id, doc in doc_store.items():
            if doc.metadata.get("type") == "system":
                continue
            memories.append({
                "label": doc.metadata.get("label"),
                "category": doc.metadata.get("category"),
                "x": doc.metadata.get("x"),
                "y": doc.metadata.get("y"),
                "z": doc.metadata.get("z"),
                "description": doc.metadata.get("description"),
                "summary": doc.page_content
            })
        return memories
