import json
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import umap
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from collections import Counter
import re
import os

INPUT_FILE = './scripts/data.json'
OUTPUT_FILE = 'src/assets/processed_data.json' 
OUTPUT_FILE = 'public/processed_data.json'
MODEL_NAME = 'all-MiniLM-L6-v2'

def load_data(filepath):
    print("loading data")
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data

def extract_explanations(data):
    records = []

    for feature in data.get('features', []):
        feature_id = feature['feature_id']
        
        explanations = feature.get('explanations')
        if explanations is None:
            explanations = []
            
        for expl_idx, explanation in enumerate(explanations):
            text = explanation['text']
            scores = explanation.get('scores', {})

            pairwise = explanation.get('pairwise_semantic_similarity', [])
            similarities = [p['cosine_similarity'] for p in pairwise] if pairwise else []
            
            explanation_mean = np.mean(similarities) if similarities else 0.0
            explanation_var = np.var(similarities) if similarities else 0.0

            records.append({
                'feature_id': feature_id,
                'explanation_index': expl_idx,
                'text': text,
                'llm_explainer': explanation.get('llm_explainer', 'Unknown'),
                'similarity_mean': float(explanation_mean),
                'similarity_var': float(explanation_var),
                'score_fuzz': scores.get('fuzz', 0),
                'score_detection': scores.get('detection', 0),
                'score_embedding': scores.get('embedding', 0),
                'total_score': (scores.get('fuzz', 0) + scores.get('detection', 0) + scores.get('embedding', 0)) / 3
            })
            
    return pd.DataFrame(records)

def generate_embeddings(texts, model_name=MODEL_NAME):
    model = SentenceTransformer(model_name)
    embeddings = model.encode(texts, show_progress_bar=True)
    return embeddings

def reduce_dimensions(embeddings, n_components=2):
    
    reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=n_components, random_state=42)
    embedding_2d = reducer.fit_transform(embeddings)
    return embedding_2d

def cluster_embeddings(embeddings_2d, eps, min_samples=6):    
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(embeddings_2d)
    return clustering.labels_

def main():
    if not os.path.exists(INPUT_FILE):
        print("no file")
        return

    data = load_data(INPUT_FILE)
    df = extract_explanations(data)
    
    embeddings = generate_embeddings(df['text'].tolist())
    
    embeddings_2d = reduce_dimensions(embeddings)
    df['x'] = embeddings_2d[:, 0]
    df['y'] = embeddings_2d[:, 1]
    
    cluster_labels = cluster_embeddings(embeddings_2d, eps=0.1, min_samples=3)
    df['cluster_id'] = [int(l) for l in cluster_labels] 
    
    output_dir = os.path.dirname(OUTPUT_FILE)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
        
    result = df.to_dict(orient='records')
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(result, f, indent=2)


    print(len(result))
    print("ok")
        

if __name__ == "__main__":
    main()
