# Smart Helmet IoT — Complete Project Documentation

## 1. PROJECT OVERVIEW

Smart Helmet IoT is a safety system for motorcycle riders. When the helmet detects danger (fall/accident, alcohol consumption, or drowsiness), it sends push notifications to linked family members via Firebase Cloud Messaging (FCM). Family members can monitor the rider's status in real time on a React Native dashboard.

**Key Design Decisions:**
- No email alerts — fully replaced by FCM push notifications
- One React Native app with two roles: Rider and Family
- Full-screen call-like emergency notification on Android when danger detected (family side)
- False alert handling: Rider gets 120s countdown — "I'M SAFE" cancels, "SEND NOW" or timer expiry sends alert to family
- Family linking via 6-digit code (permanent in MongoDB until rider removes)
- Android only, Expo SDK 54, React Native 0.81.5, React 19.1.0
- MongoDB Atlas for database, Firebase for FCM push notifications

---

## 2. SYSTEM ARCHITECTURE & DATA FLOW

```
ESP32 Helmet (Smart Helmet v3.0)
  │  WiFi → HTTP POST to Node.js Server
  │  Bluetooth → Bike Unit (SAFE/UNSAFE)
  │
  ▼
Node.js Server (Express + MongoDB + Firebase Admin)
  │  Receives alerts from ESP32
  │  Saves to MongoDB
  │  Sends FCM push notifications to family
  │  Provides REST API for mobile app
  │
  ▼
MongoDB Atlas (helmetdb database)
  │  Stores users, alerts, sensor status
  │
  ▼
React Native Mobile App (Expo SDK 54)
  │  Rider Dashboard — manages helmet, links family
  │  Family Dashboard — monitors rider, receives alerts
  │  Auto-login via AsyncStorage
  │
  ▼
Firebase Cloud Messaging (FCM)
  │  Sends push notifications to family phones
  │  Full-screen emergency intent on Android
```

---

## 3. BACKEND — Node.js Express Server

### 3.1 Tech Stack
- **Runtime:** Node.js v22.17.1
- **Framework:** Express.js
- **Database:** MongoDB Atlas (cluster0.tlpir1q.mongodb.net, database `helmetdb`, user `helmetuser`)
- **Auth:** Firebase Admin SDK (project: smarthelmet-fb5a7)
- **Sessions:** Express sessions stored in MongoDB via connect-mongo
- **PC IP:** 192.168.1.104 (server runs on port 3000)

### 3.2 Key Files

| File | Purpose |
|------|---------|
| `server/server.js` | Express server entry, session config, middleware setup |
| `server/.env` | Firebase keys, MongoDB Atlas URI, port 3000 |
| `server/models/User.js` | Mongoose User schema |
| `server/config/firebase.js` | Firebase Admin SDK initialization |
| `server/middleware/auth.js` | Simple token auth (user _id as token) |
| `server/routes/auth.js` | Signup, login, logout, session, profile |
| `server/routes/alert.js` | Fall/alcohol/drowsiness alerts, history, dismiss, notifyFamily via FCM |
| `server/routes/family.js` | Linking code, link/unlink, rider-status |

### 3.3 User Schema (MongoDB)

```javascript
{
  firebaseUid: String,
  email: String,
  username: String,
  password: String,
  phone: String,
  vehicle: String,
  role: 'rider' | 'family',
  fcmToken: String,

  // Rider-specific
  linkedFamily: [{ type: ObjectId, ref: 'User' }],
  linkingCode: String,
  linkingCodeExpiry: Date,

  // Family-specific
  linkedRider: ObjectId,

  // Current active alert
  currentAlert: {
    type: 'fall' | 'alcohol' | 'drowsiness',
    location: String,
    timestamp: Date,
    active: Boolean
  },

  // Alert history (all past alerts)
  alertHistory: [{
    type: String,
    location: String,
    timestamp: Date,
    active: Boolean,
    dismissed: Boolean
  }],

  // Latest sensor diagnostics
  sensorStatus: {
    alcohol: Number,
    drowsy: Boolean,
    fall: Boolean,
    helmetOn: Boolean,
    gpsActive: Boolean,
    lastUpdate: Date
  }
}
```

### 3.4 API Endpoints

#### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup-direct` | email, password, username, phone, vehicle, role | Create user |
| POST | `/api/auth/login` | email, password | Login, returns token + user |
| GET | `/api/auth/session` | (auth header) | Check session |
| POST | `/api/auth/logout` | (auth header) | Logout |

#### Alerts
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/alert/fall` | userId, location | Helmet sends fall alert |
| POST | `/api/alert/alcohol` | userId, location | Helmet sends alcohol alert |
| POST | `/api/alert/drowsiness` | userId, location | Helmet sends drowsiness alert |
| POST | `/api/alert/reset` | userId | Helmet sends safe/reset signal |
| POST | `/api/alert/dismiss` | userId, alertId | Family dismisses alert |
| GET | `/api/alert/history/:userId` | — | Get alert history |
| POST | `/api/alert/diagnostics` | userId, alcohol, drowsy, fall, helmetOn, gpsActive | Helmet sends sensor data |

#### Family
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/family/generate-code` | (auth header) | Rider generates 6-digit code |
| POST | `/api/family/link` | code | Family links to rider |
| POST | `/api/family/unlink` | (auth header) | Family unlinks from rider |
| GET | `/api/family/linked-family` | (auth header) | Rider views linked family |
| GET | `/api/family/rider-status` | (auth header) | Family gets rider status + alerts |

### 3.5 Alert Notification Flow (FCM)

When helmet triggers an alert:
1. ESP32 sends HTTP POST to `/api/alert/{type}`
2. Server saves `currentAlert` and pushes to `alertHistory` in MongoDB
3. Server calls `notifyFamily()` which:
   - Finds all linked family members
   - Sends FCM push notification to each family member's device
   - Notification title: "🚨 ACCIDENT DETECTED" / "🍷 ALCOHOL DETECTED" / "😴 DROWSINESS DETECTED"
   - Notification body: "username — TYPE detected! Tap for details."
4. Family app polls `/api/family/rider-status` every 3 seconds
5. When `currentAlert.active === true`, family dashboard shows full-screen emergency overlay

### 3.6 False Alert Handling (Rider Side)
1. When alert triggers, rider gets a 120-second countdown on their app
2. "I'M SAFE" → calls `/api/alert/safe` → clears `currentAlert`
3. "SEND NOW" or timer expires → calls `/api/alert/not-safe` → sends FCM to family, clears `currentAlert`

---

## 4. FRONTEND — React Native Mobile App

### 4.1 Tech Stack
- **Framework:** Expo SDK 54
- **React Native:** 0.81.5
- **React:** 19.1.0
- **Navigation:** Inline screen switching (no React Navigation dependency in main App.js)
- **Storage:** AsyncStorage (auto-login)
- **API:** HTTP fetch to `http://192.168.1.104:3000`
- **Notifications:** expo-notifications + Firebase FCM
- **Maps:** react-native-maps + Google Maps via Linking API
- **Platform:** Android only

### 4.2 Key Files

| File | Purpose |
|------|---------|
| `mobile/App.js` | Main app — all screens in one file (~684 lines) |
| `mobile/index.js` | registerRootComponent entry |
| `mobile/package.json` | Dependencies and config |
| `mobile/src/services/api.js` | API client (BASE_URL) |
| `mobile/src/services/notifications.js` | FCM push notification setup |
| `mobile/src/services/firebase.js` | Firebase JS SDK config |
| `mobile/src/context/AuthContext.js` | Auth state management |
| `mobile/src/navigation/AppNavigator.js` | Navigation setup |
| `mobile/src/screens/*.js` | Individual screen components |

### 4.3 App Structure (App.js)

**Screens:**
1. **Loading** — Shows "SMART HELMET" logo + spinner, checks AsyncStorage for session
2. **Login** — Email/password login
3. **Signup** — Role selection (Rider/Family), then form for details
4. **RiderDashboard** — Sensor status, family management, linking code
5. **FamilyDashboard** — Rider monitoring, alert display, alert history, link management

**Rider Dashboard Tabs:**
- Dashboard — Helmet status (helmet on/off, alcohol, drowsy, GPS), linked family count
- Family — Generate linking code, list linked family members

**Family Dashboard Tabs:**
- Status — Current alert (full-screen emergency overlay), rider info, sensor status
- History — All past alerts with dismiss button, color-coded by type
- Link/Settings — Link to rider or manage linked rider

### 4.4 Alert Display (Family Dashboard)

**Full-Screen Emergency Overlay:**
- Shows when `currentAlert.active === true` and is a NEW alert (not previously seen)
- Different icon/color per type: 🚨 Red (fall), 🍷 Orange (alcohol), 😴 Purple (drowsiness)
- Shows rider name, time since alert, "VIEW LOCATION ON MAP" button, "DISMISS" button
- Auto-switches to Status tab when new alert detected

**Alert Card (inline on Status tab):**
- Same icon/color per type
- Shows alert type, time, VIEW LOCATION button

**Alert History:**
- Color-coded cards with left border per type
- Icons: 🚨 fall, 🍷 alcohol, 😴 drowsiness
- Dismissed alerts show "DISMISSED" badge (not removed from list)
- Tap to open location on Google Maps

### 4.5 Auto-Login Flow
1. On app start, check AsyncStorage for `authToken` and `user`
2. If both exist, auto-login and go to dashboard
3. If not, show login screen
4. On logout, clear AsyncStorage and return to login

---

## 5. IoT — ESP32 Helmet Firmware (helmet_connector_v3.ino)

### 5.1 Hardware Connections

| Component | Pin |
|-----------|-----|
| MQ-3 Alcohol Sensor | GPIO 34 (ADC) |
| IR Sensor (helmet presence) | GPIO 27 |
| Eye Sensor (drowsiness) | GPIO 33 |
| Buzzer | GPIO 26 |
| GPS TX | GPIO 16 (UART2 RX) |
| GPS RX | GPIO 17 (UART2 TX) |
| MPU6050 SDA | GPIO 21 |
| MPU6050 SCL | GPIO 22 |
| Bluetooth | Built-in (ESP32) |

### 5.2 Configuration

```cpp
const char* ssid = "TP-Link_FFB8";
const char* password = "$@Mi#2026";
const char* SERVER_IP = "192.168.1.104";
const char* USER_ID = "6a5362e553eec64b3526eb6d";
```

### 5.3 Detection Logic

| Detection | Method | Threshold |
|-----------|--------|-----------|
| Alcohol | MQ-3 analog reading | > 1800 |
| Drowsiness | Eye sensor HIGH for 5+ seconds | Continuous HIGH |
| Fall | MPU6050 accelerometer magnitude | > 2.5 or < 0.5 |
| Helmet On | IR sensor (broken, always HIGH) | Always ON |

### 5.4 Bluetooth Safety Broadcast

```
SAFE = !alcoholDetected && !isDrowsy && !fallDetected
UNSAFE = alcoholDetected || isDrowsy || fallDetected
```

- Bike relay turns ON when SAFE, OFF when UNSAFE
- IR sensor is broken (always HIGH), so it's excluded from safety calculation

### 5.5 Key Fixes Applied

1. **IR sensor broken** — removed from safety calculation, set `helmetOn = true` always
2. **Safe reset** — fires on alert→no-alert transition with 10s cooldown (not every loop iteration)
3. **API paths** — all use `/api/alert/` prefix (not `/alert/`)
4. **Diagnostics format** — sends flat JSON matching server schema
5. **College default location** — `https://maps.google.com/?q=15.903911,73.844577` when GPS not fixed
6. **Drowsiness alert** — added `sendDrowsinessAlert()` function
7. **Fall cooldown** — 30 seconds between fall alerts
8. **BT reconnection** — retries in loop if disconnected

### 5.6 Alert Functions

| Function | Endpoint | Payload |
|----------|----------|---------|
| `sendFallAlert()` | POST `/api/alert/fall` | { userId, location } |
| `sendAlcoholAlert()` | POST `/api/alert/alcohol` | { userId, location } |
| `sendDrowsinessAlert()` | POST `/api/alert/drowsiness` | { userId, location } |
| `sendSafeReset()` | POST `/api/alert/reset` | { userId } |
| `sendDiagnostics()` | POST `/api/alert/diagnostics` | { userId, alcohol, drowsy, fall, helmetOn, gpsActive } |

---

## 6. IoT — ESP32 Bike Firmware (bike_unit_final.ino)

### 6.1 Hardware
- Bluetooth Slave (receives SAFE/UNSAFE from helmet)
- Relay on GPIO 26 (controls bike motor)

### 6.2 Logic
- Receives "SAFE" from helmet → relay HIGH → motor ON
- Receives "UNSAFE" from helmet → relay LOW → motor OFF
- Auto-reconnects to helmet BT if disconnected

---

## 7. DATABASE — MongoDB Atlas

### 7.1 Connection
- **Cluster:** cluster0.tlpir1q.mongodb.net
- **Database:** helmetdb
- **User:** helmetuser
- **Connection string:** stored in `server/.env`

### 7.2 Collections

**users** collection:
- Each document is a user (rider or family)
- Indexed by `email` (unique)
- `linkedFamily` and `linkedRider` create references between users
- `alertHistory` is an embedded array (not a separate collection)
- `currentAlert` is an embedded subdocument
- `sensorStatus` is an embedded subdocument

### 7.3 Data Flow
1. Rider signs up → user document created with `role: 'rider'`
2. Family signs up → user document created with `role: 'family'`
3. Rider generates linking code → stored in `linkingCode` + `linkingCodeExpiry`
4. Family enters code → `linkedRider` set on family, `linkedFamily` updated on rider
5. Helmet sends alerts → `currentAlert` + `alertHistory` updated on rider
6. Family dismisses alert → `alertHistory[n].dismissed = true`
7. Rider unlinks family → `linkedFamily` pulled from rider, `linkedRider` cleared on family

---

## 8. FIREBASE — Push Notifications

### 8.1 Configuration
- **Project:** smarthelmet-fb5a7
- **SDK:** Firebase Admin SDK (server-side)
- **App:** Firebase JS SDK (client-side for FCM token)

### 8.2 Notification Types
| Alert Type | Title | Icon |
|------------|-------|------|
| Fall | 🚨 ACCIDENT DETECTED | 🚨 |
| Alcohol | 🍷 ALCOHOL DETECTED | 🍷 |
| Drowsiness | 😴 DROWSINESS DETECTED | 😴 |

### 8.3 Android Full-Screen Notification
- Channel: `emergency-alerts`
- Priority: `max`
- Sound + vibration enabled
- Full-screen intent for Android when alert arrives

---

## 9. COMPLETE FILE STRUCTURE

```
D:\SmartHelmet_IOT\
├── server/
│   ├── server.js              # Express server entry
│   ├── .env                    # Firebase keys, MongoDB URI, port
│   ├── package.json
│   ├── models/
│   │   └── User.js             # Mongoose User schema
│   ├── config/
│   │   └── firebase.js         # Firebase Admin SDK init
│   ├── middleware/
│   │   └── auth.js             # Simple token auth middleware
│   └── routes/
│       ├── auth.js             # Signup, login, logout, session
│       ├── alert.js            # Alert CRUD, dismiss, FCM notify
│       └── family.js           # Linking, rider-status, linked-family
├── mobile/
│   ├── App.js                  # Main React Native app (all screens)
│   ├── index.js                # registerRootComponent
│   ├── package.json            # Expo 54, RN 0.81.5, React 19.1.0
│   └── src/
│       ├── services/
│       │   ├── api.js          # HTTP client (BASE_URL)
│       │   ├── notifications.js # FCM setup
│       │   └── firebase.js     # Firebase JS SDK config
│       ├── context/
│       │   └── AuthContext.js  # Auth state
│       └── navigation/
│           └── AppNavigator.js # Navigation setup
└── firmware/
    ├── helmet_connector_v3.ino # ESP32 helmet firmware (current)
    ├── helmet_connector_v2.ino # Previous version (backup)
    ├── helmet_connector_c1.ino # Original helmet code (superseded)
    └── bike_unit_final.ino     # ESP32 bike firmware
```

---

## 10. HOW EVERYTHING FLOWS TOGETHER

### 10.1 Setup Flow
1. Rider signs up on app → user created in MongoDB with `role: 'rider'`
2. Family signs up on app → user created with `role: 'family'`
3. Rider generates linking code → code stored in MongoDB
4. Family enters code → permanent link created in MongoDB
5. Rider uploads ESP32 firmware with their MongoDB `_id` as `USER_ID`
6. ESP32 connects to WiFi, BT, and starts sending diagnostics/alerts

### 10.2 Normal Operation Flow
1. ESP32 helmet reads sensors every 100ms loop
2. If alcohol/drowsiness/fall detected → HTTP POST to Node.js server
3. Server saves alert to MongoDB, sends FCM push to linked family
4. Family app polls server every 3 seconds
5. Family sees full-screen emergency overlay with alert details
6. Family can view location on Google Maps
7. Family can dismiss alert (marked as dismissed, stays in history)

### 10.3 Bike Safety Flow
1. ESP32 helmet checks all sensors
2. If no danger → sends "SAFE" via Bluetooth to bike
3. Bike relay turns ON → motor can start
4. If danger detected → sends "UNSAFE" via Bluetooth
5. Bike relay turns OFF → motor stops

### 10.4 False Alert Flow
1. Fall/alert detected → rider gets 120s countdown on app
2. Rider taps "I'M SAFE" → calls `/api/alert/safe` → alert cleared
3. Rider taps "SEND NOW" or timer expires → calls `/api/alert/not-safe` → FCM sent to family
4. Family sees the alert notification on their phone

---

## 11. KEY CONFIGURATION VALUES

| Value | Location |
|-------|----------|
| Server IP | `192.168.1.104` (server/.env + ESP32 firmware) |
| Server Port | `3000` |
| MongoDB URI | `mongodb+srv://helmetuser:...@cluster0.tlpir1q.mongodb.net/helmetdb` |
| Firebase Project | `smarthelmet-fb5a7` |
| Default Location | `15.903911, 73.844577` (college) |
| ESP32 USER_ID | `6a5362e553eec64b3526eb6d` |
| ESP32 WiFi | TP-Link_FFB8 |
| App API URL | `http://192.168.1.104:3000` |
| Polling Interval | 3 seconds (family dashboard) |
| Fall Cooldown | 30 seconds |
| Drowsiness Threshold | 5 seconds eye closed |
| Alcohol Threshold | 1800 (MQ-3 analog) |
| Fall Threshold | 2.5 (accel magnitude) |

---

## 12. RUNNING THE PROJECT

### 12.1 Start Backend Server
```bash
cd D:\SmartHelmet_IOT\server
npx nodemon server.js
```

### 12.2 Start Mobile App
```bash
cd D:\SmartHelmet_IOT\mobile
npx expo start --tunnel
```
Then scan QR code with Expo Go app on Android phone.

### 12.3 Upload ESP32 Firmware
1. Open `helmet_connector_v3.ino` in Arduino IDE
2. Board: ESP32 Dev Module
3. Partition: Huge APP (3MB)
4. Upload to helmet ESP32

### 12.4 Upload Bike Firmware
1. Open `bike_unit_final.ino` in Arduino IDE
2. Board: ESP32 Dev Module
3. Upload to bike ESP32

---

## 13. KNOWN ISSUES & FIXES APPLIED

| Issue | Fix |
|-------|-----|
| All alerts showed as "FALL" | Fixed API paths from `/alert/` to `/api/alert/` |
| Alerts not reaching server | Fixed ESP32 to use correct `/api/alert/` endpoints |
| Family dashboard not showing alerts | Added full-screen emergency overlay with auto-switch to Status tab |
| IR sensor broken (always HIGH) | Removed IR from safety calculation, set helmetOn=true always |
| Bike never starts (always UNSAFE) | Removed IR from isSafe calculation |
| Dismiss not working (userId undefined) | Added `_id` to family rider-status response |
| Dismiss index race condition | Changed from `alertIndex` to `alertId` (MongoDB _id) |
| Mongoose subdocument not saving | Added `user.markModified('alertHistory')` before save |
| Default GPS location | Added college coordinates fallback |
| Ngrok tunnel error | Use `--tunnel` with `--clear` flag or use `--lan` mode |
| Server port already in use | Kill all node processes before restarting |

---

## 14. ALERT TYPE DISPLAY REFERENCE

| Alert Type | Icon | Color | Background | Label |
|------------|------|-------|------------|-------|
| Fall | 🚨 | Red (#ef4444) | Red 15% opacity | ACCIDENT DETECTED |
| Alcohol | 🍷 | Orange (#f97316) | Orange 15% opacity | ALCOHOL DETECTED |
| Drowsiness | 😴 | Purple (#a855f7) | Purple 15% opacity | DROWSINESS DETECTED |

---

## 15. SECURITY NOTES

- No authentication on alert endpoints (ESP32 sends directly)
- Family linking uses 6-digit code with 24-hour expiry
- Sessions stored in MongoDB via connect-mongo
- FCM tokens stored per user for targeted push notifications
- Rider can unlink family members at any time
