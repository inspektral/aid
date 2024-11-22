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
let outputs = {};

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
    outputs = calcultation();
    sendOutputs(outputs);
});

udpPort.open();

const udpOutput = new osc.UDPPort({
    remoteAddress: "127.0.0.1", // Sending to localhost
    remotePort: 5556 // Change this to the desired remote port
});

udpOutput.open();

const inputMidi = new midi.Input();

inputMidi.on('message', (deltaTime, message) => {
    console.log(`MIDI message received: ${message}`);
    messageList = message.toString().split(",");
    inputs['/midi/'+messageList[0]+'/'+messageList[1]] = message[2];
    io.emit('oscMessage', inputs);

    outputs = calcultation();
    sendOutputs(outputs);
});

try {
    inputMidi.openPort(0);
} catch (error) {
    console.error('Error opening MIDI port:', error);
}

app.post('/sendOsc', express.json(), (req, res) => {
    const { address, args } = req.body;
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/visual', (req, res) => {
    res.sendFile(path.join(__dirname, 'visuals.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(port, () => {
    console.log(`Express server listening at http://localhost:${port}`);
});

app.use(express.static(path.join(__dirname, 'static')));

function sendOutputs(outputs) {
    
    for (const key in outputs) {
        const value = outputs[key];
        const address = key;
        const args = [value];
        const message = { address, args };
        console.log("Sending OSC message:", message);
        udpOutput.send(message);
    }

    io.emit('oscMessage', outputs);

}


function calcultation() {
    let output = {};
    if (inputs['/midi/176/18']) {
        output['/in1'] = inputs['/midi/176/18'];
    }
    if (inputs['/annotation/palmBase']) {
        output['/in2'] = inputs['/annotation/palmBase'][0]/50;
    }
    return output;
}