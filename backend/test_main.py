import pytest
import pandas as pd
import numpy as np

from main import (
    identify_features,
    preprocess_columns,
    add_missing_columns,
    get_model_prediction,
    generate_column_specific_recommendations
)

# A simple mock to replace your real XGBoost model
class MockModel:
    def predict(self, X):
        return np.ones(len(X))


def test_identify_features_empty():
    """Empty DataFrame should yield empty feature lists."""
    empty = pd.DataFrame()
    num, cat = identify_features(empty)
    assert num == []
    assert cat == []


def test_identify_features_mixed_types():
    """Check that only ints & floats are numeric; strings & dates are categorical."""
    df_mixed = pd.DataFrame({
        'ints':    pd.Series([1, 2, 3], dtype='int32'),
        'floats':  pd.Series([1.1, 2.2, 3.3], dtype='float64'),
        'strings': ['a', 'b', 'c'],
        'dates':   pd.to_datetime(['2020-01-01','2020-01-02','2020-01-03'])
    })
    num, cat = identify_features(df_mixed)
    assert set(num) == {'ints', 'floats'}
    assert set(cat) == {'strings', 'dates'}


def test_preprocess_columns_no_missing_and_normalized_and_encoded():
    """
    - No NaNs remain
    - Numeric column is zero-mean, unit-std
    - Categorical is integer-encoded and encoder stored
    """
    df = pd.DataFrame({
        'num': [10.0, np.nan, 30.0, 50.0],
        'cat': ['X', None, 'Y', 'X']
    })
    processed_df, encoders, scaler = preprocess_columns(df.copy())

    # 1. No missing values
    assert processed_df.isnull().sum().sum() == 0

    # 2. Numeric normalization: mean ≈ 0, std ≈ 1
    mean = processed_df['num'].mean()
    std  = processed_df['num'].std(ddof=0)
    assert pytest.approx(mean, abs=1e-6) == 0.0
    assert pytest.approx(std, rel=1e-2) == 1.0

    # 3. Categorical encoding
    assert pd.api.types.is_integer_dtype(processed_df['cat'])
    assert 'cat' in encoders
    assert set(encoders['cat'].classes_) == {'Unknown', 'X', 'Y'}


@pytest.mark.parametrize("input_df, required_cols, default", [
    (pd.DataFrame({'a': [1,2]}), {'a','b'}, 0),
    (pd.DataFrame(),               {'x','y','z'}, -1),
])
def test_add_missing_columns_various(input_df, required_cols, default):
    """
    add_missing_columns should add exactly the missing columns
    filled with the specified default value.
    """
    out = add_missing_columns(input_df.copy(), required_cols, default_value=default)
    # All required columns must be present
    assert set(out.columns) >= required_cols
    # New columns hold the default
    for col in required_cols - set(input_df.columns):
        assert (out[col] == default).all()


def test_get_model_prediction_success():
    """With a valid DataFrame and mock model, returns a prediction array."""
    df = pd.DataFrame({
        'Purchase_Amount':       [10, 20],
        'Frequency_of_Purchase':[1, 2],
        'Price_per_Hour':        [5, 6],
        'Research_Effectiveness':[3, 4]
    })
    pred = get_model_prediction(df.copy(), MockModel())
    assert pred is not None
    assert len(pred) == 2


def test_get_model_prediction_no_model_or_features():
    """
    If model is None or features don't match, should return None.
    """
    df_empty = pd.DataFrame({'foo':[1,2]})
    # No model
    assert get_model_prediction(df_empty.copy(), None) is None
    # Model present but no model features in df
    assert get_model_prediction(df_empty.copy(), MockModel()) is None


def test_generate_column_specific_recommendations_basic():
    """
    Check that recommendations dict is returned
    and contains keys for known numeric/categorical patterns.
    """
    df = pd.DataFrame({
        'price':     [10, 20, 30],
        'rating':    [2, 4, 5],
        'frequency': [1, 3, 2],
        'category':  ['A', 'B', 'C']
    })
    recs = generate_column_specific_recommendations(df)
    assert isinstance(recs, dict)
    # Should at least recommend something about price, rating, frequency, category
    assert any('price' in k for k in recs)
    assert any('rating' in k for k in recs)
    assert any('frequency' in k for k in recs)
    assert any('category' in k for k in recs)
