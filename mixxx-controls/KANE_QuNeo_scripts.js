/* Midi scripts for Kane's Quneo presets. Fills out some LED's, provides rotary
   scratching/playing, and a few other things. */

function KANE_QuNeo () {}

//global variables
KANE_QuNeo.scratchSpeed = 2.5 // Ticks per rotation
KANE_QuNeo.lastLight = [-1,-1]; // previous LED
KANE_QuNeo.trackPosition = [0,0]; // position of each deck in song
KANE_QuNeo.trackDuration = [0,0]; // Duration of the song on each deck

KANE_QuNeo.beatNumber = [4,4]; // Stores which beat each deck is on, loops 1-4
KANE_QuNeo.lastBeatTime = [4000,4000];  // time of last registered beat in each deck

KANE_QuNeo.togglePlayScratchStatus = 1;  // 1 for play, 0 for scratch
KANE_QuNeo.trackJump = [0,0]; // -1 for backwards, 0 for no jump, 1 for forwards

// LED Sequencers for each deck - easy to edit!
// simply choose which LED's you want for each
// beat, then update it with the appropriate midi note!
// LED midi note mappings for the quneo are found in the quneo's full manual
KANE_QuNeo.playerSequence = function (deck, beat) {
    // Here is the deck one sequence
    if (deck == 1) { // do deck1 sequence
	switch (beat) {
	case 1: // LED sequence for beat 1 of 4
	    return [0x1a,0x1b,0x2e,0x2f];
	case 2: // for beat 2 of 4, etc
	    return [0x12,0x1a,0x1b];
	case 3:
	    return [0x10,0x11,0x2e,0x2f];
	case 4:
	    return [0x18,0x10,0x11];
	}
    }
    // Here is the deck 2 sequence
    else if (deck == 2) {
	switch (beat) {
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
}		    

KANE_QuNeo.init = function (id) { // called when the device is opened & set up

  KANE_QuNeo.assertPlayScratchLED();

  engine.connectControl("[Channel1]","visual_playposition","KANE_QuNeo.circle1LEDs");

  engine.connectControl("[Channel2]","visual_playposition","KANE_QuNeo.circle2LEDs");

  engine.softTakeover("[Channel1]","rate",true);

  engine.softTakeover("[Channel2]","rate",true);

  engine.softTakeover("[Channel1]","volume",true);

  engine.softTakeover("[Channel2]","volume",true);

  engine.softTakeover("[Channel1]","filterHigh",true);

  engine.softTakeover("[Channel2]","filterHigh",true);

  engine.softTakeover("[Channel1]","filterMid",true);

  engine.softTakeover("[Channel2]","filterMid",true);

  engine.softTakeover("[Channel1]","filterLow",true);

  engine.softTakeover("[Channel2]","filterLow",true);

  engine.softTakeover("[Channel1]","gain",true);

  engine.softTakeover("[Channel2]","gain",true);

  engine.softTakeover("[Master]","volume",true);

  engine.softTakeover("[Channel2]","filterLow",true);

//engine.connectControl("[Channel1]","volume","KANE_QuNeo.player1Vol");		   
//engine.connectControl("[Channel2]","volume","KANE_QuNeo.player2Vol");		    

  //engine.connectControl("[Channel1]","rate","KANE_QuNeo.player1Rate");
    
  //engine.connectControl("[Channel2]","rate","KANE_QuNeo.player2Rate");	

};

KANE_QuNeo.shutdown = function () {
		    
};

/***** Toggle PlayScratch ****/

KANE_QuNeo.play = function (deck) {
    var deckName = "[Channel"+deck+"]";
    var currentlyPlaying = engine.getValue(deckName,"play");
    if (currentlyPlaying == 1) {    // If currently playing
        engine.setValue(deckName,"play",0);    // Stop
    }
    else {    // If not currently playing,
        engine.setValue(deckName,"play",1);    // Start
    }
}

KANE_QuNeo.togglePlayScratch = function (channel, control, value, status, group) {
    old = KANE_QuNeo.togglePlayScratchStatus;
    KANE_QuNeo.togglePlayScratchStatus = (old + 1) % 2 // toggle global on/off
    KANE_QuNeo.assertPlayScratchLED() // update LED
}

KANE_QuNeo.assertPlayScratchLED = function () {
    brightness = 0x00
    if (KANE_QuNeo.togglePlayScratchStatus) // if in play mode
	brightness = 0x7f // set led to max

    midi.sendShortMsg(0x90,0x23,brightness); // emit update
}

/****** Rotary Scratching ******/

KANE_QuNeo.rotary1Touch = function (channel, control, value, status, group) {
    // call dispatch
    KANE_QuNeo.rotaryTouch(1, control, value, status, group);
}

KANE_QuNeo.rotary2Touch = function (channel, control, value, status, group) {
    print("rotary 2: " + channel);
    // call dispatch
    KANE_QuNeo.rotaryTouch(2, control, value, status, group);
}

KANE_QuNeo.rotaryTouch = function (deck, control, value, status, group) {
    if ((status & 0xF0) == 0x90) {    // If note on midi channel 1
        if (value == 0x7F) {   // if full velocity
	    if (KANE_QuNeo.togglePlayScratchStatus) { // and scratch is toggled off
		KANE_QuNeo.play(deck); // this is a play button
		return;
	    }
	    // else proceed with scratching
	    var alpha = 1.0/8;
            var beta = alpha/32;
            engine.scratchEnable(deck, 128, 33+1/3, alpha, beta);
       	}
       	else {engine.scratchDisable(deck);}
    }
    
    if (status == 0x80) {    // If button up
        engine.scratchDisable(deck);
    }
}

// The wheels that actually control the scratching

KANE_QuNeo.wheel1Turn = function (channel, control, value, status, group) {
    // call dispatch
    KANE_QuNeo.wheelTurn(1, control, value, status, group);
}

KANE_QuNeo.wheel2Turn = function (channel, control, value, status, group) {
    // call dispatch
    KANE_QuNeo.wheelTurn(2, control, value, status, group);
}

KANE_QuNeo.wheelTurn = function (deck, control, value, status, group) {
    print(deck);
    var velocity = KANE_QuNeo.scratchSpeed;
    if (value > 1) // if reverse
	velocity *= -1; // flip direction
    engine.scratchTick(deck,velocity);
}

/****** Rotary LEDs ******/

KANE_QuNeo.circle1LEDs = function (value) {
    // call dispatch
    KANE_QuNeo.circleLEDs(1, value);
}

KANE_QuNeo.circle2LEDs = function (value) {
    // call dispatch
    KANE_QuNeo.circleLEDs(2, value);
}

KANE_QuNeo.circleLEDs = function (deck, value) {
    var deckName = "[Channel"+deck+"]";
    var channel = deck - 1; // confusing, yes. channels start from 0.

    //time it takes for an imaginary record to go around once in seconds
    var revtime = 1.8
    //find the current track position in seconds by multiplying total song length
    //by the incoming value of ChannelN visual_playposition 0.0-1.0
    KANE_QuNeo.trackDuration[channel] = engine.getValue(deckName,"duration");
    KANE_QuNeo.trackPosition[channel] = engine.getValue(deckName,"visual_playposition") * KANE_QuNeo.trackDuration[channel];

    //find how many revolutions we have made. The fractional part is where we are on the vinyl.
    var revolutions = (KANE_QuNeo.trackPosition[channel]/revtime) - .25;
    //multiply the fractional part by the total number of LEDs in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    //if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[channel]==light) return;

    //format the message on channel 1.
    var byte1 = 0xB0, byte2, byte3 = 0x00;
    if (deck == 1) byte2 = 0x06; // CC 6 for rotary 1
    else if (deck == 2) byte2 = 0x07; // CC 7 for rotary 2
    else return;
    midi.sendShortMsg(byte1,byte2,byte3+light);
    KANE_QuNeo.lastLight[channel]=light;

    // Reports when there are beats
    if (engine.getValue(deckName,"beat_active")) {
	var diff = KANE_QuNeo.trackPosition[channel] - KANE_QuNeo.lastBeatTime[channel];
	if (diff >= -0.05 && diff <= 0.05) return; // prevent rebounce
	KANE_QuNeo.playerBeat(deck, diff);
    }

}

/***** Beat LEDs *****/

KANE_QuNeo.playerBeat = function (deck, diff) {
    var deckName = "[Channel"+deck+"]";
    var channel = deck - 1; // confusing, yes. channels start from 0.

    bpm = engine.getValue(deckName,"bpm");
    spb = 60/bpm // seconds per beat

    // Set this position as last beat, record last beat number
    var lastBeat = KANE_QuNeo.beatNumber[channel];
    KANE_QuNeo.lastBeatTime[channel] = KANE_QuNeo.trackPosition[channel];

    // now see which beat this one is
    // if this is a consecutive beat, do stuff
    if (diff >= .5*spb && diff <= 1.5*spb) {
	// increment beat
	if (lastBeat == 4)
	    KANE_QuNeo.beatNumber[channel] = 1;
	else
	    KANE_QuNeo.beatNumber[channel] += 1;
    }
    // if we have moved more than a beat, this is not consecutive
    else if (diff >= 1.1*spb || (diff < 0 && diff <= -1.1*spb)) {
	
	print("non consecutive beat!");
	KANE_QuNeo.beatNumber[channel] = 1; // so restart at beat 1
    }

    // Light the next LEDs and turn off the old
    KANE_QuNeo.LEDSequencer(deck, KANE_QuNeo.beatNumber[channel], lastBeat);
	
}

KANE_QuNeo.LEDSequencer = function (deck, beatOn, beatOff) {
    on = KANE_QuNeo.playerSequence(deck, beatOn);
    off = KANE_QuNeo.playerSequence(deck, beatOff);
    for (var i=0; i < off.length; i++)
	midi.sendShortMsg(0x90,off[i],0x00);
    for (var j=0; j < on.length; j++)
	midi.sendShortMsg(0x90,on[j],0x7f);
}
