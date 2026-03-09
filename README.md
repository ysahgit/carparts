# BMW Parts Shop — Full Stack Demo

## Stack
- **Frontend**: React (Vite) — drill-down parts finder UI
- **Backend**: Node.js + Express + better-sqlite3
- **Database**: SQLite (`bmw_parts.db`)
- **Cloud deploy**: AWS (see below)

---

## Quick Start (Local)

### 1. Backend
```bash
cd backend
npm install
node seed.js          # creates & populates bmw_parts.db
npm start             # API at http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # UI at http://localhost:5173
```

---

## Database Schema

```
brands      → models → years → variants
                                  ↓
categories  ──────────────────── parts
```

### Tables
| Table | Key columns |
|-------|-------------|
| `brands` | id, name |
| `models` | id, brand_id, name |
| `years` | id, model_id, year |
| `variants` | id, year_id, name, engine |
| `categories` | id, name |
| `parts` | id, variant_id, category_id, name, part_number, price, stock, brand, notes |

---

## API Endpoints

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| GET | `/api/models` | — | All BMW models |
| GET | `/api/years` | `model_id` | Years for a model |
| GET | `/api/variants` | `model_id`, `year` | Engine variants |
| GET | `/api/parts` | `variant_id`, `category?` | Parts list |
| GET | `/api/search` | `q` | Search by name or part number |

---

## AWS Deployment

### Option A — EC2 (simplest)
1. Launch an EC2 t3.micro (Ubuntu 22.04), open ports 80 + 443
2. Install Node.js 20 + nginx
3. Upload project via `scp` or clone from Git
4. Run backend with `pm2 start server.js`
5. Serve frontend build with nginx
6. Use nginx reverse proxy `/api` → `localhost:3001`

### Option B — Elastic Beanstalk
1. `eb init` + `eb create`
2. Set `NODE_ENV=production` env var
3. SQLite file lives on the instance (or use EFS for persistence)

### Option C — Separate services (scalable)
- Frontend → **S3 + CloudFront** (static hosting)
- Backend → **Elastic Beanstalk** or **App Runner**
- DB → Keep SQLite for <100k parts, or migrate to **RDS PostgreSQL** for larger catalogues

---

## Adding More Brands / Parts
1. Insert into `brands`: `INSERT INTO brands (name) VALUES ('Audi');`
2. Insert models, years, variants following the same pattern
3. The drill-down UI adapts automatically

## Migrating to PostgreSQL (when you outgrow SQLite)
The schema is identical. Just swap `better-sqlite3` for `pg` and update queries to use `$1` placeholders instead of `?`.
