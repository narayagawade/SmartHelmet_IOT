// =============================================
//   FINAL BIKE UNIT CODE - SMART HELMET
//   Receiver + Relay Control
// =============================================

#include <BluetoothSerial.h>

BluetoothSerial SerialBT;

// ============== PIN DEFINITIONS ==============
#define RELAY_PIN  26     // Change if you used different pin

// ============== VARIABLES ==============
bool bikeRunning = false;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);   // Motor OFF at start

  // Start Bluetooth as Slave
  SerialBT.begin("BikeBT");       // Must match Helmet code
  Serial.println("\n=== BIKE UNIT STARTED ===");
  Serial.println("Waiting for HelmetBT connection...");
}

void loop() {
  // Check if data is available from Helmet
  if (SerialBT.available()) {
    String message = SerialBT.readStringUntil('\n');
    message.trim();

    Serial.print("Received from Helmet: ");
    Serial.println(message);

    if (message == "SAFE") {
      digitalWrite(RELAY_PIN, HIGH);   // Motor ON
      if (!bikeRunning) {
        Serial.println(">>> BIKE MOTOR STARTED (SAFE)");
        bikeRunning = true;
      }
    } 
    else if (message == "UNSAFE") {
      digitalWrite(RELAY_PIN, LOW);    // Motor OFF
      if (bikeRunning) {
        Serial.println(">>> BIKE MOTOR STOPPED (UNSAFE)");
        bikeRunning = false;
      }
    }
  }

  delay(100);  // Small delay for stability
}