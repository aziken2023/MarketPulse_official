# main.py
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file
import os
import io
from fastapi import FastAPI, File, UploadFile, Response, HTTPException
import pandas as pd
import joblib
import plotly.express as px
import numpy as np
import re
from fastapi.middleware.cors import CORSMiddleware
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pdfkit
from pydantic import BaseModel
import requests

app = FastAPI()

# Load your trained ML model (if applicable)
model_path = 'moneypulse_model_v2.xgb'
try:
    model = joblib.load(model_path)
except Exception as e:
    model = None
    print("Model load error:", e)

# Allow CORS from your frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default thresholds for analysis
THRESHOLD_AMOUNT = 50
THRESHOLD_FREQUENCY = 2
RATING_THRESHOLD = 3.5

def identify_features(uploaded_df):
    numerical_cols = []
    categorical_cols = []
    for col in uploaded_df.columns:
        if pd.api.types.is_numeric_dtype(uploaded_df[col]):
            numerical_cols.append(col)
        else:
            categorical_cols.append(col)
    return numerical_cols, categorical_cols

def preprocess_columns(uploaded_df):
    numerical_cols, categorical_cols = identify_features(uploaded_df)
    for col in numerical_cols:
        uploaded_df[col] = uploaded_df[col].fillna(uploaded_df[col].median())
    label_encoders = {}
    for col in categorical_cols:
        le = LabelEncoder()
        uploaded_df[col] = le.fit_transform(uploaded_df[col].fillna('Unknown'))
        label_encoders[col] = le
    scaler = StandardScaler()
    if numerical_cols:
        uploaded_df[numerical_cols] = scaler.fit_transform(uploaded_df[numerical_cols])
    return uploaded_df, label_encoders, scaler

def add_missing_columns(df, required_columns, default_value=0):
    missing_cols = required_columns - set(df.columns)
    for col in missing_cols:
        df[col] = default_value
    return df

def get_model_prediction(processed_data, model):
    MODEL_FEATURES = {"Purchase_Amount", "Frequency_of_Purchase", "Price_per_Hour", "Research_Effectiveness"}
    common_features = set(processed_data.columns).intersection(MODEL_FEATURES)
    if not common_features or model is None:
        print("No matching features for the model or model not loaded; skipping prediction.")
        return None
    try:
        processed_data = add_missing_columns(processed_data, MODEL_FEATURES, default_value=0)
        processed_data = processed_data[list(MODEL_FEATURES)]
        prediction = model.predict(processed_data)
        return prediction
    except Exception as e:
        print("Model prediction error:", e)
        return None

def pick_variant(variants, col, mean_val=None):
    index = abs(hash(col)) % len(variants)
    if mean_val is not None:
        return variants[index].format(col=col, mean=mean_val)
    else:
        return variants[index].format(col=col)

def generate_column_specific_recommendations(df):
    recommendations = {}
    numeric_cols, categorical_cols = identify_features(df)
    
    # Keyword groups
    revenue_keywords = ["amount", "price", "cost", "revenue"]
    frequency_keywords = ["frequency", "count", "number"]
    rating_keywords = ["rating", "score"]
    categorical_relevant = ["category", "segment", "region", "type"]
    
    # Variants for recommendations
    revenue_under = [
        "The '{col}' metric averages at {mean:.2f}, which is below the ideal range. Focus on boosting revenue by introducing targeted promotions, revising pricing strategies, and offering bundled deals.",
        "With '{col}' averaging only {mean:.2f}, there's significant growth opportunity. Adjust pricing and launch special discounts.",
        "The low average of '{col}' ({mean:.2f}) indicates underperformance. Invest in market research and innovate pricing models."
    ]
    revenue_over = [
        "The '{col}' metric is strong at an average of {mean:.2f}. Leverage this success to scale operations and enhance customer experience.",
        "A healthy '{col}' average of {mean:.2f} provides a solid foundation. Expand market reach and reinvest profits.",
        "With '{col}' performing well at {mean:.2f}, build on this strength by optimizing customer acquisition and upselling."
    ]
    frequency_under = [
        "The average '{col}' is only {mean:.2f}, suggesting low engagement. Prioritize developing loyalty programs and personalized marketing.",
        "An average of {mean:.2f} in '{col}' indicates low customer repeat. Create incentives that encourage regular interactions.",
        "The low frequency ({mean:.2f}) in '{col}' reveals an opportunity to boost repeat transactions. Consider subscriptions or rewards."
    ]
    frequency_over = [
        "The '{col}' metric is strong with an average of {mean:.2f}. Capitalize on this by expanding engagement initiatives.",
        "A robust average of {mean:.2f} in '{col}' highlights healthy activity. Maintain this trend and explore additional segmentation.",
        "With '{col}' at {mean:.2f} on average, continue to fine-tune upselling and cross-promotional tactics."
    ]
    rating_under = [
        "The average '{col}' of {mean:.2f} is a signal to improve customer satisfaction. Focus on quality enhancements and responsive support.",
        "With '{col}' averaging only {mean:.2f}, customer dissatisfaction might be holding you back. Invest in improvements.",
        "An average rating of {mean:.2f} in '{col}' suggests the need for upgrades. Prioritize customer feedback and product improvements."
    ]
    rating_over = [
        "A solid '{col}' average of {mean:.2f} indicates strong approval. Leverage this positive feedback in your marketing campaigns.",
        "With '{col}' at {mean:.2f}, quality is clearly a competitive advantage. Maintain your standard while exploring new segments.",
        "The excellent performance of '{col}' at {mean:.2f} provides a strong foundation for growth. Enhance brand messaging accordingly."
    ]
    categorical_high = [
        "The '{col}' column shows high diversity. Segment these groups to design tailored marketing strategies.",
        "With many unique values in '{col}', identify and target specific customer segments for personalized offerings."
    ]
    categorical_low = [
        "The '{col}' column is dominated by a few categories. Concentrate on these key segments to optimize offerings.",
        "A concentrated distribution in '{col}' reveals a clear customer preference. Refine your offerings to drive consistent growth."
    ]
    
    for col in numeric_cols:
        col_lower = col.lower()
        series = df[col].dropna()
        if series.empty:
            continue
        mean_val = series.mean()
        recommendation = None
        
        if any(keyword in col_lower for keyword in revenue_keywords):
            recommendation = pick_variant(revenue_under if mean_val < THRESHOLD_AMOUNT else revenue_over, col, mean_val)
        elif any(keyword in col_lower for keyword in frequency_keywords):
            recommendation = pick_variant(frequency_under if mean_val < THRESHOLD_FREQUENCY else frequency_over, col, mean_val)
        elif any(keyword in col_lower for keyword in rating_keywords):
            recommendation = pick_variant(rating_under if mean_val < RATING_THRESHOLD else rating_over, col, mean_val)
        
        if recommendation:
            recommendations[col] = recommendation

    for col in categorical_cols:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in categorical_relevant):
            series = df[col].dropna()
            unique_count = series.nunique()
            recommendation = pick_variant(categorical_high if unique_count > 10 else categorical_low, col)
            recommendations[col] = recommendation

    return recommendations

def generate_consumer_report(df):
    report = {}
    report['total_entries'] = len(df)
    report['total_columns'] = len(df.columns)
    
    numeric_cols, categorical_cols = identify_features(df)
    summary_parts = [f"This dataset contains {len(df)} records across {len(df.columns)} variables."]
    if numeric_cols:
        overall_mean = df[numeric_cols].mean().mean()
        summary_parts.append(f"Overall average of numeric variables is {overall_mean:.2f}.")
    if categorical_cols:
        summary_parts.append(f"There are {len(categorical_cols)} categorical variables indicating potential customer segments.")
    basic_summary = " ".join(summary_parts)
    
    # Build a concise extended context:
    columns_str = "Columns: " + ", ".join(df.columns)
    # Only include the first row sample to keep it short
    sample_str = "Sample Data (first row):\n" + df.head(1).to_string(index=False)
    extended_context = f"{columns_str}\n{sample_str}\n{basic_summary}"
    # Optionally truncate if too long:
    max_length = 1000  # adjust as needed
    if len(extended_context) > max_length:
        extended_context = extended_context[:max_length] + "..."
    
    report['general_summary'] = basic_summary
    report['extended_context'] = extended_context  # This extended context is used for chatbot recommendations
    col_recs = generate_column_specific_recommendations(df)
    report['column_specific_recommendations'] = col_recs
    report['business_recommendations'] = [f"{col}: {rec}" for col, rec in col_recs.items()]
    
    processed_data, _, _ = preprocess_columns(df.copy())
    prediction = get_model_prediction(processed_data, model)
    report['prediction'] = prediction.tolist() if prediction is not None else "No prediction available"
    
    report['company_name'] = df["companyName"].iloc[0] if "companyName" in df.columns else "ConsumerReport"
    
    return report

def generate_charts_per_column(df):
    charts = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            fig = px.histogram(df, x=col, nbins=30, title=f"Distribution of {col}")
        else:
            data = df[col].value_counts().reset_index()
            data.columns = [col, "count"]
            fig = px.bar(data, x=col, y="count", title=f"Frequency of {col}")
        charts[col] = fig.to_json()
    return charts

@app.post("/recommend-business")
async def recommend_business(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        print("Uploaded dataset shape:", df.shape)
        consumer_report = generate_consumer_report(df)
        charts_by_column = generate_charts_per_column(df)
        insights = {"total_entries": len(df), "total_columns": len(df.columns)}
        return {
            "message": "File uploaded and analyzed successfully",
            "insights": insights,
            "consumer_report": consumer_report,
            "charts_by_column": charts_by_column
        }
    except Exception as e:
        print("Error in /recommend-business:", e)
        return {"error": "An internal error occurred while processing the file."}

@app.post("/download-report-pdf")
async def download_report_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        consumer_report = generate_consumer_report(df)
        charts_by_column = generate_charts_per_column(df)
        
        html_content = (
            "<html><head><meta charset='utf-8'><title>Consumer Report</title></head><body>"
            f"<h1>Consumer Shopping Behaviour Report</h1>"
            f"<p>{consumer_report['general_summary']}</p>"
            "<h2>Column-Specific Business Recommendations</h2><ul>"
        )
        for col, rec in consumer_report['column_specific_recommendations'].items():
            html_content += f"<li><strong>{col}:</strong> {rec}</li>"
        html_content += (
            "</ul>"
            f"<h2>Prediction</h2><p>{consumer_report['prediction']}</p>"
            "</body></html>"
        )
        
        wkhtmltopdf_path = "C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe"
        config = pdfkit.configuration(wkhtmltopdf=wkhtmltopdf_path)
        options = {"encoding": "UTF-8", "quiet": "", "disable-smart-shrinking": ""}
        pdf = pdfkit.from_string(html_content, False, options=options, configuration=config)
        
        filename = f"{consumer_report['company_name']}_Report.pdf"
        return Response(content=pdf,
                        media_type="application/pdf",
                        headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e:
        print("Error generating PDF report:", e)
        return {"error": "An internal error occurred while generating the PDF."}

# Define a request model for the chatbot endpoint.
class ChatbotRequest(BaseModel):
    query: str
    datasetContext: str  # This will receive the extended context
    customerSegments: list

def call_gemini_ai(prompt):
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    headers = {"Content-Type": "application/json"}
    gemini_api_url_base = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent")
    gemini_api_url = f"{gemini_api_url_base}?key={gemini_api_key}"
    
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    
    print("Calling Gemini API at:", gemini_api_url)
    print("Payload:", payload)
    
    response = requests.post(gemini_api_url, headers=headers, json=payload)
    print("Gemini API response:", response.text)
    
    if response.status_code == 200:
        data = response.json()
        candidates = data.get("candidates")
        if isinstance(candidates, list) and len(candidates) > 0:
            candidate = candidates[0]
            # First check if there is a "content" key
            if "content" in candidate:
                candidate_content = candidate["content"]
                parts = candidate_content.get("parts")
            else:
                parts = candidate.get("parts")
            extracted_text = ""
            if isinstance(parts, list):
                for part in parts:
                    if isinstance(part, dict):
                        extracted_text += part.get("text", "") + " "
                    else:
                        extracted_text += str(part) + " "
                extracted_text = extracted_text.strip()
                if not extracted_text or extracted_text.lower() == "none":
                    return "I'm sorry, I wasn't able to generate a recommendation. Please try again."
                return extracted_text
            else:
                text = str(parts)
                if not text or text.lower() == "none":
                    return "I'm sorry, I wasn't able to generate a recommendation. Please try again."
                return text
        else:
            return "No response from Gemini AI"
    else:
        raise HTTPException(status_code=500, detail=f"Error contacting Gemini AI API: {response.text}")

@app.post("/gemini-chatbot")
async def gemini_chatbot_endpoint(chat_request: ChatbotRequest):
    # Build the prompt using the extended dataset context for better detail.
    constext = chat_request.datasetContext;
    prompt = (
        f"Based on the detailed dataset information provided below, answer the user query with actionable business recommendations.\n\n"
        f"Dataset Details:\n{chat_request.datasetContext}\n\n"
        f"Key Customer Segments: {', '.join(chat_request.customerSegments) if chat_request.customerSegments else 'Not provided'}\n\n"
        f"User Query: {chat_request.query}\n\n"
        "Your answer should provide specific, step-by-step recommendations for increasing revenue, expanding operations, launching promotions, and improving sales."
    )
    try:
        gemini_response = call_gemini_ai(prompt)
        return {"response": gemini_response}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
