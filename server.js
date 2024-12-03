const express = require('express');
const osc = require('osc');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const midi = require('midi');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3333;

let inputs = {};
let data = {};

// map for pot1 pot2 pot3 pot4 pot5 pot6 pot7 pot8 fader1 fader2 fader3 fader4 fader5 fader6 fader7 fader8

let midiMap = {
    18: "pot1",
    22: "pot2",
    26: "pot3",
    30: "pot4",
    48: "pot5",
    52: "pot6",
    56: "pot7",
    60: "pot8",
    19: "fader1",
    23: "fader2",
    27: "fader3",
    31: "fader4",
    49: "fader5",
    53: "fader6",
    57: "fader7",
    61: "fader8"
};

// OSC from handpose
const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 5555
});

udpPort.on("message", function (oscMessage) {
    console.log("Received OSC message:", oscMessage);
    values = oscMessage.args;
    for (let i = 0; i < values.length; i++) {
        values[i] = parseFloat(values[i]).toFixed(2);
    }
    inputs[oscMessage.address] = values;

    sendInputs(inputs);
    data = processInputs(inputs);
    distances = calcultateFingersThumbDistance(data);

    data = {...data, ...distances};
    sendOutputs(data);
});

udpPort.open();

// OSC to PureData
const udpOutput = new osc.UDPPort({
    remoteAddress: "127.0.0.1", // Sending to localhost
    remotePort: 5556 // Change this to the desired remote port
});

udpOutput.open();


// MIDI input
const inputMidi = new midi.Input();

inputMidi.on('message', (deltaTime, message) => {
    console.log(`MIDI message received: ${message}`);
    messageList = message.toString().split(",");
    inputs['/midi/'+messageList[0]+'/'+messageList[1]] = message[2];
    
    sendInputs(inputs);

    data = processInputs(inputs);
    distances = calcultateFingersThumbDistance(data);

    data = {...data, ...distances};
    sendOutputs(data);
});

try {
    inputMidi.openPort(0);
} catch (error) {
    console.error('Error opening MIDI port:', error);
}

// http server
app.post('/sendOsc', express.json(), (req, res) => {
    const { address, args } = req.body;
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/index.html'));
});

app.get('/visual', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/visuals.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(port, () => {
    console.log(`Express server listening at http://localhost:${port}`);
});

app.use(express.static(path.join(__dirname, 'static')));

// functions
function sendInputs(inputs) {
    io.emit('inputs', inputs);
}


function sendOutputs(outputs) {
    
    for (const key in outputs) {
        const value = parseFloat(outputs[key]);
        const address = key;
        const args = [value];
        const message = { address, args };
        console.log("Sending OSC message:", message);
        udpOutput.send(message);
    }

    io.emit('outputs', outputs);

}


function processInputs(inputs) {
    let data = {};
    
    Object.keys(inputs)
        .filter(key => key.startsWith('/midi'))
        .forEach(key => {
            mapKey = key.split('/').pop();
            data["/"+midiMap[mapKey]] = parseFloat(inputs[key]/127.0).toFixed(5);
    });

    Object.keys(inputs)
        .filter(key => key.startsWith('/annotations'))
        .forEach(key => {
            outKey = key.split('/').pop();

            if (outKey == "palmBase") {
                data["/"+outKey+"_x"] = parseFloat(inputs[key][0]/1000.0).toFixed(5);
                data["/"+outKey+"_y"] = parseFloat(inputs[key][1]/1000.0).toFixed(5);
            } else {
                data["/"+outKey+"_x"] = parseFloat(inputs[key][9]/1000.0).toFixed(5);
                data["/"+outKey+"_y"] = parseFloat(inputs[key][10]/1000.0).toFixed(5);
            }
    });
    

    if (inputs['/midi/176/18']) {
        data['/in1'] = inputs['/midi/176/18'];
    }
    if (inputs['/annotations/palmBase']) {
        data['/in2'] = inputs['/annotations/palmBase'][0];
    }
    return data;
}

function calcultateFingersThumbDistance(data) {
    let thumbCoord = {x: data['/thumb_x'], y: data['/thumb_y']};

    let otherFingersCoords = {}
    otherFingersCoords['index'] = {x: data['/indexFinger_x'], y: data['/indexFinger_y']};
    otherFingersCoords['middle'] = {x: data['/middleFinger_x'], y: data['/middleFinger_y']};
    otherFingersCoords['ring'] = {x: data['/ringFinger_x'], y: data['/ringFinger_y']};
    otherFingersCoords['pinky'] = {x: data['/pinky_x'], y: data['/pinky_y']};

    let distances = {};
    for (const key in otherFingersCoords) {
        distances["/"+key+"Distance"] = Math.sqrt(Math.pow(thumbCoord.x - otherFingersCoords[key].x, 2) + Math.pow(thumbCoord.y - otherFingersCoords[key].y, 2));
    }

    return distances;
}
