from fastapi import APIRouter, HTTPException
from statsmodels.tsa.arima_model import ARIMA
from sklearn.ensemble import IsolationForest
import pandas as pd
from main import uploaded_df  # Import the global dataset

router = APIRouter()

# Time series forecasting endpoint
@router.post("/forecast-sales")
async def forecast_sales():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    model = ARIMA(uploaded_df["sales"], order=(5, 1, 0))
    model_fit = model.fit(disp=0)
    forecast = model_fit.forecast(steps=10)[0]
    return {"forecast": forecast.tolist()}

# Anomaly detection endpoint
@router.post("/detect-anomalies")
async def detect_anomalies():
    if uploaded_df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a dataset first.")
    
    model = IsolationForest(contamination=0.1)
    anomalies = model.fit_predict([[x] for x in uploaded_df["sales"]])
    return {"anomalies": anomalies.tolist()}