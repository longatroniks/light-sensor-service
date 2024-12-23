
# Light Sensor Service README

This project implements a building management system with light sensors and room controllers using Python, Flask, and MQTT.

---

## Features

- Light sensors publish brightness levels for each room.
- Room controllers adjust bulb intensity based on the light sensor data (low, medium, high).
- A web interface to manage floors, rooms, and bulbs.
- MQTT communication with `paho-mqtt` as the client library and `Mosquitto` as the broker.
- Compatibility with Windows and Debian.

---

## Requirements

### Python Dependencies
- **Python Version**: Use Python 3.x
- **Dependencies**:
  - Flask
  - paho-mqtt==1.6.1

### Additional Tools
- Mosquitto MQTT Broker

---

## Installation and Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd light-sensor-service
```

### 2. Set Up a Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
#### Paho-Mqtt:
```bash
pip install Flask paho-mqtt==1.6.1
```

### 4. Start Mosquitto Broker
Ensure `mosquitto` is running. For Windows:
```bash
mosquitto -v
```

#### Sample Output:
```plaintext
mosquitto version 2.0.20 starting
Using default config.
Starting in local only mode. Connections will only be possible from clients running on this machine.
Opening ipv4 listen socket on port 1883.
Opening ipv6 listen socket on port 1883.
```

---

## Running the Application

1. Start the Flask application:
   ```bash
   python app.py
   ```

   #### Sample Output:
   ```plaintext
   * Running on http://127.0.0.1:5000
   Press CTRL+C to quit
   ```

2. Access the web interface in your browser at [http://127.0.0.1:5000](http://127.0.0.1:5000).

3. Add floors, rooms, and bulbs via the web interface.

---

## Sample Outputs

### Mosquitto Output:
```plaintext
New client connected from ::1:53465 as light-sensor-1_1-532 (p2, c1, k60, u'emqx').
Received SUBSCRIBE from room-controller-1_1-750
Sending PUBLISH to room-controller-1_1-750 (d0, q0, r0, m0, 'building/1_1/light_sensor', ... (18 bytes))
```

### Flask Application Output:
```plaintext
* Serving Flask app 'app'
127.0.0.1 - - [19/Nov/2024 01:43:48] "POST /add_floor HTTP/1.1" 200 -
Light Sensor: Published `{"brightness": 79}` to `building/1_1/light_sensor`
Room Controller: Published `{"intensity": "high"}` to `building/1_1/room_controller`
```

---

## Troubleshooting

### Common Issues
1. **Mosquitto Not Running**:
   Ensure `mosquitto` is installed and running.
   ```bash
   mosquitto -v
   ```

2. **Version Compatibility**:
   - Use `paho-mqtt==1.6.1` on both Windows and Debian

3. **Dependencies Missing**:
   Install missing dependencies using:
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Tools**:
   In Debian, after creating a new venv, sometimes installing `paho-mqtt` results in an error because this package is missing.

### Known Limitations
- The application currently runs in debug mode. Avoid using this setup in production.

---

## Additional Notes

- The `publisher.py` file was redundant; all logic is within `app.py`.
- MQTT communication is reliable using QoS level 1 for both sensors and controllers.
- Default behavior uses Mosquitto as the MQTT broker, while `paho-mqtt` is the client library.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
