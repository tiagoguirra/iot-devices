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
let rele = 5;
let button = 14;

let state = {
  power: 'OFF',
};
let online = false;

GPIO.set_mode(led_status, GPIO.MODE_OUTPUT);
GPIO.set_mode(rele, GPIO.MODE_OUTPUT);
GPIO.write(led_status, true);

// default initial state is off
GPIO.write(rele, true);
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

let changeState = function() {
  if (state.power === 'ON') {
    GPIO.write(rele, false);
    if (IOT.isPulse()) {
      let pulseTime = IOT.getPulseTime();
      Timer.set(
        pulseTime,
        0,
        function() {
          IOT.interaction('power', { power: 'OFF' }, 'physical_interaction');
        },
        null
      );
    }
  } else {
    GPIO.write(rele, true);
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
    state.power = state.power === 'ON' ? 'OFF' : 'ON';
    IOT.interaction('power', state, 'physical_interaction');
    changeState();
  },
  null
);

GPIO.set_button_handler(
  button,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_ANY,
  10,
  function() {
    print('Button change');
    state.power = state.power === 'ON' ? 'OFF' : 'ON';
    IOT.interaction('power', state, 'physical_interaction');
    changeState();
  },
  null
);

IOT.handler(function(event, obj) {
  print('Event', event, JSON.stringify(obj));
  if (event === 'UPDATE_DELTA') {
    for (let key in obj) {
      if (key === 'power') {
        state.power = obj.power;
      } else if (key === 'config') {
        IOT.setConfig(obj.config);
      } else if (key === 'initialState') {
        IOT.setInitialState(obj.initialState);
      }
    }
    changeState();
  }
});

Event.on(
  Event.CLOUD_CONNECTED,
  function() {
    online = true;
    Shadow.update(0, { ram_total: Sys.total_ram() });
    if (MQTT.isConnected()) {
      GPIO.write(led_status, false);
      IOT.register(IOT.template.LIGHT, {
        power: true,
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
