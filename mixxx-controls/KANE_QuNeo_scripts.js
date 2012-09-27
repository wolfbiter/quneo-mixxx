/* Midi scripts for Kane's Quneo presets. Fills out some LED's, provides rotary
   scratching/playing, and a few other things. */

function KANE_QuNeo () {}

// -------------------------------------
// begin init section
// -------------------------------------


//global variables
KANE_QuNeo.pregain = 1.0 // initialize deck gains to this value
KANE_QuNeo.scratchSpeed = 1.2 // Scratch ticks per rotary sense

KANE_QuNeo.lastLight = [-1,-1]; // starting position of last rotary LED
KANE_QuNeo.trackPosition = [0,0]; // position of each deck in song

KANE_QuNeo.beatNumber = [4,4]; // Stores which beat each deck is on, loops 1-4
KANE_QuNeo.lastBeatTime = [4000,4000];  // time of last registered beat in each deck

KANE_QuNeo.playScratchToggle = 1;  // 1 for play, 0 for scratch
KANE_QuNeo.recordToggle = 0;  // 1 for recording

KANE_QuNeo.trackJump = [0,0]; // -1 for backwards, 0 for no jump, 1 for forwards
KANE_QuNeo.trackLooping = [1,1] // 1 if in looping mode, else 0
KANE_QuNeo.trackJumpSync = [0,0] // 1 if auto sync on jump
KANE_QuNeo.trackPlaying = [0,0] // 1 if track is currently playing

KANE_QuNeo.counter = 2; // integer of ticks to wait before executing a schedule
KANE_QuNeo.scheduledLoop = [0,0] // 0 if no pending loop. for jump looping.
KANE_QuNeo.scheduledSync = [0,0] // 0 if no pending sync. for jump syncing
KANE_QuNeo.scheduledLoopBeats = [0,0] // scheduled loop will be this many beats

// LED Sequencers for each deck - easy to edit!
// simply choose which LEDs you want for each
// beat, then update it with the appropriate midi note!
// LED midi note mappings for the quneo are found in the quneo's full manual
// playerSequence must return a vector of hex numbers.
KANE_QuNeo.playerSequence = function (deck, beat) {
    // Here is deck 1's sequence
    if (deck == 1) { // do deck1 sequence
	switch (beat) {
	case 1: // LED sequence for beat 1 of 4
	    return [0x1a,0x1b,0x2e,0x2f];
	case 2: // for beat 2 of 4
	    return [0x12,0x1a,0x1b];
	case 3: // etc
	    return [0x10,0x11,0x2e,0x2f];
	case 4:
	    return [0x18,0x10,0x11];
	}
    }
    // Here is deck 2's sequence
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
/***** Initialization and shutdown *****/
KANE_QuNeo.init = function (id) { // called when the device is opened & set up

  KANE_QuNeo.assertLEDs(-1); // call with -1 as channel to indicate startup

  // NOTE: the 2 following controls are called each time the music updates,
  //       which means ~every 0.02 seconds. Everything that needs consistent updates
  //       should branch from these functions (KANE_QuNeo.circleLEDs)
  //       so we don't eat the cpu. Visual playposition is updated more often
  //       than playposition.
  engine.connectControl("[Channel1]","visual_playposition","KANE_QuNeo.time1Keeper");
  engine.connectControl("[Channel2]","visual_playposition","KANE_QuNeo.time2Keeper");

  // soft takeovers
  engine.softTakeover("[Channel1]","rate",true);
  engine.softTakeover("[Channel2]","rate",true);

  engine.softTakeover("[Master]","volume",true);
  engine.softTakeover("[Channel1]","volume",true);
  engine.softTakeover("[Channel2]","volume",true);

  engine.softTakeover("[Channel1]","filterHigh",true);
  engine.softTakeover("[Channel2]","filterHigh",true);

  engine.softTakeover("[Channel1]","filterMid",true);
  engine.softTakeover("[Channel2]","filterMid",true);

  engine.softTakeover("[Channel1]","filterLow",true);
  engine.softTakeover("[Channel2]","filterLow",true);

  engine.softTakeover("[Channel1]","pregain",true);
  engine.softTakeover("[Channel2]","pregain",true);

  // led controls for the horizontal sliders + crossfader
  engine.connectControl("[Master]","volume","KANE_QuNeo.masterVol");
  engine.connectControl("[Master]","headVolume","KANE_QuNeo.headVol");		    

  engine.connectControl("[Flanger]","lfoPeriod","KANE_QuNeo.flangerPeriod");
  engine.connectControl("[Flanger]","lfoDepth","KANE_QuNeo.flangerDepth");  

  engine.connectControl("[Master]","crossfader","KANE_QuNeo.crossFader");

  // Conveniences
  engine.setValue("[Channel1]","keylock",1);
  engine.setValue("[Channel2]","keylock",1);

  engine.setValue("[Channel1]","quantize",1);
  engine.setValue("[Channel2]","quantize",1);
    
  engine.setValue("[Channel1]","pregain",KANE_QuNeo.pregain)
  engine.setValue("[Channel2]","pregain",KANE_QuNeo.pregain)

    // for coolness
  //engine.setValue("[Spinny1]","show_spinny",1)
  //engine.setValue("[Spinny2]","show_spinny",1)


};

KANE_QuNeo.shutdown = function () {
};

// -------------------------------------
// begin toggling section
// -------------------------------------


/**** Toggling JumpSync *****/

KANE_QuNeo.toggleJumpSync = function (deck) {
    var channel = deck - 1;
    var old = KANE_QuNeo.trackJumpSync[channel]
    KANE_QuNeo.trackJumpSync[channel] = (old + 1) % 2 // toggle on/off
    KANE_QuNeo.assertJumpSyncLED(deck) // update LED
}

/***** Toggling Jump Direction *****/

KANE_QuNeo.setJump = function (deck, direction) {
    var channel = deck - 1 // track channels start at 0 to properly reference arrays
    var current = KANE_QuNeo.trackJump[channel];
    if (current != direction) { // if chosen jump is not on,
	KANE_QuNeo.trackJump[channel] = direction; // set this deck to the new direction
	KANE_QuNeo.trackLooping[channel] = 0;  // and turn looping off
    } else if (current == direction) { // else toggle jump off
	KANE_QuNeo.trackJump[channel] = 0;
	KANE_QuNeo.trackLooping[channel] = 1; // and looping on
    }
    // remember to update LEDs
    KANE_QuNeo.assertLoopingLED(deck);
    KANE_QuNeo.assertJumpDirectionLEDs(deck);
}

/***** Toggling Looping *****/

KANE_QuNeo.toggleLooping = function (deck) {
    var channel = deck - 1;
    var old = KANE_QuNeo.trackLooping[channel]
    KANE_QuNeo.trackLooping[channel] = (old + 1) % 2 // toggle on/off
    KANE_QuNeo.assertLoopingLED(deck) // update LED
}

/***** Toggling PlayScratch ****/

KANE_QuNeo.play = function (deck) {
    var channel = deck - 1;
    var deckName = "[Channel"+deck+"]";
    var playing = engine.getValue(deckName,"play");
    if (playing) {    // If currently playing
        engine.setValue(deckName,"play",0);    // Stop
    }
    else {    // If not currently playing,
        engine.setValue(deckName,"play",1);    // Start
    }
    // update global value
    KANE_QuNeo.trackPlaying[channel] = engine.getValue(deckName,"play");
    
    // LED handling
    var status = 0xB0, control, i;
    if (deck == 1) control = 0x06; // CC 6 for rotary 1
    else if (deck == 2) control = 0x07; // CC 7 for rotary 2
    // light all lights to report button press
    for (i = 0; i < 128; i++) {
	midi.sendShortMsg(status,control,i);
    }
}

KANE_QuNeo.togglePlayScratch = function (channel, control, value, status, group) {
    var old = KANE_QuNeo.playScratchToggle;
    KANE_QuNeo.playScratchToggle = (old + 1) % 2 // toggle global on/off
    KANE_QuNeo.assertPlayScratchLED() // update LED
}

/***** Toggling Record *****/

KANE_QuNeo.toggleRecord = function (channel, control, value, status, group) {
    var old = KANE_QuNeo.recordToggle;
    KANE_QuNeo.recordToggle = (old + 1) % 2 // toggle global on/off
    engine.setValue("[Recording]","toggle_recording",1) // toggle engine
    KANE_QuNeo.assertRecordLED() // update LED
}

// -------------------------------------
// begin functionality section
// -------------------------------------


/***** Jump and/or Loop 1,2,4,8 *****/

KANE_QuNeo.jumpLoop = function (deck, numBeats) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = "[Channel"+deck+"]"

    var bpm = engine.getValue(deckName,"bpm");
    var spb = 60/bpm // seconds per beat
    var duration = engine.getValue(deckName, "duration");
    var oldPosition = engine.getValue(deckName, "visual_playposition");
    var direction = KANE_QuNeo.trackJump[channel];
    var newPosition = oldPosition + (direction*numBeats*spb/duration);

    if (newPosition != oldPosition) { // if jump is on,
	engine.setValue(deckName,"playposition",newPosition); // jump
	
	if (KANE_QuNeo.trackJumpSync[channel]) // schedule sync if in sync mode
	    KANE_QuNeo.scheduledSync[channel] = KANE_QuNeo.counter; 

	// light appropriate jumpLED
	KANE_QuNeo.jumpLEDs(deck, numBeats);
    }

    // now figure out whether or not to loop
    if (KANE_QuNeo.trackLooping[channel]) { // if in looping mode,

	if (!(KANE_QuNeo.trackPlaying[channel])) // and not playing,
	    engine.setValue(deckName,"beatloop_"+numBeats+"_activate",1) // set loop

	else {	// else, if playing, schedule a loop with a loop counter
	    KANE_QuNeo.scheduledLoop[channel] = KANE_QuNeo.counter;
	    KANE_QuNeo.scheduledLoopBeats[channel] = numBeats;
	}
    }
}

/****** Rotary Scratching ******/

KANE_QuNeo.rotaryTouch = function (deck, value, status) {
    if ((status & 0xF0) == 0x90) {    // If note on midi channel 1
        if (value == 0x7F) {   // if full velocity
	    if (KANE_QuNeo.playScratchToggle) { // and scratch is toggled off
		KANE_QuNeo.play(deck); // this is a play button
		return;
	    }
	    // else proceed with scratching
	    var alpha = 1.0/8, beta = alpha/32;
            engine.scratchEnable(deck, 128, 33+1/3, alpha, beta);
       	}
       	else {engine.scratchDisable(deck);}
    }
    else if (value == 0x00) {    // If button up
        engine.scratchDisable(deck);
    }
}

// The wheels which actually control the scratching
KANE_QuNeo.wheelTurn = function (deck, value) {
    var velocity = KANE_QuNeo.scratchSpeed;
    if (value > 1) // if reverse
	velocity *= -1; // flip direction
    engine.scratchTick(deck,velocity);
}

/***** Playlist Mode *****/

KANE_QuNeo.scrollPlaylist = function (channel, control, value, status, group) {
    if (value == 1) // if rotating clockwise
	engine.setValue("[Playlist]","SelectNextPlaylist",1)
    else if (value == 127) // if rotating counterclockwise
	engine.setValue("[Playlist]","SelectPrevPlaylist",1)
}

KANE_QuNeo.scrollTracklist = function (channel, control, value, status, group) {
    if (value == 1) // if rotating clockwise
	engine.setValue("[Playlist]","SelectNextTrack",1)
    else if (value == 127) // if rotating counterclockwise
	engine.setValue("[Playlist]","SelectPrevTrack",1)
}

/***** Time Keeping *****/

KANE_QuNeo.timeKeeper = function (deck, value) {
    var channel = deck - 1;
    var deckName = "[Channel"+deck+"]"

    // update global time: scale 0-1 value by total track duration
    KANE_QuNeo.trackPosition[channel] = value *
	engine.getValue(deckName,"duration");

    /* check to see if we need to handle a scheduled loop or sync */
    if (KANE_QuNeo.scheduledLoop[channel] > 0) { // if there is a scheduled loop
	// if we are 1 tick away, do the loop
	if (KANE_QuNeo.scheduledLoop[channel] == 1) { 
	    cmd = "beatloop_"+KANE_QuNeo.scheduledLoopBeats[channel]+"_activate"
	    engine.setValue(deckName,cmd,1)
	}
	// decrement counter
	KANE_QuNeo.scheduledLoop[channel] -= 1;
    }

    if (KANE_QuNeo.scheduledSync[channel] > 0) { // if there is a scheduled sync
	if (KANE_QuNeo.scheduledSync[channel] == 1) // if we are 1 tick away,
	    engine.setValue(deckName,"beatsync_phase",1); // do the sync

	// decrement counter
	KANE_QuNeo.scheduledSync[channel] -= 1;
    }

    // update rotary LEDs
    KANE_QuNeo.circleLEDs(deck, value)
    
    // reports when there are beats
    if (engine.getValue(deckName,"beat_active")) {
	var diff = KANE_QuNeo.trackPosition[channel] -
	    KANE_QuNeo.lastBeatTime[channel];
	if (diff >= -0.09 && diff <= 0.09) return; // prevent rebounce
	KANE_QuNeo.playerBeat(deck, diff);
    }
}


// -------------------------------------------------------
// Begin LED section
// -------------------------------------------------------

// General io function for LEDs, takes arrays controls and values
// of equal lengths of hexidecimal numbers.
// if values is a single hex number, assumes that value for all controls
KANE_QuNeo.LEDs = function (midiChannel, controls, values) {
    var length = controls.length;
    if (!(values instanceof Array)) { // if values is not an array,
	// assume it's a hex number and make a new array of appropriate length
	for (var i=0; i < length; i++)
	    midi.sendShortMsg(midiChannel,controls[i],values);
    }
    else { // else send each control each value
	for (var i=0; i < length; i++)
	    midi.sendShortMsg(midiChannel,controls[i],values[i]);
    }
}

/***** Beat Handler *****/

KANE_QuNeo.playerBeat = function (deck, diff) {
    var deckName = "[Channel"+deck+"]";
    var channel = deck - 1; // confusing, yes. channels start from 0.

    var bpm = engine.getValue(deckName,"bpm");
    var spb = 60/bpm // seconds per beat

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
    else if (diff >= 1.01*spb || (diff < 0 && diff <= -1.01*spb)) {
	print("non consecutive beat on deck "+deck)
	
	KANE_QuNeo.beatNumber[channel] = 1; // so restart at beat 1,
	// then schedule a sync if we are in JumpSync mode
	 if (KANE_QuNeo.trackJumpSync[channel])
	     KANE_QuNeo.scheduledSync[channel] = KANE_QuNeo.counter;
    }

    // Light the next LEDs and turn off the old
    var off = KANE_QuNeo.playerSequence(deck,lastBeat);
    var on = KANE_QuNeo.playerSequence(deck,KANE_QuNeo.beatNumber[channel]);
    KANE_QuNeo.LEDs(0x90,off,0x00);
    KANE_QuNeo.LEDs(0x90,on,0x7f);
}

/***** Jump LEDs *****/

KANE_QuNeo.jumpLEDs = function (deck, numBeats) {
    var off = [], on = [];
    if (deck == 1) {
	switch (numBeats) {
	case 1:
	    on = [0x31] // red on
	    off = [0x30] // green off
	    break;
	case 2:
	    on = [0x33] // red on
	    off = [0x32] // green off
	    break;
	case 4:
	    on = [0x21] // red on
	    off = [0x20] // green off
	    break;
	case 8:
	    on = [0x23] // red on
	    off = [0x22] // green off
	    break;
	}
    }
    else if (deck == 2) {
	switch (numBeats) {
	case 1:
	    on = [0x3d] // red on
	    off = [0x3c] // green off
	    break;
	case 2:
	    on = [0x3f] // red on
	    off = [0x3e] // green off
	    break;
	case 4:
	    on = [0x2d] // red on
	    off = [0x2c] // green off
	    break;
	case 8:
	    on = [0x2f] // red on
	    off = [0x2e] // green off
	}
    }
    KANE_QuNeo.LEDs(0x91,on,0x7f);
    KANE_QuNeo.LEDs(0x91,off,0x00);
}

KANE_QuNeo.jumpOff = function (deck, numBeats) {
    var deckName = "[Channel"+deck+"]";
    KANE_QuNeo.assertBeatLEDs(deck);
}

/****** Rotary LEDs ******/

KANE_QuNeo.circleLEDs = function (deck, value) {
    var deckName = "[Channel"+deck+"]";
    var channel = deck - 1; // confusing, yes. channels start from 0.

    // time it takes for an imaginary record to go around once in seconds
    var revtime = 1.8

    // find how many revolutions we have made. The fractional part is where we are
    // on the vinyl.
    var revolutions = (KANE_QuNeo.trackPosition[channel]/revtime) - .25;

    // multiply the fractional part by the total number of LEDs in a rotary.
    var light = ((revolutions-(revolutions|0))*127)|0; 
    // if this is a repeat message, do not send.
    if (KANE_QuNeo.lastLight[channel]==light) return;

    // format the message on midiChannel 1.
    // fwd means the forward spinning lights,
    // bwd the backward
    var status = 0xB0, control, fwd = 0x00, bwd = 0x7f;
    if (deck == 1) control = 0x06; // CC 6 for rotary 1
    else if (deck == 2) control = 0x07; // CC 7 for rotary 2
    midi.sendShortMsg(status,control,fwd+light);

    // maintenance
    KANE_QuNeo.lastLight[channel]=light;
}

/***** LED Assertions *****/

KANE_QuNeo.assertLEDs = function (channel, control, value, status, group) {

    // turn off this button's LED while asserting
    KANE_QuNeo.LEDs(0x90,[0x22],0x00)

    // assert all scripted LEDs
    KANE_QuNeo.assertPlayScratchLED();
    KANE_QuNeo.assertRecordLED();
    var deck;
    for (deck = 1; deck < 3; deck++) {
	KANE_QuNeo.assertJumpSyncLED(deck);
	KANE_QuNeo.assertLoopingLED(deck);
	KANE_QuNeo.assertJumpDirectionLEDs(deck);
	KANE_QuNeo.assertBeatLEDs(deck);
	
	
	// horizontal arrow keys
	var deckName = "[Channel"+deck+"]";
	engine.trigger(deckName,"keylock");
	engine.trigger(deckName,"slip_enabled");
	engine.trigger(deckName,"pfl");
	engine.trigger(deckName,"flanger");
    }

    // then assert all horizontal slider LEDs
    KANE_QuNeo.masterVol(engine.getValue("[Master]","volume"));
    KANE_QuNeo.headVol(engine.getValue("[Master]","headVolume"));
    KANE_QuNeo.flangerPeriod(engine.getValue("[Flanger]","lfoPeriod"));
    KANE_QuNeo.flangerDepth(engine.getValue("[Flanger]","lfoDepth"));
    KANE_QuNeo.crossFader(engine.getValue("[Master]","crossfader"));
    
    if (channel == -1) // if starting up, turn this button's LED on
	KANE_QuNeo.LEDs(0x90,[0x22],0x7f)
}

KANE_QuNeo.assertLEDOn = function (channel, control, value, status, group) {
    //turns on the assertLED button after release
    print("LEDs asserted")
    KANE_QuNeo.LEDs(0x90,[0x22],0x7f);
}

KANE_QuNeo.assertPlayScratchLED = function () {
    var brightness = 0x00
    if (KANE_QuNeo.playScratchToggle) // if in play mode
	brightness = 0x7f // set led to max
    midi.sendShortMsg(0x90,0x23,brightness); // emit update
}

KANE_QuNeo.assertRecordLED = function () {
    var brightness = 0x00
    if (KANE_QuNeo.recordToggle) // if in record mode
	brightness = 0x7f // set led to max
    midi.sendShortMsg(0x90,0x21,brightness); // emit update
}

KANE_QuNeo.assertJumpDirectionLEDs = function (deck) {
    var channel = deck - 1;
    var on, off; // controls for which LEDs to turn on and off

    // Determine which LEDs to turn on
    switch (KANE_QuNeo.trackJump[channel]) {

    case -1: // jump backward is on
	if (deck == 1) {
	    on = [0x11] // left red on
	    off = [0x13] // right red off
	}
	else if (deck == 2) {
	    on = [0x1d] // left red on
	    off = [0x1f] // right red off
	}
	break;

    case 0: // neither jump is on
	if (deck == 1) {
	    on = []
	    off = [0x11,0x13] // both off
	}
	else if (deck == 2) {
	    on = []
	    off = [0x1d,0x1f] // both off
	}
	break;

    case 1: // jump forward is on
	if (deck == 1) {
	    on = [0x13] // right red on
	    off = [0x11] // left red off
	}
	else if (deck == 2) {
	    on = [0x1f] // right red on
	    off = [0x1d] // left red off
	}
	break;
    }

    // Now send actual midi messages
    KANE_QuNeo.LEDs(0x91,on,0x7f);
    KANE_QuNeo.LEDs(0x91,off,0x00);
}

KANE_QuNeo.assertLoopingLED = function (deck) {
    var channel = deck - 1;
    var on, off; // arrays to control which LEDs to change

    // First deal with deck 1
    if (deck == 1) {
	if (KANE_QuNeo.trackLooping[channel]) // if in loop mode
	    on = [0x14,0x15], off = []; //red on, green on
	else
	    on = [0x14], off = [0x15]; //green on, red off
    }
    else if (deck == 2) {
	if (KANE_QuNeo.trackLooping[channel]) // if in loop mode
	    on = [0x1a,0x1b], off = []; //red on, green on
	else
	    on = [0x1a], off = [0x1b]; //green on, red off
    }

    KANE_QuNeo.LEDs(0x91,on, 0x7f)
    KANE_QuNeo.LEDs(0x91,off, 0x00);
}

KANE_QuNeo.assertBeatLEDs = function (deck) {
    var channel = deck - 1;
    var deckName = "[Channel"+deck+"]"
    var on, off; // arrays to control which LEDs to change

    // First deal with deck 1
    if (deck == 1) {
	on = [0x20,0x22,0x30,0x32]; // green on
	off = [0x21,0x23,0x31,0x33]; // red off
    }
    else if (deck == 2) {
	on = [0x2c,0x2e,0x3c,0x3e]; // green on
	off = [0x2d,0x2f,0x3d,0x3f]; // red off

    }

    // Now trigger enabled loop LEDs
    for (var i = 1; i < 16; i *= 2) {
	print("triggering enabled loop: " + i)
	engine.trigger(deckName,"beatloop_"+i+"_activate");
    }

    KANE_QuNeo.LEDs(0x91,on, 0x7f);
    KANE_QuNeo.LEDs(0x91,off, 0x00);
}

KANE_QuNeo.assertJumpSyncLED = function (deck) {
    var channel = deck - 1;
    var on, off; // arrays to control which LEDs to change

    // First deal with deck 1
    if (deck == 1) {
	if (KANE_QuNeo.trackJumpSync[channel]) // if in jumpsync mode
	    on = [0x02], off = []; //green on
	else // if not in jumpsync mode
	    on = [], off = [0x02]; //green off
    }
    else if (deck == 2) {
	if (KANE_QuNeo.trackJumpSync[channel]) // if in jumpsync mode
	    on = [0x0c], off = []; //green on
	else
	    on = [], off = [0x0c]; //green off
    }

    KANE_QuNeo.LEDs(0x91,on, 0x7f);
    KANE_QuNeo.LEDs(0x91,off, 0x00);
}

/***** Slider LEDs *****/

KANE_QuNeo.masterVol = function (value) {
    var vol;
    if (value < 1) // first half of the knob, 0-1
	vol = value * 127 / 2;
    else // second half of the knob, 1-5
	vol = 64 + (value - 1) * 64 / 4
    midi.sendShortMsg(0xb0,0x0b,0x00+vol);
}

KANE_QuNeo.headVol = function (value) {
    var vol;
    if (value < 1) // first half of the knob, 0-1
	vol = value * 127 / 2;
    else // second half of the knob, 1-5
	vol = 64 + (value - 1) * 64 / 4
    midi.sendShortMsg(0xb0,0x0a,0x00+vol);
}

KANE_QuNeo.flangerPeriod = function (value) {
    var flangePeriod = (value - 50) * 127 / 2000000;
    midi.sendShortMsg(0xb0,0x09,0x00+flangePeriod);
}

KANE_QuNeo.flangerDepth = function (value) {
    var flangeDepth = value * 127;
    midi.sendShortMsg(0xb0,0x08,0x00+flangeDepth);
}

KANE_QuNeo.crossFader = function (value) {
    var crossFade = (value * 63.5) + 63.5; // split slider in half
    midi.sendShortMsg(0xb0,0x05,0x00+crossFade);
}


// -----------------------------------------------------
// begin dispatch section
// -----------------------------------------------------

/***** Dispatches *****/

//JumpSyncing
KANE_QuNeo.toggle1JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(1); // toggle jumpsync for deck 1
}

KANE_QuNeo.toggle2JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(2);
}

//Jumping
KANE_QuNeo.jump1Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(1, 1); // channel 1 to jump status 1
}

KANE_QuNeo.jump2Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(2, 1);
}

KANE_QuNeo.jump1Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(1, -1);
}

KANE_QuNeo.jump2Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(2, -1);
}

//Looping
KANE_QuNeo.toggle1Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(1)
}

KANE_QuNeo.toggle2Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(2)
}

//JumpLooping
KANE_QuNeo.deck1JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(1,1) // deck 1, 1 beat jump and/or loop
}

KANE_QuNeo.deck1JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(1,2)
}

KANE_QuNeo.deck1JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(1,4)
}

KANE_QuNeo.deck1JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(1,8)
}

KANE_QuNeo.deck2JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(2,1)
}

KANE_QuNeo.deck2JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(2,2)
}

KANE_QuNeo.deck2JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(2,4)
}

KANE_QuNeo.deck2JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(2,8)
}

//JumpOff

KANE_QuNeo.deck1JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(1,1)
}

KANE_QuNeo.deck1JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(1,2)
}

KANE_QuNeo.deck1JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(1,4)
}

KANE_QuNeo.deck1JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(1,8)
}

KANE_QuNeo.deck2JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(2,1)
}

KANE_QuNeo.deck2JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(2,2)
}

KANE_QuNeo.deck2JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(2,4)
}

KANE_QuNeo.deck2JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(2,8)
}

//Rotaries
KANE_QuNeo.rotary1Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(1, value, status);
}

KANE_QuNeo.rotary2Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(2, value, status);
}

KANE_QuNeo.wheel1Turn = function (channel, control, value, status, group) {
    KANE_QuNeo.wheelTurn(1, value);
}

KANE_QuNeo.wheel2Turn = function (channel, control, value, status, group) {
    KANE_QuNeo.wheelTurn(2, value);
}

//Timekeeper
KANE_QuNeo.time1Keeper = function (value) {
    KANE_QuNeo.timeKeeper(1, value);
}

KANE_QuNeo.time2Keeper = function (value) {
    KANE_QuNeo.timeKeeper(2, value);
}