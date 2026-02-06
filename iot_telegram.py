"""
IoT Weather Station Simulator that sends data to Telegram
Simulates the Wokwi DHT22 sensor and sends weather updates to Telegram Bot
"""

import time
import random
import json
import requests
from datetime import datetime

# Telegram Bot Configuration
TELEGRAM_SERVICE_URL = "http://localhost:48637/api/telegram/send"

class WeatherSensor:
    """Simulates DHT22 sensor readings"""
    
    def __init__(self):
        self.temp_base = 22.0  # Base temperature in Celsius
        self.humidity_base = 45.0  # Base humidity percentage
        
    def measure(self):
        """Simulate sensor measurement"""
        # Add some realistic variation
        temp_variation = random.uniform(-3, 3)
        humidity_variation = random.uniform(-10, 10)
        
        self._temperature = round(self.temp_base + temp_variation, 1)
        self._humidity = round(max(0, min(100, self.humidity_base + humidity_variation)), 1)
        
    def temperature(self):
        """Get temperature reading"""
        return self._temperature
        
    def humidity(self):
        """Get humidity reading"""
        return self._humidity

def send_to_telegram(message):
    """Send message to Telegram via the Telegram Controller Service"""
    try:
        response = requests.post(
            TELEGRAM_SERVICE_URL,
            json={"text": message},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Message sent to Telegram successfully!")
            print(f"   Message ID: {result.get('message_id', 'N/A')}")
            return True
        else:
            print(f"❌ Failed to send to Telegram: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Telegram Controller Service")
        print("   Make sure the service is running on port 48637")
        return False
    except Exception as e:
        print(f"❌ Error sending to Telegram: {e}")
        return False

def format_weather_message(temp, humidity):
    """Format weather data into a nice Telegram message"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Add emoji based on temperature
    if temp < 15:
        temp_emoji = "🥶"
    elif temp < 25:
        temp_emoji = "🌡️"
    else:
        temp_emoji = "🔥"
    
    # Add emoji based on humidity
    if humidity < 30:
        humidity_emoji = "🏜️"
    elif humidity < 60:
        humidity_emoji = "💧"
    else:
        humidity_emoji = "💦"
    
    message = f"""🌡️ **IoT Weather Station Update**

{temp_emoji} **Temperature:** {temp}°C
{humidity_emoji} **Humidity:** {humidity}%

📅 **Time:** {timestamp}
🔗 **Source:** Wokwi DHT22 Sensor Simulation"""

    return message

def main():
    """Main IoT weather station loop"""
    print("🚀 Starting IoT Weather Station...")
    print("📡 Connecting to Telegram Controller Service...")
    
    # Test connection to Telegram service
    try:
        response = requests.get("http://localhost:48637/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Connected to Telegram Controller Service")
        else:
            print("⚠️ Telegram service responded but may not be ready")
    except:
        print("❌ Cannot reach Telegram Controller Service")
        print("   Please start the service first: cd Telegram_Bot && npm start")
        return
    
    # Initialize sensor
    sensor = WeatherSensor()
    print("🌡️ DHT22 sensor initialized")
    
    prev_weather = ""
    measurement_count = 0
    
    try:
        while True:
            print(f"\n📊 Measuring weather conditions... (#{measurement_count + 1})")
            
            # Simulate sensor measurement
            sensor.measure()
            
            # Create weather data (same format as original)
            weather_data = {
                "temp": sensor.temperature(),
                "humidity": sensor.humidity(),
            }
            
            # Convert to JSON string (like ujson.dumps in MicroPython)
            message_json = json.dumps(weather_data)
            
            # Check if weather has changed significantly
            if message_json != prev_weather:
                print("📈 Weather conditions updated!")
                print(f"   Raw data: {message_json}")
                
                # Format nice message for Telegram
                telegram_message = format_weather_message(
                    weather_data["temp"], 
                    weather_data["humidity"]
                )
                
                # Send to Telegram
                success = send_to_telegram(telegram_message)
                
                if success:
                    prev_weather = message_json
                    measurement_count += 1
                else:
                    print("   Retrying in next cycle...")
                    
            else:
                print("📊 No significant change in weather conditions")
            
            # Wait before next measurement (like the original 1 second delay)
            print("⏱️ Waiting 10 seconds for next measurement...")
            time.sleep(10)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping IoT Weather Station...")
        print(f"📊 Total measurements sent: {measurement_count}")
        print("👋 Goodbye!")

if __name__ == "__main__":
    main()
