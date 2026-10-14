from sqlalchemy import create_engine, Column, Integer, String, Float, Date, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, index=True)
    order_date = Column(Date, index=True, nullable=False)
    customer_id = Column(Integer)
    sku_id = Column(String, index=True)
    product_name = Column(String, index=True, nullable=False)
    product_category = Column(String, index=True, nullable=False)
    region = Column(String, index=True)

    quantity = Column(Integer, nullable=False)
    demand_target = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float)
    promotion_flag = Column(Boolean, default=False)
    revenue = Column(Float, nullable=False)
    payment_method = Column(String)
    delivery_days = Column(Integer)
    customer_rating = Column(Float)

    year = Column(Integer, index=True)
    month = Column(Integer, index=True)
    quarter = Column(Integer)
    week_of_year = Column(Integer)
    day_of_week = Column(String)
    is_weekend = Column(Boolean, default=False)
    season = Column(String)
    holiday_flag = Column(Boolean, default=False)
    holiday_name = Column(String)

    current_inventory = Column(Integer)
    lead_time_days = Column(Integer)
    safety_stock = Column(Integer)
    reorder_point = Column(Integer)
    stockout_risk = Column(Boolean, default=False)
    overstock_risk = Column(Boolean, default=False)
    inventory_status = Column(String)
    recommended_reorder_qty = Column(Integer)
    category_demand_index = Column(Float)
    net_unit_price = Column(Float)
    inventory_gap_to_reorder = Column(Integer)
    inventory_coverage_ratio = Column(Float)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    data_source = Column(String, default="DemandIQ_Synthetic_Retail_v2", nullable=False)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()