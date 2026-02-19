#include <WiFi.h>
#include <HTTPClient.h>
#include <BluetoothSerial.h>
#include <MPU6050_light.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ==================== CHANGE THESE ====================
const char* ssid = "your wifi name";
const char* password = "your wifi password";

// Use your PC/server local IP (not localhost)
const char* SERVER_IP = "set your local ip address";
const char* USER_ID   = "id from the user"; // your MongoDB user _id

#define SENDER_EMAIL      "email sender add here"
#define SENDER_APP_PASS   "//default app key you app"
#define RECIPIENT_EMAIL   "reicever emial"

// ======================================================

#define MQ3_PIN     34
#define IR_PIN      27
#define EYE_PIN     33
#define BUZZER      26

// GPS pins
#define GPS_RX  16
#define GPS_TX  17

// Thresholds and timing
int alcoholThreshold = 1500;           // tune for your MQ-3
float fallThreshold = 2.5;             // tune for your MPU6050
const unsigned long DROWSY_TIME = 5000;
const unsigned long DIAGNOSTICS_INTERVAL = 5000;  // send every 5s
const unsigned long FALL_COOLDOWN = 30000;        // 30s no-repeat

// States
int previousIRState = HIGH;
bool alcoholDetected = false;
bool previousAlcoholState = false;

unsigned long eyeClosedStartTime = 0;
bool isDrowsy = false;

MPU6050 mpu(Wire);
bool fallDetected = false;
unsigned long lastFallSentAt = 0;

HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

BluetoothSerial SerialBT;
String bikeName = "BikeBT";
bool btConnected = false;

unsigned long lastDiagnosticsSentAt = 0;

void setup() {
  Serial.begin(115200);
  pinMode(IR_PIN, INPUT);
  pinMode(EYE_PIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  connectToWiFi();

  // MPU6050
  Wire.begin(21, 22);
  byte status = mpu.begin();
  if (status != 0) Serial.println("MPU6050 failed");
  else {
    Serial.println("MPU6050 Found!");
    mpu.calcOffsets();
  }

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // Bluetooth
  SerialBT.begin("HelmetBT", true);
  btConnected = SerialBT.connect(bikeName);
  if (btConnected) Serial.println(">>> CONNECTED TO BikeBT!");

  Serial.println("Smart Helmet READY (HTTP alerts via server)");
}

void loop() {
  int currentIRState = digitalRead(IR_PIN);
  int eyeState = digitalRead(EYE_PIN);
  int alcoholValue = analogRead(MQ3_PIN);

  // Helmet beep when IR transition HIGH -> LOW
  if (previousIRState == HIGH && currentIRState == LOW) beep(2);
  previousIRState = currentIRState;

  // Alcohol detection (value above threshold)
  alcoholDetected = (alcoholValue > alcoholThreshold);
  if (!previousAlcoholState && alcoholDetected) {
    beep(5);
    Serial.println("Alcohol detected!");
    sendAlcoholAlert();
  }
  previousAlcoholState = alcoholDetected;

  // Drowsiness detection
  if (eyeState == HIGH) {
    if (eyeClosedStartTime == 0) eyeClosedStartTime = millis();
    else if (millis() - eyeClosedStartTime >= DROWSY_TIME && !isDrowsy) isDrowsy = true;
  } else {
    eyeClosedStartTime = 0;
    isDrowsy = false;
  }
  digitalWrite(BUZZER, isDrowsy ? HIGH : LOW);

  // Fall detection using accel magnitude (old logic restored)
  mpu.update();
  float accelMag = sqrt(mpu.getAccX()*mpu.getAccX() + mpu.getAccY()*mpu.getAccY() + mpu.getAccZ()*mpu.getAccZ());

  if (accelMag > fallThreshold || accelMag < 0.5) {
    if (!fallDetected) {
      beep(20);
      sendFallAlert();   // one HTTP POST to server
      fallDetected = true;
    }
  } else {
    fallDetected = false;
  }

  // GPS update
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());

  // Bluetooth status broadcast (IR logic inverted)
  if (!SerialBT.connected()) {
    btConnected = SerialBT.connect(bikeName);
  } else {
    bool isSafe = (currentIRState == LOW) && !alcoholDetected && !isDrowsy && !fallDetected;
    SerialBT.println(isSafe ? "SAFE" : "UNSAFE");
    Serial.println(isSafe ? "Sending: SAFE" : "Sending: UNSAFE");
  }

  // IR logic inverted: LOW = SAFE, HIGH = UNSAFE
  if (currentIRState == LOW) {
    sendSafeReset();
  }

  // Periodic diagnostics
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED && now - lastDiagnosticsSentAt >= DIAGNOSTICS_INTERVAL) {
    sendDiagnostics(alcoholValue, currentIRState);
    lastDiagnosticsSentAt = now;
  }

  delay(100);
}

void sendAlcoholAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/alert/alcohol";
  String location = getLocationLink();   // same helper you use for fall
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\", \"location\":\"" + location + "\"}";
  int code = http.POST(payload);
  Serial.print("Alcohol POST response: "); Serial.println(code);
  http.end();
}

// -------------------- Helpers --------------------

String getLocationLink() {
  if (gps.location.isValid()) {
    String lat = String(gps.location.lat(), 6);
    String lng = String(gps.location.lng(), 6);
    return "https://maps.google.com/?q=" + lat + "," + lng;
  }
  return "GPS not fixed yet";
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
    digitalWrite(BUZZER, HIGH); delay(150);
    digitalWrite(BUZZER, LOW); delay(200);
  }
}

void sendFallAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/alert/fall";
  String location = getLocationLink();
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\", \"location\":\"" + location + "\"}";
  int code = http.POST(payload);
  Serial.print("Fall POST response: "); Serial.println(code);
  http.end();
}

void sendSafeReset() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String("http://") + SERVER_IP + ":3000/alert/reset";
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = String("{\"userId\":\"") + USER_ID + "\"}";
  int code = http.POST(payload);
  Serial.print("Reset POST response: "); Serial.println(code);
  http.end();
}

void sendDiagnostics(int alcoholValue, int irState) {
  if (WiFi.status() != WL_CONNECTED) return;

  bool accelerometerActive = true;
  bool gyroscopeActive = true;
  bool alcoholSensorActive = (alcoholValue >= 0 && alcoholValue <= 4095);
  bool gpsActive = gps.location.isValid();
  bool irActive = (irState == LOW); // inverted

  String url = String("http://") + SERVER_IP + ":3000/alert/diagnostics";
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String json = String("{\"userId\":\"") + USER_ID + "\",\"status\":{"
               + "\"accelerometer\":" + (accelerometerActive ? "true" : "false") + ","
               + "\"gyroscope\":"     + (gyroscopeActive ? "true" : "false") + ","
               + "\"alcoholSensor\":" + (alcoholSensorActive ? "true" : "false") + ","
               + "\"gps\":"           + (gpsActive ? "true" : "false")
               + "},\"alcohol\":" + String(alcoholValue) + "}";

  int code = http.POST(json);
  Serial.print("Diagnostics POST response: "); Serial.println(code);
  http.end();
}          
