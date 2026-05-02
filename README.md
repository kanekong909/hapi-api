# Hapi API — Backend

API REST para el seguimiento de movimientos de inversión en Hapi.  
Stack: **Node.js + Express + PostgreSQL**. Desplegada en **Railway**.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servidor y BD |
| GET | `/api/movimientos` | Listar movimientos (con filtros y paginación) |
| GET | `/api/movimientos/resumen` | Totales y estadísticas |
| GET | `/api/movimientos/:id` | Obtener un movimiento |
| POST | `/api/movimientos` | Crear movimiento |
| PUT | `/api/movimientos/:id` | Actualizar movimiento |
| DELETE | `/api/movimientos/:id` | Eliminar movimiento |
| GET | `/api/currency/trm` | TRM actual USD→COP |
| POST | `/api/currency/convertir` | Convertir valor entre USD y COP |

---

## Filtros disponibles (GET /api/movimientos)

```
?orden=COMPRA|VENTA
?tipo=ACCION|CRIPTO|ETF|BONO|OTRO
?simbolo=AAPL
?desde=2025-01-01
?hasta=2025-12-31
?page=1&limit=20
?sort=fecha&dir=DESC
```

---

## Estructura del body para crear/actualizar

```json
{
  "orden": "COMPRA",
  "nombre": "Apple Inc.",
  "simbolo": "AAPL",
  "tipo": "ACCION",
  "valor_usd": 182.50,
  "fecha": "2025-04-28",
  "notas": "Primera compra"
}
```

> Si envías `valor_usd`, se calcula `valor_cop` automáticamente con la TRM del día.  
> Si envías `valor_cop`, se calcula `valor_usd`.  
> Puedes enviar ambos si ya tienes los valores.

---

## Conversión de moneda

```http
POST /api/currency/convertir
{
  "valor": 500,
  "de": "USD"
}
```

Respuesta:
```json
{
  "data": {
    "usd": 500,
    "cop": 2060000,
    "trm": 4120,
    "fecha": "2025-04-28"
  }
}
```

---

## Setup local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL local
```

### 3. Crear la base de datos (PostgreSQL local)
```bash
createdb hapi_db
```

### 4. Ejecutar migraciones
```bash
npm run db:migrate
```

### 5. (Opcional) Insertar datos de ejemplo
```bash
npm run db:seed
```

### 6. Iniciar el servidor
```bash
npm run dev       # con hot-reload (Node 18+)
npm start         # producción
```

El servidor corre en `http://localhost:3000`.

---

## Deploy en Railway

### Paso a paso

1. **Crear cuenta en Railway** → [railway.app](https://railway.app)

2. **Crear un nuevo proyecto** → "New Project"

3. **Agregar PostgreSQL**:  
   - "+ New" → "Database" → "Add PostgreSQL"  
   - Railway crea la DB y expone `DATABASE_URL` automáticamente

4. **Agregar el backend**:  
   - "+ New" → "GitHub Repo" → seleccionar este repositorio  
   - Railway detecta el `railway.toml` y usa `node src/index.js`

5. **Variables de entorno** en el servicio del backend:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://tu-frontend.up.railway.app
   ```
   > `DATABASE_URL` ya viene inyectada por Railway al estar en el mismo proyecto.

6. **Ejecutar migraciones** desde la terminal de Railway:
   ```bash
   node src/db/migrate.js
   ```

7. Listo. El endpoint público queda en:  
   `https://tu-api.up.railway.app`

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | Sí |
| `PORT` | Puerto del servidor (Railway lo asigna solo) | No |
| `NODE_ENV` | `development` o `production` | No |
| `FRONTEND_URL` | URL del frontend Angular (para CORS) | Sí en prod |
