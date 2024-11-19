from flask import Flask, render_template, jsonify, request
import json
import threading
import random
import time
from paho.mqtt import client as mqtt_client

app = Flask(__name__)

# MQTT Configuration
BROKER = "localhost"
PORT = 1883
USERNAME = 'emqx'
PASSWORD = 'public'

# Global Variables
room_data = {}
sensor_mode = {"global": "normal"}  # Default to "normal" globally
threads = {}

def create_mqtt_client(client_id):
    client = mqtt_client.Client(client_id, protocol=mqtt_client.MQTTv311)
    client.username_pw_set(USERNAME, PASSWORD)

    lwt_topic = f"building/status/{client_id}"
    lwt_message = json.dumps({"status": "disconnected"})
    client.will_set(lwt_topic, lwt_message, qos=1, retain=True)

    client.connect(BROKER, PORT)
    return client


# Light Sensor Function
def light_sensor(floor, room):
    client_id = f'light-sensor-{floor}-{room}-{random.randint(0, 1000)}'
    client = create_mqtt_client(client_id)
    client.loop_start()

    try:
        while True:
            mode_key = f"{floor}_{room}"
            room_mode = sensor_mode.get(mode_key)
            global_mode = sensor_mode.get("global", "normal")

            # Resolve mode: Use room-specific mode if set; otherwise, use global mode
            current_mode = room_mode if room_mode is not None else global_mode

            # Generate brightness based on mode
            if current_mode == "test":
                brightness_level = random.randint(0, 100)
            elif current_mode == "normal":
                current_hour = time.localtime().tm_hour
                current_minute = time.localtime().tm_min
                if 6 <= current_hour < 8:
                    brightness_level = int((current_hour - 6) * 30 + (current_minute / 60) * 30)
                elif 8 <= current_hour < 13:
                    brightness_level = 100
                elif 13 <= current_hour < 18:
                    brightness_level = 60
                elif 18 <= current_hour < 20:
                    brightness_level = int(60 - (current_hour - 18) * 30 - (current_minute / 60) * 30)
                elif 20 <= current_hour < 22:
                    brightness_level = 30
                elif 22 <= current_hour <= 23:
                    brightness_level = int(30 - (current_hour - 22) * 15 - (current_minute / 60) * 15)
                elif 0 <= current_hour < 6:
                    brightness_level = 10
                else:
                    brightness_level = 0

            # Publish brightness to the room's topic
            topic = f"building/{floor}/{room}/light_sensor"
            msg = {"brightness": brightness_level, "mode": current_mode}
            client.publish(topic, json.dumps(msg), qos=1)
            room_data[floor][room]["sensor_data"] = msg

            time.sleep(2)
    except Exception as e:
        print(f"[ERROR] Sensor error for room {room}: {e}")
    finally:
        client.loop_stop()

# Room Controller Function
def room_controller(floor, room):
    def on_message(client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            brightness = data.get("brightness", 0)
            intensity = (
                "off" if brightness == 0 else
                "low" if brightness < 30 else
                "medium" if brightness <= 70 else
                "high"
            )

            room_data[floor][room]["controller_data"] = {"intensity": intensity}
            for bulb in room_data[floor][room]["bulbs"]:
                room_data[floor][room]["bulbs"][bulb] = intensity

            topic = f"building/{floor}/{room}/room_controller"
            client.publish(topic, json.dumps({"intensity": intensity}), qos=1)
        except Exception as e:
            print(f"[ERROR] Controller error for room {room}: {e}")

    client_id = f'controller-{floor}-{room}-{random.randint(0, 1000)}'
    client = create_mqtt_client(client_id)

    topic = f"building/{floor}/{room}/light_sensor"
    client.subscribe(topic, qos=1)
    client.on_message = on_message

    client.loop_forever()

# Flask Routes
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/data", methods=["GET"])
def get_data():
    return jsonify(room_data)

@app.route("/add_floor", methods=["POST"])
def add_floor():
    floor_name = request.json.get("floor_name")
    if floor_name in room_data:
        return jsonify({"error": "Floor already exists"}), 400

    room_data[floor_name] = {}
    return jsonify({"message": f"Floor {floor_name} added"}), 200

@app.route("/add_room", methods=["POST"])
def add_room():
    floor = request.json.get("floor")
    room = request.json.get("room")
    if floor not in room_data:
        return jsonify({"error": "Floor does not exist"}), 400
    if room in room_data[floor]:
        return jsonify({"error": "Room already exists"}), 400

    room_data[floor][room] = {"sensor_data": {}, "controller_data": {}, "bulbs": {}}
    sensor_mode[f"{floor}_{room}"] = "test"  # Default to test mode for new rooms

    sensor_thread = threading.Thread(target=light_sensor, args=(floor, room))
    controller_thread = threading.Thread(target=room_controller, args=(floor, room))
    threads[f"{floor}_{room}"] = [sensor_thread, controller_thread]

    sensor_thread.start()
    controller_thread.start()

    return jsonify({"message": f"Room {room} added to floor {floor}"}), 200

@app.route("/add_bulb", methods=["POST"])
def add_bulb():
    floor = request.json.get("floor")
    room = request.json.get("room")
    bulb_id = request.json.get("bulb_id")

    if floor not in room_data or room not in room_data[floor]:
        return jsonify({"error": "Room does not exist"}), 400
    if bulb_id in room_data[floor][room]["bulbs"]:
        return jsonify({"error": "Bulb already exists"}), 400

    room_data[floor][room]["bulbs"][bulb_id] = "off"
    return jsonify({"message": f"Bulb {bulb_id} added"}), 200

@app.route("/toggle_mode", methods=["POST"])
def toggle_mode():
    floor = request.json.get("floor")
    room = request.json.get("room")
    new_mode = request.json.get("mode")

    if new_mode not in ["test", "normal"]:
        return jsonify({"error": "Invalid mode"}), 400

    if floor and room:
        # Set mode for a specific room
        sensor_mode[f"{floor}_{room}"] = new_mode
    else:
        # Set global mode
        sensor_mode["global"] = new_mode
        # Reset all room-specific modes to inherit global mode
        for key in list(sensor_mode.keys()):
            if key != "global":
                sensor_mode[key] = None

    return jsonify({"message": f"Mode set to {new_mode}"}), 200

if __name__ == "__main__":
    app.run(debug=True)
