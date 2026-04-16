# 🏎️ F1 Telemetry Pro: AI-Driven Performance Analysis

A high-performance analytics engine designed for granular Formula 1 telemetry processing. This tool synchronizes live data from the OpenF1 API, processes it via a FastAPI/PostgreSQL backend, and utilizes Llama 3.3 (Groq) for automated race engineering verdicts.

## 🚀 Key Features
* **ETL Data Pipeline**: Automated synchronization with OpenF1 API with smart duplication handling (Idempotent Sync).
* **Comparative Telemetry**: High-frequency speed and RPM analysis between drivers across specific session keys.
* **AI Race Engineering**: Integration with Groq's Llama 3.3-70B to provide professional-grade performance insights (cornering efficiency, power delivery).
* **Dockerized Environment**: Fully containerized stack with PostgreSQL health monitoring and isolated networking.

## 🛠️ Tech Stack
* **Backend**: FastAPI (Python 3.11), SQLAlchemy ORM, Pydantic.
* **Database**: PostgreSQL (Relational storage for time-series data).
* **Frontend**: React 18, Vite, Recharts (Data Visualization), Tailwind CSS.
* **AI/LLM**: Groq Cloud SDK (Llama 3.3-70B-Versatile).
* **Infrastructure**: Docker & Docker Compose.

## ⚙️ Quick Start
1. Create a `.env` file with your `GROQ_API_KEY` and DB credentials.
2. Run the entire stack:
   ```bash
   docker-compose up -d --build