#!/bin/bash
# Download face-api.js models for emotion detection
# Models are served from /public/models in Next.js

MODEL_DIR="public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

mkdir -p $MODEL_DIR

echo "Downloading face detection model (tiny_face_detector)..."
curl -sL "$BASE_URL/tiny_face_detector_model-weights_manifest.json" -o "$MODEL_DIR/tiny_face_detector_model-weights_manifest.json"
curl -sL "$BASE_URL/tiny_face_detector_model-shard1" -o "$MODEL_DIR/tiny_face_detector_model-shard1"

echo "Downloading face expression model..."
curl -sL "$BASE_URL/face_expression_model-weights_manifest.json" -o "$MODEL_DIR/face_expression_model-weights_manifest.json"
curl -sL "$BASE_URL/face_expression_model-shard1" -o "$MODEL_DIR/face_expression_model-shard1"
curl -sL "$BASE_URL/face_expression_model-shard2" -o "$MODEL_DIR/face_expression_model-shard2"

echo "Models downloaded successfully!"
ls -la $MODEL_DIR
