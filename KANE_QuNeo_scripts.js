/* Midi scripts for Kane's Quneo presets. Fills out some LED's, and provides rotary
   scratching. */

function KANE_QuNeo () {}

//global variables
KANE_QuNeo.lastLight = [-1,-1]; // previous LED
KANE_QuNeo.trackDuration = [0,0]; // Duration of the song on each deck
		    
KANE_QuNeo.init = function (id) { // called when the device is opened & set up

  engine.connectControl("[Channel1]","visual_playposition","KANE_QuNeo.circle1LEDs");
   
  engine.connectControl("[Channel2]","visual_playposition","KANE_QuNeo.circle2LEDs");

  engine.connectControl("[Channel1]","volume","KANE_QuNeo.player1Vol");		    

  engine.connectControl("[Channel2]","volume","KANE_QuNeo.player2Vol");		    

  engine.connectControl("[Channel1]","rate","KANE_QuNeo.player1Rate");
    
  engine.connectControl("[Channel2]","rate","KANE_QuNeo.player2Rate");	
};

KANE_QuNeo.shutdown = function () {
		    
};

// Rotary Scratching

KANE_QuNeo.rotary1Touch = function (channel, control, value, status, group) {

    if ((status & 0xF0) == 0x90) {    // If note on ch1...
        if (value == 0x7F) {//if note is velocity 127
            var alpha = 1.0/8;
            var beta = alpha/32;
            engine.scratchEnable(1, 128, 33+1/3, alpha, beta);
       	}
       	else {engine.scratchDisable(1);}
    }
    
    if (status == 0x80) {    // If button up
        engine.scratchDisable(1);
    }
}

KANE_QuNeo.rotary2Touch = function (channel, control, value, status, group) {

    if ((status & 0xF0) == 0x90) {    // If note on ch1...
        if (value == 0x7F) {//if note is velocity 127
            var alpha = 1.0/8;
            var beta = alpha/32;
            engine.scratchEnable(2, 128, 33+1/3, alpha, beta);
       	}
       	else {engine.scratchDisable(2);}
    }
    
    if (status == 0x80) {    // If button up
        engine.scratchDisable(2);
    }
}

// The wheels that actually control the scratching
KANE_QuNeo.wheel1Turn = function (channel, control, value, status, group) {
    var newValue;
    if (value > 1) newValue = -2.5;
    else newValue = 2.5;
    engine.scratchTick(1,newValue);
}

KANE_QuNeo.wheel2Turn = function (channel, control, value, status, group) {
    var newValue;
    if (value > 1) newValue = -2.5;
    else newValue = 2.5;
    engine.scratchTick(2,newValue);    
}


// LEDs

KANE_QuNeo.circle1LEDs = function (value) {

    //LEDs
    //time it takes for an imaginary record to go around once in seconds
	var revtime = 1.8
	//find the current track position in seconds by multiplying total song length
	//by the incoming value of ChannelN visual_playposition 0.0-1.0
	KANE_QuNeo.trackDuration[1] = engine.getValue("[Channel1]","duration");
    var currentTrackPos = engine.getValue("[Channel1]","visual_playposition") * KANE_QuNeo.trackDuration[1];
    print("current track position1" + currentTrackPos);
    print("track duration" + KANE_QuNeo.trackDuration[1]);
    print("play position1" + value);
    //find how many revolutions we have made. The fractional part is where we are on the vinyl.
    var revolutions = (currentTrackPos/revtime) - .25;
    //multiply the fractional part by the total number of LEDs in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    //if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[1]==light) return;
    //format the message CC 6 for rotary 1 CC 7 for rotary 2 on channel 1.
     var byte1 = 0xB0
     var byte2 = 0x06
     var byte3 = 0x00
         midi.sendShortMsg(byte1,byte2,byte3);
	    midi.sendShortMsg(byte1,byte2,byte3+light);
	        KANE_QuNeo.lastLight[1]=light;
}

KANE_QuNeo.circle2LEDs = function (value) {

    
    //LEDs
    //time it takes for an imaginary record to go around once in seconds
	var revtime = 1.8
	//find the current track position in seconds by multiplying total song length
	//by the incoming value of ChannelN visual_playposition 0.0-1.0
	KANE_QuNeo.trackDuration[2] = engine.getValue("[Channel2]","duration");
    var currentTrackPos = engine.getValue("[Channel2]","visual_playposition") * KANE_QuNeo.trackDuration[2];
        print("current track position2" + currentTrackPos);
        print("track duration" + KANE_QuNeo.trackDuration[2]);
        print("play position2" + value);
    //find how many revolutions we have made. The fractional part is where we are on the vinyl.
    var revolutions = (currentTrackPos/revtime) - .25;
    //multiply the fractional part by the total number of LED values in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    //if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[2]==light) return;
    //format the message CC 6 for rotary 1 CC 7 for rotary 2 on channel 1.
     var byte1 = 0xB0
     var byte2 = 0x07
     var byte3 = 0x00
         midi.sendShortMsg(byte1,byte2,byte3);
	    midi.sendShortMsg(byte1,byte2,byte3+light);
	        KANE_QuNeo.lastLight[2]=light;
}

KANE_QuNeo.player1Vol = function (value) {
    var play1Vol = value * 127;
    midi.sendShortMsg(0xB0,0x01,0x00+play1Vol);
}

KANE_QuNeo.player2Vol = function (value) {
    var play2Vol = value * 127;
    midi.sendShortMsg(0xB0,0x03,0x00+play2Vol);
}

KANE_QuNeo.player1Rate = function (value) {
var play1Rate = (value + 1) * 127 / 2;
    midi.sendShortMsg(0xB0,0x02,0x00+play1Rate);
}

KANE_QuNeo.player2Rate = function (value) {
var play2Rate = (value + 1) * 127 / 2;
    midi.sendShortMsg(0xB0,0x04,0x00+play2Rate);
}
