#Сборка
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Продакшн-сервер
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Копируем кастомный конфиг если нужно, либо используем дефолт
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]