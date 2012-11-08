
# Deprecated.
This was a pre-1.0 version;
[The new one can be found here](https://github.com/wolfbiter/kane-quneo-mixxx).

-------
#About
This repository contains all the components necessary to link a QuNeo to Mixxx with
my customized set of controls and LED's.

###Included is a series of visuals of the controls
Take a look at the diagrams folder.

###NOTE: The usage guide assumes the user already has Mixxx installed.
A quick googling of Mixxx should offer plenty of installation information.

# Usage:
## I) How to apply this preset
###1. Copy presets to mixxx preset folder
#####These two files need to be copied straight into the preset folder:
mixxx-controls/KANE_QuNeo.xml.midi   
mixxx-controls/KANE_QuNeo_scripts.js   
#####The location of the preset folder depends upon your OS:
Windows: C:\Program Files\Mixxx\midi    
Linux: /usr/share/mixxx/midi (or /usr/local/share/mixxx/midi)    
OS X: /Applications/Mixxx.app/Contents/Resources/midi    
###2. Update your QuNeo's midi output preset
#####Plug in your QuNeo
Via usb, this should be trivial. The QuNeo's LED's will go from left to right
when it is successfully connected.
#####Run QuNeo Editor/QuNeo Editor.exe
In the lower right, select "Preset 5" from the dropdown menu. To verify that this is
the correct preset, you can check that 4/16 pads are in drum mode, the rest in grid.
If this is not the case, try
File > Import Preset, select
QuNeo Editor > presets > KANE_QuNeo.quneopreset
#####Click "update preset"
Your QuNeo's pad 5 (the one just above the bottom left pad) should flash in
confirmation of this update.
####Switch QuNeo's mode to preset 5
Preset 5 is the pad that just flashed. To activate a QuNeo mode, simply press the
mode button (far top left) followed by the pad of your choice of preset.
###3. Start Mixxx, select preset
While running Mixxx, go
#####Options > Preferences > MIDI Controllers > QUNEO MIDI 1 > Load Preset
(If the QuNeo is not listed, refer to Mixxx's Midi Controller documentation)
#####Select the preset: KANE_QuNeo
Click ok.
#####Here's where it gets weird.
The only way I can manage to get the LED's working properly is to then go
Options > Preferences > MIDI Controllers > QUNEO MIDI 1 > MIDI Output
Select any of the listed controls, change it's "Midi Channel" to 3, click ok.
#####Now your QuNeo and Mixxx should be synced!
Due to the above manipulation, Mixxx may segfault on startup. Refer to III)Troubles

## II) Important files/folders
####1. QuNeo Editor
This folder has the factory presets for the QuNeo mappings, where I have modified
the fifth preset to output midi notes consistent with my settings for Mixxx controls.
This folder also contains the file "QuNeo Editor.exe", which is necessary for
updating a given QuNeo's presets.
####2. mixxx-controls
This folder contains the two files (xml and js) necessary for mapping midi notes into
Mixxx's controls.
####3. dj
This is a home-brewed script which places the relevant files from Mixxx Controls into
the appropriate folder for Mixxx presets, then runs Mixxx.
####4. quneo-mixxx-controls.png
Here is the visual representation for my presets of Mixxx's controls on the QuNeo.
Refer to this to know which buttons do what.

## III) Troubles
####1. LED's out of whack
You can simply reselect mode 5 on the QuNeo - this should clear any latent garbage
LED values.
####2. Mixxx segfault on startup
Make sure to remove ~/.mixxx/midi/QUNEO_MIDI_1.midi.xml
or your equivalent file before running Mixxx.
#####This is because the LED behavior is currently bugged
The script must be reloaded every time Mixxx is run.
This is non-optimal behavior (hopefully to be eradicated).
To expedite this process for myself, I run mixxx by calling ./dj from the
quneo-mixxx folder. dj is a simple bash script which removes the bugged file so that
mixxx can successfully start, then starts mixxx.