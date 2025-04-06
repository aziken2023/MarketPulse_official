from fastapi import FastAPI, File, UploadFile
import pandas as pd
import io
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
import xgboost as xgb
import plotly.express as px
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Load the model
model_path = "moneypulse_model.pkl"
model = joblib.load(model_path)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow any origin or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to identify numerical and categorical columns dynamically
def identify_features(uploaded_df):
    numerical_cols = []
    categorical_cols = []
    
    for col in uploaded_df.columns:
        if uploaded_df[col].dtype in [np.int64, np.float64]:
            numerical_cols.append(col)
        else:
            categorical_cols.append(col)
    
    return numerical_cols, categorical_cols

# Function for preprocessing the dataset
def preprocess_columns(uploaded_df):
    numerical_cols, categorical_cols = identify_features(uploaded_df)
    
    # Impute missing numerical data with the median
    for col in numerical_cols:
        uploaded_df[col] = uploaded_df[col].fillna(uploaded_df[col].median())
    
    # Encode categorical variables
    label_encoders = {}
    for col in categorical_cols:
        le = LabelEncoder()
        uploaded_df[col] = le.fit_transform(uploaded_df[col].fillna('Unknown'))  # Handle missing categorical data
        label_encoders[col] = le
    
    # Normalize numerical features
    scaler = StandardScaler()
    uploaded_df[numerical_cols] = scaler.fit_transform(uploaded_df[numerical_cols])

    return uploaded_df, label_encoders, scaler

# Function for generating predictions
def get_model_prediction(df, model):
    dmatrix = xgb.DMatrix(df)
    prediction = model.predict(dmatrix)
    return prediction

# Function to generate insights
def generate_insights(df):
    insights = {
        "total_entries": len(df),
        "missing_values": df.isnull().sum().to_dict(),
        "average_purchase_amount": df['Purchase_Amount'].mean(),
        "average_purchase_frequency": df['Frequency_of_Purchase'].mean(),
    }
    return insights

# Function to generate visualizations
def generate_visualization(predictions):
    fig = px.bar(x=np.arange(len(predictions)), y=predictions)
    return fig

# Function to generate business recommendations based on data
def generate_business_recommendations(df, predictions):
    recommendations = []

    # Example recommendation based on purchase behavior
    if df['Purchase_Amount'].mean() > 100:
        recommendations.append("Consider offering higher-value product bundles to increase purchase amounts.")
    
    if df['Frequency_of_Purchase'].mean() < 2:
        recommendations.append("Encourage more frequent purchases through loyalty programs or discounts.")
    
    if df['Brand_Loyalty'].mean() < 0.5:
        recommendations.append("Focus on improving brand loyalty programs or offering incentives for repeat customers.")

    # Example recommendations based on predictions
    high_purchase_customers = df[predictions > 0.5]  # assuming >0.5 indicates high intent to purchase
    if len(high_purchase_customers) > 0:
        recommendations.append(f"Target marketing campaigns at the top {len(high_purchase_customers)} high-purchase customers.")
    
    # Return a set of actionable recommendations
    return recommendations

# Endpoint to upload dataset
@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    
    # Preprocess and generate insights
    processed_data, label_encoders, scaler = preprocess_columns(df)
    insights = generate_insights(df)
    
    # Generate business recommendations based on the insights and predictions
    predictions = get_model_prediction(processed_data, model)
    business_recommendations = generate_business_recommendations(df, predictions)
    
    return {
        "message": "File uploaded successfully", 
        "insights": insights, 
        "business_recommendations": business_recommendations
    }

# Endpoint to recommend business actions based on predictions
@app.post("/recommend-business")
async def recommend_business(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))

    # Preprocess data
    processed_data, label_encoders, scaler = preprocess_columns(df)
    
    # Get predictions
    predictions = get_model_prediction(processed_data, model)
    
    # Generate visualization
    fig = generate_visualization(predictions)
    
    # Generate business recommendations based on predictions
    business_recommendations = generate_business_recommendations(df, predictions)
    
    return {
        "recommendations": predictions.tolist(),
        "business_recommendations": business_recommendations,
        "visualization": fig.to_json()
    }
