import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept responses to extract meaningful error messages from FastAPI
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Network error or server unreachable";
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else if (data.message) {
        message = data.message;
      } else {
        message = JSON.stringify(data);
      }
    } else if (error.message) {
      message = error.message;
    }
    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    enhancedError.originalError = error;
    return Promise.reject(enhancedError);
  }
);

export const getSystemStatus = () => api.get("/status").then((res) => res.data);

export const getSummary = () => api.get("/summary").then((res) => res.data);

export const getTrendingProducts = () => api.get("/trends/products").then((res) => res.data);

export const getCategoryTrends = () => api.get("/trends/categories").then((res) => res.data);

export const getSeasonality = (category) =>
  api.get("/seasonality", { params: category ? { category } : {} }).then((res) => res.data);

export const trainModels = () => api.post("/train").then((res) => res.data);

export const getModelMetrics = () => api.get("/metrics").then((res) => res.data);

export const getPrediction = (category) => api.get(`/predict/${category}`).then((res) => res.data);

export const getAllPredictions = () => api.get("/predict").then((res) => res.data);

export const getRecommendations = () => api.get("/recommendations").then((res) => res.data);

export const getProductInventory = () => api.get("/inventory/products").then((res) => res.data);

export const getInsights = () => api.get("/insights").then((res) => res.data);

export const getStructuredInsights = (category) =>
  api.get("/insights/structured", { params: category && category !== "all" ? { category } : {} }).then((res) => res.data);

export const askAssistant = (question, category) =>
  api.post("/ask", { question, category: category && category !== "all" ? category : undefined }, { timeout: 45000 }).then((res) => res.data);

export const predictCustom = (payload) =>
  api.post("/predict/custom", payload).then((res) => res.data);

export const getCategoryDefaults = (category) =>
  api.get(`/predict/defaults/${category}`).then((res) => res.data);

export const getModelBenchmark = () =>
  api.get("/ml/benchmark").then((res) => res.data);

export const getModelFeatureSchema = () =>
  api.get("/ml/feature-schema").then((res) => res.data);

export const getModelStatus = () =>
  api.get("/ml/status").then((res) => res.data);

export const predictBatch = (payload) =>
  api.post("/predict/batch", payload).then((res) => res.data);

export const getInventoryIntelligence = (category) =>
  api.get("/inventory/intelligence", { params: category && category !== "all" ? { category } : {} }).then((res) => res.data);

export const getPricingInsights = (category) =>
  api.get("/pricing/insights", { params: category && category !== "all" ? { category } : {} }).then((res) => res.data);