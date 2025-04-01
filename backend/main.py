from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store the uploaded dataset
uploaded_df = None

# Root endpoint
@app.get("/")
def root():
    return {"message": "MarketPulse API is running"}

# Upload dataset endpoint
@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    global uploaded_df
    contents = await file.read()
    uploaded_df = pd.read_csv(StringIO(contents.decode("utf-8")))
    return {"message": "Dataset uploaded successfully!"}

# Consumer Insight Endpoints
@app.post("/upload-consumer-data")
async def upload_consumer_data(file: UploadFile = File(...)):
    global uploaded_df
    contents = await file.read()
    uploaded_df = pd.read_csv(StringIO(contents.decode("utf-8")))
    return {"message": "Consumer data uploaded successfully!"}

@app.post("/cluster-users")
async def cluster_users():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example clustering logic
    clusters = {"clusters": [1, 2, 3]}  # Replace with actual clustering logic
    return clusters

@app.post("/predict-conversion")
async def predict_conversion():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example prediction logic
    predictions = {"predictions": [0, 1, 0]}  # Replace with actual prediction logic
    return predictions

@app.post("/recommend-products")
async def recommend_products():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example recommendation logic
    recommendations = {"recommendations": ["Product A", "Product B"]}  # Replace with actual logic
    return recommendations

# Product Review Endpoints
@app.post("/analyze-sentiment")
async def analyze_sentiment():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example sentiment analysis logic
    sentiments = {"sentiments": ["positive", "negative", "neutral"]}  # Replace with actual logic
    return sentiments

@app.post("/predict-rating")
async def predict_rating():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example rating prediction logic
    ratings = {"ratings": [4.5, 3.2, 5.0]}  # Replace with actual logic
    return ratings

# Reports & Recommendations Endpoints
@app.post("/forecast-sales")
async def forecast_sales():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example sales forecasting logic
    forecast = {"forecast": [100, 200, 300]}  # Replace with actual logic
    return forecast

@app.post("/detect-anomalies")
async def detect_anomalies():
    if uploaded_df is None:
        return {"error": "No dataset uploaded"}
    # Example anomaly detection logic
    anomalies = {"anomalies": [5, 10, 15]}  # Replace with actual logic
    return anomalies

# Run the backend server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)