# ml/data_prep.py
import pandas as pd
from pymongo import MongoClient
import os

def collect_and_preprocess():
    # 1️⃣ Connect to MongoDB
    client = MongoClient("mongodb+srv://dhanush:dhanush@cluster0.veks4zw.mongodb.net/")
    db = client["myDatabase"]
    collection = db["sensordatas"]

    # 2️⃣ Fetch data from MongoDB
    cursor = collection.find({}, {"_id": 0})
    df = pd.DataFrame(list(cursor))

    if df.empty:
        print("❌ No data found in MongoDB collection.")
        return None

    # 3️⃣ Convert timestamp to datetime (handles microseconds too)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=False)

    # 4️⃣ Drop invalid timestamp rows
    df = df.dropna(subset=["timestamp"])

    # 5️⃣ Sort by time and index
    df = df.sort_values("timestamp")
    df = df.set_index("timestamp")

    # 6️⃣ Remove rows with missing sensor readings only
    df = df.dropna(subset=["temperature", "humidity", "mq2", "mq135"])

    # 7️⃣ Resample to 1-minute interval
    df_minute = df.resample("1min").mean().interpolate().dropna()

    # 8️⃣ Save processed data
    os.makedirs("data", exist_ok=True)
    df_minute.to_csv("data/preprocessed_minute_data.csv")

    print("✅ Minute-level data saved to data/preprocessed_minute_data.csv")
    print(f"📌 Total records after preprocessing: {len(df_minute)}")

    return df_minute

if __name__ == "__main__":
    collect_and_preprocess()
