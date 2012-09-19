/* Midi scripts for Kane's Quneo presets. Fills out some LED's, and provides rotary
   scratching. */

function KANE_QuNeo () {}

//global variables
KANE_QuNeo.lastLight = [-1,-1]; // previous LED
KANE_QuNeo.trackPosition = [0,0]; // position of each deck in song
KANE_QuNeo.trackDuration = [0,0]; // Duration of the song on each deck

KANE_QuNeo.beatNumber = [4,4]; // Stores which beat each deck is on, loops 1-4
KANE_QuNeo.lastBeatTime = [4000,4000];  // time of last registered beat in each deck
		    
KANE_QuNeo.init = function (id) { // called when the device is opened & set up

  engine.connectControl("[Channel1]","visual_playposition","KANE_QuNeo.circle1LEDs");
   
  engine.connectControl("[Channel2]","visual_playposition","KANE_QuNeo.circle2LEDs");

//engine.connectControl("[Channel1]","volume","KANE_QuNeo.player1Vol");		   
//engine.connectControl("[Channel2]","volume","KANE_QuNeo.player2Vol");		    

  //engine.connectControl("[Channel1]","rate","KANE_QuNeo.player1Rate");
    
  //engine.connectControl("[Channel2]","rate","KANE_QuNeo.player2Rate");	

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


// Rotary LEDs

KANE_QuNeo.circle1LEDs = function (value) {

    //LEDs
    //time it takes for an imaginary record to go around once in seconds
    var revtime = 1.8
    //find the current track position in seconds by multiplying total song length
    //by the incoming value of ChannelN visual_playposition 0.0-1.0
    KANE_QuNeo.trackDuration[0] = engine.getValue("[Channel1]","duration");
    KANE_QuNeo.trackPosition[0] = engine.getValue("[Channel1]","visual_playposition") * KANE_QuNeo.trackDuration[0];

    //find how many revolutions we have made. The fractional part is where we are on the vinyl.
    var revolutions = (KANE_QuNeo.trackPosition[0]/revtime) - .25;
    //multiply the fractional part by the total number of LEDs in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    //if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[0]==light) return;
    //format the message CC 6 for rotary 1 CC 7 for rotary 2 on channel 1.
    var byte1 = 0xB0
    var byte2 = 0x06
    var byte3 = 0x00
    midi.sendShortMsg(byte1,byte2,byte3);
    midi.sendShortMsg(byte1,byte2,byte3+light);
    KANE_QuNeo.lastLight[0]=light;

    
    // Reports when there are beats
    if (engine.getValue("[Channel1]","beat_active")) {
	var diff = KANE_QuNeo.trackPosition[0] - KANE_QuNeo.lastBeatTime[0];
	if (diff >= -0.05 && diff <= 0.05) return; // prevent rebounce
	KANE_QuNeo.player1Beat(diff);
    }

}

KANE_QuNeo.circle2LEDs = function (value) {

    
    //LEDs
    //time it takes for an imaginary record to go around once in seconds
    var revtime = 1.8
    //find the current track position in seconds by multiplying total song length
    //by the incoming value of ChannelN visual_playposition 0.0-1.0
    KANE_QuNeo.trackDuration[1] = engine.getValue("[Channel2]","duration");
    KANE_QuNeo.trackPosition[1] = engine.getValue("[Channel2]","visual_playposition") * KANE_QuNeo.trackDuration[1];
    //find how many revolutions we have made. The fractional part is where we are on the vinyl.
    var revolutions = (KANE_QuNeo.trackPosition[1]/revtime) - .25;
    //multiply the fractional part by the total number of LED values in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    //if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[1]==light) return;
    //format the message CC 6 for rotary 1 CC 7 for rotary 2 on channel 1.
    var byte1 = 0xB0
    var byte2 = 0x07
    var byte3 = 0x00
    midi.sendShortMsg(byte1,byte2,byte3);
    midi.sendShortMsg(byte1,byte2,byte3+light);
    KANE_QuNeo.lastLight[1]=light;

    // Reports when there are beats
    if (engine.getValue("[Channel2]","beat_active")) {
	var diff = KANE_QuNeo.trackPosition[1] - KANE_QuNeo.lastBeatTime[1];
	if (diff >= -0.05 && diff <= 0.05) return; // prevent rebounce
	KANE_QuNeo.player2Beat(diff);
    }
}

// Beat LEDs

KANE_QuNeo.player1Beat = function (diff) {

    bpm = engine.getValue("[Channel1]","bpm");
    spb = 60/bpm // seconds per beat

    // Set this position as last beat, record last beat number
    var lastBeat = KANE_QuNeo.beatNumber[0];
    KANE_QuNeo.lastBeatTime[0] = KANE_QuNeo.trackPosition[0];

    // now see which beat this one is
    // if this is a consecutive beat, do stuff
    if (diff >= .5*spb && diff <= 1.5*spb) {
	// increment beat
	if (lastBeat == 4)
	    KANE_QuNeo.beatNumber[0] = 1;
	else
	    KANE_QuNeo.beatNumber[0] += 1;
    }
    // if we have moved more than a beat, this is not consecutive
    else if (diff >= 1.1*spb || (diff < 0 && diff <= -1.1*spb)) {
	
	print("non consecutive beat!");
	KANE_QuNeo.beatNumber[0] = 1; // so restart at beat 1
    }

    // Light the next LEDs and turn off the old
    KANE_QuNeo.player1Sequence(KANE_QuNeo.beatNumber[0], lastBeat);
	
}

KANE_QuNeo.player1Sequence = function (beatOn, beatOff) {
    on = KANE_QuNeo.player1BeatToLED(beatOn);
    off = KANE_QuNeo.player1BeatToLED(beatOff);
    for (var i=0; i < off.length; i++)
	midi.sendShortMsg(0x90,off[i],0x00);
    for (var j=0; j < on.length; j++)
	midi.sendShortMsg(0x90,on[j],0x3f);
}

KANE_QuNeo.player1BeatToLED = function (beat) {
    switch(beat) {
    case 1:
	return [0x1a,0x1b,0x2e,0x2f];
    case 2:
	return [0x12,0x1a,0x1b];
    case 3:
	return [0x10,0x11,0x2e,0x2f];
    case 4:
	return [0x18,0x10,0x11];
    }
}

KANE_QuNeo.player2Beat = function (diff) {

    bpm = engine.getValue("[Channel2]","bpm");
    spb = 60/bpm // seconds per beat

    // Set this position as last beat, record last beat number
    var lastBeat = KANE_QuNeo.beatNumber[1];
    KANE_QuNeo.lastBeatTime[1] = KANE_QuNeo.trackPosition[1];

    // now see which beat this one is
    // if this is a consecutive beat, do stuff
    if (diff >= .5*spb && diff <= 1.5*spb) {
	// increment beat
	if (lastBeat == 4)
	    KANE_QuNeo.beatNumber[1] = 1;
	else
	    KANE_QuNeo.beatNumber[1] += 1;
    }
    // if we have moved more than a beat, this is not consecutive
    else if (diff >= 1.1*spb || (diff < 0 && diff <= -1.1*spb)) {
	
	print("non consecutive beat!");
	KANE_QuNeo.beatNumber[1] = 1; // so restart at beat 1
    }

    // Light the next LEDs and turn off the old
    KANE_QuNeo.player2Sequence(KANE_QuNeo.beatNumber[1], lastBeat);
    
}

KANE_QuNeo.player2Sequence = function (beatOn, beatOff) {
    on = KANE_QuNeo.player2BeatToLED(beatOn);
    off = KANE_QuNeo.player2BeatToLED(beatOff);
    for (var i=0; i < off.length; i++)
	midi.sendShortMsg(0x90,off[i],0x00);
    for (var j=0; j < on.length; j++)
	midi.sendShortMsg(0x90,on[j],0x3f);
}

KANE_QuNeo.player2BeatToLED = function (beat) {
    switch(beat) {
    case 1:
	return [0x1c,0x1d,0x30,0x31];
    case 2:
	return [0x14,0x1c,0x1d];
    case 3:
	return [0x16,0x17,0x30,0x31];
    case 4:
	return [0x1e,0x16,0x17];
    }
}

// Slider LEDs

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
