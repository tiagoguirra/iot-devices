load('api_aws.js');
load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_rpc.js');
load('api_iot.js');

let led_status = IOT.ledStatus();

let lock_pin = 5;
let sensor_pin = 12;
let button = 14;

let state = {
  lock: 'JAMMED',
  sensorContact: 'NOT_DETECTED',
};
let rebooted = false;
let online = false;

GPIO.set_mode(led_status, GPIO.MODE_OUTPUT);
GPIO.set_mode(lock_pin, GPIO.MODE_OUTPUT);
GPIO.setup_input(sensor_pin, GPIO.PULL_UP);

GPIO.write(led_status, true);
GPIO.write(lock_pin, false);

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

let sensorState = function() {
  let sensor = GPIO.read(sensor_pin);
  return sensor === 1 ? 'DETECTED' : 'NOT_DETECTED';
};

let reportState = function() {
  if (online) {
    let sensor = GPIO.read(sensor_pin);
    print('Sensor value', sensor);
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

let changeState = function(value) {
  let sensor = sensorState();
  state.lock = value;
  if (value === 'UNLOCKED' && sensor === 'NOT_DETECTED') {
    GPIO.write(lock_pin, true);
    print('Unlock door on');
    let pulseTime = IOT.getPulseTime();
    Timer.set(
      pulseTime,
      0,
      function() {
        print('Unlock door off');
        GPIO.write(lock_pin, false);
      },
      null
    );
  } else if (value === 'LOCKED' && sensor === 'DETECTED') {
    IOT.interaction('lock', { lock: 'JAMMED' }, 'physical_interaction');
  }
};

GPIO.set_button_handler(
  0,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_NEG,
  5000,
  IOT.setPairingMode,
  null
);

GPIO.set_button_handler(
  0,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_NEG,
  10,
  function() {
    print('Button inboard change');
    let lock = state.lock === 'LOCKED' ? 'UNLOCKED' : 'LOCKED';
    IOT.interaction('lock', { lock: lock }, 'physical_interaction');
    changeState(lock);
  },
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
    let lock = value === 'DETECTED' ? 'UNLOCKED' : 'LOCKED';
    IOT.interaction('lock', { lock: lock }, 'physical_interaction');
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
      if (key === 'lock') {
        changeState(obj.lock);
      } else if (key === 'config') {
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
      let value = sensorState();
      let lock = value === 'DETECTED' ? 'UNLOCKED' : 'LOCKED';
      GPIO.write(led_status, false);
      IOT.register(
        IOT.template.SMARTLOCK,
        {
          lock: true,
          sensorContact: true,
        },
        {
          lock: lock,
          sensorContact: value,
        }
      );
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
