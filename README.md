# Mongoose os iot devices

This project contains a iot devices with mongoose os.

## Tested Hardware

- ESP8266

## Devices

- Light rgb
- Light
- Smartlock pulse mode

## Installation & Flashing

Before beginning, you must have the `mos` tool installed. For more info, see the mos [installation instructions](https://mongoose-os.com/docs/quickstart/setup.html).

1. First, clone the devices

```
$ git clone https://github.com/tiagoguirra/iot-devices.git
```

2. Open device folder

3. Building the firmware: (esp8266 or esp32)

```
$ mos build --platform esp8266
```

4. To flash the device: (esp8266 or esp32)

```
$ mos flash
```

5. Configure WiFi:

- Connect to acces point with name beginning with "IOT"
- Open browser and acess page http://192.168.4.1
- Type it device name, user id, wifi name, wifi password and save

If you want to restart the interface, press the flash button for 5 seconds

6. Configure MQTT:

```
mos aws-iot-setup --aws-region us-east-1 --aws-iot-policy mos-default
```

7. To stream logs to the terminal:

```
$ mos console
```

8. To open up the Web UI:

```
$ mos
```
