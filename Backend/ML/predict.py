import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
import warnings
import os

warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# -----------------------
# 1️⃣ Load Hourly Data
# -----------------------
df = pd.read_csv("data/preprocessed_minute_data.csv")
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp')
df.set_index('timestamp', inplace=True)

# Convert to hourly average
df = df.resample('1H').mean().dropna()

features = ['temperature', 'humidity', 'mq2', 'mq135']

# -----------------------
# 2️⃣ Load LSTM Model + Scaler
# -----------------------
lstm_model = load_model("models/lstm_model.h5", compile=False)
scaler = joblib.load("models/lstm_scaler.pkl")

# Scale the data
data = df[features].values
data_scaled = scaler.transform(data)

SEQ_LENGTH = 6  # Last 6 hours → predict next hour

# -----------------------
# 3️⃣ LSTM Forecast Function
# -----------------------
def predict_lstm(hours):

    future_steps = hours
    current_seq = data_scaled[-SEQ_LENGTH:].reshape(1, SEQ_LENGTH, len(features))

    forecast_list = []
    timestamps = []

    last_time = df.index[-1]

    for _ in range(future_steps):
        pred_scaled = lstm_model.predict(current_seq, verbose=0)
        pred_original = scaler.inverse_transform(pred_scaled)[0]

        # 🔥 Fix negative predictions (MQ2, MQ135, Temp, Humidity)
        pred_original = np.maximum(pred_original, 0)

        forecast_list.append(pred_original)

        # Shift window for next prediction
        current_seq = np.append(current_seq[:, 1:, :],
                                pred_scaled.reshape(1, 1, len(features)),
                                axis=1)

        # Create next timestamp
        last_time = last_time + pd.Timedelta(hours=1)
        timestamps.append(last_time)

    forecast_df = pd.DataFrame(forecast_list, columns=features, index=timestamps)
    forecast_df.index.name = "timestamp"
    return forecast_df

# -----------------------
# 4️⃣ Generate Forecasts
# -----------------------
forecast_1hr = predict_lstm(1)
forecast_10hr = predict_lstm(10)

# -----------------------
# 5️⃣ Save Output
# -----------------------
forecast_1hr.to_csv("data/predictions_lstm_1hr.csv")
forecast_10hr.to_csv("data/predictions_lstm_10hr.csv")

print("✅ LSTM-only Predictions Saved:")
print("  → data/predictions_lstm_1hr.csv")
print("  → data/predictions_lstm_10hr.csv")
