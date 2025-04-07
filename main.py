from fastapi import FastAPI, File, UploadFile, Response
import pandas as pd
import io
import joblib
import plotly.express as px
import numpy as np
import re
from fastapi.middleware.cors import CORSMiddleware
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pdfkit

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

# Default thresholds for analysis (adjust as needed)
THRESHOLD_AMOUNT = 50      # For revenue/price-related columns
THRESHOLD_FREQUENCY = 2    # For frequency-related columns
RATING_THRESHOLD = 3.5     # For rating-related columns

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

def clean_currency_value(val):
    """
    Cleans a currency-formatted value (e.g. "$123.45" or "€50") into a float.
    Returns None if conversion fails.
    """
    if isinstance(val, str):
        cleaned = re.sub(r'[^\d\.-]', '', val)
        try:
            return float(cleaned)
        except:
            return None
    return val

def pick_variant(variants, col, mean_val=None):
    """Select a recommendation variant deterministically based on the column name."""
    index = abs(hash(col)) % len(variants)
    if mean_val is not None:
        return variants[index].format(col=col, mean=mean_val)
    else:
        return variants[index].format(col=col)

def generate_column_specific_recommendations(df):
    """
    Inspects each column and generates a unique, specific recommendation 
    on what to focus on to drive growth—only for relevant columns.
    """
    recommendations = {}
    numeric_cols, categorical_cols = identify_features(df)
    
    # Define keyword groups
    revenue_keywords = ["amount", "price", "cost", "revenue"]
    frequency_keywords = ["frequency", "count", "number"]
    rating_keywords = ["rating", "score"]
    categorical_relevant = ["category", "segment", "region", "type"]
    
    # Define unique variants for each category:
    revenue_under = [
        "The '{col}' metric averages at {mean:.2f}, which is below the ideal range. Focus on boosting revenue by introducing targeted promotions, revising pricing strategies, and offering bundled deals to attract higher spending.",
        "With '{col}' averaging only {mean:.2f}, there's significant opportunity for growth. Concentrate on adjusting your pricing and launching special discounts to drive up sales in this area.",
        "The low average of '{col}' ({mean:.2f}) indicates underperformance. Invest in market research and innovate your pricing models to stimulate higher customer expenditure."
    ]
    revenue_over = [
        "The '{col}' metric is strong at an average of {mean:.2f}. Leverage this success by scaling operations, enhancing customer experience, and exploring premium offerings to further fuel growth.",
        "A healthy '{col}' average of {mean:.2f} provides a solid foundation. Focus on expanding market reach and reinvesting profits into innovative growth strategies.",
        "With '{col}' performing well at {mean:.2f}, continue to build on this strength by optimizing customer acquisition and upselling complementary products."
    ]
    
    frequency_under = [
        "The average '{col}' is only {mean:.2f}, suggesting customers are not engaging frequently. Prioritize developing loyalty programs and personalized marketing to increase repeat business.",
        "An average of {mean:.2f} in '{col}' indicates low customer engagement. Focus on creating incentives and reminders that encourage more regular interactions.",
        "The low frequency shown by '{col}' ({mean:.2f}) reveals an opportunity to boost repeat transactions. Consider subscription models or reward systems to drive retention."
    ]
    frequency_over = [
        "The '{col}' metric is strong with an average of {mean:.2f}. Capitalize on this momentum by expanding your engagement initiatives and introducing cross-selling strategies.",
        "A robust average of {mean:.2f} in '{col}' highlights healthy customer activity. Maintain this trend and explore further segmentation to unlock additional revenue streams.",
        "With '{col}' at {mean:.2f} on average, your customer engagement is commendable. Focus on fine-tuning your upselling and cross-promotional tactics to maximize growth."
    ]
    
    rating_under = [
        "The average '{col}' of {mean:.2f} is a clear signal to improve customer satisfaction. Focus on quality enhancements and customer support improvements to drive a better brand perception and growth.",
        "With '{col}' averaging only {mean:.2f}, customer dissatisfaction might be hindering growth. Invest in product improvements and responsive service to turn these ratings around.",
        "An average rating of {mean:.2f} in '{col}' suggests urgent need for quality upgrades. Prioritize customer feedback and continuous improvement strategies to enhance overall performance."
    ]
    rating_over = [
        "A solid '{col}' average of {mean:.2f} indicates strong customer approval. Leverage this positive feedback in your marketing campaigns and scale your operations to capture a larger market share.",
        "With '{col}' performing at {mean:.2f} on average, your quality is a competitive advantage. Focus on maintaining this standard while exploring new market segments for expansion.",
        "The excellent performance of '{col}' at {mean:.2f} offers a strong foundation for growth. Capitalize on this by enhancing brand messaging and targeting new customer demographics."
    ]
    
    categorical_high = [
        "The '{col}' column shows a high diversity of categories. Focus on segmenting these groups to design tailored marketing strategies that can capture niche opportunities for growth.",
        "With '{col}' featuring many unique values, there is a chance to identify and target specific customer segments. Analyze these groups to develop personalized offerings.",
    ]
    categorical_low = [
        "The '{col}' column is dominated by a few categories. Concentrate on these key segments to optimize product offerings and invest in targeted marketing initiatives for further expansion.",
        "A concentrated distribution in '{col}' reveals a clear customer preference. Focus on refining your offerings for this dominant group to drive more consistent growth."
    ]
    
    # Process numeric columns
    for col in numeric_cols:
        col_lower = col.lower()
        series = df[col].dropna()
        if series.empty:
            continue
        mean_val = series.mean()
        recommendation = None
        
        if any(keyword in col_lower for keyword in revenue_keywords):
            if mean_val < THRESHOLD_AMOUNT:
                recommendation = pick_variant(revenue_under, col, mean_val)
            else:
                recommendation = pick_variant(revenue_over, col, mean_val)
        elif any(keyword in col_lower for keyword in frequency_keywords):
            if mean_val < THRESHOLD_FREQUENCY:
                recommendation = pick_variant(frequency_under, col, mean_val)
            else:
                recommendation = pick_variant(frequency_over, col, mean_val)
        elif any(keyword in col_lower for keyword in rating_keywords):
            if mean_val < RATING_THRESHOLD:
                recommendation = pick_variant(rating_under, col, mean_val)
            else:
                recommendation = pick_variant(rating_over, col, mean_val)
        
        # Only include numeric columns that match one of our relevant keywords
        if recommendation:
            recommendations[col] = recommendation

    # Process categorical columns (only if the column name is relevant)
    for col in categorical_cols:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in categorical_relevant):
            series = df[col].dropna()
            unique_count = series.nunique()
            if unique_count > 10:
                recommendation = pick_variant(categorical_high, col)
            else:
                recommendation = pick_variant(categorical_low, col)
            recommendations[col] = recommendation

    return recommendations

def generate_consumer_report(df):
    """
    Generates a comprehensive overall summary of consumer shopping behaviour,
    including a general summary, column-specific business recommendations,
    and any available ML prediction.
    """
    report = {}
    report['total_entries'] = len(df)
    report['total_columns'] = len(df.columns)
    
    summary_parts = []
    summary_parts.append(f"This dataset contains {len(df)} records across {len(df.columns)} variables.")
    
    numeric_cols, categorical_cols = identify_features(df)
    if numeric_cols:
        overall_mean = df[numeric_cols].mean().mean()
        summary_parts.append(f"The overall average value across numeric variables is {overall_mean:.2f}.")
    if categorical_cols:
        summary_parts.append(f"There are {len(categorical_cols)} categorical variables which may indicate key customer segments.")
    
    general_summary = " ".join(summary_parts)
    report['general_summary'] = general_summary
    
    # Generate column-specific recommendations
    col_recs = generate_column_specific_recommendations(df)
    report['column_specific_recommendations'] = col_recs
    
    # Combine recommendations into a list (each with its own unique flow)
    combined_recs = [f"{col}: {rec}" for col, rec in col_recs.items()]
    report['business_recommendations'] = combined_recs
    
    # Incorporate prediction from the ML model (if available)
    processed_data, _, _ = preprocess_columns(df.copy())
    prediction = get_model_prediction(processed_data, model)
    report['prediction'] = prediction.tolist() if prediction is not None else "No prediction available"
    
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
        if file.filename.endswith('.csv'):
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
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        consumer_report = generate_consumer_report(df)
        charts_by_column = generate_charts_per_column(df)
        
        # Build an HTML version of the overall report
        html_content = "<html><head><meta charset='utf-8'><title>Consumer Report</title></head><body>"
        html_content += f"<h1>Consumer Shopping Behaviour Report</h1>"
        html_content += f"<p>{consumer_report['general_summary']}</p>"
        html_content += "<h2>Column-Specific Business Recommendations</h2><ul>"
        for col, rec in consumer_report['column_specific_recommendations'].items():
            html_content += f"<li><strong>{col}:</strong> {rec}</li>"
        html_content += "</ul>"
        html_content += f"<h2>Prediction</h2><p>{consumer_report['prediction']}</p>"
        html_content += "</body></html>"
        
        pdf = pdfkit.from_string(html_content, False)
        return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=ConsumerReport.pdf"})
    except Exception as e:
        print("Error generating PDF report:", e)
        return {"error": "An internal error occurred while generating the PDF."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
