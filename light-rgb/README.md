# Mongoose os device light rgb

This is a mongoose os device light rbg

## Tested Hardware

- ESP8266

## Installation & Flashing

Before beginning, you must have the `mos` tool installed. For more info, see the mos [installation instructions](https://mongoose-os.com/docs/quickstart/setup.html).

1. First, clone the device

```
$ git clone https://github.com/tiagoguirra/iot-light-rgb.git
```

2. Building the firmware: (esp8266 or esp32)

```
$ mos build --arch esp8266
```

3. To flash the device: (esp8266 or esp32)

```
$ mos flash
```

4. Configure WiFi:

- Connect to acces point with name beginning with "IOT"
- Open browser and acess page http://192.168.4.1
- Type it device name, user email, wifi name, wifi password and save

If you want to restart the interface, press the flash button for 5 seconds

5. Configure MQTT:

```
mos aws-iot-setup --aws-region us-east-1 --aws-iot-policy mos-default
```

6. To stream logs to the terminal:

```
$ mos console
```

7. To open up the Web UI:

```
$ mos
```
