/**
 * MidiSostenutoPedal v1.0 - A very simple event-driven Midi Sostenuto Pedal processor for JavaScript.
 * Hugo Hromic - http://github.com/hhromic
 * MIT license
 */
/*jslint nomen: true*/

(function () {
    'use strict';

    // Constructor
    function MidiSostenutoPedal() {
        // Create a note slots object to be cloned
        var noteSlots = [];
        for (var i=0; i<128; i++)
            noteSlots[i] = false;

        // Create internal pedals state object
        this._pedals = [];
        for (var i=0; i<16; i++) {
            this._pedals[i] = {
                pressed: false,
                prePedalNotes: Object.create(noteSlots),
                pedalNotes: Object.create(noteSlots),
                heldNotes: Object.create(noteSlots)
            };
        }

        // Setup event handlers
        this._handlers = {
            'note-off': undefined,       // channel, note
            'note-on': undefined,        // channel, note, velocity
            'sostenuto-off': undefined,  // channel
            'sostenuto-on': undefined    // channel
        };
    }

    // Cache variable for prototype
    var proto = MidiSostenutoPedal.prototype;

    // Assign an event handler to a pedalling event
    proto.on = function (event, handler) {
        if (typeof handler === 'function' && this._handlers.hasOwnProperty(event)) {
            this._handlers[event] = handler;
            return true;
        }
        return false;
    }

    // Emit pedalling events
    proto.emit = function (event, data1, data2, data3) {
        if (this._handlers.hasOwnProperty(event) && this._handlers[event] !== undefined) {
            switch (event) {
                case 'sostenuto-off':
                case 'sostenuto-on':
                    this._handlers[event](data1);
                    break;
                case 'note-off':
                    this._handlers[event](data1, data2);
                    break;
                case 'note-on':
                    this._handlers[event](data1, data2, data3);
                    break;
                default:
                    return false;
            }
            return true;
        }
        return false;
    }

    // Simulate pressing the sostenuto pedal
    proto.press = function (channel) {
        if (channel < 0x0 || channel > 0xF)
            return false;
        this._pedals[channel].pressed = true;
        for (var note in this._pedals[channel].prePedalNotes)
            if (this._pedals[channel].prePedalNotes[note])
                this._pedals[channel].pedalNotes[note] = true;
        this.emit('sostenuto-on', channel);
        return true;
    }

    // Simulate releasing the sostenuto pedal
    proto.release = function (channel) {
        if (channel < 0x0 || channel > 0xF)
            return false;
        this._pedals[channel].pressed = false;
        for (var note in this._pedals[channel].pedalNotes) {
            this._pedals[channel].pedalNotes[note] = false;
            if (this._pedals[channel].heldNotes[note]) {
                this._pedals[channel].heldNotes[note] = false;
                this.emit('note-off', channel, note);
            }
        }
        this.emit('sostenuto-off', channel);
        return true;
    }

    // Process a Midi Note On message
    proto.noteOn = function (channel, note, velocity) {
        if (channel < 0x0 || channel > 0xF || note < 0x00 || note > 0x7F || velocity < 0x00 || velocity > 0x7F)
            return false;
        this._pedals[channel].prePedalNotes[note] = true;
        if (this._pedals[channel].pressed)
            this._pedals[channel].heldNotes[note] = false;
        this.emit('note-on', channel, note, velocity);
        return true;
    }

    // Process a Midi Note Off message
    proto.noteOff = function (channel, note) {
        if (channel < 0x0 || channel > 0xF || note < 0x00 || note > 0x7F)
            return false;
        this._pedals[channel].prePedalNotes[note] = false;
        if (this._pedals[channel].pressed && this._pedals[channel].pedalNotes[note])
            this._pedals[channel].heldNotes[note] = true;
        else
            this.emit('note-off', channel, note);
        return true;
    }

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return MidiSostenutoPedal;
        });
    }
    else if (typeof module === 'object' && module.exports) {
        module.exports = MidiSostenutoPedal;
    }
    else {
        this.MidiSostenutoPedal = MidiSostenutoPedal;
    }
}.call(this));