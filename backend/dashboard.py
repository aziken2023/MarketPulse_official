from fastapi import APIRouter, HTTPException
import pandas as pd
from main import uploaded_df  # Import the global dataset
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

router = APIRouter()

# Helper function to check if the dataset is uploaded
def check_dataset():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")

# Endpoint to generate quick overview and insights
@router.post("/generate-overview")
async def generate_overview():
    check_dataset()

    # Basic dataset overview
    overview = {
        "num_rows": len(uploaded_df),
        "num_columns": len(uploaded_df.columns),
        "columns": uploaded_df.columns.tolist(),
        "missing_values": uploaded_df.isnull().sum().to_dict(),
        "data_types": uploaded_df.dtypes.astype(str).to_dict(),
    }

    # Descriptive statistics for numeric columns
    numeric_columns = uploaded_df.select_dtypes(include=[np.number]).columns
    if len(numeric_columns) > 0:
        overview["descriptive_stats"] = uploaded_df[numeric_columns].describe().to_dict()

    # Unique values for categorical columns
    categorical_columns = uploaded_df.select_dtypes(include=["object"]).columns
    if len(categorical_columns) > 0:
        overview["unique_values"] = {col: uploaded_df[col].unique().tolist() for col in categorical_columns}

    return overview

# Endpoint to generate clustering insights
@router.post("/cluster-users")
async def cluster_users():
    check_dataset()

    # Ensure required columns exist
    required_columns = ["purchase_frequency", "total_spent"]
    if not all(col in uploaded_df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"Dataset must contain the following columns: {required_columns}")

    # Perform KMeans clustering
    kmeans = KMeans(n_clusters=3)
    uploaded_df["cluster"] = kmeans.fit_predict(uploaded_df[required_columns])
    return uploaded_df.to_dict(orient="records")

# Endpoint to generate classification insights
@router.post("/predict-conversion")
async def predict_conversion():
    check_dataset()

    # Ensure required columns exist
    required_columns = ["time_spent", "pages_visited", "converted"]
    if not all(col in uploaded_df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"Dataset must contain the following columns: {required_columns}")

    # Train a RandomForestClassifier
    model = RandomForestClassifier()
    model.fit(uploaded_df[["time_spent", "pages_visited"]], uploaded_df["converted"])
    predictions = model.predict(uploaded_df[["time_spent", "pages_visited"]])
    return {"predictions": predictions.tolist()}

# Endpoint to generate product recommendations
@router.post("/recommend-products")
async def recommend_products():
    check_dataset()

    # Ensure required columns exist
    if "product_interests" not in uploaded_df.columns:
        raise HTTPException(status_code=400, detail="Dataset must contain a 'product_interests' column")

    # Generate recommendations using TF-IDF and cosine similarity
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(uploaded_df["product_interests"])
    similarity_matrix = cosine_similarity(tfidf_matrix)
    recommendations = similarity_matrix.argsort()[:, -3:][:, ::-1]
    return {"recommendations": recommendations.tolist()}

# Endpoint to generate visualizations (e.g., histograms, scatter plots)
@router.post("/generate-visualizations")
async def generate_visualizations():
    check_dataset()

    # Generate histograms for numeric columns
    numeric_columns = uploaded_df.select_dtypes(include=[np.number]).columns
    histograms = {}
    for col in numeric_columns:
        histograms[col] = uploaded_df[col].value_counts().to_dict()

    # Generate scatter plots for numeric columns (example: first two numeric columns)
    scatter_plots = {}
    if len(numeric_columns) >= 2:
        scatter_plots["scatter_plot"] = {
            "x": uploaded_df[numeric_columns[0]].tolist(),
            "y": uploaded_df[numeric_columns[1]].tolist(),
        }

    return {
        "histograms": histograms,
        "scatter_plots": scatter_plots,
    }