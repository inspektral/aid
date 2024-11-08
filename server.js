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
    io.emit('oscMessage', inputs);
});

udpPort.open();

const inputMidi = new midi.Input();

inputMidi.on('message', (deltaTime, message) => {
    console.log(`MIDI message received: ${message}`);
    messageList = message.toString().split(",");
    inputs['/midi/'+messageList[0]+'/'+messageList[1]] = message[2];
    io.emit('oscMessage', inputs);
});

inputMidi.openPort(0);

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