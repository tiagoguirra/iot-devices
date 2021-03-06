load('api_aws.js');
load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_iot.js');
load('api_dht.js');
load('api_sys.js');

let led_status = IOT.ledStatus();

let sensor_pin = 12;

let state = {
  sensorContact: 'NOT_DETECTED',
};
let rebooted = false;
let online = false;

GPIO.set_mode(led_status, GPIO.MODE_OUTPUT);
GPIO.setup_input(sensor_pin, GPIO.PULL_UP);

GPIO.write(led_status, true);

let sensorState = function() {
  let sensor = GPIO.read(sensor_pin);
  return sensor === 1 ? 'DETECTED' : 'NOT_DETECTED';
};

Timer.set(
  300,
  Timer.REPEAT,
  function() {
    if (IOT.isPairingMode()) {
      GPIO.toggle(led_status);
    }
  },
  null
);

let reportState = function() {
  if (online) {
    state.sensorContact = sensorState();
    IOT.report(state);
  }
};

Timer.set(
  5000,
  Timer.REPEAT,
  function() {
    reportState();
  },
  null
);

GPIO.set_button_handler(
  0,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_NEG,
  5000,
  IOT.setPairingMode,
  null
);

GPIO.set_button_handler(
  sensor_pin,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_ANY,
  10,
  function() {
    print('Sensor change');
    let value = sensorState();
    IOT.interaction(
      'sensorContact',
      { sensorContact: value },
      'physical_interaction'
    );
  },
  null
);

IOT.handler(function(event, obj) {
  print('Event', event, JSON.stringify(obj));
  if (event === 'UPDATE_DELTA') {
    for (let key in obj) {
      if (key === 'config') {
        IOT.setConfig(obj.config);
      } else if (key === 'initialState') {
        IOT.setInitialState(obj.initialState);
      }
    }
  }
});

Event.on(
  Event.CLOUD_CONNECTED,
  function() {
    online = true;
    Shadow.update(0, { ram_total: Sys.total_ram() });
    if (MQTT.isConnected()) {
      GPIO.write(led_status, false);
      IOT.register(IOT.template.CONTACT_SENSOR, {
        sensorContact: true,
      });
    }
  },
  null
);

Event.on(
  Event.CLOUD_DISCONNECTED,
  function() {
    online = false;
    GPIO.write(led_status, true);
  },
  null
);
