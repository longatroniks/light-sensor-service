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
threads = {}

def create_mqtt_client(client_id):
    client = mqtt_client.Client(client_id, protocol=mqtt_client.MQTTv311)
    client.username_pw_set(USERNAME, PASSWORD)
    client.connect(BROKER, PORT)
    return client

# Light Sensor Function
def light_sensor(floor, room):
    client_id = f'light-sensor-{floor}_{room}-{random.randint(0, 1000)}'
    client = create_mqtt_client(client_id)
    client.loop_start()
    
    while room_data[floor][room]["active"]:
        brightness_level = random.randint(0, 100)  # Simulate brightness level
        msg = json.dumps({'brightness': brightness_level})
        topic = f"building/{floor}_{room}/light_sensor"
        client.publish(topic, msg)
        print(f"Light Sensor: Published `{msg}` to `{topic}`")
        time.sleep(2)

    client.loop_stop()

# Room Controller Function
def room_controller(floor, room):
    def on_message(client, userdata, msg):
        data = json.loads(msg.payload.decode())
        brightness = data.get("brightness", 0)
        intensity = "high" if brightness > 70 else "low" if brightness < 30 else "medium"
        command_msg = json.dumps({"intensity": intensity})
        topic = f"building/{floor}_{room}/room_controller"
        
        client.publish(topic, command_msg)
        room_data[floor][room]["controller_data"] = {"intensity": intensity}
        for bulb_id in room_data[floor][room]["bulbs"]:
            room_data[floor][room]["bulbs"][bulb_id] = intensity
        print(f"Room Controller: Published `{command_msg}` to `{topic}`")

    client_id = f'room-controller-{floor}_{room}-{random.randint(0, 1000)}'
    client = create_mqtt_client(client_id)
    client.on_message = on_message
    client.subscribe(f"building/{floor}_{room}/light_sensor")
    client.loop_forever()

# Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    return jsonify(room_data)

@app.route('/add_floor', methods=['POST'])
def add_floor():
    floor_name = request.json.get('floor_name')
    print(f"Received request to add floor: {floor_name}")  # Debugging line
    if floor_name in room_data:
        return jsonify({"error": "Floor already exists"}), 400
    
    room_data[floor_name] = {}
    return jsonify({"message": f"Floor {floor_name} added"}), 200

@app.route('/add_room', methods=['POST'])
def add_room():
    floor = request.json.get('floor')
    room = request.json.get('room')
    
    if floor not in room_data:
        return jsonify({"error": "Floor does not exist"}), 400
    if room in room_data[floor]:
        return jsonify({"error": "Room already exists on this floor"}), 400

    room_data[floor][room] = {"sensor_data": {}, "controller_data": {}, "bulbs": {}, "active": True}
    sensor_thread = threading.Thread(target=light_sensor, args=(floor, room))
    controller_thread = threading.Thread(target=room_controller, args=(floor, room))
    threads[f"{floor}_{room}"] = [sensor_thread, controller_thread]
    sensor_thread.start()
    controller_thread.start()
    
    return jsonify({"message": f"Room {room} added to floor {floor}"}), 200

@app.route('/add_bulb', methods=['POST'])
def add_bulb():
    floor = request.json.get('floor')
    room = request.json.get('room')
    bulb_id = request.json.get('bulb_id')
    
    if floor not in room_data or room not in room_data[floor]:
        return jsonify({"error": "Room does not exist"}), 400
    if bulb_id in room_data[floor][room]["bulbs"]:
        return jsonify({"error": "Bulb already exists in the room"}), 400

    current_intensity = room_data[floor][room].get("controller_data", {}).get("intensity", "off")
    room_data[floor][room]["bulbs"][bulb_id] = current_intensity

    return jsonify({"message": f"Bulb {bulb_id} added to room {room} on floor {floor}"}), 200

if __name__ == '__main__':
    app.run(debug=True)
