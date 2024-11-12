import json
import logging
import random
import time
from paho.mqtt import client as mqtt_client

# MQTT Configuration
BROKER = "localhost"
PORT = 1883
USERNAME = 'emqx'
PASSWORD = 'public'

# Topics
SENSOR_TOPIC = "house/room1/light_sensor"

# MQTT Client ID
SENSOR_CLIENT_ID = f'light-sensor-{random.randint(0, 1000)}'

# Flag for exit condition
FLAG_EXIT = False

# Utility function for handling reconnections
def on_disconnect(client, userdata, rc):
    logging.info("Disconnected with result code: %s", rc)
    reconnect(client)

# Reconnection logic
def reconnect(client):
    delay = 1
    while not FLAG_EXIT:
        time.sleep(delay)
        try:
            client.reconnect()
            logging.info("Reconnected successfully!")
            return
        except Exception:
            delay = min(delay * 2, 60)  # Exponential backoff

# Light Sensor: Publishes brightness levels
def light_sensor():
    client = mqtt_client.Client(SENSOR_CLIENT_ID, protocol=mqtt_client.MQTTv311)
    client.username_pw_set(USERNAME, PASSWORD)
    client.on_disconnect = on_disconnect
    client.connect(BROKER, PORT)
    client.loop_start()
    
    while not FLAG_EXIT:
        brightness_level = random.randint(0, 100)  # Simulate brightness level
        msg = json.dumps({'brightness': brightness_level})
        client.publish(SENSOR_TOPIC, msg)
        print(f"Light Sensor: Published `{msg}` to `{SENSOR_TOPIC}`")
        time.sleep(2)  # Publish data every 2 seconds

    client.loop_stop()

# Run the sensor component
if __name__ == "__main__":
    logging.basicConfig(format='%(asctime)s - %(levelname)s: %(message)s', level=logging.INFO)
    light_sensor()
