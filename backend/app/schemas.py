from pydantic import BaseModel, ConfigDict
from datetime import date

class SalesRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    order_date: date
    sku_id: str
    product_name: str
    product_category: str
    region: str
    quantity: int
    demand_target: int
    unit_price: float
    discount: float
    promotion_flag: bool
    revenue: float
    year: int
    month: int
    quarter: int
    week_of_year: int
    day_of_week: str
    is_weekend: bool
    season: str
    holiday_flag: bool
    holiday_name: str
    current_inventory: int
    lead_time_days: int
    safety_stock: int
    reorder_point: int
    stockout_risk: bool
    overstock_risk: bool
    inventory_status: str
    recommended_reorder_qty: int
    category_demand_index: float
    net_unit_price: float
    inventory_gap_to_reorder: int
    inventory_coverage_ratio: float


import math
from typing import Optional

MONTH_MAX_DAYS = {
    1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
}


class ConfidenceRangeSchema(BaseModel):
    lower: float
    upper: float


class InventoryAnalysisSchema(BaseModel):
    current_inventory: int
    variance: float
    status: str
    shortage_qty: float
    surplus_qty: float
    safety_buffer: float
    target_inventory: float
    recommended_reorder: int
    explanation: str


class CustomPredictionRequest(BaseModel):
    category: str
    month_num: int
    avg_price: float
    promo_days: int = 0
    holiday_days: int = 0
    lag1: float
    lag2: float
    rolling3: Optional[float] = None
    current_inventory: Optional[int] = None
    request_id: Optional[str] = None

    @classmethod
    def validate_finite(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not math.isfinite(v):
            raise ValueError("Numeric value must be a finite number")
        return v

    def validate_days(self) -> None:
        max_days = MONTH_MAX_DAYS.get(self.month_num, 31)
        if self.promo_days > max_days:
            raise ValueError(f"promo_days ({self.promo_days}) exceeds maximum days ({max_days}) for month {self.month_num}")
        if self.holiday_days > max_days:
            raise ValueError(f"holiday_days ({self.holiday_days}) exceeds maximum days ({max_days}) for month {self.month_num}")


from pydantic import field_validator, model_validator


class ValidatedCustomPredictionRequest(BaseModel):
    category: str
    month_num: int
    avg_price: float
    promo_days: int = 0
    holiday_days: int = 0
    lag1: float
    lag2: float
    rolling3: Optional[float] = None
    current_inventory: Optional[int] = None
    request_id: Optional[str] = None

    @field_validator("avg_price", "lag1", "lag2", "rolling3")
    @classmethod
    def check_finite(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not math.isfinite(v):
            raise ValueError("Numeric value must be a finite number")
        return v

    @field_validator("avg_price")
    @classmethod
    def check_positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("avg_price must be greater than zero")
        return v

    @field_validator("lag1", "lag2")
    @classmethod
    def check_non_negative_lags(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Lag demand volumes must be non-negative")
        return v

    @field_validator("rolling3")
    @classmethod
    def check_non_negative_rolling(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("rolling3 must be non-negative")
        return v

    @field_validator("current_inventory")
    @classmethod
    def check_non_negative_inventory(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("current_inventory must be non-negative")
        return v

    @field_validator("month_num")
    @classmethod
    def check_month_num(cls, v: int) -> int:
        if v < 1 or v > 12:
            raise ValueError("month_num must be between 1 and 12")
        return v

    @field_validator("promo_days", "holiday_days")
    @classmethod
    def check_non_negative_days(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Day counts must be non-negative")
        return v

    @model_validator(mode="after")
    def validate_days_within_month(self) -> "ValidatedCustomPredictionRequest":
        max_days = MONTH_MAX_DAYS.get(self.month_num, 31)
        if self.promo_days > max_days:
            raise ValueError(f"promo_days ({self.promo_days}) exceeds maximum days ({max_days}) for month {self.month_num}")
        if self.holiday_days > max_days:
            raise ValueError(f"holiday_days ({self.holiday_days}) exceeds maximum days ({max_days}) for month {self.month_num}")
        return self


class CustomPredictionResponse(BaseModel):
    category: str
    predicted_demand: float
    confidence_range: ConfidenceRangeSchema
    inventory_analysis: Optional[InventoryAnalysisSchema] = None
    model_version: str = "2.0.0"
    model_used: str = "XGBoost Regressor"
    is_fallback: bool = False
    preferred_model: str = "XGBoost"
    features_used: dict[str, float | int]
    request_id: Optional[str] = None


class NextMonthPredictionResponse(BaseModel):
    category: str
    predicted_demand: float
    confidence_range: ConfidenceRangeSchema
    based_on_period: str
    forecast_period: str
    model_version: str = "2.0.0"
    model_used: str = "XGBoost Regressor"
    is_fallback: bool = False
    preferred_model: str = "XGBoost"
    data_source: str = "Synthetic prototype dataset"
    features_used: Optional[dict[str, float | int]] = None


class BatchPredictionItemRequest(BaseModel):
    category: str
    month_num: int
    avg_price: float
    promo_days: int = 0
    holiday_days: int = 0
    lag1: float
    lag2: float
    rolling3: Optional[float] = None
    current_inventory: Optional[int] = None
    request_id: Optional[str] = None


class BatchPredictionRequest(BaseModel):
    items: list[BatchPredictionItemRequest]


class BatchPredictionItemResult(BaseModel):
    index: int
    request_id: Optional[str] = None
    success: bool
    category: Optional[str] = None
    prediction: Optional[CustomPredictionResponse] = None
    error: Optional[str] = None


class BatchPredictionResponse(BaseModel):
    total_items: int
    successful_count: int
    failed_count: int
    successful_items: Optional[int] = None
    failed_items: Optional[int] = None
    results: list[BatchPredictionItemResult]


class ModelStatusItem(BaseModel):
    category: str
    file_exists: bool
    cached_in_memory: bool
    model_version: Optional[str] = None
    trained_at: Optional[str] = None
    residual_std: Optional[float] = None
    preferred_model: Optional[str] = None
    wape_pct: Optional[float] = None
    features: Optional[list[str]] = None
    error: Optional[str] = None


class ModelStatusResponse(BaseModel):
    total_supported: int
    models: list[ModelStatusItem]


class CategoryInventoryRisk(BaseModel):
    category: str
    forecast_demand: float
    forecast_period: str
    confidence_lower: float
    confidence_upper: float
    current_inventory: float
    safety_stock: float
    reorder_point: float
    lead_time_days: float
    lead_time_demand: float
    confirmed_incoming_inventory: int = 0
    incoming_inventory_tracked: bool = False
    net_inventory_available: float
    suggested_replenishment_qty: int
    stockout_risk: bool
    stockout_severity: str  # "Critical", "High", "Medium", "Low"
    overstock_risk: bool
    surplus_units: int
    inventory_status: str  # "Critical Stockout", "Reorder Required", "Overstock", "Healthy"
    assumptions: list[str]
    strategic_explanation: str


class InventorySummary(BaseModel):
    total_categories: int
    stockout_risk_count: int
    overstock_risk_count: int
    healthy_count: int
    total_suggested_reorder_units: int
    active_dataset_cycle: str


class InventoryIntelligenceResponse(BaseModel):
    summary: InventorySummary
    category_risks: list[CategoryInventoryRisk]
    disclaimer: str
    automated_ordering_enabled: bool = False


class CategoryPricingInsight(BaseModel):
    category: str
    avg_unit_price: float
    avg_discount_pct: float
    promo_days_avg: float
    observed_sales_volume: float
    promo_volume_lift_pct: Optional[float] = None
    overstock_flag: bool
    pricing_review_recommended: bool
    recommended_action: str
    rationale: str
    empirical_observations: list[str]
    limitations: list[str]


class SKUPricingInsight(BaseModel):
    sku_id: str
    product_name: str
    category: str
    unit_price: float
    current_inventory: int
    reorder_point: int
    inventory_status: str
    markdown_candidate: bool
    observation_summary: str


class PricingInsightsResponse(BaseModel):
    category_insights: list[CategoryPricingInsight]
    sku_markdown_candidates: list[SKUPricingInsight]
    data_limitations: list[str]
    causal_claim_disclaimer: str


from typing import Any, Dict


class StructuredInsight(BaseModel):
    id: str
    title: str
    explanation: str
    category: str  # "demand_trends", "inventory_risk", "pricing_promotion", "forecast_limitations", "seasonality"
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"
    supporting_metrics: Dict[str, Any] = {}
    sku: Optional[str] = None
    category_name: Optional[str] = None
    period: Optional[str] = None
    recommendation: Optional[str] = None
    data_source: str
    evidence_quality: str  # "HIGH_EMPIRICAL", "MODEL_BENCHMARK", "ESTIMATED_RUN_RATE", "PROPORTIONAL_APPROXIMATION"
    limitations: list[str] = []


class StructuredInsightsResponse(BaseModel):
    insights: list[StructuredInsight]
    total_insights: int
    active_dataset_cycle: str
    data_disclaimer: str


class AskAssistantRequest(BaseModel):
    question: str
    category: Optional[str] = None


class BusinessAssistantResponse(BaseModel):
    question: str
    answer: str
    provider: str
    intent: str
    data_type: str  # "HISTORICAL_OBSERVATION", "MODEL_FORECAST", "INVENTORY_POLICY", "LIMITATION", "AMBIGUOUS", "UNAVAILABLE"
    period: str
    supporting_metrics: Dict[str, Any] = {}
    recommendations: list[str] = []
    limitations: list[str] = []
    clarifying_question: Optional[str] = None
    structured_insights: list[StructuredInsight] = []
    disclaimer: str