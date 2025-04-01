from fastapi import APIRouter, HTTPException
from textblob import TextBlob
from sklearn.linear_model import LinearRegression
import pandas as pd
from main import uploaded_df  # Import the global dataset

router = APIRouter()

# Sentiment analysis endpoint
@router.post("/analyze-sentiment")
async def analyze_sentiment():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    sentiments = [TextBlob(review).sentiment.polarity for review in uploaded_df["review_content"]]
    return {"sentiments": sentiments}

# Rating prediction endpoint
@router.post("/predict-rating")
async def predict_rating():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    model = LinearRegression()
    model.fit(uploaded_df[["price", "review_length"]], uploaded_df["rating"])
    predictions = model.predict(uploaded_df[["price", "review_length"]])
    return {"predictions": predictions.tolist()}