# RoadSense System

An AI-powered road monitoring and violation tracking system using YOLO for vehicle detection and Laravel + React + MongoDB for real-time data logging and user interface.

---

## 🚀 Tech Stack

**Frontend**: React.js + Vite + MUI + Tailwind CSS  
**Backend**: Laravel (PHP 8.4+) + MongoDB PHP Library  
**Database**: MongoDB Atlas  
**AI Model**: YOLOv11 (object detection & speed estimator) + yolov8 (license plate detection model)
**RTC**: MediaMTX for WebRTC streaming  
**Scripts**: Node.js for image/report uploads

---

## 📁 Project Structure

```
roadsense/
├── backend/               # Laravel backend (API + Auth)
├── frontend/              # React frontend (Admin/User UI)
├── yolov11-env/           # Python virtual environment for YOLO
├── violation_logging/     # Logs & reports vehicle violations
├── mediamtx.yml           # WebRTC media server config
├── start_services.sh      # Starts YOLO, Node upload, and WebRTC
├── stop_services.sh       # Stops all services
```

---

## ⚙️ Setup

**update these files:**
backend/config/cors.php -> add raspberry pi IP to allowed_origins

mediamtx.yml -> add camera IP to paths:cam:source

prediction_model/run_full_predictions.py -> add camera IP as cv2.videoCapture() parameter

frontend/.env-> add local machine IP to as BASE_URL

frontend/.env -> add local machine IP to .env file as VITE_RTSP_STREAM_ADDRESS:8889

### 1. Laravel Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=0.0.0.0 --port=8000  # or use Herd if installed
php artisan serve --host=0.0.0.0 --port=8000
```

> Note: Ensure MongoDB credentials are correctly set in `.env`.
> use env.example as a starting point!

### 2. React Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Python YOLO Model

```bash
source ~/yolov11-env/bin/activate
pip install opencv-python numpy ultralytics easyocr
cd prediction_model/
python stream_based_predictions.py #run on rtsp camera stream
OR
python video_based_predictions.py #run the script on a video file and write results to mp4 file
```

### 4. Node.js Violation Logger

```bash
cd violation_logging/
node upload_report.js
```

### 5. WebRTC Stream

```bash
mediamtx
```

---

Logs are written to `.log` files silently.

---

## 👥 User Roles

| Role  | Access                                               |
| ----- | ---------------------------------------------------- |
| Admin | Full dashboard access, manage users, view violations |
| User  | Limited access, view personal violations only        |

---

## 🌐 API Endpoints (Sample)

### Auth

- `POST /register`
- `POST /login`
- `POST /logout`

### User Management

- `GET /admin/user` (admin only)
- `GET /user/profile` (user only)

### Violations

- `GET /violations`
- `GET /violations/{id}`
- `POST /violations`
- `PUT /violations/{id}`
- `DELETE /violations/{id}`

---

## 🔧 Environment (.env.example)

```
APP_NAME=RoadSense
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mongodb
DB_HOST=cluster.mongodb.net
DB_PORT=27017
DB_DATABASE=roadsense
DB_USERNAME=<your_username>
DB_PASSWORD=<your_password>

SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
```

---

## 🛠 Troubleshooting

- `composer install` fails → ensure PHP >= 8.3 and MongoDB PHP extension installed
- Laravel 500 error → check `.env` DB credentials or run `php artisan key:generate`
- Port conflicts → update WebRTC or Laravel port configs as needed

---

## 🚧 Disclaimer

This system is currently under active development and intended for demo and testing purposes only. It is not yet ready for production use. Features and functionalities may change without notice.
