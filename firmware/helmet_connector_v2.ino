#include <WiFi.h>
#include <HTTPClient.h>
#include <BluetoothSerial.h>
#include <MPU6050_light.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ==================== CHANGE THESE ====================
const char* ssid = "you_wifi_ssid_here";
const char* password = "your_password_here";

const char* SERVER_IP = "192.168.1.104";
const char* USER_ID   = "6a5362e553eec64b3526eb6d";
// ======================================================

#define MQ3_PIN     34
#define IR_PIN      27
#define EYE_PIN     33
#define BUZZER      26

#define GPS_RX  16
#define GPS_TX  17

int alcoholThreshold = 1800;
float fallThreshold = 2.5;
const unsigned long DROWSY_TIME = 5000;
const unsigned long DIAGNOSTICS_INTERVAL = 5000;
const unsigned long FALL_COOLDOWN = 30000;
const unsigned long SAFE_RESET_COOLDOWN = 10000;

bool alcoholDetected = false;
bool previousAlcoholState = false;

unsigned long eyeClosedStartTime = 0;
bool isDrowsy = false;
bool previousDrowsyState = false;

MPU6050 mpu(Wire);
bool fallDetected = false;
unsigned long lastFallSentAt = 0;

HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

BluetoothSerial SerialBT;
String bikeName = "BikeBT";
bool btConnected = false;

unsigned long lastDiagnosticsSentAt = 0;
bool previousAnyAlert = false;
unsigned long lastSafeResetSentAt = 0;

void setup() {
  Serial.begin(115200);
  pinMode(IR_PIN, INPUT);
  pinMode(EYE_PIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  connectToWiFi();

  Wire.begin(21, 22);
  byte status = mpu.begin();
  if (status != 0) Serial.println("MPU6050 failed");
  else {
    Serial.println("MPU6050 Found!");
    mpu.calcOffsets();
  }

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  SerialBT.begin("HelmetBT", true);
  Serial.println("Searching for BikeBT...");
  for (int i = 0; i < 10; i++) {
    btConnected = SerialBT.connect(bikeName);
    if (btConnected) { Serial.println(">>> CONNECTED TO BikeBT!"); break; }
    Serial.print("Attempt "); Serial.print(i + 1); Serial.println("/10");
    delay(3000);
  }
  if (!btConnected) Serial.println(">>> BT NOT connected — retrying in loop");

  Serial.println("Smart Helmet READY (v3.0)");
}

void loop() {
  int eyeState = digitalRead(EYE_PIN);
  int alcoholValue = analogRead(MQ3_PIN);

  // 1. Alcohol detection
  alcoholDetected = (alcoholValue > alcoholThreshold);
  if (!previousAlcoholState && alcoholDetected) {
    beep(5);
    Serial.println("Alcohol detected!");
    sendAlcoholAlert();
  }
  previousAlcoholState = alcoholDetected;

  // 2. Drowsiness detection
  if (eyeState == HIGH) {
    if (eyeClosedStartTime == 0) eyeClosedStartTime = millis();
    else if (millis() - eyeClosedStartTime >= DROWSY_TIME && !isDrowsy) isDrowsy = true;
  } else {
    eyeClosedStartTime = 0;
    isDrowsy = false;
  }

  if (isDrowsy && !previousDrowsyState) {
    Serial.println("Drowsiness detected!");
    sendDrowsinessAlert();
  }
  previousDrowsyState = isDrowsy;
  digitalWrite(BUZZER, isDrowsy ? HIGH : LOW);

  // 3. Fall detection
  mpu.update();
  float accelMag = sqrt(mpu.getAccX() * mpu.getAccX() + mpu.getAccY() * mpu.getAccY() + mpu.getAccZ() * mpu.getAccZ());

  if (accelMag > fallThreshold || accelMag < 0.5) {
    if (!fallDetected && (millis() - lastFallSentAt > FALL_COOLDOWN)) {
      beep(20);
      sendFallAlert();
      fallDetected = true;
      lastFallSentAt = millis();
    }
  } else {
    fallDetected = false;
  }

  // 4. GPS update
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());

  // 5. Bluetooth — safety based on alcohol + drowsiness + fall (IR broken, removed)
  if (!SerialBT.connected()) {
    btConnected = SerialBT.connect(bikeName);
    if (btConnected) Serial.println(">>> BT Reconnected!");
    else delay(2000);
  } else {
    bool isSafe = !alcoholDetected && !isDrowsy && !fallDetected;
    SerialBT.println(isSafe ? "SAFE" : "UNSAFE");
  }

  // 6. Send safe reset when all alerts clear (transition from alert to no-alert)
  bool anyAlert = alcoholDetected || isDrowsy || fallDetected;
  if (!anyAlert && previousAnyAlert && (millis() - lastSafeResetSentAt > SAFE_RESET_COOLDOWN)) {
    sendSafeReset();
    lastSafeResetSentAt = millis();
  }
  previousAnyAlert = anyAlert;

  // 7. Periodic diagnostics — sends correct format to server
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED && now - lastDiagnosticsSentAt >= DIAGNOSTICS_INTERVAL) {
    sendDiagnostics(alcoholValue);
    lastDiagnosticsSentAt = now;
  }

  delay(100);
}

// -------------------- Alert Functions --------------------

void sendFallAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/api/alert/fall";
  String location = getLocationLink();
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\", \"location\":\"" + location + "\"}";
  int code = http.POST(payload);
  Serial.print("Fall POST response: "); Serial.println(code);
  http.end();
}

void sendAlcoholAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/api/alert/alcohol";
  String location = getLocationLink();
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\", \"location\":\"" + location + "\"}";
  int code = http.POST(payload);
  Serial.print("Alcohol POST response: "); Serial.println(code);
  http.end();
}

void sendDrowsinessAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/api/alert/drowsiness";
  String location = getLocationLink();
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\", \"location\":\"" + location + "\"}";
  int code = http.POST(payload);
  Serial.print("Drowsiness POST response: "); Serial.println(code);
  http.end();
}

void sendSafeReset() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/api/alert/reset";
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\"}";
  int code = http.POST(payload);
  Serial.print("Reset POST response: "); Serial.println(code);
  http.end();
}

void sendDiagnostics(int alcoholValue) {
  if (WiFi.status() != WL_CONNECTED) return;

  bool gpsActive = gps.location.isValid();

  String url = String("http://") + SERVER_IP + ":3000/api/alert/diagnostics";
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String json = String("{\"userId\":\"") + USER_ID + "\","
               + "\"alcohol\":" + String(alcoholValue) + ","
               + "\"drowsy\":" + (isDrowsy ? "true" : "false") + ","
               + "\"fall\":" + (fallDetected ? "true" : "false") + ","
               + "\"helmetOn\":true,"
               + "\"gpsActive\":" + (gpsActive ? "true" : "false") + "}";

  int code = http.POST(json);
  Serial.print("Diagnostics POST response: "); Serial.println(code);
  http.end();
}

// -------------------- Helpers --------------------

String getLocationLink() {
  if (gps.location.isValid()) {
    String lat = String(gps.location.lat(), 6);
    String lng = String(gps.location.lng(), 6);
    return "https://maps.google.com/?q=" + lat + "," + lng;
  }
  return "https://maps.google.com/?q=15.903911,73.844577";
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH); delay(100);
    digitalWrite(BUZZER, LOW); delay(100);
  }
}
