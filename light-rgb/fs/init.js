load('api_aws.js');
load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_rpc.js');
load('api_pwm.js');
load('api_iot.js');

let led_status = IOT.ledStatus();

let led = {
  green: 5,
  red: 14,
  blue: 4,
};

let state = {
  red: 0,
  green: 0,
  blue: 0,
  power: 'OFF',
  brightness: 0,
};
let rebooted = false;
let online = false;

GPIO.set_mode(led_status, GPIO.MODE_OUTPUT);
GPIO.write(led_status, true);
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

GPIO.set_button_handler(
  0,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_NEG,
  5000,
  IOT.setPairingMode,
  null
);

let reportState = function() {
  if (online) {
    Shadow.update(0, state);
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
    let brightness = state.brightness / 100;
    PWM.set(led.green, 1024, state.green * brightness);
    PWM.set(led.red, 1024, state.red * brightness);
    PWM.set(led.blue, 1024, state.blue * brightness);
  } else {
    PWM.set(led.green, 0, 0);
    PWM.set(led.red, 0, 0);
    PWM.set(led.blue, 0, 0);
  }
};

Shadow.addHandler(function(event, obj) {
  if (event === 'UPDATE_DELTA') {
    for (let key in obj) {
      if (key === 'power') {
        state.power = obj.power;
      } else if (key === 'red') {
        state.red = obj.red ? obj.red : 0;
      } else if (key === 'green') {
        state.green = obj.green ? obj.green : 0;
      } else if (key === 'blue') {
        state.blue = obj.blue ? obj.blue : 0;
      } else if (key === 'brightness') {
        state.brightness = obj.brightness ? obj.brightness : 1;
      } else if (key === 'reboot') {
        rebooted = true;
        Timer.set(
          750,
          0,
          function() {
            Sys.reboot(500);
          },
          null
        );
      }
    }
    changeState();
    reportState();
  }
  print('Event', event, JSON.stringify(obj));
});

Event.on(
  Event.CLOUD_CONNECTED,
  function() {
    online = true;
    Shadow.update(0, { ram_total: Sys.total_ram() });
    if (MQTT.isConnected()) {
      GPIO.write(led_status, false);
      IOT.register(IOT.template.LIGHT_RGB, {
        power: true,
        color: true,
        brightness: true,
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
