# Берем официальный образ Python
FROM python:3.11-slim

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Сначала копируем только список зависимостей
COPY requirements.txt .

# ЗАПУСКАЕМ УСТАНОВКУ (этот шаг ты, скорее всего, пропустил)
RUN pip install --no-cache-dir -r requirements.txt

# Копируем остальной код (main.py и прочее)
COPY . .

# Команда для запуска
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]