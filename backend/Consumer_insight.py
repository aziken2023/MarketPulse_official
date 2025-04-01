from fastapi import APIRouter, HTTPException
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from main import uploaded_df  # Import the global dataset

router = APIRouter()

# Clustering endpoint
@router.post("/cluster-users")
async def cluster_users():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    kmeans = KMeans(n_clusters=3)
    uploaded_df["cluster"] = kmeans.fit_predict(uploaded_df[["purchase_frequency", "total_spent"]])
    return uploaded_df.to_dict(orient="records")

# Classification endpoint
@router.post("/predict-conversion")
async def predict_conversion():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    model = RandomForestClassifier()
    model.fit(uploaded_df[["time_spent", "pages_visited"]], uploaded_df["converted"])
    predictions = model.predict(uploaded_df[["time_spent", "pages_visited"]])
    return {"predictions": predictions.tolist()}

# Recommendation endpoint
@router.post("/recommend-products")
async def recommend_products():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(uploaded_df["product_interests"])
    similarity_matrix = cosine_similarity(tfidf_matrix)
    recommendations = similarity_matrix.argsort()[:, -3:][:, ::-1]
    return {"recommendations": recommendations.tolist()}