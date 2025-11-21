from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import sys
import os
import pandas as pd
import threading
import time

app = Flask(__name__)
CORS(app)

# ----------------------------------------------------
# Helper: Run any Python script
# ----------------------------------------------------
def run_script(script_path):
    try:
        full_path = os.path.join(os.path.dirname(__file__), script_path)
        subprocess.run([sys.executable, full_path], check=True)
        print(f"✅ Script executed: {script_path}")
    except Exception as e:
        print(f"❌ Error running {script_path}: {e}")

# ----------------------------------------------------
# Load prediction CSV files safely
# ----------------------------------------------------
def load_csv(file_path):
    path = os.path.join(os.path.dirname(__file__), file_path)
    if not os.path.exists(path):
        print(f"⚠ Missing file: {file_path}")
        return []
    df = pd.read_csv(path)
    return df.to_dict(orient="records")

# ----------------------------------------------------
# ML retraining loop (runs every 10 minutes)
# ----------------------------------------------------
def periodic_trainer():
    print("\n⏳ Auto ML retrainer activated (runs every 10 minutes)\n")

    while True:
        print("\n📦 [ML] Updating models with latest data...")
        
        run_script("preprocess.py")
        run_script("lstm_model.py")
        run_script("predict.py")

        print("🎉 [ML] Pipeline updated successfully. Sleeping...\n")

        # Sleep for 10 minutes
        time.sleep(600)

# ----------------------------------------------------
# Initial ML pipeline (runs once at startup)
# ----------------------------------------------------
def startup_pipeline():
    print("\n🚀 Initializing ML Pipeline (first run)...\n")

    run_script("preprocess.py")
    run_script("lstm_model.py")
    run_script("predict.py")

    print("🏁 ML Initialization Completed.\n")

# ----------------------------------------------------
# API Endpoint (fast & non-blocking)
# ----------------------------------------------------
@app.route("/predictions", methods=["GET"])
def get_predictions():
    next_1hr = load_csv("data/predictions_lstm_1hr.csv")
    next_10hr = load_csv("data/predictions_lstm_10hr.csv")

    return jsonify({
        "next_1_hour": next_1hr,
        "next_10_hours": next_10hr
    })

# ----------------------------------------------------
# Flask + Background Thread Start
# ----------------------------------------------------
if __name__ == "__main__":
    # Run initial inference once
    startup_pipeline()

    # Start background auto-retrainer
    trainer_thread = threading.Thread(target=periodic_trainer, daemon=True)
    trainer_thread.start()

    # Start Flask API
    app.run(port=5001, debug=False, use_reloader=False)
