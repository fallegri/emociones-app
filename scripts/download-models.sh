#!/bin/bash
# Download face-api.js models for emotion detection
# Models are served from /public/models in Next.js

MODEL_DIR="public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

mkdir -p $MODEL_DIR

echo "Downloading SSD MobileNet v1 model (primary - better for groups)..."
curl -sL "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json" -o "$MODEL_DIR/ssd_mobilenetv1_model-weights_manifest.json"
curl -sL "$BASE_URL/ssd_mobilenetv1_model-shard1" -o "$MODEL_DIR/ssd_mobilenetv1_model-shard1"
curl -sL "$BASE_URL/ssd_mobilenetv1_model-shard2" -o "$MODEL_DIR/ssd_mobilenetv1_model-shard2"

echo "Downloading Tiny Face Detector (fallback - faster, less accurate)..."
curl -sL "$BASE_URL/tiny_face_detector_model-weights_manifest.json" -o "$MODEL_DIR/tiny_face_detector_model-weights_manifest.json"
curl -sL "$BASE_URL/tiny_face_detector_model-shard1" -o "$MODEL_DIR/tiny_face_detector_model-shard1"

echo "Downloading Face Landmark 68 model..."
curl -sL "$BASE_URL/face_landmark_68_model-weights_manifest.json" -o "$MODEL_DIR/face_landmark_68_model-weights_manifest.json"
curl -sL "$BASE_URL/face_landmark_68_model-shard1" -o "$MODEL_DIR/face_landmark_68_model-shard1"

echo "Downloading face expression model..."
curl -sL "$BASE_URL/face_expression_model-weights_manifest.json" -o "$MODEL_DIR/face_expression_model-weights_manifest.json"
curl -sL "$BASE_URL/face_expression_model-shard1" -o "$MODEL_DIR/face_expression_model-shard1"
curl -sL "$BASE_URL/face_expression_model-shard2" -o "$MODEL_DIR/face_expression_model-shard2"

echo "Models downloaded successfully!"
ls -la $MODEL_DIR
