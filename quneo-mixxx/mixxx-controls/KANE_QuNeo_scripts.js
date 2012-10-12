/* Midi scripts for Kane's Quneo presets. Fills out some LED's, provides rotary
   scratching/playing, and (1300 lines of) other things. */

function KANE_QuNeo () {}

/* BEGIN INDEX

   1) Init

       (GV) Global Variables
       (IS) Initialization and Shutdown

   2) Toggling

       (JS) Toggling JumpSync
       (JD) Toggling Jump Direction
       (L)  Toggling Looping
       (PS) Toggling PlayScratch
       (R)  Toggling Record

   3) Functionality
   
       (JL) Jump, Sync, and/or Loop over 1,2,4,8 Beats
       (ZC) Zoom and Cursor
       (VN) Visual Nudging
       (RN) Periodic and Regular Rate Nudging
       (P)  Playlist Mode
       (RB) Reset Beat
       (TK) Time Keeping
       (B)  Beat Handling
       (UF)  Utilities

   4) LEDs

       (JLED) Jump LEDs
       (RLED) Rotary LEDs
       (ALED) LED Assertions
       (SLED) Slider LEDs

   5) Dispatches

       (DD) Deck Dispatches
       (SD) Sampler Dispatches
   
END INDEX*/

// -------------------------------------
// begin init section
// -------------------------------------

/***** (GV) Global Variables *****/

// Settings

KANE_QuNeo.timer = 35; // time(ms) to wait before executing a jumped loop or sync
KANE_QuNeo.beatOffset = 85; // time(ms) to wait before signaling a beat, used
// to synchronize LED's and actual audible beat

KANE_QuNeo.numDecks = 6 // number of decks we are supporting. currently 2 decks +
                        // 4 samplers = 6 total decks
KANE_QuNeo.pregain = 1.0 // initialize deck gains to this value
KANE_QuNeo.scratchSpeed = 3.0 // Scratch ticks per rotary sense
KANE_QuNeo.rateNudgeHoldTime = 800; // time(ms) to hold nudges for scroll toggle
KANE_QuNeo.visualNudgeHoldTime = 500; // time(ms) to hold nudges for scroll toggle
KANE_QuNeo.visualNudgeDist = .0000005 // setting (%) for how far each press of visual
                                   // nudge moves the current play position

KANE_QuNeo.totalBeats = 16; // number of beats over which to sequence the LEDs
KANE_QuNeo.visualNudgeSpeed = 20 // time(ms) to wait for each tick while scrolling
KANE_QuNeo.rateNudgeSpeed = 1000; // ms to wait between each auto nudge
KANE_QuNeo.rateNudgeTolerance = 0.16*0.025 // determines how close rate must be to 0
                                     // to trigger turning off auto nudge

// LED Sequencers for each deck - easy to edit!
// simply choose which LEDs you want for each
// beat, then update it with the appropriate midi note!
// LED midi note mappings for the quneo are found in the quneo's full manual
// playerSequence must return a vector of hex numbers.
// Quarter comes in 0, 1/4, 1/2, 3/4.
KANE_QuNeo.playerSequence = function (deck, beat, quarter) {
    // Here is deck 1's sequence
    if (deck == 1) { // do deck1 sequence
	var middleGreen = [0x64,0x54,0x52,0x62]
	var middleRed = [0x65,0x55,0x53,0x63]
	var middleOrange = middleGreen.concat(middleRed)
	if (quarter == 0) { // for whole beats
	    switch (beat) {
	    case 1: // LEDs to turn on for beat 1 of 8
		return [0x73,0x75,0x43,0x45].concat(middleRed);
	    case 2: case 4: case 6: case 8: case 11: case 13: case 15:
		return [0x60,0x50,0x66,0x56].concat(middleOrange);
	    case 3: case 5: case 7: case 10: case 12: case 14: case 16: case 0:
		return [0x72,0x74,0x42,0x44].concat(middleOrange);
	    case 9:
		return [0x61,0x51,0x67,0x57].concat(middleRed);
	    }
	}
	else if (quarter == 1/2) {
	    switch (beat) {
	    case 8:
		return [0x70,0x72,0x74,0x76,0x40,0x42,0x44,0x46,0x73,0x75,0x43,0x45]
	    case 16:
		return [0x70,0x60,0x50,0x40,0x76,0x66,0x56,0x46,0x61,0x51,0x67,0x57]
	    default:
		return middleGreen
	    }
	}
    }

    // Here is deck 2's sequence
    else if (deck == 2) { // do deck1 sequence
	var middleGreen = [0x6a,0x6c,0x5a,0x5c]
	var middleRed = [0x6b,0x6d,0x5b,0x5d]
	var middleOrange = middleGreen.concat(middleRed)
	if (quarter == 0) { // for whole beats
	    switch (beat) {
	    case 1: // LEDs to turn on for beat 1 of 8
		return [0x7b,0x7d,0x4b,0x4d].concat(middleRed);
	    case 2: case 4: case 6: case 8: case 11: case 13: case 15:
		return [0x68,0x58,0x6e,0x5e].concat(middleOrange);
	    case 3: case 5: case 7: case 10: case 12: case 14: case 16:
		return [0x7a,0x7c,0x4a,0x4c].concat(middleOrange);
	    case 9:
		return [0x69,0x59,0x6f,0x5f].concat(middleRed);
	    }}
	else if (quarter == 1/2) {
	    switch (beat) {
	    case 8: // LEDs to turn on for 8 and
		return [0x78,0x7a,0x7b,0x7c,0x7d,0x7e,0x48,0x4a,0x4b,0x4c,0x4d,0x4e]
	    case 16:
		return [0x78,0x68,0x69,0x58,0x59,0x48,0x7e,0x6e,0x6f,0x5e,0x5f,0x4e]
	    default:
		return middleGreen
	    }
	}
    }
    return []; // turn on nothing if no matches
}
/*    if (beat > 4) beat -= 4; // crude mod 8
    // Here is deck 1's sequence 0
    if (deck == 1) { // do deck1 sequence
	if (quarter == 0) { // for whole beats
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
    }
    // Here is deck 2's sequence 0
    else if (deck == 2) {
	if (quarter == 0) { // for whole beats
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
    return []; // turn on nothing if no matches
}*/
// Runtime Variables

KANE_QuNeo.makeVar = function (element) {
    var array = []
    // initialize the array with copies of the element for each deck
    for (var i = 0; i < KANE_QuNeo.numDecks; i++)
	array.push(element)
    return array
}

// stores timers of nudges
KANE_QuNeo.rateNudgeTimers = KANE_QuNeo.makeVar([])
KANE_QuNeo.visualNudgeTimers = KANE_QuNeo.makeVar([])

KANE_QuNeo.visualNudge = KANE_QuNeo.makeVar(0) // 1 for nudging forward, -1 backward
KANE_QuNeo.rateNudge = KANE_QuNeo.makeVar(0) // 1 for rate nudging, determines
                          //  periodic vs press. -1 for backward, 0 for not nudging
KANE_QuNeo.lastLight =
    KANE_QuNeo.makeVar(-1); // starting position of last rotary LED
    
KANE_QuNeo.trackPosition = 
    KANE_QuNeo.makeVar(0); // position of each deck in song

// Stores which beat each deck is on, loops 1-KANE_QuNeo.totalBeats
KANE_QuNeo.wholeBeat = KANE_QuNeo.makeVar(KANE_QuNeo.totalBeats);
KANE_QuNeo.lastBeatTime = 
    KANE_QuNeo.makeVar(-4000);  // time of last real beat on each deck
KANE_QuNeo.lastBeatLEDs = 
    KANE_QuNeo.makeVar([]); // last beat LEDs to receive an on midi msg

KANE_QuNeo.playScratchToggle = 1;  // 1 for play, 0 for scratch
KANE_QuNeo.recordToggle = 0;  // 1 for recording

// 0 if no schedule, 1 if loop of 1 beat, 2 for a loop of 2 beats, etc
KANE_QuNeo.loopNextJump = KANE_QuNeo.makeVar(0);
KANE_QuNeo.trackJumped = 
    KANE_QuNeo.makeVar(0); // 1 if this track just jumped, 0 otherwise

KANE_QuNeo.trackJump = 
    KANE_QuNeo.makeVar(0); // -1 for backwards, 0 for no jump, 1 for forwards
KANE_QuNeo.trackLooping = 
    KANE_QuNeo.makeVar(1) // 1 if in looping mode, else 0
KANE_QuNeo.trackJumpSync = 
    KANE_QuNeo.makeVar(0) // 1 if auto sync on jump
KANE_QuNeo.trackPlaying = 
    KANE_QuNeo.makeVar(0) // 1 if track is currently playing
KANE_QuNeo.slipEnabled = KANE_QuNeo.makeVar(0) // 1 if slip is enabled

KANE_QuNeo.scheduledBeats = 
    KANE_QuNeo.makeVar([]) // holds arrays of timers which may be stopped
	    
/***** (IS) Initialization and Shutdown *****/

KANE_QuNeo.init = function (id) { // called when the device is opened & set up

  // NOTE: the 2 following controls are called each time the music updates,
  //       which means ~every 0.02 seconds. Everything that needs consistent updates
  //       should branch from these functions so we don't eat the cpu.
  //       Visual playposition is updated roughly 4x more often
  //       than playposition.
  engine.connectControl("[Channel1]","visual_playposition","KANE_QuNeo.time1Keeper");
  engine.connectControl("[Channel2]","visual_playposition","KANE_QuNeo.time2Keeper");

  // led controls for the master / flanger channels
  engine.connectControl("[Master]","volume","KANE_QuNeo.masterVol");
  engine.softTakeover("[Master]","volume",true);
  engine.connectControl("[Master]","headVolume","KANE_QuNeo.headVol");		    
  engine.connectControl("[Flanger]","lfoPeriod","KANE_QuNeo.flangerPeriod");
  engine.connectControl("[Flanger]","lfoDepth","KANE_QuNeo.flangerDepth");  

  engine.connectControl("[Master]","crossfader","KANE_QuNeo.crossFader");

  for (var deck = 1; deck <= KANE_QuNeo.numDecks; deck++) {
      var deckName = KANE_QuNeo.getDeckName(deck)
      
      // soft takeovers
      engine.softTakeover(deckName,"rate",true);
      engine.softTakeover(deckName,"volume",true);

      engine.softTakeover(deckName,"filterHigh",true);

      engine.softTakeover(deckName,"filterMid",true);

      engine.softTakeover(deckName,"filterLow",true);

      engine.softTakeover(deckName,"pregain",true);

      // Conveniences
      engine.setValue(deckName,"keylock",1);
      engine.setValue(deckName,"quantize",1);   
      engine.setValue(deckName,"pregain",KANE_QuNeo.pregain)
  }

  engine.setValue("[Samplers]","show_samplers",1)
  engine.setValue("[Microphone]","show_microphone",1)


    // for coolness
  //engine.setValue("[Spinny1]","show_spinny",1)
  //engine.setValue("[Spinny2]","show_spinny",1)

  // now that our controls are up, assert our LED config
  KANE_QuNeo.assertLEDs(-1); // call with -1 as channel to indicate startup
};

KANE_QuNeo.shutdown = function () {
};

// -------------------------------------
// begin toggling section
// -------------------------------------


/**** (JS) Toggling JumpSync *****/

KANE_QuNeo.toggleJumpSync = function (deck) {
    var channel = deck - 1;
    var old = KANE_QuNeo.trackJumpSync[channel]
    KANE_QuNeo.trackJumpSync[channel] = (old + 1) % 2 // toggle on/off
    KANE_QuNeo.assertJumpSyncLED(deck) // update LED
}

/***** (JD) Toggling Jump Direction *****/

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

/***** (L) Toggling Looping *****/

KANE_QuNeo.toggleLooping = function (deck) {
    var channel = deck - 1;
    var old = KANE_QuNeo.trackLooping[channel]
    KANE_QuNeo.trackLooping[channel] = (old + 1) % 2 // toggle on/off
    KANE_QuNeo.assertLoopingLED(deck) // update LED
}

/***** (PS) Toggling PlayScratch ****/

KANE_QuNeo.play = function (deck) {
    var channel = deck - 1;
    var deckName = KANE_QuNeo.getDeckName(deck);
    var playing = engine.getValue(deckName,"play");
    if (playing) {    // If currently playing
        engine.setValue(deckName,"play",0);    // Stop
	KANE_QuNeo.cancelScheduledBeats(deck); // cancel any scheduled beats,
	KANE_QuNeo.clearLastBeatLEDs(deck); // and turn off last beat LEDs.
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

KANE_QuNeo.rotaryTouch = function (deck, value, status) {
    if ((status & 0xF0) == 0x90) {    // If note press on midi channel 1
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

/***** (R) Toggling Record *****/

KANE_QuNeo.toggleRecord = function (channel, control, value, status, group) {
    var old = KANE_QuNeo.recordToggle;
    KANE_QuNeo.recordToggle = (old + 1) % 2 // toggle global on/off
    engine.setValue("[Recording]","toggle_recording",1) // toggle engine
    KANE_QuNeo.assertRecordLED() // update LED
}

// -------------------------------------
// begin functionality section
// -------------------------------------

/***** (JL) Jump, Sync, and/or Loop over 1,2,4,8 Beats *****/

KANE_QuNeo.jumpLoop = function (deck, numBeats) {
    print ("jumpLoop called for deck: " + deck)
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = KANE_QuNeo.getDeckName(deck)

    var bpm = engine.getValue(deckName,"file_bpm");
    var spb = 60/bpm // seconds per beat
    var duration = engine.getValue(deckName, "duration");
    var oldPosition = engine.getValue(deckName, "visual_playposition");
    var direction = KANE_QuNeo.trackJump[channel];
    var beatsVector = numBeats * direction; // vector has magnitude and direction
    var newPosition = oldPosition + (beatsVector*spb/duration);

    // if jump is on,
    if (newPosition != oldPosition) {

	// light appropriate jumpLED during button press
	KANE_QuNeo.jumpLEDs(deck, numBeats);
	print("old beat #:" + KANE_QuNeo.wholeBeat[channel])

	engine.setValue(deckName,"playposition",newPosition); // jump
	// then adjust current beat
	var wholeBeat = KANE_QuNeo.wholeBeat[channel]
	var newBeat = (wholeBeat + beatsVector);
	// if playing, we will hit the next beat so add 1
	if (engine.getValue(deckName,"play"))
	    newBeat += 1
	print("newbeat before mod: "+newBeat)
	var totalBeats = KANE_QuNeo.totalBeats

	if (newBeat < 1) // hand-made mod
	    newBeat += totalBeats 
	else if (newBeat > 16) // note: extra mod stuff because javascript's mod is mathematically wrong
	    newBeat -= totalBeats

	KANE_QuNeo.wholeBeat[channel] = newBeat // then set us to that beat
	print("new beat #:" + KANE_QuNeo.wholeBeat[channel])
	KANE_QuNeo.trackJumped[channel] = 1; // say that we jumped

	if (KANE_QuNeo.trackJumpSync[channel]) // then schedule sync if in sync mode
	    KANE_QuNeo.scheduleSync(deck);
    }

    // now figure out how/whether or not to loop
    if (KANE_QuNeo.trackLooping[channel]) { // if in looping mode,

	if (!(KANE_QuNeo.trackPlaying[channel] // and neither playing,
	     && direction))                    // nor jumping,
	    KANE_QuNeo.doLoop(deck, numBeats); // do loop now
	else // else (if playing or jumping) schedule a loop
	    KANE_QuNeo.scheduleLoop(deck, numBeats);
    }

    // if neither jump nor loop, then we are in loop planning mode
    else if (!(KANE_QuNeo.trackLooping[channel])
	     && !(KANE_QuNeo.trackJump[channel])) {

	// light appropriate jumpLED during button press
	KANE_QuNeo.jumpLEDs(deck, numBeats);

	if (KANE_QuNeo.loopNextJump[channel] == numBeats) // if equal numBeats,
	    // we already have a loop of this length planned, so a second button
	    // press means to cancel the first
	    KANE_QuNeo.loopNextJump[channel] = 0;

	else // otherwise, proceed
	    KANE_QuNeo.loopNextJump[channel] = numBeats; // set loop for next jump
    }
}

KANE_QuNeo.scheduleSync = function (deck) {
    engine.beginTimer(KANE_QuNeo.timer,"KANE_QuNeo.doSync("+deck+")",true)
}

KANE_QuNeo.doSync = function (deck) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    engine.setValue(deckName,"beatsync_phase",1); // do the sync
}

KANE_QuNeo.scheduleLoop = function (deck, numBeats) {
    engine.beginTimer(KANE_QuNeo.timer,
		      "KANE_QuNeo.doLoop("+deck+","+numBeats+")"
		      ,true)
}
    
KANE_QuNeo.doLoop = function (deck, numBeats) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    engine.setValue(deckName,"beatloop_"+numBeats+"_activate",1) // set loop
}

/***** (ZC) Zoom and Cursor *****/

KANE_QuNeo.deckZoom = function (deck, value) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = KANE_QuNeo.getDeckName(deck)
    
    var normalized = Math.ceil(6 * ((127 - value) / 127))

    // adjust zoom and assert LEDs
    engine.setValue(deckName, "waveform_zoom", normalized)
    KANE_QuNeo.assertZoomLEDs(deck)
    
}

KANE_QuNeo.deckCursor = function (deck, value) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = KANE_QuNeo.getDeckName(deck)

    var normalized = value / 127;
    
    // adjust play positions, then update LEDs
    engine.setValue(deckName,"visual_playposition", normalized)
    engine.setValue(deckName,"playposition", normalized)
    //KANE_QuNeo.assertCursorLEDs(1);
}

/***** (VN) Visual Nudging *****/

KANE_QuNeo.visualNudge = function (deck, direction) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = KANE_QuNeo.getDeckName(deck)

    if (!(KANE_QuNeo.visualNudge[channel])) { // if we are not already nudging,
	KANE_QuNeo.visualNudge[channel] = 1; // set us to nudging,
	// then set timer to see if button is held for more than half a second
	KANE_QuNeo.visualNudgeTimers[channel].push(
	    engine.beginTimer(KANE_QuNeo.visualNudgeHoldTime,
			      "KANE_QuNeo.visualNudgeHeld("+deck+","+direction+")",
			      true))
	// then do the pressed nudge
	KANE_QuNeo.doVisualNudge(deck, direction);

    } else // if we are nudging, this press is to stop nudging
	KANE_QuNeo.visualNudge[channel] = 0;
}

KANE_QuNeo.visualNudgeHeld = function (deck, direction) {
    // if we reach this function, visual nudge has been held for sufficient time
    // to activate scrolling...
    var channel = deck - 1;
    KANE_QuNeo.visualNudge[channel] = direction;
    // ...so set a persistent scroll timer
    KANE_QuNeo.visualNudgeTimers[channel].push(
	engine.beginTimer(KANE_QuNeo.visualNudgeSpeed,
			  "KANE_QuNeo.doVisualNudge("+deck+","+direction+")"))
}

KANE_QuNeo.doVisualNudge = function (deck, direction) {
    var channel = deck - 1;
    var deckName = KANE_QuNeo.getDeckName(deck)
    // calculate new position
    var newPosition = engine.getValue(deckName,"visual_playposition")
	+ (KANE_QuNeo.visualNudgeDist * direction);
	  
    // now apply to both visual and actual position
    engine.setValue(deckName,"playposition",newPosition)
    engine.setValue(deckName,"visual_playposition",newPosition)

}

KANE_QuNeo.visualNudgeOff = function (deck, direction) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays

    // turn off the nudging
    KANE_QuNeo.visualNudge[channel] = 0;
    KANE_QuNeo.cancelTimers(KANE_QuNeo.visualNudgeTimers[channel]);
    KANE_QuNeo.visualNudgeTimers[channel] = []; // reset global rate timer var
}

/***** (RN) Periodic and Regular Rate Nudging *****/

KANE_QuNeo.rateNudge = function (deck, direction) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var deckName = KANE_QuNeo.getDeckName(deck)

    // first light LED to signify button press
    

    // if we are not auto nudging, then set button hold timer
    // and do a regular nudge
    if (!(KANE_QuNeo.rateNudge[channel])) {
	KANE_QuNeo.rateNudgeTimers[channel].push(
	    engine.beginTimer(KANE_QuNeo.rateNudgeHoldTime,
			      "KANE_QuNeo.rateNudgeHeld("+deck+","+direction+")",
			      true))
	KANE_QuNeo.doRateNudge(deck, direction);
    }
    else {// if we are currently auto nudging,
	KANE_QuNeo.rateNudge[channel] = 0; // toggle it off
	print("turning off auto nudge for deck: "+deck)
    }
}

KANE_QuNeo.rateNudgeHeld = function (deck, direction) {
    // if we reach this function, the rate nudge has been held for sufficient time
    // to activate auto nudge
    print("activating auto nudge for deck: "+deck+" in direction: "+direction)
    var channel = deck - 1;
    KANE_QuNeo.rateNudge[channel] = direction;
    // then set a persistent nudge timer
    KANE_QuNeo.rateNudgeTimers[channel].push(
	engine.beginTimer(KANE_QuNeo.rateNudgeSpeed,
			  "KANE_QuNeo.doRateNudge("+deck+","+direction+")"))
}

KANE_QuNeo.doRateNudge = function (deck, direction) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    var control;
    if (direction == 0)
	return;
    else if (direction == 1) // nudge tempo up
	control = "rate_perm_up_small"
    else if (direction == -1) // nudge tempo down
	control = "rate_perm_down_small"
    // make engine actually nudge
    engine.setValue(deckName,control,1)

    // now check if rate is near 0% adjustment. if so, turn off auto nudging.
    // NOTE: extra rate factor is for looking ahead 1 tick because the engine is
    // slow to update.
    var rate = engine.getValue(deckName, "rate") + 0.16 * direction * 0.05;
    var tolerance = KANE_QuNeo.rateNudgeTolerance
    print("rate: "+rate)
    if ((rate < 0 && rate > -tolerance) ||
	(rate > 0 && rate < tolerance)) {
	KANE_QuNeo.cancelTimers(KANE_QuNeo.rateNudgeTimers[channel]); //cancel timers
	KANE_QuNeo.rateNudgeTimers[channel] = []; // reset global rate timer var
    }
}

KANE_QuNeo.rateNudgeOff = function (deck, direction) {
    var channel = deck - 1; // track channels start at 0 to properly reference arrays
    KANE_QuNeo.assertNudgeLEDs(deck) // update LEDs
    if (!(KANE_QuNeo.rateNudge[channel])) { // if we are not on auto nudge,
	KANE_QuNeo.cancelTimers(KANE_QuNeo.rateNudgeTimers[channel]); //cancel timers
	KANE_QuNeo.rateNudgeTimers[channel] = []; // reset global rate timer var
    }
}

/***** (P) Playlist Mode *****/

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

/***** (RB) Reset Beat and Enable Slip*****/

KANE_QuNeo.resetBeat = function (deck) {
    var channel = deck - 1;
    var deckName = KANE_QuNeo.getDeckName(deck)
    var bpm = engine.getValue(deckName,"bpm");
    var spb = 60/bpm // seconds per beat

    // toggle slip
    KANE_QuNeo.slipEnabled[channel] =
	(KANE_QuNeo.slipEnabled[channel] + 1) % 2
    engine.setValue(deckName, "slip_enabled", KANE_QuNeo.slipEnabled[channel])

    KANE_QuNeo.cancelScheduledBeats(deck) // first, cancel old beats
    KANE_QuNeo.wholeBeat[channel] = 1; // set beat to 1,
    KANE_QuNeo.scheduleBeat(deck, 1, spb, 1) // then schedule this beat
}

/***** (TK) Time Keeping *****/

KANE_QuNeo.timeKeeper = function (deck, value) {
    var channel = deck - 1;
    var deckName = KANE_QuNeo.getDeckName(deck)

    // update global time: scale 0-1 value by total track duration
    KANE_QuNeo.trackPosition[channel] = value *
	engine.getValue(deckName,"duration");

    // update rotary LEDs
    KANE_QuNeo.circleLEDs(deck, value)
    
    // report when there are beats
    if (engine.getValue(deckName,"beat_active")) {
	var diff = KANE_QuNeo.trackPosition[channel] -
	    KANE_QuNeo.lastBeatTime[channel];
	if (diff > 0.0001 && diff <= 0.09) return; // prevent forwards rebounce
	//if (diff < -0.001 && diff >= -0.09) return; // prevent backwards rebounce

	// set the last beat to this time
	KANE_QuNeo.lastBeatTime[channel] = KANE_QuNeo.trackPosition[channel];

	// then handle the beat
	KANE_QuNeo.handleBeat(deck, diff);
    }
}

/***** (B) Beat Handling *****/

KANE_QuNeo.handleBeat = function (deck, diff) {
    var channel = deck - 1; // confusing, yes. channels start from 0.
    var deckName = KANE_QuNeo.getDeckName(deck);

    var bpm = engine.getValue(deckName,"bpm");
    var spb = 60/bpm // seconds per beat
    
    // record last beat number
    var lastWholeBeat = KANE_QuNeo.wholeBeat[channel];

    // now see which beat this one is
    // if this is a consecutive beat, do regular stuff:
    if (diff >= .8*spb && diff <= 1.2*spb) {
    	// first increment beat number,
	if (lastWholeBeat == KANE_QuNeo.totalBeats) // if beat at end
	    KANE_QuNeo.wholeBeat[channel] = 1; // restart at 1
	else // regular increment
	    KANE_QuNeo.wholeBeat[channel] += 1;
	// remember to clear our list of previously scheduled beats,
	KANE_QuNeo.scheduledBeats[channel] = [];
	// and then schedule a forwards beat
	KANE_QuNeo.scheduleBeat(deck, KANE_QuNeo.wholeBeat[channel], spb, 1)
    }
/*
    else if (diff <= -.8*spb && diff >= -1.2*spb) {
	// if back a beat, take a step back
    	// first decrement beat number,
	if (lastWholeBeat == 1) // if beat at start, go back to end
	    KANE_QuNeo.wholeBeat[channel] = KANE_QuNeo.totalBeats;
	else // regular decrement
	    KANE_QuNeo.wholeBeat[channel] -= 1;
	// then schedule a reverse beat
	KANE_QuNeo.scheduleBeat(deck, KANE_QuNeo.wholeBeat[channel], spb, -1)
    }
*/	

    // if we have moved either more than a beat OR backwards,
    // this is not a consecutive beat:
    else if (diff >= 1.1*spb || (diff <= 0)) { // diff == 0 means repeat beat
	print("non consecutive beat on deck "+deck)
	print("diff: "+diff)
	
	if (!(KANE_QuNeo.trackJumped[channel])) { // if we did not just jump,
	    KANE_QuNeo.wholeBeat[channel] = 1; // restart at beat 1
	    KANE_QuNeo.cancelScheduledBeats(deck); // cancel any scheduled beats
	} else // we just jumped, so reset status
	    KANE_QuNeo.trackJumped[channel] = 0;


	// then schedule a new beat
	KANE_QuNeo.scheduleBeat(deck, KANE_QuNeo.wholeBeat[channel], spb, 1);

	// set a loop if we had a loop planned for next jump
	var numBeats = KANE_QuNeo.loopNextJump[channel];
	if (numBeats) {
	    KANE_QuNeo.doLoop(deck, numBeats);
	    KANE_QuNeo.loopNextJump[channel] = 0; // handled, so reset global
	}

	// then schedule a sync if we are in JumpSync mode;
	// verifying other track is playing to avoid glitchy sync loops
	var otherChannel = (channel + 1) % KANE_QuNeo.numDecks
	if (KANE_QuNeo.trackJumpSync[channel] &&
	    KANE_QuNeo.trackPlaying[otherChannel])
	    KANE_QuNeo.scheduleSync(deck);
    }
}

KANE_QuNeo.cancelScheduledBeats = function (deck) {
    var channel = deck - 1, i;
    var scheduledBeats = KANE_QuNeo.scheduledBeats[channel];
    KANE_QuNeo.cancelTimers(scheduledBeats) // cancel all
    // now clear the global var
    KANE_QuNeo.scheduledBeats[channel] = [];
}

KANE_QuNeo.cancelTimers = function (timers) {
    for (i = 0; i < timers.length; i++)
	engine.stopTimer(timers[i]); // cancel each timer
}

// direction is 1 or -1 for forwards or backwards respectively
KANE_QuNeo.scheduleBeat = function (deck, wholeBeat, spb, direction) {
    var channel = deck - 1;
    var offset = KANE_QuNeo.beatOffset; // timing adjustment

    // drummer speak to determine seconds to offset for each quarter note
    var e, and, uh;
    if (direction == 1) {
	e = 1000*(spb * 1/4) + offset; // forwards, so e first
        uh = 1000*(spb * 3/4) + offset; // multiple of 1000 for s -> ms
    } else if (direction == -1) {
        uh = 1000*(spb * 1/4) + offset; // reverse, so uh first
	e = 1000*(spb * 3/4) + offset;
    }
    else {
	print("ERROR. direction: "+direction+
	      " for beat on deck: "+deck+ " is not valid");
	return;
    }
    and = 1000*(spb * 1/2) + offset; // and is symmetric in either direction

    // now set and store actual timers, in case we want to cancel them
    var startOfCall = "KANE_QuNeo.playerBeat("+deck+","+wholeBeat+",";

    // the beat itself, but do not store timer because it's happening now
    engine.beginTimer(offset,startOfCall+"0)", true)
    // e, add this and the following quarters to our list of timers
    KANE_QuNeo.scheduledBeats[channel].push(
	engine.beginTimer(e,startOfCall+"1/4)", true))
    // and
    KANE_QuNeo.scheduledBeats[channel].push(
	engine.beginTimer(and,startOfCall+"1/2)", true))
    // uh
    KANE_QuNeo.scheduledBeats[channel].push(
	engine.beginTimer(uh,startOfCall+"3/4)", true))
}

KANE_QuNeo.playerBeat = function (deck, wholeBeat, quarter) {
    //print("beat: "+wholeBeat+" with quarter: "+quarter)
    var channel = deck - 1; // yes very annoying

    // Check for LED updates
    var on = KANE_QuNeo.playerSequence(deck,wholeBeat,quarter);
    if (on.length > 0) { // if we have new LEDs to turn on,
	KANE_QuNeo.clearLastBeatLEDs(deck); // first turn off old,
	KANE_QuNeo.LEDs(0x91,on,0x7f); // then turn on the new,
	// and always remember to update the global variable.
	KANE_QuNeo.lastBeatLEDs[channel] = on;
    }
    
    // now flash vertical arrow LEDs if we are not nudging
    var nudge = KANE_QuNeo.rateNudge[channel]
    on = [], off = []; // reset LED arrays

    if (!(KANE_QuNeo.rateNudge[channel])) { // if we are not nudging 

	if (quarter == 0 && (wholeBeat % 2 == 1)) { // and on an odd whole beat,
	    if (deck == 1) on = [0x2e,0x2f] // deck 1 on
	    else if (deck == 2) on = [0x30,0x31] // deck 2 on

	} else if (quarter == 1/2) { // else if on an and
	    if (deck == 1) off = [0x2e,0x2f] // deck 1 off
	    else if (deck == 2) off = [0x30,0x31] // deck 2 off
	}
    }
    KANE_QuNeo.LEDs(0x90,off,0x00) // emit updates
    KANE_QuNeo.LEDs(0x90,on,0x7f)
}

KANE_QuNeo.clearLastBeatLEDs = function (deck) {
    var channel = deck - 1;
    var off = KANE_QuNeo.lastBeatLEDs[channel];
    KANE_QuNeo.LEDs(0x91,off,0x00);
}

/***** (U) Utilities *****/

KANE_QuNeo.deckSide = function (deck) {
    return ((deck + 1) % 2) // 0 for left, 1 for right
}

KANE_QuNeo.getDeckName = function (deck) {
    var deckName;
    if (deck < 3) // if dealing with actual deck
	deckName = "[Channel"+deck+"]"
    else // if dealing with sampler
	deckName = "[Sampler"+(deck - 2)+"]"
    return deckName
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

/***** (JLED) Jump LEDs *****/

KANE_QuNeo.jumpLEDs = function (deck, numBeats) {
    var off = [], on = [];
    if (KANE_QuNeo.deckSide(deck) == 0) { // if using a deck on the left side
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
    else if (KANE_QuNeo.deckSide(deck) == 1) { // if using a deck on the right side
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
    var deckName = KANE_QuNeo.getDeckName(deck);
    KANE_QuNeo.assertBeatLEDs(deck);
}

/****** (RLED) Rotary LEDs ******/

KANE_QuNeo.circleLEDs = function (deck, value) {
    var deckName = KANE_QuNeo.getDeckName(deck);
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

/***** (ALED) LED Assertions *****/

KANE_QuNeo.assertLEDs = function (channel, control, value, status, group) {

    // turn off this button's LED while asserting
    KANE_QuNeo.LEDs(0x90,[0x22],0x00)

    // assert all scripted LEDs
    KANE_QuNeo.assertPlayScratchLED();
    KANE_QuNeo.assertRecordLED();
    var deck;
    for (deck = 1; deck <= 2; deck++) { // 1 and 2 for sides left and right
	KANE_QuNeo.assertJumpSyncLED(deck);
	KANE_QuNeo.assertLoopingLED(deck);
	KANE_QuNeo.assertJumpDirectionLEDs(deck);
	KANE_QuNeo.assertBeatLEDs(deck);

	// horizontal arrow keys and filter kills
	KANE_QuNeo.assertHorizArrowLEDs(deck);
	KANE_QuNeo.assertKillLEDs(deck);

	// make sure we have no latent beat LEDs
	KANE_QuNeo.clearLastBeatLEDs(deck);
	KANE_QuNeo.assertNudgeLEDs(deck)
	
    }

    // regular cue LEDs
    KANE_QuNeo.assertCueLEDs()

    // then assert all horizontal slider LEDs
    engine.trigger("[Master]","volume");
    engine.trigger("[Master]","headVolume");
    engine.trigger("[Flanger]","lfoPeriod");
    engine.trigger("[Flanger]","lfoDepth");
    engine.trigger("[Master]","crossfader");

    if (channel == -1)  {// if starting up
	KANE_QuNeo.LEDs(0x90,[0x22],0x7f) // this button's LED
	KANE_QuNeo.assertZoomLEDs(1) // default vertical sliders
	KANE_QuNeo.assertZoomLEDs(2)
    }
}

KANE_QuNeo.assertNudgeLEDs = function (deck) {
    var channel = deck - 1; // confusing, yes. channels start from 0.
    // turn on if auto nudging, else turn off
    var on = [];
    var off = [];
    if (KANE_QuNeo.deckSide(deck) == 0) {
	if (KANE_QuNeo.rateNudge[channel] == 1)
	    on.push(0x2e), off.push(0x2f);
	else if (KANE_QuNeo.rateNudge[channel] == -1)
	    on.push(0x2f), off.push(0x2e);
	else off.push(0x2e,0x2f)
    } else if (KANE_QuNeo.deckSide(deck) == 1) {
	if (KANE_QuNeo.rateNudge[channel] == 1)
	    on.push(0x30), off.push(0x31);
	else if (KANE_QuNeo.rateNudge[channel] == -1)
	    on.push(0x31), off.push(0x30);
	else off.push(0x30,0x31)
    }
    KANE_QuNeo.LEDs(0x90,on,0x7f);
    KANE_QuNeo.LEDs(0x90,off,0x00);
}

KANE_QuNeo.assertCueLEDs = function () {
    var on = []
    var off = [0x06,0x08]

    // for each deck, light LED if cue is on
    if (engine.getValue("[Channel1]", "cue_point") != -1)
	on.push(0x06)
    if (engine.getValue("[Channel2]", "cue_point") != -1)
	on.push(0x08)
    // emit updates
    KANE_QuNeo.LEDs(0x91,off,0x00)
    KANE_QuNeo.LEDs(0x91,on,0x7f)
}


KANE_QuNeo.assertZoomLEDs = function (deck) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    var zoom = engine.getValue(deckName, "waveform_zoom")
    
    // normalize zoom LED value to be 0-127
    zoom = (zoom / 6) * 127
    
    // determine which control we are manipulating
    var control;
    if (KANE_QuNeo.deckSide(deck) == 0) control = [0x01]; // CC 1
    else if (KANE_QuNeo.deckSide(deck) == 1) control = [0x03]; // CC 3
    // emit message
    KANE_QuNeo.LEDs(0xb0,control,127 - zoom) // inverted because high is zoomed in
}


KANE_QuNeo.assertHorizArrowLEDs = function (deck) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    var on = [], off = [], i; // i for loop iteration
    // nested arrays of controls,LEDs for deck1,LEDs for deck2
    var controls = [["keylock",0x24,0x25],
		    ["pfl",0x26,0x27],
		    ["slip_enabled",0x28,0x29],
		    ["flanger",0x2a,0x2b]];
    // check which controls are enabled
    for (i = 0; i < controls.length; i++) {
	if (engine.getValue(deckName, controls[i][0])) // if val on,
	    on.push(controls[i][deck]); // light led
	else // if val off,
	    off.push(controls[i][deck]) // turn off led
    }
    // update LEDs
    KANE_QuNeo.LEDs(0x90,on,0x7f)
    KANE_QuNeo.LEDs(0x90,off,0x00)
}

KANE_QuNeo.assertKillLEDs = function (deck) {
    var deckName = KANE_QuNeo.getDeckName(deck)
    var on = [], off = [], i; // i for loop iteration
    var controls = [["filterHighKill",0x37,0x39],
		    ["filterMidKill",0x27,0x29],
		    ["filterLowKill",0x17,0x19]];
    for (i = 0; i < controls.length; i++) {
	if (engine.getValue(deckName, controls[i][0])) // if val on,
	    on.push(controls[i][deck]); // light led
	else // if val off,
	    off.push(controls[i][deck]) // turn off led
    }
    // update LEDs
    KANE_QuNeo.LEDs(0x91,on,0x7f)
    KANE_QuNeo.LEDs(0x91,off,0x00)
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
	if (KANE_QuNeo.deckSide(deck) == 0) {
	    on = [0x11] // left red on
	    off = [0x13] // right red off
	}
	else if (KANE_QuNeo.deckSide(deck) == 1) {
	    on = [0x1d] // left red on
	    off = [0x1f] // right red off
	}
	break;

    case 0: // neither jump is on
	if (KANE_QuNeo.deckSide(deck) == 0) {
	    on = []
	    off = [0x11,0x13] // both off
	}
	else if (KANE_QuNeo.deckSide(deck) == 1) {
	    on = []
	    off = [0x1d,0x1f] // both off
	}
	break;

    case 1: // jump forward is on
	if (KANE_QuNeo.deckSide(deck) == 0) {
	    on = [0x13] // right red on
	    off = [0x11] // left red off
	}
	else if (KANE_QuNeo.deckSide(deck) == 1) {
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
    if (KANE_QuNeo.deckSide(deck) == 0) {
	if (KANE_QuNeo.trackLooping[channel]) // if in loop mode
	    on = [0x14,0x15], off = []; //red on, green on
	else
	    on = [0x14], off = [0x15]; //green on, red off
    }
    else if (KANE_QuNeo.deckSide(deck) == 1) {
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
    var deckName = KANE_QuNeo.getDeckName(deck)
    var on = [], greens, reds, reloop, i; // arrays to control which LEDs to change

    // start by clearing reds and lighting greens, also determine which LEDs we have
    // for reloop based on which deck we are checking
    if (KANE_QuNeo.deckSide(deck) == 0) {
	greens = [0x20,0x22,0x30,0x32];
	reds = [0x21,0x23,0x31,0x33];
	reloop = [0x00,0x01];
    } else if (KANE_QuNeo.deckSide(deck) == 1) {
	greens = [0x2c,0x2e,0x3c,0x3e];
	reds = [0x2d,0x2f,0x3d,0x3f];
	reloop = [0x0e,0x0f]
    }
    KANE_QuNeo.LEDs(0x91,reds,0x00);
    KANE_QuNeo.LEDs(0x91,greens,0x7f);

    // controls to consider, put in an array with affected LEDs grouped by deck
    var controls = [["beatloop_1_enabled",[0x30,0x31],[0x3c,0x3d]],
		    ["beatloop_2_enabled",[0x32,0x33],[0x3e,0x3f]],
		    ["beatloop_4_enabled",[0x20,0x21],[0x2c,0x2d]],
		    ["beatloop_8_enabled",[0x22,0x23],[0x2e,0x2f]]];

    // now consider those controls
    for (i = 0; i < controls.length; i++) {
	if (engine.getValue(deckName, controls[i][0])) { // if a loop is on,
	    // set that loop number to shine,
	    on = on.concat(controls[i][deck]);
	    // and it has to be the only loop, so set enable-loop LED and break
	    on = on.concat(reloop);
	    break;
	}
    }

    // update
    KANE_QuNeo.LEDs(0x91,on,0x7f);

    // And finally, check and update for pending loops
    numBeats = KANE_QuNeo.loopNextJump[channel];
    if (numBeats) {
	KANE_QuNeo.jumpLEDs(deck, numBeats);
    }
	
}

KANE_QuNeo.assertJumpSyncLED = function (deck) {
    var channel = deck - 1;
    var on, off; // arrays to control which LEDs to change

    // First deal with deck 1
    if (KANE_QuNeo.deckSide(deck) == 0) {
	if (KANE_QuNeo.trackJumpSync[channel]) // if in jumpsync mode
	    on = [0x02], off = []; //green on
	else // if not in jumpsync mode
	    on = [], off = [0x02]; //green off
    }
    else if (KANE_QuNeo.deckSide(deck) == 1) {
	if (KANE_QuNeo.trackJumpSync[channel]) // if in jumpsync mode
	    on = [0x0c], off = []; //green on
	else
	    on = [], off = [0x0c]; //green off
    }

    KANE_QuNeo.LEDs(0x91,on, 0x7f);
    KANE_QuNeo.LEDs(0x91,off, 0x00);
}

/***** (SLED) Slider LEDs *****/

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

/***** (DD) Deck Dispatches *****/

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

KANE_QuNeo.rotary3Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(3, value, status);
}

KANE_QuNeo.rotary4Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(4, value, status);
}

KANE_QuNeo.rotary5Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(5, value, status);
}

KANE_QuNeo.rotary6Touch = function (channel, control, value, status, group) {
    KANE_QuNeo.rotaryTouch(6, value, status);
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

//Visual Nudge
KANE_QuNeo.visualNudge1Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudge(1, 1) // 1 for deck 1, 1 for forward direction
}

KANE_QuNeo.visualNudge1Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudge(1, -1) // 1 for deck 1, -1 for backward direction
}

KANE_QuNeo.visualNudge2Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudge(2, 1) // 2 for deck 1, 1 for forward direction
}

KANE_QuNeo.visualNudge2Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudge(2, -1) // 2 for deck 1, -1 for backward direction
}

KANE_QuNeo.visualNudge1ForwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudgeOff(1, 1) // 1 for deck 1, 1 for forward direction
}

KANE_QuNeo.visualNudge1BackwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudgeOff(1, -1) // 1 for deck 1, 1 for backward direction
}

KANE_QuNeo.visualNudge2ForwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudgeOff(2, 1) // 2 for deck 1, 1 for forward direction
}

KANE_QuNeo.visualNudge2BackwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.visualNudgeOff(2, -1) // 2 for deck 1, -1 for backward direction
}

//Periodic/Regular Nudge
KANE_QuNeo.rateNudge1Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudge(1, 1) // 1 for deck 1, 1 for forward direction
}

KANE_QuNeo.rateNudge1Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudge(1, -1) // 1 for deck 1, -1 for backward direction
}

KANE_QuNeo.rateNudge2Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudge(2, 1) // 2 for deck 2, 1 for forward direction
}

KANE_QuNeo.rateNudge2Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudge(2, -1) // 2 for deck 2, -1 for backward direction
}

KANE_QuNeo.rateNudge1ForwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudgeOff(1, 1) // 1 for deck 1, 1 for forward direction
}

KANE_QuNeo.rateNudge1BackwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudgeOff(1, -1) // 1 for deck 1, -1 for backward direction
}

KANE_QuNeo.rateNudge2ForwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudgeOff(2, 1) // 2 for deck 2, 1 for forward direction
}

KANE_QuNeo.rateNudge2BackwardOff = function (channel, control, value, status, group) {
    KANE_QuNeo.rateNudgeOff(2, -1) // 2 for deck 2, -1 for backward direction
}

//Zoom and Cursor
KANE_QuNeo.deck1Zoom = function (channel, control, value, status, group) {
    KANE_QuNeo.deckZoom(1, value)
}

KANE_QuNeo.deck1Cursor = function (channel, control, value, status, group) {
    KANE_QuNeo.deckCursor(1, value)
}

KANE_QuNeo.deck2Zoom = function (channel, control, value, status, group) {
    KANE_QuNeo.deckZoom(2, value)
}

KANE_QuNeo.deck2Cursor = function (channel, control, value, status, group) {
    KANE_QuNeo.deckCursor(2, value) 
}

//Reset Beat
KANE_QuNeo.reset1Beat = function (channel, control, value, status, group) {
    KANE_QuNeo.resetBeat(1) 
}

KANE_QuNeo.reset2Beat = function (channel, control, value, status, group) {
    KANE_QuNeo.resetBeat(2) 
}

/***** (SD) Sampler Dispatches *****/

//JumpSyncing
KANE_QuNeo.toggle3JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(3); // toggle jumpsync for deck 3
}

KANE_QuNeo.toggle4JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(4);
}

KANE_QuNeo.toggle5JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(5); // toggle jumpsync for deck 5
}

KANE_QuNeo.toggle6JumpSync = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleJumpSync(6);
}

//Jumping
KANE_QuNeo.jump3Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(3, 1); // channel 3 to jump status 1
}

KANE_QuNeo.jump4Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(4, 1);
}

KANE_QuNeo.jump3Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(3, -1);
}

KANE_QuNeo.jump4Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(4, -1);
}

KANE_QuNeo.jump5Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(5, 1); // channel 5 to jump status 1
}

KANE_QuNeo.jump6Forward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(6, 1);
}

KANE_QuNeo.jump5Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(5, -1);
}

KANE_QuNeo.jump6Backward = function (channel, control, value, status, group) {
    KANE_QuNeo.setJump(6, -1);
}

//Looping
KANE_QuNeo.toggle3Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(3)
}

KANE_QuNeo.toggle4Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(4)
}

KANE_QuNeo.toggle5Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(5)
}

KANE_QuNeo.toggle6Looping = function (channel, control, value, status, group) {
    KANE_QuNeo.toggleLooping(6)
}

//JumpLooping
KANE_QuNeo.deck3JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(3,1) // deck 3, 1 beat jump and/or loop
}

KANE_QuNeo.deck3JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(3,2)
}

KANE_QuNeo.deck3JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(3,4)
}

KANE_QuNeo.deck3JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(3,8)
}

KANE_QuNeo.deck4JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(4,1)
}

KANE_QuNeo.deck4JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(4,2)
}

KANE_QuNeo.deck4JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(4,4)
}

KANE_QuNeo.deck4JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(4,8)
}

KANE_QuNeo.deck5JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(5,1)
}

KANE_QuNeo.deck5JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(5,2)
}

KANE_QuNeo.deck5JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(5,4)
}

KANE_QuNeo.deck5JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(5,8)
}

KANE_QuNeo.deck6JumpLoop1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(6,1)
}

KANE_QuNeo.deck6JumpLoop2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(6,2)
}

KANE_QuNeo.deck6JumpLoop4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(6,4)
}

KANE_QuNeo.deck6JumpLoop8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpLoop(6,8)
}

//JumpOff

KANE_QuNeo.deck3JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(3,1)
}

KANE_QuNeo.deck3JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(3,2)
}

KANE_QuNeo.deck3JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(3,4)
}

KANE_QuNeo.deck3JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(3,8)
}

KANE_QuNeo.deck4JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(4,1)
}

KANE_QuNeo.deck4JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(4,2)
}

KANE_QuNeo.deck4JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(4,4)
}

KANE_QuNeo.deck4JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(4,8)
}

KANE_QuNeo.deck5JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(5,1)
}

KANE_QuNeo.deck5JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(5,2)
}

KANE_QuNeo.deck5JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(5,4)
}

KANE_QuNeo.deck5JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(5,8)
}

KANE_QuNeo.deck6JumpOff1 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(6,1)
}

KANE_QuNeo.deck6JumpOff2 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(6,2)
}

KANE_QuNeo.deck6JumpOff4 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(6,4)
}

KANE_QuNeo.deck6JumpOff8 = function (channel, control, value, status, group) {
    KANE_QuNeo.jumpOff(6,8)
}
