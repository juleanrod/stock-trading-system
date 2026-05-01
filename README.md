# TradeSim: Real-Time Stock Trading System 📈

**TradeSim** is a full-stack, real-time stock trading platform engineered to simulate a live market environment. Built with modern web technologies, it features dynamic price generation, bi-directional WebSocket communication for live data feeds, and a fully automated Infrastructure-as-Code (IaC) deployment pipeline for AWS.

This repository serves as a showcase of end-to-end software engineering—from a responsive Next.js frontend to a Dockerized PostgreSQL/Node.js backend, all the way to a "zero-touch" AWS EC2 deployment automation.

---

## ✨ Core Features

### 🔄 Real-Time Market Data
- **Live Price Feeds:** Driven by `Socket.io`, market prices tick dynamically, pushing updates instantly to all connected clients without HTTP polling.
- **Algorithmic Volatility:** A backend polling engine generates realistic price fluctuations based on individual stock volatility and market trends.
- **Timezone-Aware Market Hours:** Enforces strict trading hours (e.g., 9:30 AM – 4:00 PM EST), correctly calculated regardless of the server's local timezone.

### 💼 Portfolio & Wealth Management
- **Instant Trade Execution:** Users can buy and sell active stocks with immediate portfolio reflection and strict cash-balance constraints.
- **Transaction History:** Immutable ledger of every trade action logged to the PostgreSQL database.
- **Idempotent Upserts:** Database architecture specifically designed to handle concurrent transaction races and prevent duplicate ledger entries.

### 🔐 Role-Based Access & Admin Dashboard
- **Standard Users:** Dedicated dashboard for market viewing, trading, and portfolio monitoring.
- **Admin Control Panel:** Admins can inject new IPOs (stocks), halt trading, seed initial market conditions, and manage global system state.

### 🚀 Zero-Touch AWS Deployment
- **Custom Bash Automation:** Features a robust, idempotent `deploy.sh` pipeline that interacts directly with AWS CLI.
- **Automated Provisioning:** The script dynamically provisions security groups, SSH keys, and an EC2 instance.
- **Remote Payload Execution:** Zips the application, transports it via SSH, installs Docker natively on the fresh Ubuntu server, and spins up the multi-container architecture via `docker-compose`.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) / React 19
- **Styling:** Tailwind CSS 4, `clsx`, `tailwind-merge`
- **Icons:** Lucide React
- **Real-Time Integration:** `socket.io-client`

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) with Express.js
- **Real-Time Engine:** `Socket.io`
- **Database:** PostgreSQL 15 (Dockerized)
- **Authentication:** JWT-based stateless authentication

### Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx (Handles HTTP routing and WebSocket upgrading)
- **Cloud Provider:** AWS EC2
- **Automation:** Native Shell/Bash scripting

---

## 📸 Application Gallery

> **Note to self/developer:** Add high-quality screenshots here before publishing!
> 
> *Suggested Screenshots:*
> 1. `![Market Dashboard](./docs/screenshots/market.png)` - Showing live ticker prices and charts.
> 2. `![Trade Execution](./docs/screenshots/trade_modal.png)` - Showing the buy/sell interface.
> 3. `![Admin Panel](./docs/screenshots/admin.png)` - Showing stock creation and system controls.

---

## 💻 Local Development Setup

If you want to run this application locally on your machine, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose (for the database)
- OR a local PostgreSQL installation (v14+)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/stock-trading-system.git
cd stock-trading-system
```

### 2. Environment Variables
You will need to create `.env` files in both the `backend` and `frontend` directories. You can use the provided `.env.example` as a template.

**Backend (`backend/.env`):**
```env
PORT=5000
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trade_sim
JWT_SECRET=super_secret_jwt_key_for_local_dev
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### 3. Start the Backend Infrastructure
The easiest way to get the database running is via Docker:
```bash
# This will spin up PostgreSQL, the Backend API, and Nginx locally
docker-compose up -d
```
*Alternatively, you can run the backend natively using `npm run dev` inside the `backend` folder after setting up a local Postgres instance.*

### 4. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deploying to AWS

This repository contains a highly resilient `deploy.sh` script to launch the entire ecosystem into production. 

### Prerequisites for Deployment
- AWS CLI installed and authenticated with programmatic access.
- An AWS account with permissions to manage EC2, Security Groups, and Key Pairs.

### Launching Production
Simply run the deploy script from the root of the project:
```bash
./deploy.sh
```

**What the script does:**
1. Validates AWS credentials and state.
2. Creates an open Security Group (`trade-sim-sg`) for ports 22 and 80.
3. Provisions a new `t3.medium` EC2 instance with an expanded gp3 EBS volume.
4. Archives the source code and securely copies it over SSH.
5. Installs Docker/Docker Compose remotely.
6. Builds and runs the entire architecture via `docker-compose up -d --build`.

**To seed the admin account:**
Once deployed, you can securely inject the initial admin user into the production database:
```bash
./seed_admin.sh
```

**To tear down infrastructure:**
```bash
./destroy.sh
```

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
