# ML/train_lstm.py   (FINAL STABLE VERSION FOR 3 DAYS DATA)

import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import joblib
import tensorflow as tf

# -----------------------
# 1️⃣ Load Raw Minute Data (NO SCALING DONE HERE)
# -----------------------
df = pd.read_csv("data/preprocessed_minute_data.csv")
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp').set_index('timestamp')

# -----------------------
# ✅ Convert to Hourly Average
# -----------------------
df = df.resample('1h').mean().dropna().reset_index()

# Smooth humidity (reduces sensor noise)
df['humidity'] = df['humidity'].rolling(window=5, min_periods=1).mean()

# -----------------------
# Define Feature Set
# -----------------------
features = ['temperature', 'humidity', 'mq2', 'mq135']
data = df[features].values

# -----------------------
# 2️⃣ Scale Once (Correct Scaling)
# -----------------------
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(data)

os.makedirs("models", exist_ok=True)
joblib.dump(scaler, "models/lstm_scaler.pkl")
print("✅ Scaler saved → models/lstm_scaler.pkl")

# -----------------------
# 3️⃣ Create Sequences
# Using last 12 hours → Predict next hour (BEST FOR 3 DAYS DATA)
# -----------------------
SEQ_LENGTH = 12

def create_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i + seq_len])
        y.append(data[i + seq_len])
    return np.array(X), np.array(y)

X, y = create_sequences(data_scaled, SEQ_LENGTH)
print(f"✅ Sequences created → X: {X.shape}, y: {y.shape}")

# If not enough samples → stop safely
if len(X) < 10:
    print("\n❌ ERROR: Not enough training samples.")
    print("Minimum required: 10 | Found:", len(X))
    print("Collect more data in MongoDB for better accuracy.")
    exit()

# -----------------------
# 4️⃣ Weighted Loss for Gas Sensors Priority
# -----------------------
weights = np.array([1.0, 1.0, 2.5, 2.5])
def weighted_mse(y_true, y_pred):
    return tf.reduce_mean(weights * tf.square(y_true - y_pred))

# -----------------------
# 5️⃣ Define LSTM Model (Optimized for Small Dataset)
# -----------------------
model = Sequential([
    Input(shape=(SEQ_LENGTH, len(features))),
    LSTM(64, return_sequences=True),
    Dropout(0.25),
    LSTM(32),
    Dense(16, activation='relu'),
    Dense(len(features))  # output (temp, hum, mq2, mq135)
])

model.compile(optimizer='adam', loss=weighted_mse)

# -----------------------
# 6️⃣ Train Model
# -----------------------
early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

history = model.fit(
    X, y,
    epochs=180,
    batch_size=8,
    validation_split=0.1,  # works well for small dataset
    callbacks=[early_stop],
    verbose=1
)

# -----------------------
# 7️⃣ Save Model
# -----------------------
model.save("models/lstm_model.h5")
print("✅ Model saved → models/lstm_model.h5")

# -----------------------
# 8️⃣ Evaluate Performance
# -----------------------
y_pred = scaler.inverse_transform(model.predict(X, verbose=0))
y_true = scaler.inverse_transform(y)

print("\n Accuracy Metrics:")
for i, feat in enumerate(features):
    mae = np.mean(np.abs(y_true[:, i] - y_pred[:, i]))
    rmse = np.sqrt(np.mean((y_true[:, i] - y_pred[:, i])**2))
    acc = 100 * (1 - mae / (max(y_true[:, i]) - min(y_true[:, i])))
    print(f"{feat}: RMSE = {rmse:.3f}, MAE = {mae:.3f}, Accuracy = {acc:.2f}%")

overall_acc = np.mean([
    100 * (1 - np.mean(np.abs(y_true[:, i] - y_pred[:, i])) /
    (max(y_true[:, i]) - min(y_true[:, i])))
    for i in range(len(features))
])
print(f"\n Overall Model Accuracy: {overall_acc:.2f}%\n")
