import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import joblib

# Load your dataset (replace with actual file path)
df = pd.read_csv("your_dataset.csv")  # Replace with your dataset path

# Preprocess the data (example, adjust as needed)
X = df.drop("target", axis=1)  # Features
y = df["target"]  # Target column

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Function to train and evaluate models
def train_and_evaluate_model(model, model_name):
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    print(f"{model_name} Model Mean Squared Error: {mse}")
    
    # Save the trained model
    joblib.dump(model, f"{model_name}_model.pkl")
    print(f"{model_name} model saved as '{model_name}_model.pkl'.\n")

# List of models to train
models = [
    (LinearRegression(), "LinearRegression"),
    (DecisionTreeRegressor(), "DecisionTree"),
    (RandomForestRegressor(), "RandomForest")
]

# Train and evaluate each model
for model, model_name in models:
    train_and_evaluate_model(model, model_name)
