(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//  Chance.js 0.5.9
//  http://chancejs.com
//  (c) 2013 Victor Quinn
//  Chance may be freely distributed or modified under the MIT license.

(function () {

    // Constants
    var MAX_INT = 9007199254740992;
    var MIN_INT = -MAX_INT;
    var NUMBERS = '0123456789';
    var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
    var CHARS_UPPER = CHARS_LOWER.toUpperCase();
    var HEX_POOL  = NUMBERS + "abcdef";

    // Cached array helpers
    var slice = Array.prototype.slice;

    // Constructor
    function Chance (seed) {
        if (!(this instanceof Chance)) {
            return new Chance(seed);
        }

        if (seed !== undefined) {
            // If we were passed a generator rather than a seed, use it.
            if (typeof seed === 'function') {
                this.random = seed;
            } else {
                this.seed = seed;
            }
        }

        // If no generator function was provided, use our MT
        if (typeof this.random === 'undefined') {
            this.mt = this.mersenne_twister(seed);
            this.random = function () {
                return this.mt.random(this.seed);
            };
        }
    }

    // Random helper functions
    function initOptions(options, defaults) {
        options || (options = {});
        if (!defaults) {
            return options;
        }
        for (var i in defaults) {
            if (typeof options[i] === 'undefined') {
                options[i] = defaults[i];
            }
        }
        return options;
    }

    function testRange(test, errorMessage) {
        if (test) {
            throw new RangeError(errorMessage);
        }
    }

    // -- Basics --

    Chance.prototype.bool = function (options) {

        // likelihood of success (true)
        options = initOptions(options, {likelihood : 50});

        testRange(
            options.likelihood < 0 || options.likelihood > 100,
            "Chance: Likelihood accepts values from 0 to 100."
        );

        return this.random() * 100 < options.likelihood;
    };

    Chance.prototype.character = function (options) {
        options = initOptions(options);

        var symbols = "!@#$%^&*()[]",
            letters, pool;

        testRange(
            options.alpha && options.symbols,
            "Chance: Cannot specify both alpha and symbols."
        );


        if (options.casing === 'lower') {
            letters = CHARS_LOWER;
        } else if (options.casing === 'upper') {
            letters = CHARS_UPPER;
        } else {
            letters = CHARS_LOWER + CHARS_UPPER;
        }

        if (options.pool) {
            pool = options.pool;
        } else if (options.alpha) {
            pool = letters;
        } else if (options.symbols) {
            pool = symbols;
        } else {
            pool = letters + NUMBERS + symbols;
        }

        return pool.charAt(this.natural({max: (pool.length - 1)}));
    };

    // Note, wanted to use "float" or "double" but those are both JS reserved words.

    // Note, fixed means N OR LESS digits after the decimal. This because
    // It could be 14.9000 but in JavaScript, when this is cast as a number,
    // the trailing zeroes are dropped. Left to the consumer if trailing zeroes are
    // needed
    Chance.prototype.floating = function (options) {
        var num, range;

        options = initOptions(options, {fixed : 4});
        var fixed = Math.pow(10, options.fixed);

        testRange(
            options.fixed && options.precision,
            "Chance: Cannot specify both fixed and precision."
        );

        var max = MAX_INT / fixed;
        var min = -max;

        testRange(
            options.min && options.fixed && options.min < min,
            "Chance: Min specified is out of range with fixed. Min should be, at least, " + min
        );
        testRange(
            options.max && options.fixed && options.max > max,
            "Chance: Max specified is out of range with fixed. Max should be, at most, " + max
        );

        options = initOptions(options, {min : min, max : max});

        // Todo - Make this work!
        // options.precision = (typeof options.precision !== "undefined") ? options.precision : false;

        num = this.integer({min: options.min * fixed, max: options.max * fixed});
        var num_fixed = (num / fixed).toFixed(options.fixed);

        return parseFloat(num_fixed);
    };

    // NOTE the max and min are INCLUDED in the range. So:
    //
    // chance.natural({min: 1, max: 3});
    //
    // would return either 1, 2, or 3.

    Chance.prototype.integer = function (options) {

        // 9007199254740992 (2^53) is the max integer number in JavaScript
        // See: http://vq.io/132sa2j
        options = initOptions(options, {min: MIN_INT, max: MAX_INT});

        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return Math.floor(this.random() * (options.max - options.min + 1) + options.min);
    };

    Chance.prototype.natural = function (options) {
        options = initOptions(options, {min: 0, max: MAX_INT});
        return this.integer(options);
    };

    Chance.prototype.normal = function (options) {
        options = initOptions(options, {mean : 0, dev : 1});

        // The Marsaglia Polar method
        var s, u, v, norm,
            mean = options.mean,
            dev = options.dev;

        do {
            // U and V are from the uniform distribution on (-1, 1)
            u = this.random() * 2 - 1;
            v = this.random() * 2 - 1;

            s = u * u + v * v;
        } while (s >= 1);

        // Compute the standard normal variate
        norm = u * Math.sqrt(-2 * Math.log(s) / s);

        // Shape and scale
        return dev * norm + mean;
    };

    Chance.prototype.string = function (options) {
        options = initOptions(options);

        var length = options.length || this.natural({min: 5, max: 20}),
            text = '',
            pool = options.pool;

        for (var i = 0; i < length; i++) {
            text += this.character({pool: pool});
        }
        return text;
    };

    // -- End Basics --

    // -- Helpers --

    Chance.prototype.capitalize = function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1);
    };

    Chance.prototype.mixin = function (obj) {
        var chance = this;
        for (var func_name in obj) {
            Chance.prototype[func_name] = obj[func_name];
        }
        return this;
    };

    // Given a function that generates something random and a number of items to generate,
    // return an array of items where none repeat.
    Chance.prototype.unique = function(fn, num, options) {
        options = initOptions(options, {
            // Default comparator to check that val is not already in arr.
            // Should return `false` if item not in array, `true` otherwise
            comparator: function(arr, val) {
                return arr.indexOf(result) !== -1;
            }
        });

        var arr = [], count = 0;

        while (arr.length < num) {
            var result = fn.apply(this, slice.call(arguments, 2));
            if (!options.comparator(arr, result)) {
                arr.push(result);
                // reset count when unique found
                count = 0;
            }

            if (++count > num * 50) {
                throw new RangeError("Chance: num is likely too large for sample set");
            }
        }
        return arr;
    };

    // H/T to SO for this one: http://vq.io/OtUrZ5
    Chance.prototype.pad = function (number, width, pad) {
        // Default pad to 0 if none provided
        pad = pad || '0';
        // Convert number to a string
        number = number + '';
        return number.length >= width ? number : new Array(width - number.length + 1).join(pad) + number;
    };

    Chance.prototype.pick = function (arr, count) {
        if (!count || count === 1) {
            return arr[this.natural({max: arr.length - 1})];
        } else {
            return this.shuffle(arr).slice(0, count);
        }
    };

    Chance.prototype.shuffle = function (arr) {
        var old_array = arr.slice(0),
            new_array = [],
            j = 0,
            length = Number(old_array.length);

        for (var i = 0; i < length; i++) {
            // Pick a random index from the array
            j = this.natural({max: old_array.length - 1});
            // Add it to the new array
            new_array[i] = old_array[j];
            // Remove that element from the original array
            old_array.splice(j, 1);
        }

        return new_array;
    };

    // -- End Helpers --

    // -- Text --

    Chance.prototype.paragraph = function (options) {
        options = initOptions(options);

        var sentences = options.sentences || this.natural({min: 3, max: 7}),
            sentence_array = [];

        for (var i = 0; i < sentences; i++) {
            sentence_array.push(this.sentence());
        }

        return sentence_array.join(' ');
    };

    // Could get smarter about this than generating random words and
    // chaining them together. Such as: http://vq.io/1a5ceOh
    Chance.prototype.sentence = function (options) {
        options = initOptions(options);

        var words = options.words || this.natural({min: 12, max: 18}),
            text, word_array = [];

        for (var i = 0; i < words; i++) {
            word_array.push(this.word());
        }

        text = word_array.join(' ');

        // Capitalize first letter of sentence, add period at end
        text = this.capitalize(text) + '.';

        return text;
    };

    Chance.prototype.syllable = function (options) {
        options = initOptions(options);

        var length = options.length || this.natural({min: 2, max: 3}),
            consonants = 'bcdfghjklmnprstvwz', // consonants except hard to speak ones
            vowels = 'aeiou', // vowels
            all = consonants + vowels, // all
            text = '',
            chr;

        // I'm sure there's a more elegant way to do this, but this works
        // decently well.
        for (var i = 0; i < length; i++) {
            if (i === 0) {
                // First character can be anything
                chr = this.character({pool: all});
            } else if (consonants.indexOf(chr) === -1) {
                // Last character was a vowel, now we want a consonant
                chr = this.character({pool: consonants});
            } else {
                // Last character was a consonant, now we want a vowel
                chr = this.character({pool: vowels});
            }

            text += chr;
        }

        return text;
    };

    Chance.prototype.word = function (options) {
        options = initOptions(options);

        testRange(
            options.syllables && options.length,
            "Chance: Cannot specify both syllables AND length."
        );

        var syllables = options.syllables || this.natural({min: 1, max: 3}),
            text = '';

        if (options.length) {
            // Either bound word by length
            do {
                text += this.syllable();
            } while (text.length < options.length);
            text = text.substring(0, options.length);
        } else {
            // Or by number of syllables
            for (var i = 0; i < syllables; i++) {
                text += this.syllable();
            }
        }
        return text;
    };

    // -- End Text --

    // -- Person --

    Chance.prototype.age = function (options) {
        options = initOptions(options);
        var ageRange;

        switch (options.type) {
            case 'child':
                ageRange = {min: 1, max: 12};
                break;
            case 'teen':
                ageRange = {min: 13, max: 19};
                break;
            case 'adult':
                ageRange = {min: 18, max: 65};
                break;
            case 'senior':
                ageRange = {min: 65, max: 100};
                break;
            case 'all':
                ageRange = {min: 1, max: 100};
                break;
            default:
                ageRange = {min: 18, max: 65};
                break;
        }

        return this.natural(ageRange);
    };

    Chance.prototype.birthday = function (options) {
        options = initOptions(options, {
            year: (new Date().getFullYear() - this.age(options))
        });

        return this.date(options);
    };


    Chance.prototype.first = function (options) {
        options = initOptions(options, {gender: this.gender()});
        return this.pick(this.get("firstNames")[options.gender.toLowerCase()]);
    };

    Chance.prototype.gender = function () {
        return this.pick(['Male', 'Female']);
    };


    Chance.prototype.last = function () {
        return this.pick(this.get("lastNames"));
    };

    Chance.prototype.name = function (options) {
        options = initOptions(options);

        var first = this.first(options),
            last = this.last(),
            name;

        if (options.middle) {
            name = first + ' ' + this.first(options) + ' ' + last;
        } else if (options.middle_initial) {
            name = first + ' ' + this.character({alpha: true, casing: 'upper'}) + '. ' + last;
        } else {
            name = first + ' ' + last;
        }

        if (options.prefix) {
            name = this.prefix(options) + ' ' + name;
        }

        return name;
    };

    // Return the list of available name prefixes based on supplied gender.
    Chance.prototype.name_prefixes = function (gender) {
        gender = gender || "all";

        var prefixes = [
            { name: 'Doctor', abbreviation: 'Dr.' }
        ];

        if (gender === "male" || gender === "all") {
            prefixes.push({ name: 'Mister', abbreviation: 'Mr.' });
        }

        if (gender === "female" || gender === "all") {
            prefixes.push({ name: 'Miss', abbreviation: 'Miss' });
            prefixes.push({ name: 'Misses', abbreviation: 'Mrs.' });
        }

        return prefixes;
    };

    // Alias for name_prefix
    Chance.prototype.prefix = function (options) {
        return this.name_prefix(options);
    };

    Chance.prototype.name_prefix = function (options) {
        options = initOptions(options, { gender: "all" });
        return options.full ?
            this.pick(this.name_prefixes(options.gender)).name :
            this.pick(this.name_prefixes(options.gender)).abbreviation;
    };

    Chance.prototype.ssn = function (options) {
        options = initOptions(options, {ssnFour: false, dashes: true});
        var ssn_pool = "1234567890",
            ssn,
            dash = '';

        if(options.dashes){
            dash = '-';
        }

        if(!options.ssnFour) {
            ssn = this.string({pool: ssn_pool, length: 3}) + dash +
            this.string({pool: ssn_pool, length: 2}) + dash +
            this.string({pool: ssn_pool, length: 4});
        } else {
            ssn = this.string({pool: ssn_pool, length: 4});
        }
        return ssn;
    };

    // -- End Person --

    // -- Web --

    Chance.prototype.color = function (options) {
        function gray(value, delimiter) {
            return [value, value, value].join(delimiter || '');
        }

        options = initOptions(options, {format: this.pick(['hex', 'shorthex', 'rgb']), grayscale: false});
        var isGrayscale = options.grayscale;

        if (options.format === 'hex') {
            return '#' + (isGrayscale ? gray(this.hash({length: 2})) : this.hash({length: 6}));
        }

        if (options.format === 'shorthex') {
            return '#' + (isGrayscale ? gray(this.hash({length: 1})) : this.hash({length: 3}));
        }

        if (options.format === 'rgb') {
            if (isGrayscale) {
                return 'rgb(' + gray(this.natural({max: 255}), ',') + ')';
            } else {
                return 'rgb(' + this.natural({max: 255}) + ',' + this.natural({max: 255}) + ',' + this.natural({max: 255}) + ')';
            }
        }

        throw new Error('Invalid format provided. Please provide one of "hex", "shorthex", or "rgb"');
    };

    Chance.prototype.domain = function (options) {
        options = initOptions(options);
        return this.word() + '.' + (options.tld || this.tld());
    };

    Chance.prototype.email = function (options) {
        options = initOptions(options);
        return this.word() + '@' + (options.domain || this.domain());
    };

    Chance.prototype.fbid = function () {
        return parseInt('10000' + this.natural({max: 100000000000}), 10);
    };

    Chance.prototype.google_analytics = function () {
        var account = this.pad(this.natural({max: 999999}), 6);
        var property = this.pad(this.natural({max: 99}), 2);
        return 'UA-' + account + '-' + property;
    };

    Chance.prototype.hashtag = function () {
        return '#' + this.word();
    };

    Chance.prototype.ip = function () {
        // Todo: This could return some reserved IPs. See http://vq.io/137dgYy
        // this should probably be updated to account for that rare as it may be
        return this.natural({max: 255}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({max: 255});
    };

    Chance.prototype.ipv6 = function () {
        var ip_addr = [];

        for (var i = 0; i < 8; i++) {
            ip_addr.push(this.hash({length: 4}));
        }
        return ip_addr.join(":");
    };

    Chance.prototype.klout = function () {
        return this.natural({min: 1, max: 99});
    };

    Chance.prototype.tlds = function () {
        return ['com', 'org', 'edu', 'gov', 'co.uk', 'net', 'io'];
    };

    Chance.prototype.tld = function () {
        return this.pick(this.tlds());
    };

    Chance.prototype.twitter = function () {
        return '@' + this.word();
    };

    // -- End Web --

    // -- Address --

    Chance.prototype.address = function (options) {
        options = initOptions(options);
        return this.natural({min: 5, max: 2000}) + ' ' + this.street(options);
    };

    Chance.prototype.areacode = function (options) {
        options = initOptions(options, {parens : true});
        // Don't want area codes to start with 1, or have a 9 as the second digit
        var areacode = this.natural({min: 2, max: 9}).toString() + this.natural({min: 0, max: 8}).toString() + this.natural({min: 0, max: 9}).toString();
        return options.parens ? '(' + areacode + ')' : areacode;
    };

    Chance.prototype.city = function () {
        return this.capitalize(this.word({syllables: 3}));
    };

    Chance.prototype.coordinates = function (options) {
        options = initOptions(options);
        return this.latitude(options) + ', ' + this.longitude(options);
    };

    Chance.prototype.geoJson = function (options) {
        options = initOptions(options);
        return this.latitude(options) + ', ' + this.longitude(options) + ', ' + this.altitude(options);
    };

    Chance.prototype.altitude = function (options) {
        options = initOptions(options, {fixed : 5});
        return this.floating({min: 0, max: 32736000, fixed: options.fixed});
    };

    Chance.prototype.depth = function (options) {
        options = initOptions(options, {fixed: 5});
        return this.floating({min: -35994, max: 0, fixed: options.fixed});
    };

    Chance.prototype.latitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -90, max: 90});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.longitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -180, max: 180});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.phone = function (options) {
        options = initOptions(options, {formatted : true});
        if (!options.formatted) {
            options.parens = false;
        }
        var areacode = this.areacode(options).toString();
        var exchange = this.natural({min: 2, max: 9}).toString() 
            + this.natural({min: 0, max: 9}).toString() 
            + this.natural({min: 0, max: 9}).toString();
        var subscriber = this.natural({min: 1000, max: 9999}).toString(); // this could be random [0-9]{4}
        
        return options.formatted ? areacode + ' ' + exchange + '-' + subscriber : areacode + exchange + subscriber;
    };

    Chance.prototype.postal = function () {
        // Postal District
        var pd = this.character({pool: "XVTSRPNKLMHJGECBA"});
        // Forward Sortation Area (FSA)
        var fsa = pd + this.natural({max: 9}) + this.character({alpha: true, casing: "upper"});
        // Local Delivery Unut (LDU)
        var ldu = this.natural({max: 9}) + this.character({alpha: true, casing: "upper"}) + this.natural({max: 9});

        return fsa + " " + ldu;
    };

    Chance.prototype.provinces = function () {
        return this.get("provinces");
    };

    Chance.prototype.province = function (options) {
        return (options && options.full) ?
            this.pick(this.provinces()).name :
            this.pick(this.provinces()).abbreviation;
    };

    Chance.prototype.radio = function (options) {
        // Initial Letter (Typically Designated by Side of Mississippi River)
        options = initOptions(options, {side : "?"});
        var fl = "";
        switch (options.side.toLowerCase()) {
        case "east":
        case "e":
            fl = "W";
            break;
        case "west":
        case "w":
            fl = "K";
            break;
        default:
            fl = this.character({pool: "KW"});
            break;
        }

        return fl + this.character({alpha: true, casing: "upper"}) + this.character({alpha: true, casing: "upper"}) + this.character({alpha: true, casing: "upper"});
    };

    Chance.prototype.state = function (options) {
        return (options && options.full) ?
            this.pick(this.states(options)).name :
            this.pick(this.states(options)).abbreviation;
    };

    Chance.prototype.states = function (options) {
        options = initOptions(options);

        var states,
            us_states_and_dc = this.get("us_states_and_dc"),
            territories = this.get("territories"),
            armed_forces = this.get("armed_forces");

        states = us_states_and_dc;

        if (options.territories) {
            states = states.concat(territories);
        }
        if (options.armed_forces) {
            states = states.concat(armed_forces);
        }

        return states;
    };

    Chance.prototype.street = function (options) {
        options = initOptions(options);

        var street = this.word({syllables: 2});
        street = this.capitalize(street);
        street += ' ';
        street += options.short_suffix ?
            this.street_suffix().abbreviation :
            this.street_suffix().name;
        return street;
    };

    Chance.prototype.street_suffix = function () {
        return this.pick(this.street_suffixes());
    };

    Chance.prototype.street_suffixes = function () {
        // These are the most common suffixes.
        return this.get("street_suffixes");
    };

    Chance.prototype.tv = function (options) {
        return this.radio(options);
    };

    // Note: only returning US zip codes, internationalization will be a whole
    // other beast to tackle at some point.
    Chance.prototype.zip = function (options) {
        var zip = "";

        for (var i = 0; i < 5; i++) {
            zip += this.natural({max: 9}).toString();
        }

        if (options && options.plusfour === true) {
            zip += '-';
            for (i = 0; i < 4; i++) {
                zip += this.natural({max: 9}).toString();
            }
        }

        return zip;
    };

    // -- End Address --

    // -- Time

    Chance.prototype.ampm = function () {
        return this.bool() ? 'am' : 'pm';
    };

    Chance.prototype.date = function (options) {
        var m = this.month({raw: true}),
            date_string;

        options = initOptions(options, {
            year: parseInt(this.year(), 10),
            // Necessary to subtract 1 because Date() 0-indexes month but not day or year
            // for some reason.
            month: m.numeric - 1,
            day: this.natural({min: 1, max: m.days}),
            hour: this.hour(),
            minute: this.minute(),
            second: this.second(),
            millisecond: this.millisecond(),
            american: true,
            string: false
        });

        var date = new Date(options.year, options.month, options.day, options.hour, options.minute, options.second, options.millisecond);

        if (options.american) {
            // Adding 1 to the month is necessary because Date() 0-indexes
            // months but not day for some odd reason.
            date_string = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        } else {
            date_string = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        }

        return options.string ? date_string : date;
    };

    Chance.prototype.hammertime = function (options) {
        return this.date(options).getTime();
    };

    Chance.prototype.hour = function (options) {
        options = initOptions(options);
        var max = options.twentyfour ? 24 : 12;
        return this.natural({min: 1, max: max});
    };

    Chance.prototype.millisecond = function () {
        return this.natural({max: 999});
    };

    Chance.prototype.minute = Chance.prototype.second = function () {
        return this.natural({max: 59});
    };

    Chance.prototype.month = function (options) {
        options = initOptions(options);
        var month = this.pick(this.months());
        return options.raw ? month : month.name;
    };

    Chance.prototype.months = function () {
        return this.get("months");
    };

    Chance.prototype.second = function () {
        return this.natural({max: 59});
    };

    Chance.prototype.timestamp = function () {
        return this.natural({min: 1, max: parseInt(new Date().getTime() / 1000, 10)});
    };

    Chance.prototype.year = function (options) {
        // Default to current year as min if none specified
        options = initOptions(options, {min: new Date().getFullYear()});

        // Default to one century after current year as max if none specified
        options.max = (typeof options.max !== "undefined") ? options.max : options.min + 100;

        return this.natural(options).toString();
    };

    // -- End Time

    // -- Finance --

    Chance.prototype.cc = function (options) {
        options = initOptions(options);

        var type, number, to_generate, type_name;

        type = (options.type) ?
                    this.cc_type({ name: options.type, raw: true }) :
                    this.cc_type({ raw: true });
        number = type.prefix.split("");
        to_generate = type.length - type.prefix.length - 1;

        // Generates n - 1 digits
        for (var i = 0; i < to_generate; i++) {
            number.push(this.integer({min: 0, max: 9}));
        }

        // Generates the last digit according to Luhn algorithm
        number.push(this.luhn_calculate(number.join("")));

        return number.join("");
    };

    Chance.prototype.cc_types = function () {
        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        return this.get("cc_types");
    };

    Chance.prototype.cc_type = function (options) {
        options = initOptions(options);
        var types = this.cc_types(),
            type = null;

        if (options.name) {
            for (var i = 0; i < types.length; i++) {
                // Accept either name or short_name to specify card type
                if (types[i].name === options.name || types[i].short_name === options.name) {
                    type = types[i];
                    break;
                }
            }
            if (type === null) {
                throw new Error("Credit card type '" + options.name + "'' is not supported");
            }
        } else {
            type = this.pick(types);
        }

        return options.raw ? type : type.name;
    };

    Chance.prototype.dollar = function (options) {
        // By default, a somewhat more sane max for dollar than all available numbers
        options = initOptions(options, {max : 10000, min : 0});

        var dollar = this.floating({min: options.min, max: options.max, fixed: 2}).toString(),
            cents = dollar.split('.')[1];

        if (cents === undefined) {
            dollar += '.00';
        } else if (cents.length < 2) {
            dollar = dollar + '0';
        }

        if (dollar < 0) {
            return '-$' + dollar.replace('-', '');
        } else {
            return '$' + dollar;
        }
    };

    Chance.prototype.exp = function (options) {
        options = initOptions(options);
        var exp = {};

        exp.year = this.exp_year();

        // If the year is this year, need to ensure month is greater than the
        // current month or this expiration will not be valid
        if (exp.year === (new Date().getFullYear())) {
            exp.month = this.exp_month({future: true});
        } else {
            exp.month = this.exp_month();
        }

        return options.raw ? exp : exp.month + '/' + exp.year;
    };

    Chance.prototype.exp_month = function (options) {
        options = initOptions(options);
        var month, month_int;

        if (options.future) {
            do {
                month = this.month({raw: true}).numeric;
                month_int = parseInt(month, 10);
            } while (month_int < new Date().getMonth());
        } else {
            month = this.month({raw: true}).numeric;
        }

        return month;
    };

    Chance.prototype.exp_year = function () {
        return this.year({max: new Date().getFullYear() + 10});
    };

    //return all world currency by ISO 4217
    Chance.prototype.currency_types = function () {
        return this.get("currency_types");
    };


    //return random world currency by ISO 4217
    Chance.prototype.currency = function () {
        return this.pick(this.currency_types());
    };

    //Return random correct currency exchange pair (e.g. EUR/USD) or array of currency code
    Chance.prototype.currency_pair = function (returnAsString) {
        var currencies = this.unique(this.currency, 2, {
            comparator: function(arr, val) {
                // If this is the first element, we know it doesn't exist
                if (arr.length === 0) {
                    return false;
                }

                return arr.reduce(function(acc, item) {
                    // If a match has been found, short circuit check and just return
                    if (acc) {
                        return acc;
                    }
                    return item.code === val.code;
                }, false);
            }
        });

        if (returnAsString) {
            return  currencies[0] + '/' + currencies[1];
        } else {
            return currencies;
        }
    };

    // -- End Finance

    // -- Miscellaneous --

    // Dice - For all the board game geeks out there, myself included ;)
    function diceFn (range) {
    	return function () {
    		return this.natural(range);
    	};
    }
    Chance.prototype.d4 = diceFn({min: 1, max: 4});
    Chance.prototype.d6 = diceFn({min: 1, max: 6});
    Chance.prototype.d8 = diceFn({min: 1, max: 8});
    Chance.prototype.d10 = diceFn({min: 1, max: 10});
    Chance.prototype.d12 = diceFn({min: 1, max: 12});
    Chance.prototype.d20 = diceFn({min: 1, max: 20});
    Chance.prototype.d30 = diceFn({min: 1, max: 30});
    Chance.prototype.d100 = diceFn({min: 1, max: 100});

    Chance.prototype.rpg = function (thrown, options) {
        options = initOptions(options);
        if (thrown === null) {
            throw new Error("A type of die roll must be included");
        } else {
            var bits = thrown.toLowerCase().split("d"),
                rolls = [];

            if (bits.length !== 2 || !parseInt(bits[0], 10) || !parseInt(bits[1], 10)) {
                throw new Error("Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
            }
            for (var i = bits[0]; i > 0; i--) {
                rolls[i - 1] = this.natural({min: 1, max: bits[1]});
            }
            return (typeof options.sum !== 'undefined' && options.sum) ? rolls.reduce(function (p, c) { return p + c; }) : rolls;
        }
    };

    // Guid
    Chance.prototype.guid = function (options) {
        options = options || {version: 5};

        var guid_pool = "ABCDEF1234567890",
            variant_pool = "AB89",
            guid = this.string({pool: guid_pool, length: 8}) + '-' +
                   this.string({pool: guid_pool, length: 4}) + '-' +
                   // The Version
                   options.version +
                   this.string({pool: guid_pool, length: 3}) + '-' +
                   // The Variant
                   this.string({pool: variant_pool, length: 1}) +
                   this.string({pool: guid_pool, length: 3}) + '-' +
                   this.string({pool: guid_pool, length: 12});
        return guid;
    };

    // Hash
    Chance.prototype.hash = function (options) {
        options = initOptions(options, {length : 40, casing: 'lower'});
        var pool = options.casing === 'upper' ? HEX_POOL.toUpperCase() : HEX_POOL;
        return this.string({pool: pool, length: options.length});
    };

    Chance.prototype.luhn_check = function (num) {
        var str = num.toString();
        var checkDigit = +str.substring(str.length - 1);
        return checkDigit === this.luhn_calculate(+str.substring(0, str.length - 1));
    };

    Chance.prototype.luhn_calculate = function (num) {
        var digits = num.toString().split("").reverse();
        var sum = 0;
        var digit;
        
        for (var i = 0, l = digits.length; l > i; ++i) {
            digit = +digits[i];
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return (sum * 9) % 10;
    };


    var data = {

        firstNames: {
            "male": ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
            "female": ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "John", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"]
        },

        lastNames: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler', 'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer', 'Bishop', 'McCoy', 'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza', 'Harvey', 'Little', 'Burton', 'Stanley', 'Nguyen', 'George', 'Jacobs', 'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero', 'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman', 'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson', 'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis', 'Neal', 'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton', 'Shelton', 'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles', 'Craig', 'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates', 'Hale', 'Rhodes', 'Pena', 'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez', 'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago', 'Norris', 'Hardy', 'Love', 'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page', 'Munoz', 'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey', 'Wolfe', 'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin', 'Griffith', 'Valdez', 'Hubbard', 'Salazar', 'Reeves', 'Warner', 'Stevenson', 'Burgess', 'Santos', 'Tate', 'Cross', 'Garner', 'Mann', 'Mack', 'Moss', 'Thornton', 'Dennis', 'McGee', 'Farmer', 'Delgado', 'Aguilar', 'Vega', 'Glover', 'Manning', 'Cohen', 'Harmon', 'Rodgers', 'Robbins', 'Newton', 'Todd', 'Blair', 'Higgins', 'Ingram', 'Reese', 'Cannon', 'Strickland', 'Townsend', 'Potter', 'Goodwin', 'Walton', 'Rowe', 'Hampton', 'Ortega', 'Patton', 'Swanson', 'Joseph', 'Francis', 'Goodman', 'Maldonado', 'Yates', 'Becker', 'Erickson', 'Hodges', 'Rios', 'Conner', 'Adkins', 'Webster', 'Norman', 'Malone', 'Hammond', 'Flowers', 'Cobb', 'Moody', 'Quinn', 'Blake', 'Maxwell', 'Pope', 'Floyd', 'Osborne', 'Paul', 'McCarthy', 'Guerrero', 'Lindsey', 'Estrada', 'Sandoval', 'Gibbs', 'Tyler', 'Gross', 'Fitzgerald', 'Stokes', 'Doyle', 'Sherman', 'Saunders', 'Wise', 'Colon', 'Gill', 'Alvarado', 'Greer', 'Padilla', 'Simon', 'Waters', 'Nunez', 'Ballard', 'Schwartz', 'McBride', 'Houston', 'Christensen', 'Klein', 'Pratt', 'Briggs', 'Parsons', 'McLaughlin', 'Zimmerman', 'French', 'Buchanan', 'Moran', 'Copeland', 'Roy', 'Pittman', 'Brady', 'McCormick', 'Holloway', 'Brock', 'Poole', 'Frank', 'Logan', 'Owen', 'Bass', 'Marsh', 'Drake', 'Wong', 'Jefferson', 'Park', 'Morton', 'Abbott', 'Sparks', 'Patrick', 'Norton', 'Huff', 'Clayton', 'Massey', 'Lloyd', 'Figueroa', 'Carson', 'Bowers', 'Roberson', 'Barton', 'Tran', 'Lamb', 'Harrington', 'Casey', 'Boone', 'Cortez', 'Clarke', 'Mathis', 'Singleton', 'Wilkins', 'Cain', 'Bryan', 'Underwood', 'Hogan', 'McKenzie', 'Collier', 'Luna', 'Phelps', 'McGuire', 'Allison', 'Bridges', 'Wilkerson', 'Nash', 'Summers', 'Atkins'],

        provinces: [
            {name: 'Alberta', abbreviation: 'AB'},
            {name: 'British Columbia', abbreviation: 'BC'},
            {name: 'Manitoba', abbreviation: 'MB'},
            {name: 'New Brunswick', abbreviation: 'NB'},
            {name: 'Newfoundland and Labrador', abbreviation: 'NL'},
            {name: 'Nova Scotia', abbreviation: 'NS'},
            {name: 'Ontario', abbreviation: 'ON'},
            {name: 'Prince Edward Island', abbreviation: 'PE'},
            {name: 'Quebec', abbreviation: 'QC'},
            {name: 'Saskatchewan', abbreviation: 'SK'},

            // The case could be made that the following are not actually provinces
            // since they are technically considered "territories" however they all
            // look the same on an envelope!
            {name: 'Northwest Territories', abbreviation: 'NT'},
            {name: 'Nunavut', abbreviation: 'NU'},
            {name: 'Yukon', abbreviation: 'YT'}
        ],

        us_states_and_dc: [
            {name: 'Alabama', abbreviation: 'AL'},
            {name: 'Alaska', abbreviation: 'AK'},
            {name: 'Arizona', abbreviation: 'AZ'},
            {name: 'Arkansas', abbreviation: 'AR'},
            {name: 'California', abbreviation: 'CA'},
            {name: 'Colorado', abbreviation: 'CO'},
            {name: 'Connecticut', abbreviation: 'CT'},
            {name: 'Delaware', abbreviation: 'DE'},
            {name: 'District of Columbia', abbreviation: 'DC'},
            {name: 'Florida', abbreviation: 'FL'},
            {name: 'Georgia', abbreviation: 'GA'},
            {name: 'Hawaii', abbreviation: 'HI'},
            {name: 'Idaho', abbreviation: 'ID'},
            {name: 'Illinois', abbreviation: 'IL'},
            {name: 'Indiana', abbreviation: 'IN'},
            {name: 'Iowa', abbreviation: 'IA'},
            {name: 'Kansas', abbreviation: 'KS'},
            {name: 'Kentucky', abbreviation: 'KY'},
            {name: 'Louisiana', abbreviation: 'LA'},
            {name: 'Maine', abbreviation: 'ME'},
            {name: 'Maryland', abbreviation: 'MD'},
            {name: 'Massachusetts', abbreviation: 'MA'},
            {name: 'Michigan', abbreviation: 'MI'},
            {name: 'Minnesota', abbreviation: 'MN'},
            {name: 'Mississippi', abbreviation: 'MS'},
            {name: 'Missouri', abbreviation: 'MO'},
            {name: 'Montana', abbreviation: 'MT'},
            {name: 'Nebraska', abbreviation: 'NE'},
            {name: 'Nevada', abbreviation: 'NV'},
            {name: 'New Hampshire', abbreviation: 'NH'},
            {name: 'New Jersey', abbreviation: 'NJ'},
            {name: 'New Mexico', abbreviation: 'NM'},
            {name: 'New York', abbreviation: 'NY'},
            {name: 'North Carolina', abbreviation: 'NC'},
            {name: 'North Dakota', abbreviation: 'ND'},
            {name: 'Ohio', abbreviation: 'OH'},
            {name: 'Oklahoma', abbreviation: 'OK'},
            {name: 'Oregon', abbreviation: 'OR'},
            {name: 'Pennsylvania', abbreviation: 'PA'},
            {name: 'Rhode Island', abbreviation: 'RI'},
            {name: 'South Carolina', abbreviation: 'SC'},
            {name: 'South Dakota', abbreviation: 'SD'},
            {name: 'Tennessee', abbreviation: 'TN'},
            {name: 'Texas', abbreviation: 'TX'},
            {name: 'Utah', abbreviation: 'UT'},
            {name: 'Vermont', abbreviation: 'VT'},
            {name: 'Virginia', abbreviation: 'VA'},
            {name: 'Washington', abbreviation: 'WA'},
            {name: 'West Virginia', abbreviation: 'WV'},
            {name: 'Wisconsin', abbreviation: 'WI'},
            {name: 'Wyoming', abbreviation: 'WY'}
        ],

        territories: [
            {name: 'American Samoa', abbreviation: 'AS'},
            {name: 'Federated States of Micronesia', abbreviation: 'FM'},
            {name: 'Guam', abbreviation: 'GU'},
            {name: 'Marshall Islands', abbreviation: 'MH'},
            {name: 'Northern Mariana Islands', abbreviation: 'MP'},
            {name: 'Puerto Rico', abbreviation: 'PR'},
            {name: 'Virgin Islands, U.S.', abbreviation: 'VI'}
        ],

        armed_forces: [
            {name: 'Armed Forces Europe', abbreviation: 'AE'},
            {name: 'Armed Forces Pacific', abbreviation: 'AP'},
            {name: 'Armed Forces the Americas', abbreviation: 'AA'}
        ],

        street_suffixes: [
            {name: 'Avenue', abbreviation: 'Ave'},
            {name: 'Boulevard', abbreviation: 'Blvd'},
            {name: 'Center', abbreviation: 'Ctr'},
            {name: 'Circle', abbreviation: 'Cir'},
            {name: 'Court', abbreviation: 'Ct'},
            {name: 'Drive', abbreviation: 'Dr'},
            {name: 'Extension', abbreviation: 'Ext'},
            {name: 'Glen', abbreviation: 'Gln'},
            {name: 'Grove', abbreviation: 'Grv'},
            {name: 'Heights', abbreviation: 'Hts'},
            {name: 'Highway', abbreviation: 'Hwy'},
            {name: 'Junction', abbreviation: 'Jct'},
            {name: 'Key', abbreviation: 'Key'},
            {name: 'Lane', abbreviation: 'Ln'},
            {name: 'Loop', abbreviation: 'Loop'},
            {name: 'Manor', abbreviation: 'Mnr'},
            {name: 'Mill', abbreviation: 'Mill'},
            {name: 'Park', abbreviation: 'Park'},
            {name: 'Parkway', abbreviation: 'Pkwy'},
            {name: 'Pass', abbreviation: 'Pass'},
            {name: 'Path', abbreviation: 'Path'},
            {name: 'Pike', abbreviation: 'Pike'},
            {name: 'Place', abbreviation: 'Pl'},
            {name: 'Plaza', abbreviation: 'Plz'},
            {name: 'Point', abbreviation: 'Pt'},
            {name: 'Ridge', abbreviation: 'Rdg'},
            {name: 'River', abbreviation: 'Riv'},
            {name: 'Road', abbreviation: 'Rd'},
            {name: 'Square', abbreviation: 'Sq'},
            {name: 'Street', abbreviation: 'St'},
            {name: 'Terrace', abbreviation: 'Ter'},
            {name: 'Trail', abbreviation: 'Trl'},
            {name: 'Turnpike', abbreviation: 'Tpke'},
            {name: 'View', abbreviation: 'Vw'},
            {name: 'Way', abbreviation: 'Way'}
        ],

        months: [
            {name: 'January', short_name: 'Jan', numeric: '01', days: 31},
            // Not messing with leap years...
            {name: 'February', short_name: 'Feb', numeric: '02', days: 28},
            {name: 'March', short_name: 'Mar', numeric: '03', days: 31},
            {name: 'April', short_name: 'Apr', numeric: '04', days: 30},
            {name: 'May', short_name: 'May', numeric: '05', days: 31},
            {name: 'June', short_name: 'Jun', numeric: '06', days: 30},
            {name: 'July', short_name: 'Jul', numeric: '07', days: 31},
            {name: 'August', short_name: 'Aug', numeric: '08', days: 31},
            {name: 'September', short_name: 'Sep', numeric: '09', days: 30},
            {name: 'October', short_name: 'Oct', numeric: '10', days: 31},
            {name: 'November', short_name: 'Nov', numeric: '11', days: 30},
            {name: 'December', short_name: 'Dec', numeric: '12', days: 31}
        ],

        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        cc_types: [
            {name: "American Express", short_name: 'amex', prefix: '34', length: 15},
            {name: "Bankcard", short_name: 'bankcard', prefix: '5610', length: 16},
            {name: "China UnionPay", short_name: 'chinaunion', prefix: '62', length: 16},
            {name: "Diners Club Carte Blanche", short_name: 'dccarte', prefix: '300', length: 14},
            {name: "Diners Club enRoute", short_name: 'dcenroute', prefix: '2014', length: 15},
            {name: "Diners Club International", short_name: 'dcintl', prefix: '36', length: 14},
            {name: "Diners Club United States & Canada", short_name: 'dcusc', prefix: '54', length: 16},
            {name: "Discover Card", short_name: 'discover', prefix: '6011', length: 16},
            {name: "InstaPayment", short_name: 'instapay', prefix: '637', length: 16},
            {name: "JCB", short_name: 'jcb', prefix: '3528', length: 16},
            {name: "Laser", short_name: 'laser', prefix: '6304', length: 16},
            {name: "Maestro", short_name: 'maestro', prefix: '5018', length: 16},
            {name: "Mastercard", short_name: 'mc', prefix: '51', length: 16},
            {name: "Solo", short_name: 'solo', prefix: '6334', length: 16},
            {name: "Switch", short_name: 'switch', prefix: '4903', length: 16},
            {name: "Visa", short_name: 'visa', prefix: '4', length: 16},
            {name: "Visa Electron", short_name: 'electron', prefix: '4026', length: 16}
        ],

        //return all world currency by ISO 4217
        currency_types: [
            {'code' : 'AED', 'name' : 'United Arab Emirates Dirham'},
            {'code' : 'AFN', 'name' : 'Afghanistan Afghani'},
            {'code' : 'ALL', 'name' : 'Albania Lek'},
            {'code' : 'AMD', 'name' : 'Armenia Dram'},
            {'code' : 'ANG', 'name' : 'Netherlands Antilles Guilder'},
            {'code' : 'AOA', 'name' : 'Angola Kwanza'},
            {'code' : 'ARS', 'name' : 'Argentina Peso'},
            {'code' : 'AUD', 'name' : 'Australia Dollar'},
            {'code' : 'AWG', 'name' : 'Aruba Guilder'},
            {'code' : 'AZN', 'name' : 'Azerbaijan New Manat'},
            {'code' : 'BAM', 'name' : 'Bosnia and Herzegovina Convertible Marka'},
            {'code' : 'BBD', 'name' : 'Barbados Dollar'},
            {'code' : 'BDT', 'name' : 'Bangladesh Taka'},
            {'code' : 'BGN', 'name' : 'Bulgaria Lev'},
            {'code' : 'BHD', 'name' : 'Bahrain Dinar'},
            {'code' : 'BIF', 'name' : 'Burundi Franc'},
            {'code' : 'BMD', 'name' : 'Bermuda Dollar'},
            {'code' : 'BND', 'name' : 'Brunei Darussalam Dollar'},
            {'code' : 'BOB', 'name' : 'Bolivia Boliviano'},
            {'code' : 'BRL', 'name' : 'Brazil Real'},
            {'code' : 'BSD', 'name' : 'Bahamas Dollar'},
            {'code' : 'BTN', 'name' : 'Bhutan Ngultrum'},
            {'code' : 'BWP', 'name' : 'Botswana Pula'},
            {'code' : 'BYR', 'name' : 'Belarus Ruble'},
            {'code' : 'BZD', 'name' : 'Belize Dollar'},
            {'code' : 'CAD', 'name' : 'Canada Dollar'},
            {'code' : 'CDF', 'name' : 'Congo/Kinshasa Franc'},
            {'code' : 'CHF', 'name' : 'Switzerland Franc'},
            {'code' : 'CLP', 'name' : 'Chile Peso'},
            {'code' : 'CNY', 'name' : 'China Yuan Renminbi'},
            {'code' : 'COP', 'name' : 'Colombia Peso'},
            {'code' : 'CRC', 'name' : 'Costa Rica Colon'},
            {'code' : 'CUC', 'name' : 'Cuba Convertible Peso'},
            {'code' : 'CUP', 'name' : 'Cuba Peso'},
            {'code' : 'CVE', 'name' : 'Cape Verde Escudo'},
            {'code' : 'CZK', 'name' : 'Czech Republic Koruna'},
            {'code' : 'DJF', 'name' : 'Djibouti Franc'},
            {'code' : 'DKK', 'name' : 'Denmark Krone'},
            {'code' : 'DOP', 'name' : 'Dominican Republic Peso'},
            {'code' : 'DZD', 'name' : 'Algeria Dinar'},
            {'code' : 'EGP', 'name' : 'Egypt Pound'},
            {'code' : 'ERN', 'name' : 'Eritrea Nakfa'},
            {'code' : 'ETB', 'name' : 'Ethiopia Birr'},
            {'code' : 'EUR', 'name' : 'Euro Member Countries'},
            {'code' : 'FJD', 'name' : 'Fiji Dollar'},
            {'code' : 'FKP', 'name' : 'Falkland Islands (Malvinas) Pound'},
            {'code' : 'GBP', 'name' : 'United Kingdom Pound'},
            {'code' : 'GEL', 'name' : 'Georgia Lari'},
            {'code' : 'GGP', 'name' : 'Guernsey Pound'},
            {'code' : 'GHS', 'name' : 'Ghana Cedi'},
            {'code' : 'GIP', 'name' : 'Gibraltar Pound'},
            {'code' : 'GMD', 'name' : 'Gambia Dalasi'},
            {'code' : 'GNF', 'name' : 'Guinea Franc'},
            {'code' : 'GTQ', 'name' : 'Guatemala Quetzal'},
            {'code' : 'GYD', 'name' : 'Guyana Dollar'},
            {'code' : 'HKD', 'name' : 'Hong Kong Dollar'},
            {'code' : 'HNL', 'name' : 'Honduras Lempira'},
            {'code' : 'HRK', 'name' : 'Croatia Kuna'},
            {'code' : 'HTG', 'name' : 'Haiti Gourde'},
            {'code' : 'HUF', 'name' : 'Hungary Forint'},
            {'code' : 'IDR', 'name' : 'Indonesia Rupiah'},
            {'code' : 'ILS', 'name' : 'Israel Shekel'},
            {'code' : 'IMP', 'name' : 'Isle of Man Pound'},
            {'code' : 'INR', 'name' : 'India Rupee'},
            {'code' : 'IQD', 'name' : 'Iraq Dinar'},
            {'code' : 'IRR', 'name' : 'Iran Rial'},
            {'code' : 'ISK', 'name' : 'Iceland Krona'},
            {'code' : 'JEP', 'name' : 'Jersey Pound'},
            {'code' : 'JMD', 'name' : 'Jamaica Dollar'},
            {'code' : 'JOD', 'name' : 'Jordan Dinar'},
            {'code' : 'JPY', 'name' : 'Japan Yen'},
            {'code' : 'KES', 'name' : 'Kenya Shilling'},
            {'code' : 'KGS', 'name' : 'Kyrgyzstan Som'},
            {'code' : 'KHR', 'name' : 'Cambodia Riel'},
            {'code' : 'KMF', 'name' : 'Comoros Franc'},
            {'code' : 'KPW', 'name' : 'Korea (North) Won'},
            {'code' : 'KRW', 'name' : 'Korea (South) Won'},
            {'code' : 'KWD', 'name' : 'Kuwait Dinar'},
            {'code' : 'KYD', 'name' : 'Cayman Islands Dollar'},
            {'code' : 'KZT', 'name' : 'Kazakhstan Tenge'},
            {'code' : 'LAK', 'name' : 'Laos Kip'},
            {'code' : 'LBP', 'name' : 'Lebanon Pound'},
            {'code' : 'LKR', 'name' : 'Sri Lanka Rupee'},
            {'code' : 'LRD', 'name' : 'Liberia Dollar'},
            {'code' : 'LSL', 'name' : 'Lesotho Loti'},
            {'code' : 'LTL', 'name' : 'Lithuania Litas'},
            {'code' : 'LYD', 'name' : 'Libya Dinar'},
            {'code' : 'MAD', 'name' : 'Morocco Dirham'},
            {'code' : 'MDL', 'name' : 'Moldova Leu'},
            {'code' : 'MGA', 'name' : 'Madagascar Ariary'},
            {'code' : 'MKD', 'name' : 'Macedonia Denar'},
            {'code' : 'MMK', 'name' : 'Myanmar (Burma) Kyat'},
            {'code' : 'MNT', 'name' : 'Mongolia Tughrik'},
            {'code' : 'MOP', 'name' : 'Macau Pataca'},
            {'code' : 'MRO', 'name' : 'Mauritania Ouguiya'},
            {'code' : 'MUR', 'name' : 'Mauritius Rupee'},
            {'code' : 'MVR', 'name' : 'Maldives (Maldive Islands) Rufiyaa'},
            {'code' : 'MWK', 'name' : 'Malawi Kwacha'},
            {'code' : 'MXN', 'name' : 'Mexico Peso'},
            {'code' : 'MYR', 'name' : 'Malaysia Ringgit'},
            {'code' : 'MZN', 'name' : 'Mozambique Metical'},
            {'code' : 'NAD', 'name' : 'Namibia Dollar'},
            {'code' : 'NGN', 'name' : 'Nigeria Naira'},
            {'code' : 'NIO', 'name' : 'Nicaragua Cordoba'},
            {'code' : 'NOK', 'name' : 'Norway Krone'},
            {'code' : 'NPR', 'name' : 'Nepal Rupee'},
            {'code' : 'NZD', 'name' : 'New Zealand Dollar'},
            {'code' : 'OMR', 'name' : 'Oman Rial'},
            {'code' : 'PAB', 'name' : 'Panama Balboa'},
            {'code' : 'PEN', 'name' : 'Peru Nuevo Sol'},
            {'code' : 'PGK', 'name' : 'Papua New Guinea Kina'},
            {'code' : 'PHP', 'name' : 'Philippines Peso'},
            {'code' : 'PKR', 'name' : 'Pakistan Rupee'},
            {'code' : 'PLN', 'name' : 'Poland Zloty'},
            {'code' : 'PYG', 'name' : 'Paraguay Guarani'},
            {'code' : 'QAR', 'name' : 'Qatar Riyal'},
            {'code' : 'RON', 'name' : 'Romania New Leu'},
            {'code' : 'RSD', 'name' : 'Serbia Dinar'},
            {'code' : 'RUB', 'name' : 'Russia Ruble'},
            {'code' : 'RWF', 'name' : 'Rwanda Franc'},
            {'code' : 'SAR', 'name' : 'Saudi Arabia Riyal'},
            {'code' : 'SBD', 'name' : 'Solomon Islands Dollar'},
            {'code' : 'SCR', 'name' : 'Seychelles Rupee'},
            {'code' : 'SDG', 'name' : 'Sudan Pound'},
            {'code' : 'SEK', 'name' : 'Sweden Krona'},
            {'code' : 'SGD', 'name' : 'Singapore Dollar'},
            {'code' : 'SHP', 'name' : 'Saint Helena Pound'},
            {'code' : 'SLL', 'name' : 'Sierra Leone Leone'},
            {'code' : 'SOS', 'name' : 'Somalia Shilling'},
            {'code' : 'SPL', 'name' : 'Seborga Luigino'},
            {'code' : 'SRD', 'name' : 'Suriname Dollar'},
            {'code' : 'STD', 'name' : 'São Tomé and Príncipe Dobra'},
            {'code' : 'SVC', 'name' : 'El Salvador Colon'},
            {'code' : 'SYP', 'name' : 'Syria Pound'},
            {'code' : 'SZL', 'name' : 'Swaziland Lilangeni'},
            {'code' : 'THB', 'name' : 'Thailand Baht'},
            {'code' : 'TJS', 'name' : 'Tajikistan Somoni'},
            {'code' : 'TMT', 'name' : 'Turkmenistan Manat'},
            {'code' : 'TND', 'name' : 'Tunisia Dinar'},
            {'code' : 'TOP', 'name' : 'Tonga Pa\'anga'},
            {'code' : 'TRY', 'name' : 'Turkey Lira'},
            {'code' : 'TTD', 'name' : 'Trinidad and Tobago Dollar'},
            {'code' : 'TVD', 'name' : 'Tuvalu Dollar'},
            {'code' : 'TWD', 'name' : 'Taiwan New Dollar'},
            {'code' : 'TZS', 'name' : 'Tanzania Shilling'},
            {'code' : 'UAH', 'name' : 'Ukraine Hryvnia'},
            {'code' : 'UGX', 'name' : 'Uganda Shilling'},
            {'code' : 'USD', 'name' : 'United States Dollar'},
            {'code' : 'UYU', 'name' : 'Uruguay Peso'},
            {'code' : 'UZS', 'name' : 'Uzbekistan Som'},
            {'code' : 'VEF', 'name' : 'Venezuela Bolivar'},
            {'code' : 'VND', 'name' : 'Viet Nam Dong'},
            {'code' : 'VUV', 'name' : 'Vanuatu Vatu'},
            {'code' : 'WST', 'name' : 'Samoa Tala'},
            {'code' : 'XAF', 'name' : 'Communauté Financière Africaine (BEAC) CFA Franc BEAC'},
            {'code' : 'XCD', 'name' : 'East Caribbean Dollar'},
            {'code' : 'XDR', 'name' : 'International Monetary Fund (IMF) Special Drawing Rights'},
            {'code' : 'XOF', 'name' : 'Communauté Financière Africaine (BCEAO) Franc'},
            {'code' : 'XPF', 'name' : 'Comptoirs Français du Pacifique (CFP) Franc'},
            {'code' : 'YER', 'name' : 'Yemen Rial'},
            {'code' : 'ZAR', 'name' : 'South Africa Rand'},
            {'code' : 'ZMW', 'name' : 'Zambia Kwacha'},
            {'code' : 'ZWD', 'name' : 'Zimbabwe Dollar'}
        ]
    };

    function copyObject(source, target) {
        var key;

        target = target || (Array.isArray(source) ? [] : {});

        for (key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key] || target[key];
            }
        }

        return target;
    }

    /** Get the data based on key**/
    Chance.prototype.get = function (name) {
        return copyObject(data[name]);
    };

    /** Set the data as key and data or the data map**/
    Chance.prototype.set = function (name, values) {
        if (typeof name === "string") {
            data[name] = values;
        } else {
            data = copyObject(name, data);
        }
    };


    Chance.prototype.mersenne_twister = function (seed) {
        return new MersenneTwister(seed);
    };

    // -- End Miscellaneous --

    Chance.prototype.VERSION = "0.5.9";

    // Mersenne Twister from https://gist.github.com/banksean/300494
    var MersenneTwister = function (seed) {
        if (seed === undefined) {
            seed = new Date().getTime();
        }
        /* Period parameters */
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df;   /* constant vector a */
        this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
        this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

        this.mt = new Array(this.N); /* the array for the state vector */
        this.mti = this.N + 1; /* mti==N + 1 means mt[N] is not initialized */

        this.init_genrand(seed);
    };

    /* initializes mt[N] with a seed */
    MersenneTwister.prototype.init_genrand = function (s) {
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
            /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
            /* In the previous versions, MSBs of the seed affect   */
            /* only MSBs of the array mt[].                        */
            /* 2002/01/09 modified by Makoto Matsumoto             */
            this.mt[this.mti] >>>= 0;
            /* for >32 bit machines */
        }
    };

    /* initialize by an array with array-length */
    /* init_key is the array for initializing keys */
    /* key_length is its length */
    /* slight change for C++, 2004/2/26 */
    MersenneTwister.prototype.init_by_array = function (init_key, key_length) {
        var i = 1, j = 0, k, s;
        this.init_genrand(19650218);
        k = (this.N > key_length ? this.N : key_length);
        for (; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            j++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
            if (j >= key_length) { j = 0; }
        }
        for (k = this.N - 1; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
        }

        this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
    };

    /* generates a random number on [0,0xffffffff]-interval */
    MersenneTwister.prototype.genrand_int32 = function () {
        var y;
        var mag01 = new Array(0x0, this.MATRIX_A);
        /* mag01[x] = x * MATRIX_A  for x=0,1 */

        if (this.mti >= this.N) { /* generate N words at one time */
            var kk;

            if (this.mti === this.N + 1) {   /* if init_genrand() has not been called, */
                this.init_genrand(5489); /* a default initial seed is used */
            }
            for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (;kk < this.N - 1; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y = (this.mt[this.N - 1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

            this.mti = 0;
        }

        y = this.mt[this.mti++];

        /* Tempering */
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);

        return y >>> 0;
    };

    /* generates a random number on [0,0x7fffffff]-interval */
    MersenneTwister.prototype.genrand_int31 = function () {
        return (this.genrand_int32() >>> 1);
    };

    /* generates a random number on [0,1]-real-interval */
    MersenneTwister.prototype.genrand_real1 = function () {
        return this.genrand_int32() * (1.0 / 4294967295.0);
        /* divided by 2^32-1 */
    };

    /* generates a random number on [0,1)-real-interval */
    MersenneTwister.prototype.random = function () {
        return this.genrand_int32() * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on (0,1)-real-interval */
    MersenneTwister.prototype.genrand_real3 = function () {
        return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on [0,1) with 53-bit resolution*/
    MersenneTwister.prototype.genrand_res53 = function () {
        var a = this.genrand_int32()>>>5, b = this.genrand_int32()>>>6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    };


    // CommonJS module
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Chance;
        }
        exports.Chance = Chance;
    }

    // Register as an anonymous AMD module
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return Chance;
        });
    }

    // If there is a window object, that at least has a document property,
    // instantiate and define chance on the window
    if (typeof window === "object" && typeof window.document === "object") {
        window.Chance = Chance;
        window.chance = new Chance();
    }
})();

},{}],2:[function(require,module,exports){
var Triad;

Triad = require('./triad.coffee');

window.app = new Triad();

jQuery(function() {
  return app.render();
});



},{"./triad.coffee":4}],3:[function(require,module,exports){
module.exports = {
  TICK_MS: 25,
  FADE_MS: 4000,
  SHAPE_SIZE: 200
};



},{}],4:[function(require,module,exports){
var Triad, chance, constants,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

constants = require('./constants.coffee');

chance = new (require('chance'));

Triad = (function() {
  function Triad() {
    this.tick = __bind(this.tick, this);
  }

  Triad.prototype.render = function() {
    this.svg = d3.select('body').append('svg');
    this.shapes = [];
    this.generator = this.shapeFactory();
    return this.tick();
  };

  Triad.prototype.shapeFactory = function() {
    var x, y;
    x = 1;
    y = 1;
    return (function(_this) {
      return function() {
        var dx, dy, rot;
        rot = Math.round(Math.random() * 4);
        if (x < 1) {
          dx = 1;
        } else if (x >= Math.floor($(window).width() / constants.SHAPE_SIZE)) {
          dx = -1;
        }
        if (y < 1) {
          dy = 1;
        } else if (y >= Math.floor($(window).height() / constants.SHAPE_SIZE)) {
          dy = -1;
        }
        if (dx == null) {
          dx = Math.round(Math.random() * 2) - 1;
        }
        if (dy == null) {
          dy = Math.round(Math.random() * 2) - 1;
        }
        if (_this.shapeExistsAtPosition(x + dx, y + dy)) {
          dx += chance.bool() ? 1 : -1;
        }
        x += dx;
        y += dy;
        return {
          x: x,
          y: y,
          rot: rot
        };
      };
    })(this);
  };

  Triad.prototype.tick = function() {
    var shape, toRemove;
    shape = this.generator();
    shape.el = this.drawTriange(shape);
    if (this.shapes.length > 25) {
      toRemove = this.shapes.pop();
      toRemove.el.remove();
    }
    this.shapes.unshift(shape);
    return _.delay(this.tick, constants.TICK_MS);
  };

  Triad.prototype.drawTriange = function(_arg) {
    var rot, size, triangle, x, y;
    x = _arg.x, y = _arg.y, size = _arg.size, rot = _arg.rot;
    if (size == null) {
      size = constants.SHAPE_SIZE;
    }
    triangle = this.svg.append("path").attr('d', function(d) {
      return "M " + (x * size) + " " + (y * size) + " l " + size + " " + size + " l -" + size + " 0 z";
    }).style('fill', 'blue');
    if (rot > 0) {
      triangle.attr('transform', "rotate(" + (rot * 90) + ", " + (x * size + size / 2) + ", " + (y * +size + size / 2) + ")");
    }
    return triangle.transition().style('opacity', 0).duration(constants.FADE_MS);
  };

  Triad.prototype.shapeExistsAtPosition = function(x, y) {
    var conflicts;
    conflicts = this.shapes.filter(function(shape) {
      return shape.x === x && shape.y === y;
    });
    return conflicts.length > 0;
  };

  return Triad;

})();

module.exports = Triad;



},{"./constants.coffee":3,"chance":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9saW5jb2xuL2Rldi9zcmMvdHJpYWQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2xpbmNvbG4vZGV2L3NyYy90cmlhZC9ub2RlX21vZHVsZXMvY2hhbmNlL2NoYW5jZS5qcyIsIi9Vc2Vycy9saW5jb2xuL2Rldi9zcmMvdHJpYWQvc3JjL2pzL2FwcC5jb2ZmZWUiLCIvVXNlcnMvbGluY29sbi9kZXYvc3JjL3RyaWFkL3NyYy9qcy9jb25zdGFudHMuY29mZmVlIiwiL1VzZXJzL2xpbmNvbG4vZGV2L3NyYy90cmlhZC9zcmMvanMvdHJpYWQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmxEQSxJQUFBLEtBQUE7O0FBQUEsS0FBQSxHQUFRLE9BQUEsQ0FBUSxnQkFBUixDQUFSLENBQUE7O0FBQUEsTUFDTSxDQUFDLEdBQVAsR0FBaUIsSUFBQSxLQUFBLENBQUEsQ0FEakIsQ0FBQTs7QUFBQSxNQUdBLENBQU8sU0FBQSxHQUFBO1NBQ0wsR0FBRyxDQUFDLE1BQUosQ0FBQSxFQURLO0FBQUEsQ0FBUCxDQUhBLENBQUE7Ozs7O0FDQUEsTUFBTSxDQUFDLE9BQVAsR0FDRTtBQUFBLEVBQUEsT0FBQSxFQUFTLEVBQVQ7QUFBQSxFQUNBLE9BQUEsRUFBUyxJQURUO0FBQUEsRUFFQSxVQUFBLEVBQVksR0FGWjtDQURGLENBQUE7Ozs7O0FDQUEsSUFBQSx3QkFBQTtFQUFBLGtGQUFBOztBQUFBLFNBQUEsR0FBWSxPQUFBLENBQVEsb0JBQVIsQ0FBWixDQUFBOztBQUFBLE1BQ0EsR0FBUyxHQUFBLENBQUEsQ0FBSyxPQUFBLENBQVEsUUFBUixDQUFELENBRGIsQ0FBQTs7QUFBQTtBQUtlLEVBQUEsZUFBQSxHQUFBO0FBQUMsdUNBQUEsQ0FBRDtFQUFBLENBQWI7O0FBQUEsa0JBRUEsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUNOLElBQUEsSUFBQyxDQUFBLEdBQUQsR0FBTyxFQUFFLENBQUMsTUFBSCxDQUFVLE1BQVYsQ0FBaUIsQ0FBQyxNQUFsQixDQUF5QixLQUF6QixDQUFQLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxNQUFELEdBQVUsRUFEVixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxZQUFELENBQUEsQ0FGYixDQUFBO1dBR0EsSUFBQyxDQUFBLElBQUQsQ0FBQSxFQUpNO0VBQUEsQ0FGUixDQUFBOztBQUFBLGtCQVFBLFlBQUEsR0FBYyxTQUFBLEdBQUE7QUFDWixRQUFBLElBQUE7QUFBQSxJQUFBLENBQUEsR0FBSSxDQUFKLENBQUE7QUFBQSxJQUNBLENBQUEsR0FBSSxDQURKLENBQUE7V0FHQSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ0UsWUFBQSxXQUFBO0FBQUEsUUFBQSxHQUFBLEdBQU0sSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFJLENBQUMsTUFBTCxDQUFBLENBQUEsR0FBZ0IsQ0FBM0IsQ0FBTixDQUFBO0FBRUEsUUFBQSxJQUFHLENBQUEsR0FBSSxDQUFQO0FBQ0UsVUFBQSxFQUFBLEdBQUssQ0FBTCxDQURGO1NBQUEsTUFFSyxJQUFHLENBQUEsSUFBSyxJQUFJLENBQUMsS0FBTCxDQUFXLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxLQUFWLENBQUEsQ0FBQSxHQUFvQixTQUFTLENBQUMsVUFBekMsQ0FBUjtBQUNILFVBQUEsRUFBQSxHQUFLLENBQUEsQ0FBTCxDQURHO1NBSkw7QUFNQSxRQUFBLElBQUcsQ0FBQSxHQUFJLENBQVA7QUFDRSxVQUFBLEVBQUEsR0FBSyxDQUFMLENBREY7U0FBQSxNQUVLLElBQUcsQ0FBQSxJQUFLLElBQUksQ0FBQyxLQUFMLENBQVcsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLE1BQVYsQ0FBQSxDQUFBLEdBQXFCLFNBQVMsQ0FBQyxVQUExQyxDQUFSO0FBQ0gsVUFBQSxFQUFBLEdBQUssQ0FBQSxDQUFMLENBREc7U0FSTDtBQVdBLFFBQUEsSUFBTyxVQUFQO0FBQ0UsVUFBQSxFQUFBLEdBQUssSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFJLENBQUMsTUFBTCxDQUFBLENBQUEsR0FBZ0IsQ0FBM0IsQ0FBQSxHQUFnQyxDQUFyQyxDQURGO1NBWEE7QUFhQSxRQUFBLElBQU8sVUFBUDtBQUNFLFVBQUEsRUFBQSxHQUFLLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFBLEdBQWdCLENBQTNCLENBQUEsR0FBZ0MsQ0FBckMsQ0FERjtTQWJBO0FBZ0JBLFFBQUEsSUFBRyxLQUFDLENBQUEscUJBQUQsQ0FBdUIsQ0FBQSxHQUFJLEVBQTNCLEVBQStCLENBQUEsR0FBSSxFQUFuQyxDQUFIO0FBQ0UsVUFBQSxFQUFBLElBQVMsTUFBTSxDQUFDLElBQVAsQ0FBQSxDQUFILEdBQXNCLENBQXRCLEdBQTZCLENBQUEsQ0FBbkMsQ0FERjtTQWhCQTtBQUFBLFFBbUJBLENBQUEsSUFBSyxFQW5CTCxDQUFBO0FBQUEsUUFvQkEsQ0FBQSxJQUFLLEVBcEJMLENBQUE7ZUFzQkE7QUFBQSxVQUFDLEdBQUEsQ0FBRDtBQUFBLFVBQUksR0FBQSxDQUFKO0FBQUEsVUFBTyxLQUFBLEdBQVA7VUF2QkY7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxFQUpZO0VBQUEsQ0FSZCxDQUFBOztBQUFBLGtCQXFDQSxJQUFBLEdBQU0sU0FBQSxHQUFBO0FBQ0osUUFBQSxlQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFSLENBQUE7QUFBQSxJQUNBLEtBQUssQ0FBQyxFQUFOLEdBQVcsSUFBQyxDQUFBLFdBQUQsQ0FBYSxLQUFiLENBRFgsQ0FBQTtBQUdBLElBQUEsSUFBRyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUIsRUFBcEI7QUFDRSxNQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBQSxDQUFYLENBQUE7QUFBQSxNQUNBLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBWixDQUFBLENBREEsQ0FERjtLQUhBO0FBQUEsSUFNQSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBZ0IsS0FBaEIsQ0FOQSxDQUFBO1dBT0EsQ0FBQyxDQUFDLEtBQUYsQ0FBUSxJQUFDLENBQUEsSUFBVCxFQUFlLFNBQVMsQ0FBQyxPQUF6QixFQVJJO0VBQUEsQ0FyQ04sQ0FBQTs7QUFBQSxrQkErQ0EsV0FBQSxHQUFhLFNBQUMsSUFBRCxHQUFBO0FBQ1gsUUFBQSx5QkFBQTtBQUFBLElBRGEsU0FBQSxHQUFHLFNBQUEsR0FBRyxZQUFBLE1BQU0sV0FBQSxHQUN6QixDQUFBOztNQUFBLE9BQVEsU0FBUyxDQUFDO0tBQWxCO0FBQUEsSUFFQSxRQUFBLEdBQVcsSUFBQyxDQUFBLEdBQUcsQ0FBQyxNQUFMLENBQVksTUFBWixDQUNULENBQUMsSUFEUSxDQUNILEdBREcsRUFDRSxTQUFDLENBQUQsR0FBQTtBQUNULGFBQVEsSUFBQSxHQUFHLENBQUMsQ0FBQSxHQUFJLElBQUwsQ0FBSCxHQUFhLEdBQWIsR0FBZSxDQUFDLENBQUEsR0FBSSxJQUFMLENBQWYsR0FBeUIsS0FBekIsR0FBOEIsSUFBOUIsR0FBbUMsR0FBbkMsR0FBc0MsSUFBdEMsR0FBMkMsTUFBM0MsR0FBaUQsSUFBakQsR0FBc0QsTUFBOUQsQ0FEUztJQUFBLENBREYsQ0FHVCxDQUFDLEtBSFEsQ0FHRixNQUhFLEVBR00sTUFITixDQUZYLENBQUE7QUFPQSxJQUFBLElBQUcsR0FBQSxHQUFNLENBQVQ7QUFDRSxNQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsV0FBZCxFQUE0QixTQUFBLEdBQVEsQ0FBQyxHQUFBLEdBQUksRUFBTCxDQUFSLEdBQWdCLElBQWhCLEdBQW1CLENBQUMsQ0FBQSxHQUFJLElBQUosR0FBVyxJQUFBLEdBQUssQ0FBakIsQ0FBbkIsR0FBc0MsSUFBdEMsR0FBeUMsQ0FBQyxDQUFBLEdBQUksQ0FBQSxJQUFKLEdBQWEsSUFBQSxHQUFLLENBQW5CLENBQXpDLEdBQThELEdBQTFGLENBQUEsQ0FERjtLQVBBO1dBVUEsUUFBUSxDQUFDLFVBQVQsQ0FBQSxDQUFxQixDQUFDLEtBQXRCLENBQTRCLFNBQTVCLEVBQXVDLENBQXZDLENBQXlDLENBQUMsUUFBMUMsQ0FBbUQsU0FBUyxDQUFDLE9BQTdELEVBWFc7RUFBQSxDQS9DYixDQUFBOztBQUFBLGtCQTREQSxxQkFBQSxHQUF1QixTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFDckIsUUFBQSxTQUFBO0FBQUEsSUFBQSxTQUFBLEdBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLENBQWUsU0FBQyxLQUFELEdBQUE7YUFBVyxLQUFLLENBQUMsQ0FBTixLQUFXLENBQVgsSUFBaUIsS0FBSyxDQUFDLENBQU4sS0FBVyxFQUF2QztJQUFBLENBQWYsQ0FBWixDQUFBO1dBQ0EsU0FBUyxDQUFDLE1BQVYsR0FBbUIsRUFGRTtFQUFBLENBNUR2QixDQUFBOztlQUFBOztJQUxGLENBQUE7O0FBQUEsTUFxRU0sQ0FBQyxPQUFQLEdBQWlCLEtBckVqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vICBDaGFuY2UuanMgMC41Ljlcbi8vICBodHRwOi8vY2hhbmNlanMuY29tXG4vLyAgKGMpIDIwMTMgVmljdG9yIFF1aW5uXG4vLyAgQ2hhbmNlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgb3IgbW9kaWZpZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gQ29uc3RhbnRzXG4gICAgdmFyIE1BWF9JTlQgPSA5MDA3MTk5MjU0NzQwOTkyO1xuICAgIHZhciBNSU5fSU5UID0gLU1BWF9JTlQ7XG4gICAgdmFyIE5VTUJFUlMgPSAnMDEyMzQ1Njc4OSc7XG4gICAgdmFyIENIQVJTX0xPV0VSID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6JztcbiAgICB2YXIgQ0hBUlNfVVBQRVIgPSBDSEFSU19MT1dFUi50b1VwcGVyQ2FzZSgpO1xuICAgIHZhciBIRVhfUE9PTCAgPSBOVU1CRVJTICsgXCJhYmNkZWZcIjtcblxuICAgIC8vIENhY2hlZCBhcnJheSBoZWxwZXJzXG4gICAgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4gICAgLy8gQ29uc3RydWN0b3JcbiAgICBmdW5jdGlvbiBDaGFuY2UgKHNlZWQpIHtcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENoYW5jZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ2hhbmNlKHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgd2Ugd2VyZSBwYXNzZWQgYSBnZW5lcmF0b3IgcmF0aGVyIHRoYW4gYSBzZWVkLCB1c2UgaXQuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbSA9IHNlZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VlZCA9IHNlZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBubyBnZW5lcmF0b3IgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCB1c2Ugb3VyIE1UXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5yYW5kb20gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aGlzLm10ID0gdGhpcy5tZXJzZW5uZV90d2lzdGVyKHNlZWQpO1xuICAgICAgICAgICAgdGhpcy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubXQucmFuZG9tKHRoaXMuc2VlZCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmFuZG9tIGhlbHBlciBmdW5jdGlvbnNcbiAgICBmdW5jdGlvbiBpbml0T3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0cykge1xuICAgICAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgICAgICBpZiAoIWRlZmF1bHRzKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1tpXSA9IGRlZmF1bHRzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRlc3RSYW5nZSh0ZXN0LCBlcnJvck1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLSBCYXNpY3MgLS1cblxuICAgIENoYW5jZS5wcm90b3R5cGUuYm9vbCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cbiAgICAgICAgLy8gbGlrZWxpaG9vZCBvZiBzdWNjZXNzICh0cnVlKVxuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge2xpa2VsaWhvb2QgOiA1MH0pO1xuXG4gICAgICAgIHRlc3RSYW5nZShcbiAgICAgICAgICAgIG9wdGlvbnMubGlrZWxpaG9vZCA8IDAgfHwgb3B0aW9ucy5saWtlbGlob29kID4gMTAwLFxuICAgICAgICAgICAgXCJDaGFuY2U6IExpa2VsaWhvb2QgYWNjZXB0cyB2YWx1ZXMgZnJvbSAwIHRvIDEwMC5cIlxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnJhbmRvbSgpICogMTAwIDwgb3B0aW9ucy5saWtlbGlob29kO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmNoYXJhY3RlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgICAgICB2YXIgc3ltYm9scyA9IFwiIUAjJCVeJiooKVtdXCIsXG4gICAgICAgICAgICBsZXR0ZXJzLCBwb29sO1xuXG4gICAgICAgIHRlc3RSYW5nZShcbiAgICAgICAgICAgIG9wdGlvbnMuYWxwaGEgJiYgb3B0aW9ucy5zeW1ib2xzLFxuICAgICAgICAgICAgXCJDaGFuY2U6IENhbm5vdCBzcGVjaWZ5IGJvdGggYWxwaGEgYW5kIHN5bWJvbHMuXCJcbiAgICAgICAgKTtcblxuXG4gICAgICAgIGlmIChvcHRpb25zLmNhc2luZyA9PT0gJ2xvd2VyJykge1xuICAgICAgICAgICAgbGV0dGVycyA9IENIQVJTX0xPV0VSO1xuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY2FzaW5nID09PSAndXBwZXInKSB7XG4gICAgICAgICAgICBsZXR0ZXJzID0gQ0hBUlNfVVBQRVI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXR0ZXJzID0gQ0hBUlNfTE9XRVIgKyBDSEFSU19VUFBFUjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBvb2wpIHtcbiAgICAgICAgICAgIHBvb2wgPSBvcHRpb25zLnBvb2w7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5hbHBoYSkge1xuICAgICAgICAgICAgcG9vbCA9IGxldHRlcnM7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5zeW1ib2xzKSB7XG4gICAgICAgICAgICBwb29sID0gc3ltYm9scztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvb2wgPSBsZXR0ZXJzICsgTlVNQkVSUyArIHN5bWJvbHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcG9vbC5jaGFyQXQodGhpcy5uYXR1cmFsKHttYXg6IChwb29sLmxlbmd0aCAtIDEpfSkpO1xuICAgIH07XG5cbiAgICAvLyBOb3RlLCB3YW50ZWQgdG8gdXNlIFwiZmxvYXRcIiBvciBcImRvdWJsZVwiIGJ1dCB0aG9zZSBhcmUgYm90aCBKUyByZXNlcnZlZCB3b3Jkcy5cblxuICAgIC8vIE5vdGUsIGZpeGVkIG1lYW5zIE4gT1IgTEVTUyBkaWdpdHMgYWZ0ZXIgdGhlIGRlY2ltYWwuIFRoaXMgYmVjYXVzZVxuICAgIC8vIEl0IGNvdWxkIGJlIDE0LjkwMDAgYnV0IGluIEphdmFTY3JpcHQsIHdoZW4gdGhpcyBpcyBjYXN0IGFzIGEgbnVtYmVyLFxuICAgIC8vIHRoZSB0cmFpbGluZyB6ZXJvZXMgYXJlIGRyb3BwZWQuIExlZnQgdG8gdGhlIGNvbnN1bWVyIGlmIHRyYWlsaW5nIHplcm9lcyBhcmVcbiAgICAvLyBuZWVkZWRcbiAgICBDaGFuY2UucHJvdG90eXBlLmZsb2F0aW5nID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG51bSwgcmFuZ2U7XG5cbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtmaXhlZCA6IDR9KTtcbiAgICAgICAgdmFyIGZpeGVkID0gTWF0aC5wb3coMTAsIG9wdGlvbnMuZml4ZWQpO1xuXG4gICAgICAgIHRlc3RSYW5nZShcbiAgICAgICAgICAgIG9wdGlvbnMuZml4ZWQgJiYgb3B0aW9ucy5wcmVjaXNpb24sXG4gICAgICAgICAgICBcIkNoYW5jZTogQ2Fubm90IHNwZWNpZnkgYm90aCBmaXhlZCBhbmQgcHJlY2lzaW9uLlwiXG4gICAgICAgICk7XG5cbiAgICAgICAgdmFyIG1heCA9IE1BWF9JTlQgLyBmaXhlZDtcbiAgICAgICAgdmFyIG1pbiA9IC1tYXg7XG5cbiAgICAgICAgdGVzdFJhbmdlKFxuICAgICAgICAgICAgb3B0aW9ucy5taW4gJiYgb3B0aW9ucy5maXhlZCAmJiBvcHRpb25zLm1pbiA8IG1pbixcbiAgICAgICAgICAgIFwiQ2hhbmNlOiBNaW4gc3BlY2lmaWVkIGlzIG91dCBvZiByYW5nZSB3aXRoIGZpeGVkLiBNaW4gc2hvdWxkIGJlLCBhdCBsZWFzdCwgXCIgKyBtaW5cbiAgICAgICAgKTtcbiAgICAgICAgdGVzdFJhbmdlKFxuICAgICAgICAgICAgb3B0aW9ucy5tYXggJiYgb3B0aW9ucy5maXhlZCAmJiBvcHRpb25zLm1heCA+IG1heCxcbiAgICAgICAgICAgIFwiQ2hhbmNlOiBNYXggc3BlY2lmaWVkIGlzIG91dCBvZiByYW5nZSB3aXRoIGZpeGVkLiBNYXggc2hvdWxkIGJlLCBhdCBtb3N0LCBcIiArIG1heFxuICAgICAgICApO1xuXG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7bWluIDogbWluLCBtYXggOiBtYXh9KTtcblxuICAgICAgICAvLyBUb2RvIC0gTWFrZSB0aGlzIHdvcmshXG4gICAgICAgIC8vIG9wdGlvbnMucHJlY2lzaW9uID0gKHR5cGVvZiBvcHRpb25zLnByZWNpc2lvbiAhPT0gXCJ1bmRlZmluZWRcIikgPyBvcHRpb25zLnByZWNpc2lvbiA6IGZhbHNlO1xuXG4gICAgICAgIG51bSA9IHRoaXMuaW50ZWdlcih7bWluOiBvcHRpb25zLm1pbiAqIGZpeGVkLCBtYXg6IG9wdGlvbnMubWF4ICogZml4ZWR9KTtcbiAgICAgICAgdmFyIG51bV9maXhlZCA9IChudW0gLyBmaXhlZCkudG9GaXhlZChvcHRpb25zLmZpeGVkKTtcblxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChudW1fZml4ZWQpO1xuICAgIH07XG5cbiAgICAvLyBOT1RFIHRoZSBtYXggYW5kIG1pbiBhcmUgSU5DTFVERUQgaW4gdGhlIHJhbmdlLiBTbzpcbiAgICAvL1xuICAgIC8vIGNoYW5jZS5uYXR1cmFsKHttaW46IDEsIG1heDogM30pO1xuICAgIC8vXG4gICAgLy8gd291bGQgcmV0dXJuIGVpdGhlciAxLCAyLCBvciAzLlxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5pbnRlZ2VyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuICAgICAgICAvLyA5MDA3MTk5MjU0NzQwOTkyICgyXjUzKSBpcyB0aGUgbWF4IGludGVnZXIgbnVtYmVyIGluIEphdmFTY3JpcHRcbiAgICAgICAgLy8gU2VlOiBodHRwOi8vdnEuaW8vMTMyc2EyalxuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge21pbjogTUlOX0lOVCwgbWF4OiBNQVhfSU5UfSk7XG5cbiAgICAgICAgdGVzdFJhbmdlKG9wdGlvbnMubWluID4gb3B0aW9ucy5tYXgsIFwiQ2hhbmNlOiBNaW4gY2Fubm90IGJlIGdyZWF0ZXIgdGhhbiBNYXguXCIpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMucmFuZG9tKCkgKiAob3B0aW9ucy5tYXggLSBvcHRpb25zLm1pbiArIDEpICsgb3B0aW9ucy5taW4pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLm5hdHVyYWwgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge21pbjogMCwgbWF4OiBNQVhfSU5UfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmludGVnZXIob3B0aW9ucyk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUubm9ybWFsID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHttZWFuIDogMCwgZGV2IDogMX0pO1xuXG4gICAgICAgIC8vIFRoZSBNYXJzYWdsaWEgUG9sYXIgbWV0aG9kXG4gICAgICAgIHZhciBzLCB1LCB2LCBub3JtLFxuICAgICAgICAgICAgbWVhbiA9IG9wdGlvbnMubWVhbixcbiAgICAgICAgICAgIGRldiA9IG9wdGlvbnMuZGV2O1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIFUgYW5kIFYgYXJlIGZyb20gdGhlIHVuaWZvcm0gZGlzdHJpYnV0aW9uIG9uICgtMSwgMSlcbiAgICAgICAgICAgIHUgPSB0aGlzLnJhbmRvbSgpICogMiAtIDE7XG4gICAgICAgICAgICB2ID0gdGhpcy5yYW5kb20oKSAqIDIgLSAxO1xuXG4gICAgICAgICAgICBzID0gdSAqIHUgKyB2ICogdjtcbiAgICAgICAgfSB3aGlsZSAocyA+PSAxKTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBzdGFuZGFyZCBub3JtYWwgdmFyaWF0ZVxuICAgICAgICBub3JtID0gdSAqIE1hdGguc3FydCgtMiAqIE1hdGgubG9nKHMpIC8gcyk7XG5cbiAgICAgICAgLy8gU2hhcGUgYW5kIHNjYWxlXG4gICAgICAgIHJldHVybiBkZXYgKiBub3JtICsgbWVhbjtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIGxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IHRoaXMubmF0dXJhbCh7bWluOiA1LCBtYXg6IDIwfSksXG4gICAgICAgICAgICB0ZXh0ID0gJycsXG4gICAgICAgICAgICBwb29sID0gb3B0aW9ucy5wb29sO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRleHQgKz0gdGhpcy5jaGFyYWN0ZXIoe3Bvb2w6IHBvb2x9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGV4dDtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIEJhc2ljcyAtLVxuXG4gICAgLy8gLS0gSGVscGVycyAtLVxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5jYXBpdGFsaXplID0gZnVuY3Rpb24gKHdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnN1YnN0cigxKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5taXhpbiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIGNoYW5jZSA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGZ1bmNfbmFtZSBpbiBvYmopIHtcbiAgICAgICAgICAgIENoYW5jZS5wcm90b3R5cGVbZnVuY19uYW1lXSA9IG9ialtmdW5jX25hbWVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvLyBHaXZlbiBhIGZ1bmN0aW9uIHRoYXQgZ2VuZXJhdGVzIHNvbWV0aGluZyByYW5kb20gYW5kIGEgbnVtYmVyIG9mIGl0ZW1zIHRvIGdlbmVyYXRlLFxuICAgIC8vIHJldHVybiBhbiBhcnJheSBvZiBpdGVtcyB3aGVyZSBub25lIHJlcGVhdC5cbiAgICBDaGFuY2UucHJvdG90eXBlLnVuaXF1ZSA9IGZ1bmN0aW9uKGZuLCBudW0sIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgY29tcGFyYXRvciB0byBjaGVjayB0aGF0IHZhbCBpcyBub3QgYWxyZWFkeSBpbiBhcnIuXG4gICAgICAgICAgICAvLyBTaG91bGQgcmV0dXJuIGBmYWxzZWAgaWYgaXRlbSBub3QgaW4gYXJyYXksIGB0cnVlYCBvdGhlcndpc2VcbiAgICAgICAgICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGFyciwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyci5pbmRleE9mKHJlc3VsdCkgIT09IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYXJyID0gW10sIGNvdW50ID0gMDtcblxuICAgICAgICB3aGlsZSAoYXJyLmxlbmd0aCA8IG51bSkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuY29tcGFyYXRvcihhcnIsIHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICBhcnIucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIC8vIHJlc2V0IGNvdW50IHdoZW4gdW5pcXVlIGZvdW5kXG4gICAgICAgICAgICAgICAgY291bnQgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoKytjb3VudCA+IG51bSAqIDUwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJDaGFuY2U6IG51bSBpcyBsaWtlbHkgdG9vIGxhcmdlIGZvciBzYW1wbGUgc2V0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfTtcblxuICAgIC8vIEgvVCB0byBTTyBmb3IgdGhpcyBvbmU6IGh0dHA6Ly92cS5pby9PdFVyWjVcbiAgICBDaGFuY2UucHJvdG90eXBlLnBhZCA9IGZ1bmN0aW9uIChudW1iZXIsIHdpZHRoLCBwYWQpIHtcbiAgICAgICAgLy8gRGVmYXVsdCBwYWQgdG8gMCBpZiBub25lIHByb3ZpZGVkXG4gICAgICAgIHBhZCA9IHBhZCB8fCAnMCc7XG4gICAgICAgIC8vIENvbnZlcnQgbnVtYmVyIHRvIGEgc3RyaW5nXG4gICAgICAgIG51bWJlciA9IG51bWJlciArICcnO1xuICAgICAgICByZXR1cm4gbnVtYmVyLmxlbmd0aCA+PSB3aWR0aCA/IG51bWJlciA6IG5ldyBBcnJheSh3aWR0aCAtIG51bWJlci5sZW5ndGggKyAxKS5qb2luKHBhZCkgKyBudW1iZXI7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUucGljayA9IGZ1bmN0aW9uIChhcnIsIGNvdW50KSB7XG4gICAgICAgIGlmICghY291bnQgfHwgY291bnQgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnJbdGhpcy5uYXR1cmFsKHttYXg6IGFyci5sZW5ndGggLSAxfSldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2h1ZmZsZShhcnIpLnNsaWNlKDAsIGNvdW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnNodWZmbGUgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHZhciBvbGRfYXJyYXkgPSBhcnIuc2xpY2UoMCksXG4gICAgICAgICAgICBuZXdfYXJyYXkgPSBbXSxcbiAgICAgICAgICAgIGogPSAwLFxuICAgICAgICAgICAgbGVuZ3RoID0gTnVtYmVyKG9sZF9hcnJheS5sZW5ndGgpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vIFBpY2sgYSByYW5kb20gaW5kZXggZnJvbSB0aGUgYXJyYXlcbiAgICAgICAgICAgIGogPSB0aGlzLm5hdHVyYWwoe21heDogb2xkX2FycmF5Lmxlbmd0aCAtIDF9KTtcbiAgICAgICAgICAgIC8vIEFkZCBpdCB0byB0aGUgbmV3IGFycmF5XG4gICAgICAgICAgICBuZXdfYXJyYXlbaV0gPSBvbGRfYXJyYXlbal07XG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhhdCBlbGVtZW50IGZyb20gdGhlIG9yaWdpbmFsIGFycmF5XG4gICAgICAgICAgICBvbGRfYXJyYXkuc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld19hcnJheTtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIEhlbHBlcnMgLS1cblxuICAgIC8vIC0tIFRleHQgLS1cblxuICAgIENoYW5jZS5wcm90b3R5cGUucGFyYWdyYXBoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBzZW50ZW5jZXMgPSBvcHRpb25zLnNlbnRlbmNlcyB8fCB0aGlzLm5hdHVyYWwoe21pbjogMywgbWF4OiA3fSksXG4gICAgICAgICAgICBzZW50ZW5jZV9hcnJheSA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VudGVuY2VzOyBpKyspIHtcbiAgICAgICAgICAgIHNlbnRlbmNlX2FycmF5LnB1c2godGhpcy5zZW50ZW5jZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZW50ZW5jZV9hcnJheS5qb2luKCcgJyk7XG4gICAgfTtcblxuICAgIC8vIENvdWxkIGdldCBzbWFydGVyIGFib3V0IHRoaXMgdGhhbiBnZW5lcmF0aW5nIHJhbmRvbSB3b3JkcyBhbmRcbiAgICAvLyBjaGFpbmluZyB0aGVtIHRvZ2V0aGVyLiBTdWNoIGFzOiBodHRwOi8vdnEuaW8vMWE1Y2VPaFxuICAgIENoYW5jZS5wcm90b3R5cGUuc2VudGVuY2UgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHdvcmRzID0gb3B0aW9ucy53b3JkcyB8fCB0aGlzLm5hdHVyYWwoe21pbjogMTIsIG1heDogMTh9KSxcbiAgICAgICAgICAgIHRleHQsIHdvcmRfYXJyYXkgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdvcmRzOyBpKyspIHtcbiAgICAgICAgICAgIHdvcmRfYXJyYXkucHVzaCh0aGlzLndvcmQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZXh0ID0gd29yZF9hcnJheS5qb2luKCcgJyk7XG5cbiAgICAgICAgLy8gQ2FwaXRhbGl6ZSBmaXJzdCBsZXR0ZXIgb2Ygc2VudGVuY2UsIGFkZCBwZXJpb2QgYXQgZW5kXG4gICAgICAgIHRleHQgPSB0aGlzLmNhcGl0YWxpemUodGV4dCkgKyAnLic7XG5cbiAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuc3lsbGFibGUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIGxlbmd0aCA9IG9wdGlvbnMubGVuZ3RoIHx8IHRoaXMubmF0dXJhbCh7bWluOiAyLCBtYXg6IDN9KSxcbiAgICAgICAgICAgIGNvbnNvbmFudHMgPSAnYmNkZmdoamtsbW5wcnN0dnd6JywgLy8gY29uc29uYW50cyBleGNlcHQgaGFyZCB0byBzcGVhayBvbmVzXG4gICAgICAgICAgICB2b3dlbHMgPSAnYWVpb3UnLCAvLyB2b3dlbHNcbiAgICAgICAgICAgIGFsbCA9IGNvbnNvbmFudHMgKyB2b3dlbHMsIC8vIGFsbFxuICAgICAgICAgICAgdGV4dCA9ICcnLFxuICAgICAgICAgICAgY2hyO1xuXG4gICAgICAgIC8vIEknbSBzdXJlIHRoZXJlJ3MgYSBtb3JlIGVsZWdhbnQgd2F5IHRvIGRvIHRoaXMsIGJ1dCB0aGlzIHdvcmtzXG4gICAgICAgIC8vIGRlY2VudGx5IHdlbGwuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2hhcmFjdGVyIGNhbiBiZSBhbnl0aGluZ1xuICAgICAgICAgICAgICAgIGNociA9IHRoaXMuY2hhcmFjdGVyKHtwb29sOiBhbGx9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc29uYW50cy5pbmRleE9mKGNocikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjaGFyYWN0ZXIgd2FzIGEgdm93ZWwsIG5vdyB3ZSB3YW50IGEgY29uc29uYW50XG4gICAgICAgICAgICAgICAgY2hyID0gdGhpcy5jaGFyYWN0ZXIoe3Bvb2w6IGNvbnNvbmFudHN9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjaGFyYWN0ZXIgd2FzIGEgY29uc29uYW50LCBub3cgd2Ugd2FudCBhIHZvd2VsXG4gICAgICAgICAgICAgICAgY2hyID0gdGhpcy5jaGFyYWN0ZXIoe3Bvb2w6IHZvd2Vsc30pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0ZXh0ICs9IGNocjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0ZXh0O1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLndvcmQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdGVzdFJhbmdlKFxuICAgICAgICAgICAgb3B0aW9ucy5zeWxsYWJsZXMgJiYgb3B0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgICBcIkNoYW5jZTogQ2Fubm90IHNwZWNpZnkgYm90aCBzeWxsYWJsZXMgQU5EIGxlbmd0aC5cIlxuICAgICAgICApO1xuXG4gICAgICAgIHZhciBzeWxsYWJsZXMgPSBvcHRpb25zLnN5bGxhYmxlcyB8fCB0aGlzLm5hdHVyYWwoe21pbjogMSwgbWF4OiAzfSksXG4gICAgICAgICAgICB0ZXh0ID0gJyc7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBFaXRoZXIgYm91bmQgd29yZCBieSBsZW5ndGhcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IHRoaXMuc3lsbGFibGUoKTtcbiAgICAgICAgICAgIH0gd2hpbGUgKHRleHQubGVuZ3RoIDwgb3B0aW9ucy5sZW5ndGgpO1xuICAgICAgICAgICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIG9wdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9yIGJ5IG51bWJlciBvZiBzeWxsYWJsZXNcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3lsbGFibGVzOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IHRoaXMuc3lsbGFibGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGV4dDtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIFRleHQgLS1cblxuICAgIC8vIC0tIFBlcnNvbiAtLVxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5hZ2UgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIHZhciBhZ2VSYW5nZTtcblxuICAgICAgICBzd2l0Y2ggKG9wdGlvbnMudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnY2hpbGQnOlxuICAgICAgICAgICAgICAgIGFnZVJhbmdlID0ge21pbjogMSwgbWF4OiAxMn07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd0ZWVuJzpcbiAgICAgICAgICAgICAgICBhZ2VSYW5nZSA9IHttaW46IDEzLCBtYXg6IDE5fTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FkdWx0JzpcbiAgICAgICAgICAgICAgICBhZ2VSYW5nZSA9IHttaW46IDE4LCBtYXg6IDY1fTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Nlbmlvcic6XG4gICAgICAgICAgICAgICAgYWdlUmFuZ2UgPSB7bWluOiA2NSwgbWF4OiAxMDB9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgICAgICAgICBhZ2VSYW5nZSA9IHttaW46IDEsIG1heDogMTAwfTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYWdlUmFuZ2UgPSB7bWluOiAxOCwgbWF4OiA2NX07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsKGFnZVJhbmdlKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5iaXJ0aGRheSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7XG4gICAgICAgICAgICB5ZWFyOiAobmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIC0gdGhpcy5hZ2Uob3B0aW9ucykpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmRhdGUob3B0aW9ucyk7XG4gICAgfTtcblxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5maXJzdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7Z2VuZGVyOiB0aGlzLmdlbmRlcigpfSk7XG4gICAgICAgIHJldHVybiB0aGlzLnBpY2sodGhpcy5nZXQoXCJmaXJzdE5hbWVzXCIpW29wdGlvbnMuZ2VuZGVyLnRvTG93ZXJDYXNlKCldKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5nZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpY2soWydNYWxlJywgJ0ZlbWFsZSddKTtcbiAgICB9O1xuXG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpY2sodGhpcy5nZXQoXCJsYXN0TmFtZXNcIikpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLm5hbWUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIGZpcnN0ID0gdGhpcy5maXJzdChvcHRpb25zKSxcbiAgICAgICAgICAgIGxhc3QgPSB0aGlzLmxhc3QoKSxcbiAgICAgICAgICAgIG5hbWU7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubWlkZGxlKSB7XG4gICAgICAgICAgICBuYW1lID0gZmlyc3QgKyAnICcgKyB0aGlzLmZpcnN0KG9wdGlvbnMpICsgJyAnICsgbGFzdDtcbiAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLm1pZGRsZV9pbml0aWFsKSB7XG4gICAgICAgICAgICBuYW1lID0gZmlyc3QgKyAnICcgKyB0aGlzLmNoYXJhY3Rlcih7YWxwaGE6IHRydWUsIGNhc2luZzogJ3VwcGVyJ30pICsgJy4gJyArIGxhc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lID0gZmlyc3QgKyAnICcgKyBsYXN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucHJlZml4KSB7XG4gICAgICAgICAgICBuYW1lID0gdGhpcy5wcmVmaXgob3B0aW9ucykgKyAnICcgKyBuYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfTtcblxuICAgIC8vIFJldHVybiB0aGUgbGlzdCBvZiBhdmFpbGFibGUgbmFtZSBwcmVmaXhlcyBiYXNlZCBvbiBzdXBwbGllZCBnZW5kZXIuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5uYW1lX3ByZWZpeGVzID0gZnVuY3Rpb24gKGdlbmRlcikge1xuICAgICAgICBnZW5kZXIgPSBnZW5kZXIgfHwgXCJhbGxcIjtcblxuICAgICAgICB2YXIgcHJlZml4ZXMgPSBbXG4gICAgICAgICAgICB7IG5hbWU6ICdEb2N0b3InLCBhYmJyZXZpYXRpb246ICdEci4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpZiAoZ2VuZGVyID09PSBcIm1hbGVcIiB8fCBnZW5kZXIgPT09IFwiYWxsXCIpIHtcbiAgICAgICAgICAgIHByZWZpeGVzLnB1c2goeyBuYW1lOiAnTWlzdGVyJywgYWJicmV2aWF0aW9uOiAnTXIuJyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChnZW5kZXIgPT09IFwiZmVtYWxlXCIgfHwgZ2VuZGVyID09PSBcImFsbFwiKSB7XG4gICAgICAgICAgICBwcmVmaXhlcy5wdXNoKHsgbmFtZTogJ01pc3MnLCBhYmJyZXZpYXRpb246ICdNaXNzJyB9KTtcbiAgICAgICAgICAgIHByZWZpeGVzLnB1c2goeyBuYW1lOiAnTWlzc2VzJywgYWJicmV2aWF0aW9uOiAnTXJzLicgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJlZml4ZXM7XG4gICAgfTtcblxuICAgIC8vIEFsaWFzIGZvciBuYW1lX3ByZWZpeFxuICAgIENoYW5jZS5wcm90b3R5cGUucHJlZml4ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZV9wcmVmaXgob3B0aW9ucyk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUubmFtZV9wcmVmaXggPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywgeyBnZW5kZXI6IFwiYWxsXCIgfSk7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmZ1bGwgP1xuICAgICAgICAgICAgdGhpcy5waWNrKHRoaXMubmFtZV9wcmVmaXhlcyhvcHRpb25zLmdlbmRlcikpLm5hbWUgOlxuICAgICAgICAgICAgdGhpcy5waWNrKHRoaXMubmFtZV9wcmVmaXhlcyhvcHRpb25zLmdlbmRlcikpLmFiYnJldmlhdGlvbjtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5zc24gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge3NzbkZvdXI6IGZhbHNlLCBkYXNoZXM6IHRydWV9KTtcbiAgICAgICAgdmFyIHNzbl9wb29sID0gXCIxMjM0NTY3ODkwXCIsXG4gICAgICAgICAgICBzc24sXG4gICAgICAgICAgICBkYXNoID0gJyc7XG5cbiAgICAgICAgaWYob3B0aW9ucy5kYXNoZXMpe1xuICAgICAgICAgICAgZGFzaCA9ICctJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFvcHRpb25zLnNzbkZvdXIpIHtcbiAgICAgICAgICAgIHNzbiA9IHRoaXMuc3RyaW5nKHtwb29sOiBzc25fcG9vbCwgbGVuZ3RoOiAzfSkgKyBkYXNoICtcbiAgICAgICAgICAgIHRoaXMuc3RyaW5nKHtwb29sOiBzc25fcG9vbCwgbGVuZ3RoOiAyfSkgKyBkYXNoICtcbiAgICAgICAgICAgIHRoaXMuc3RyaW5nKHtwb29sOiBzc25fcG9vbCwgbGVuZ3RoOiA0fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzc24gPSB0aGlzLnN0cmluZyh7cG9vbDogc3NuX3Bvb2wsIGxlbmd0aDogNH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzc247XG4gICAgfTtcblxuICAgIC8vIC0tIEVuZCBQZXJzb24gLS1cblxuICAgIC8vIC0tIFdlYiAtLVxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5jb2xvciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIGZ1bmN0aW9uIGdyYXkodmFsdWUsIGRlbGltaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIFt2YWx1ZSwgdmFsdWUsIHZhbHVlXS5qb2luKGRlbGltaXRlciB8fCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge2Zvcm1hdDogdGhpcy5waWNrKFsnaGV4JywgJ3Nob3J0aGV4JywgJ3JnYiddKSwgZ3JheXNjYWxlOiBmYWxzZX0pO1xuICAgICAgICB2YXIgaXNHcmF5c2NhbGUgPSBvcHRpb25zLmdyYXlzY2FsZTtcblxuICAgICAgICBpZiAob3B0aW9ucy5mb3JtYXQgPT09ICdoZXgnKSB7XG4gICAgICAgICAgICByZXR1cm4gJyMnICsgKGlzR3JheXNjYWxlID8gZ3JheSh0aGlzLmhhc2goe2xlbmd0aDogMn0pKSA6IHRoaXMuaGFzaCh7bGVuZ3RoOiA2fSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuZm9ybWF0ID09PSAnc2hvcnRoZXgnKSB7XG4gICAgICAgICAgICByZXR1cm4gJyMnICsgKGlzR3JheXNjYWxlID8gZ3JheSh0aGlzLmhhc2goe2xlbmd0aDogMX0pKSA6IHRoaXMuaGFzaCh7bGVuZ3RoOiAzfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuZm9ybWF0ID09PSAncmdiJykge1xuICAgICAgICAgICAgaWYgKGlzR3JheXNjYWxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZ2IoJyArIGdyYXkodGhpcy5uYXR1cmFsKHttYXg6IDI1NX0pLCAnLCcpICsgJyknO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JnYignICsgdGhpcy5uYXR1cmFsKHttYXg6IDI1NX0pICsgJywnICsgdGhpcy5uYXR1cmFsKHttYXg6IDI1NX0pICsgJywnICsgdGhpcy5uYXR1cmFsKHttYXg6IDI1NX0pICsgJyknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZvcm1hdCBwcm92aWRlZC4gUGxlYXNlIHByb3ZpZGUgb25lIG9mIFwiaGV4XCIsIFwic2hvcnRoZXhcIiwgb3IgXCJyZ2JcIicpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmRvbWFpbiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMud29yZCgpICsgJy4nICsgKG9wdGlvbnMudGxkIHx8IHRoaXMudGxkKCkpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmVtYWlsID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy53b3JkKCkgKyAnQCcgKyAob3B0aW9ucy5kb21haW4gfHwgdGhpcy5kb21haW4oKSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZmJpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KCcxMDAwMCcgKyB0aGlzLm5hdHVyYWwoe21heDogMTAwMDAwMDAwMDAwfSksIDEwKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5nb29nbGVfYW5hbHl0aWNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYWNjb3VudCA9IHRoaXMucGFkKHRoaXMubmF0dXJhbCh7bWF4OiA5OTk5OTl9KSwgNik7XG4gICAgICAgIHZhciBwcm9wZXJ0eSA9IHRoaXMucGFkKHRoaXMubmF0dXJhbCh7bWF4OiA5OX0pLCAyKTtcbiAgICAgICAgcmV0dXJuICdVQS0nICsgYWNjb3VudCArICctJyArIHByb3BlcnR5O1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmhhc2h0YWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnIycgKyB0aGlzLndvcmQoKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5pcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gVG9kbzogVGhpcyBjb3VsZCByZXR1cm4gc29tZSByZXNlcnZlZCBJUHMuIFNlZSBodHRwOi8vdnEuaW8vMTM3ZGdZeVxuICAgICAgICAvLyB0aGlzIHNob3VsZCBwcm9iYWJseSBiZSB1cGRhdGVkIHRvIGFjY291bnQgZm9yIHRoYXQgcmFyZSBhcyBpdCBtYXkgYmVcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0dXJhbCh7bWF4OiAyNTV9KSArICcuJyArXG4gICAgICAgICAgICAgICB0aGlzLm5hdHVyYWwoe21heDogMjU1fSkgKyAnLicgK1xuICAgICAgICAgICAgICAgdGhpcy5uYXR1cmFsKHttYXg6IDI1NX0pICsgJy4nICtcbiAgICAgICAgICAgICAgIHRoaXMubmF0dXJhbCh7bWF4OiAyNTV9KTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5pcHY2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXBfYWRkciA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICAgICAgICBpcF9hZGRyLnB1c2godGhpcy5oYXNoKHtsZW5ndGg6IDR9KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlwX2FkZHIuam9pbihcIjpcIik7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUua2xvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hdHVyYWwoe21pbjogMSwgbWF4OiA5OX0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnRsZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbJ2NvbScsICdvcmcnLCAnZWR1JywgJ2dvdicsICdjby51aycsICduZXQnLCAnaW8nXTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS50bGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpY2sodGhpcy50bGRzKCkpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnR3aXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnQCcgKyB0aGlzLndvcmQoKTtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIFdlYiAtLVxuXG4gICAgLy8gLS0gQWRkcmVzcyAtLVxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5hZGRyZXNzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsKHttaW46IDUsIG1heDogMjAwMH0pICsgJyAnICsgdGhpcy5zdHJlZXQob3B0aW9ucyk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuYXJlYWNvZGUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge3BhcmVucyA6IHRydWV9KTtcbiAgICAgICAgLy8gRG9uJ3Qgd2FudCBhcmVhIGNvZGVzIHRvIHN0YXJ0IHdpdGggMSwgb3IgaGF2ZSBhIDkgYXMgdGhlIHNlY29uZCBkaWdpdFxuICAgICAgICB2YXIgYXJlYWNvZGUgPSB0aGlzLm5hdHVyYWwoe21pbjogMiwgbWF4OiA5fSkudG9TdHJpbmcoKSArIHRoaXMubmF0dXJhbCh7bWluOiAwLCBtYXg6IDh9KS50b1N0cmluZygpICsgdGhpcy5uYXR1cmFsKHttaW46IDAsIG1heDogOX0pLnRvU3RyaW5nKCk7XG4gICAgICAgIHJldHVybiBvcHRpb25zLnBhcmVucyA/ICcoJyArIGFyZWFjb2RlICsgJyknIDogYXJlYWNvZGU7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuY2l0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FwaXRhbGl6ZSh0aGlzLndvcmQoe3N5bGxhYmxlczogM30pKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5jb29yZGluYXRlcyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubGF0aXR1ZGUob3B0aW9ucykgKyAnLCAnICsgdGhpcy5sb25naXR1ZGUob3B0aW9ucyk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZ2VvSnNvbiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubGF0aXR1ZGUob3B0aW9ucykgKyAnLCAnICsgdGhpcy5sb25naXR1ZGUob3B0aW9ucykgKyAnLCAnICsgdGhpcy5hbHRpdHVkZShvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5hbHRpdHVkZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7Zml4ZWQgOiA1fSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsb2F0aW5nKHttaW46IDAsIG1heDogMzI3MzYwMDAsIGZpeGVkOiBvcHRpb25zLmZpeGVkfSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZGVwdGggPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge2ZpeGVkOiA1fSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsb2F0aW5nKHttaW46IC0zNTk5NCwgbWF4OiAwLCBmaXhlZDogb3B0aW9ucy5maXhlZH0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmxhdGl0dWRlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtmaXhlZDogNSwgbWluOiAtOTAsIG1heDogOTB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxvYXRpbmcoe21pbjogb3B0aW9ucy5taW4sIG1heDogb3B0aW9ucy5tYXgsIGZpeGVkOiBvcHRpb25zLmZpeGVkfSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUubG9uZ2l0dWRlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtmaXhlZDogNSwgbWluOiAtMTgwLCBtYXg6IDE4MH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5mbG9hdGluZyh7bWluOiBvcHRpb25zLm1pbiwgbWF4OiBvcHRpb25zLm1heCwgZml4ZWQ6IG9wdGlvbnMuZml4ZWR9KTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5waG9uZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7Zm9ybWF0dGVkIDogdHJ1ZX0pO1xuICAgICAgICBpZiAoIW9wdGlvbnMuZm9ybWF0dGVkKSB7XG4gICAgICAgICAgICBvcHRpb25zLnBhcmVucyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmVhY29kZSA9IHRoaXMuYXJlYWNvZGUob3B0aW9ucykudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIGV4Y2hhbmdlID0gdGhpcy5uYXR1cmFsKHttaW46IDIsIG1heDogOX0pLnRvU3RyaW5nKCkgXG4gICAgICAgICAgICArIHRoaXMubmF0dXJhbCh7bWluOiAwLCBtYXg6IDl9KS50b1N0cmluZygpIFxuICAgICAgICAgICAgKyB0aGlzLm5hdHVyYWwoe21pbjogMCwgbWF4OiA5fSkudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHN1YnNjcmliZXIgPSB0aGlzLm5hdHVyYWwoe21pbjogMTAwMCwgbWF4OiA5OTk5fSkudG9TdHJpbmcoKTsgLy8gdGhpcyBjb3VsZCBiZSByYW5kb20gWzAtOV17NH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBvcHRpb25zLmZvcm1hdHRlZCA/IGFyZWFjb2RlICsgJyAnICsgZXhjaGFuZ2UgKyAnLScgKyBzdWJzY3JpYmVyIDogYXJlYWNvZGUgKyBleGNoYW5nZSArIHN1YnNjcmliZXI7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUucG9zdGFsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBQb3N0YWwgRGlzdHJpY3RcbiAgICAgICAgdmFyIHBkID0gdGhpcy5jaGFyYWN0ZXIoe3Bvb2w6IFwiWFZUU1JQTktMTUhKR0VDQkFcIn0pO1xuICAgICAgICAvLyBGb3J3YXJkIFNvcnRhdGlvbiBBcmVhIChGU0EpXG4gICAgICAgIHZhciBmc2EgPSBwZCArIHRoaXMubmF0dXJhbCh7bWF4OiA5fSkgKyB0aGlzLmNoYXJhY3Rlcih7YWxwaGE6IHRydWUsIGNhc2luZzogXCJ1cHBlclwifSk7XG4gICAgICAgIC8vIExvY2FsIERlbGl2ZXJ5IFVudXQgKExEVSlcbiAgICAgICAgdmFyIGxkdSA9IHRoaXMubmF0dXJhbCh7bWF4OiA5fSkgKyB0aGlzLmNoYXJhY3Rlcih7YWxwaGE6IHRydWUsIGNhc2luZzogXCJ1cHBlclwifSkgKyB0aGlzLm5hdHVyYWwoe21heDogOX0pO1xuXG4gICAgICAgIHJldHVybiBmc2EgKyBcIiBcIiArIGxkdTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5wcm92aW5jZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldChcInByb3ZpbmNlc1wiKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5wcm92aW5jZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiAob3B0aW9ucyAmJiBvcHRpb25zLmZ1bGwpID9cbiAgICAgICAgICAgIHRoaXMucGljayh0aGlzLnByb3ZpbmNlcygpKS5uYW1lIDpcbiAgICAgICAgICAgIHRoaXMucGljayh0aGlzLnByb3ZpbmNlcygpKS5hYmJyZXZpYXRpb247XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUucmFkaW8gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAvLyBJbml0aWFsIExldHRlciAoVHlwaWNhbGx5IERlc2lnbmF0ZWQgYnkgU2lkZSBvZiBNaXNzaXNzaXBwaSBSaXZlcilcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtzaWRlIDogXCI/XCJ9KTtcbiAgICAgICAgdmFyIGZsID0gXCJcIjtcbiAgICAgICAgc3dpdGNoIChvcHRpb25zLnNpZGUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICBjYXNlIFwiZWFzdFwiOlxuICAgICAgICBjYXNlIFwiZVwiOlxuICAgICAgICAgICAgZmwgPSBcIldcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwid2VzdFwiOlxuICAgICAgICBjYXNlIFwid1wiOlxuICAgICAgICAgICAgZmwgPSBcIktcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgZmwgPSB0aGlzLmNoYXJhY3Rlcih7cG9vbDogXCJLV1wifSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmbCArIHRoaXMuY2hhcmFjdGVyKHthbHBoYTogdHJ1ZSwgY2FzaW5nOiBcInVwcGVyXCJ9KSArIHRoaXMuY2hhcmFjdGVyKHthbHBoYTogdHJ1ZSwgY2FzaW5nOiBcInVwcGVyXCJ9KSArIHRoaXMuY2hhcmFjdGVyKHthbHBoYTogdHJ1ZSwgY2FzaW5nOiBcInVwcGVyXCJ9KTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiAob3B0aW9ucyAmJiBvcHRpb25zLmZ1bGwpID9cbiAgICAgICAgICAgIHRoaXMucGljayh0aGlzLnN0YXRlcyhvcHRpb25zKSkubmFtZSA6XG4gICAgICAgICAgICB0aGlzLnBpY2sodGhpcy5zdGF0ZXMob3B0aW9ucykpLmFiYnJldmlhdGlvbjtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5zdGF0ZXMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHN0YXRlcyxcbiAgICAgICAgICAgIHVzX3N0YXRlc19hbmRfZGMgPSB0aGlzLmdldChcInVzX3N0YXRlc19hbmRfZGNcIiksXG4gICAgICAgICAgICB0ZXJyaXRvcmllcyA9IHRoaXMuZ2V0KFwidGVycml0b3JpZXNcIiksXG4gICAgICAgICAgICBhcm1lZF9mb3JjZXMgPSB0aGlzLmdldChcImFybWVkX2ZvcmNlc1wiKTtcblxuICAgICAgICBzdGF0ZXMgPSB1c19zdGF0ZXNfYW5kX2RjO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnRlcnJpdG9yaWVzKSB7XG4gICAgICAgICAgICBzdGF0ZXMgPSBzdGF0ZXMuY29uY2F0KHRlcnJpdG9yaWVzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5hcm1lZF9mb3JjZXMpIHtcbiAgICAgICAgICAgIHN0YXRlcyA9IHN0YXRlcy5jb25jYXQoYXJtZWRfZm9yY2VzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdGF0ZXM7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuc3RyZWV0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBzdHJlZXQgPSB0aGlzLndvcmQoe3N5bGxhYmxlczogMn0pO1xuICAgICAgICBzdHJlZXQgPSB0aGlzLmNhcGl0YWxpemUoc3RyZWV0KTtcbiAgICAgICAgc3RyZWV0ICs9ICcgJztcbiAgICAgICAgc3RyZWV0ICs9IG9wdGlvbnMuc2hvcnRfc3VmZml4ID9cbiAgICAgICAgICAgIHRoaXMuc3RyZWV0X3N1ZmZpeCgpLmFiYnJldmlhdGlvbiA6XG4gICAgICAgICAgICB0aGlzLnN0cmVldF9zdWZmaXgoKS5uYW1lO1xuICAgICAgICByZXR1cm4gc3RyZWV0O1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnN0cmVldF9zdWZmaXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpY2sodGhpcy5zdHJlZXRfc3VmZml4ZXMoKSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuc3RyZWV0X3N1ZmZpeGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBUaGVzZSBhcmUgdGhlIG1vc3QgY29tbW9uIHN1ZmZpeGVzLlxuICAgICAgICByZXR1cm4gdGhpcy5nZXQoXCJzdHJlZXRfc3VmZml4ZXNcIik7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUudHYgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gdGhpcy5yYWRpbyhvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy8gTm90ZTogb25seSByZXR1cm5pbmcgVVMgemlwIGNvZGVzLCBpbnRlcm5hdGlvbmFsaXphdGlvbiB3aWxsIGJlIGEgd2hvbGVcbiAgICAvLyBvdGhlciBiZWFzdCB0byB0YWNrbGUgYXQgc29tZSBwb2ludC5cbiAgICBDaGFuY2UucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHZhciB6aXAgPSBcIlwiO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICAgICAgICB6aXAgKz0gdGhpcy5uYXR1cmFsKHttYXg6IDl9KS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5wbHVzZm91ciA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgemlwICs9ICctJztcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgICAgICAgICB6aXAgKz0gdGhpcy5uYXR1cmFsKHttYXg6IDl9KS50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHppcDtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIEFkZHJlc3MgLS1cblxuICAgIC8vIC0tIFRpbWVcblxuICAgIENoYW5jZS5wcm90b3R5cGUuYW1wbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9vbCgpID8gJ2FtJyA6ICdwbSc7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZGF0ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHZhciBtID0gdGhpcy5tb250aCh7cmF3OiB0cnVlfSksXG4gICAgICAgICAgICBkYXRlX3N0cmluZztcblxuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge1xuICAgICAgICAgICAgeWVhcjogcGFyc2VJbnQodGhpcy55ZWFyKCksIDEwKSxcbiAgICAgICAgICAgIC8vIE5lY2Vzc2FyeSB0byBzdWJ0cmFjdCAxIGJlY2F1c2UgRGF0ZSgpIDAtaW5kZXhlcyBtb250aCBidXQgbm90IGRheSBvciB5ZWFyXG4gICAgICAgICAgICAvLyBmb3Igc29tZSByZWFzb24uXG4gICAgICAgICAgICBtb250aDogbS5udW1lcmljIC0gMSxcbiAgICAgICAgICAgIGRheTogdGhpcy5uYXR1cmFsKHttaW46IDEsIG1heDogbS5kYXlzfSksXG4gICAgICAgICAgICBob3VyOiB0aGlzLmhvdXIoKSxcbiAgICAgICAgICAgIG1pbnV0ZTogdGhpcy5taW51dGUoKSxcbiAgICAgICAgICAgIHNlY29uZDogdGhpcy5zZWNvbmQoKSxcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kOiB0aGlzLm1pbGxpc2Vjb25kKCksXG4gICAgICAgICAgICBhbWVyaWNhbjogdHJ1ZSxcbiAgICAgICAgICAgIHN0cmluZzogZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShvcHRpb25zLnllYXIsIG9wdGlvbnMubW9udGgsIG9wdGlvbnMuZGF5LCBvcHRpb25zLmhvdXIsIG9wdGlvbnMubWludXRlLCBvcHRpb25zLnNlY29uZCwgb3B0aW9ucy5taWxsaXNlY29uZCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuYW1lcmljYW4pIHtcbiAgICAgICAgICAgIC8vIEFkZGluZyAxIHRvIHRoZSBtb250aCBpcyBuZWNlc3NhcnkgYmVjYXVzZSBEYXRlKCkgMC1pbmRleGVzXG4gICAgICAgICAgICAvLyBtb250aHMgYnV0IG5vdCBkYXkgZm9yIHNvbWUgb2RkIHJlYXNvbi5cbiAgICAgICAgICAgIGRhdGVfc3RyaW5nID0gKGRhdGUuZ2V0TW9udGgoKSArIDEpICsgJy8nICsgZGF0ZS5nZXREYXRlKCkgKyAnLycgKyBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRlX3N0cmluZyA9IGRhdGUuZ2V0RGF0ZSgpICsgJy8nICsgKGRhdGUuZ2V0TW9udGgoKSArIDEpICsgJy8nICsgZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuc3RyaW5nID8gZGF0ZV9zdHJpbmcgOiBkYXRlO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmhhbW1lcnRpbWUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRlKG9wdGlvbnMpLmdldFRpbWUoKTtcbiAgICB9O1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5ob3VyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICB2YXIgbWF4ID0gb3B0aW9ucy50d2VudHlmb3VyID8gMjQgOiAxMjtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0dXJhbCh7bWluOiAxLCBtYXg6IG1heH0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLm1pbGxpc2Vjb25kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsKHttYXg6IDk5OX0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLm1pbnV0ZSA9IENoYW5jZS5wcm90b3R5cGUuc2Vjb25kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsKHttYXg6IDU5fSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUubW9udGggPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIHZhciBtb250aCA9IHRoaXMucGljayh0aGlzLm1vbnRocygpKTtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucmF3ID8gbW9udGggOiBtb250aC5uYW1lO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLm1vbnRocyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KFwibW9udGhzXCIpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnNlY29uZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0dXJhbCh7bWF4OiA1OX0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLnRpbWVzdGFtcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF0dXJhbCh7bWluOiAxLCBtYXg6IHBhcnNlSW50KG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gMTAwMCwgMTApfSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUueWVhciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIC8vIERlZmF1bHQgdG8gY3VycmVudCB5ZWFyIGFzIG1pbiBpZiBub25lIHNwZWNpZmllZFxuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucywge21pbjogbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpfSk7XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBvbmUgY2VudHVyeSBhZnRlciBjdXJyZW50IHllYXIgYXMgbWF4IGlmIG5vbmUgc3BlY2lmaWVkXG4gICAgICAgIG9wdGlvbnMubWF4ID0gKHR5cGVvZiBvcHRpb25zLm1heCAhPT0gXCJ1bmRlZmluZWRcIikgPyBvcHRpb25zLm1heCA6IG9wdGlvbnMubWluICsgMTAwO1xuXG4gICAgICAgIHJldHVybiB0aGlzLm5hdHVyYWwob3B0aW9ucykudG9TdHJpbmcoKTtcbiAgICB9O1xuXG4gICAgLy8gLS0gRW5kIFRpbWVcblxuICAgIC8vIC0tIEZpbmFuY2UgLS1cblxuICAgIENoYW5jZS5wcm90b3R5cGUuY2MgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gaW5pdE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHR5cGUsIG51bWJlciwgdG9fZ2VuZXJhdGUsIHR5cGVfbmFtZTtcblxuICAgICAgICB0eXBlID0gKG9wdGlvbnMudHlwZSkgP1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNjX3R5cGUoeyBuYW1lOiBvcHRpb25zLnR5cGUsIHJhdzogdHJ1ZSB9KSA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2NfdHlwZSh7IHJhdzogdHJ1ZSB9KTtcbiAgICAgICAgbnVtYmVyID0gdHlwZS5wcmVmaXguc3BsaXQoXCJcIik7XG4gICAgICAgIHRvX2dlbmVyYXRlID0gdHlwZS5sZW5ndGggLSB0eXBlLnByZWZpeC5sZW5ndGggLSAxO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlcyBuIC0gMSBkaWdpdHNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b19nZW5lcmF0ZTsgaSsrKSB7XG4gICAgICAgICAgICBudW1iZXIucHVzaCh0aGlzLmludGVnZXIoe21pbjogMCwgbWF4OiA5fSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2VuZXJhdGVzIHRoZSBsYXN0IGRpZ2l0IGFjY29yZGluZyB0byBMdWhuIGFsZ29yaXRobVxuICAgICAgICBudW1iZXIucHVzaCh0aGlzLmx1aG5fY2FsY3VsYXRlKG51bWJlci5qb2luKFwiXCIpKSk7XG5cbiAgICAgICAgcmV0dXJuIG51bWJlci5qb2luKFwiXCIpO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmNjX3R5cGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0JhbmtfY2FyZF9udW1iZXIjSXNzdWVyX2lkZW50aWZpY2F0aW9uX251bWJlcl8uMjhJSU4uMjlcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KFwiY2NfdHlwZXNcIik7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuY2NfdHlwZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgdmFyIHR5cGVzID0gdGhpcy5jY190eXBlcygpLFxuICAgICAgICAgICAgdHlwZSA9IG51bGw7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIEFjY2VwdCBlaXRoZXIgbmFtZSBvciBzaG9ydF9uYW1lIHRvIHNwZWNpZnkgY2FyZCB0eXBlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVzW2ldLm5hbWUgPT09IG9wdGlvbnMubmFtZSB8fCB0eXBlc1tpXS5zaG9ydF9uYW1lID09PSBvcHRpb25zLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHR5cGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNyZWRpdCBjYXJkIHR5cGUgJ1wiICsgb3B0aW9ucy5uYW1lICsgXCInJyBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHlwZSA9IHRoaXMucGljayh0eXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb3B0aW9ucy5yYXcgPyB0eXBlIDogdHlwZS5uYW1lO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmRvbGxhciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIC8vIEJ5IGRlZmF1bHQsIGEgc29tZXdoYXQgbW9yZSBzYW5lIG1heCBmb3IgZG9sbGFyIHRoYW4gYWxsIGF2YWlsYWJsZSBudW1iZXJzXG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zLCB7bWF4IDogMTAwMDAsIG1pbiA6IDB9KTtcblxuICAgICAgICB2YXIgZG9sbGFyID0gdGhpcy5mbG9hdGluZyh7bWluOiBvcHRpb25zLm1pbiwgbWF4OiBvcHRpb25zLm1heCwgZml4ZWQ6IDJ9KS50b1N0cmluZygpLFxuICAgICAgICAgICAgY2VudHMgPSBkb2xsYXIuc3BsaXQoJy4nKVsxXTtcblxuICAgICAgICBpZiAoY2VudHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZG9sbGFyICs9ICcuMDAnO1xuICAgICAgICB9IGVsc2UgaWYgKGNlbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgIGRvbGxhciA9IGRvbGxhciArICcwJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2xsYXIgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJy0kJyArIGRvbGxhci5yZXBsYWNlKCctJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICckJyArIGRvbGxhcjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmV4cCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgdmFyIGV4cCA9IHt9O1xuXG4gICAgICAgIGV4cC55ZWFyID0gdGhpcy5leHBfeWVhcigpO1xuXG4gICAgICAgIC8vIElmIHRoZSB5ZWFyIGlzIHRoaXMgeWVhciwgbmVlZCB0byBlbnN1cmUgbW9udGggaXMgZ3JlYXRlciB0aGFuIHRoZVxuICAgICAgICAvLyBjdXJyZW50IG1vbnRoIG9yIHRoaXMgZXhwaXJhdGlvbiB3aWxsIG5vdCBiZSB2YWxpZFxuICAgICAgICBpZiAoZXhwLnllYXIgPT09IChuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkpKSB7XG4gICAgICAgICAgICBleHAubW9udGggPSB0aGlzLmV4cF9tb250aCh7ZnV0dXJlOiB0cnVlfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHAubW9udGggPSB0aGlzLmV4cF9tb250aCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucmF3ID8gZXhwIDogZXhwLm1vbnRoICsgJy8nICsgZXhwLnllYXI7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZXhwX21vbnRoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICB2YXIgbW9udGgsIG1vbnRoX2ludDtcblxuICAgICAgICBpZiAob3B0aW9ucy5mdXR1cmUpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBtb250aCA9IHRoaXMubW9udGgoe3JhdzogdHJ1ZX0pLm51bWVyaWM7XG4gICAgICAgICAgICAgICAgbW9udGhfaW50ID0gcGFyc2VJbnQobW9udGgsIDEwKTtcbiAgICAgICAgICAgIH0gd2hpbGUgKG1vbnRoX2ludCA8IG5ldyBEYXRlKCkuZ2V0TW9udGgoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtb250aCA9IHRoaXMubW9udGgoe3JhdzogdHJ1ZX0pLm51bWVyaWM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9udGg7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUuZXhwX3llYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnllYXIoe21heDogbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpICsgMTB9KTtcbiAgICB9O1xuXG4gICAgLy9yZXR1cm4gYWxsIHdvcmxkIGN1cnJlbmN5IGJ5IElTTyA0MjE3XG4gICAgQ2hhbmNlLnByb3RvdHlwZS5jdXJyZW5jeV90eXBlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KFwiY3VycmVuY3lfdHlwZXNcIik7XG4gICAgfTtcblxuXG4gICAgLy9yZXR1cm4gcmFuZG9tIHdvcmxkIGN1cnJlbmN5IGJ5IElTTyA0MjE3XG4gICAgQ2hhbmNlLnByb3RvdHlwZS5jdXJyZW5jeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGljayh0aGlzLmN1cnJlbmN5X3R5cGVzKCkpO1xuICAgIH07XG5cbiAgICAvL1JldHVybiByYW5kb20gY29ycmVjdCBjdXJyZW5jeSBleGNoYW5nZSBwYWlyIChlLmcuIEVVUi9VU0QpIG9yIGFycmF5IG9mIGN1cnJlbmN5IGNvZGVcbiAgICBDaGFuY2UucHJvdG90eXBlLmN1cnJlbmN5X3BhaXIgPSBmdW5jdGlvbiAocmV0dXJuQXNTdHJpbmcpIHtcbiAgICAgICAgdmFyIGN1cnJlbmNpZXMgPSB0aGlzLnVuaXF1ZSh0aGlzLmN1cnJlbmN5LCAyLCB7XG4gICAgICAgICAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihhcnIsIHZhbCkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgdGhlIGZpcnN0IGVsZW1lbnQsIHdlIGtub3cgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIGlmIChhcnIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgYSBtYXRjaCBoYXMgYmVlbiBmb3VuZCwgc2hvcnQgY2lyY3VpdCBjaGVjayBhbmQganVzdCByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5jb2RlID09PSB2YWwuY29kZTtcbiAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXR1cm5Bc1N0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuICBjdXJyZW5jaWVzWzBdICsgJy8nICsgY3VycmVuY2llc1sxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW5jaWVzO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIC0tIEVuZCBGaW5hbmNlXG5cbiAgICAvLyAtLSBNaXNjZWxsYW5lb3VzIC0tXG5cbiAgICAvLyBEaWNlIC0gRm9yIGFsbCB0aGUgYm9hcmQgZ2FtZSBnZWVrcyBvdXQgdGhlcmUsIG15c2VsZiBpbmNsdWRlZCA7KVxuICAgIGZ1bmN0aW9uIGRpY2VGbiAocmFuZ2UpIHtcbiAgICBcdHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgXHRcdHJldHVybiB0aGlzLm5hdHVyYWwocmFuZ2UpO1xuICAgIFx0fTtcbiAgICB9XG4gICAgQ2hhbmNlLnByb3RvdHlwZS5kNCA9IGRpY2VGbih7bWluOiAxLCBtYXg6IDR9KTtcbiAgICBDaGFuY2UucHJvdG90eXBlLmQ2ID0gZGljZUZuKHttaW46IDEsIG1heDogNn0pO1xuICAgIENoYW5jZS5wcm90b3R5cGUuZDggPSBkaWNlRm4oe21pbjogMSwgbWF4OiA4fSk7XG4gICAgQ2hhbmNlLnByb3RvdHlwZS5kMTAgPSBkaWNlRm4oe21pbjogMSwgbWF4OiAxMH0pO1xuICAgIENoYW5jZS5wcm90b3R5cGUuZDEyID0gZGljZUZuKHttaW46IDEsIG1heDogMTJ9KTtcbiAgICBDaGFuY2UucHJvdG90eXBlLmQyMCA9IGRpY2VGbih7bWluOiAxLCBtYXg6IDIwfSk7XG4gICAgQ2hhbmNlLnByb3RvdHlwZS5kMzAgPSBkaWNlRm4oe21pbjogMSwgbWF4OiAzMH0pO1xuICAgIENoYW5jZS5wcm90b3R5cGUuZDEwMCA9IGRpY2VGbih7bWluOiAxLCBtYXg6IDEwMH0pO1xuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5ycGcgPSBmdW5jdGlvbiAodGhyb3duLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbml0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgaWYgKHRocm93biA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSB0eXBlIG9mIGRpZSByb2xsIG11c3QgYmUgaW5jbHVkZWRcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYml0cyA9IHRocm93bi50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiZFwiKSxcbiAgICAgICAgICAgICAgICByb2xscyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAoYml0cy5sZW5ndGggIT09IDIgfHwgIXBhcnNlSW50KGJpdHNbMF0sIDEwKSB8fCAhcGFyc2VJbnQoYml0c1sxXSwgMTApKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBmb3JtYXQgcHJvdmlkZWQuIFBsZWFzZSBwcm92aWRlICNkIyB3aGVyZSB0aGUgZmlyc3QgIyBpcyB0aGUgbnVtYmVyIG9mIGRpY2UgdG8gcm9sbCwgdGhlIHNlY29uZCAjIGlzIHRoZSBtYXggb2YgZWFjaCBkaWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gYml0c1swXTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIHJvbGxzW2kgLSAxXSA9IHRoaXMubmF0dXJhbCh7bWluOiAxLCBtYXg6IGJpdHNbMV19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIG9wdGlvbnMuc3VtICE9PSAndW5kZWZpbmVkJyAmJiBvcHRpb25zLnN1bSkgPyByb2xscy5yZWR1Y2UoZnVuY3Rpb24gKHAsIGMpIHsgcmV0dXJuIHAgKyBjOyB9KSA6IHJvbGxzO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIEd1aWRcbiAgICBDaGFuY2UucHJvdG90eXBlLmd1aWQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7dmVyc2lvbjogNX07XG5cbiAgICAgICAgdmFyIGd1aWRfcG9vbCA9IFwiQUJDREVGMTIzNDU2Nzg5MFwiLFxuICAgICAgICAgICAgdmFyaWFudF9wb29sID0gXCJBQjg5XCIsXG4gICAgICAgICAgICBndWlkID0gdGhpcy5zdHJpbmcoe3Bvb2w6IGd1aWRfcG9vbCwgbGVuZ3RoOiA4fSkgKyAnLScgK1xuICAgICAgICAgICAgICAgICAgIHRoaXMuc3RyaW5nKHtwb29sOiBndWlkX3Bvb2wsIGxlbmd0aDogNH0pICsgJy0nICtcbiAgICAgICAgICAgICAgICAgICAvLyBUaGUgVmVyc2lvblxuICAgICAgICAgICAgICAgICAgIG9wdGlvbnMudmVyc2lvbiArXG4gICAgICAgICAgICAgICAgICAgdGhpcy5zdHJpbmcoe3Bvb2w6IGd1aWRfcG9vbCwgbGVuZ3RoOiAzfSkgKyAnLScgK1xuICAgICAgICAgICAgICAgICAgIC8vIFRoZSBWYXJpYW50XG4gICAgICAgICAgICAgICAgICAgdGhpcy5zdHJpbmcoe3Bvb2w6IHZhcmlhbnRfcG9vbCwgbGVuZ3RoOiAxfSkgK1xuICAgICAgICAgICAgICAgICAgIHRoaXMuc3RyaW5nKHtwb29sOiBndWlkX3Bvb2wsIGxlbmd0aDogM30pICsgJy0nICtcbiAgICAgICAgICAgICAgICAgICB0aGlzLnN0cmluZyh7cG9vbDogZ3VpZF9wb29sLCBsZW5ndGg6IDEyfSk7XG4gICAgICAgIHJldHVybiBndWlkO1xuICAgIH07XG5cbiAgICAvLyBIYXNoXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5oYXNoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IGluaXRPcHRpb25zKG9wdGlvbnMsIHtsZW5ndGggOiA0MCwgY2FzaW5nOiAnbG93ZXInfSk7XG4gICAgICAgIHZhciBwb29sID0gb3B0aW9ucy5jYXNpbmcgPT09ICd1cHBlcicgPyBIRVhfUE9PTC50b1VwcGVyQ2FzZSgpIDogSEVYX1BPT0w7XG4gICAgICAgIHJldHVybiB0aGlzLnN0cmluZyh7cG9vbDogcG9vbCwgbGVuZ3RoOiBvcHRpb25zLmxlbmd0aH0pO1xuICAgIH07XG5cbiAgICBDaGFuY2UucHJvdG90eXBlLmx1aG5fY2hlY2sgPSBmdW5jdGlvbiAobnVtKSB7XG4gICAgICAgIHZhciBzdHIgPSBudW0udG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIGNoZWNrRGlnaXQgPSArc3RyLnN1YnN0cmluZyhzdHIubGVuZ3RoIC0gMSk7XG4gICAgICAgIHJldHVybiBjaGVja0RpZ2l0ID09PSB0aGlzLmx1aG5fY2FsY3VsYXRlKCtzdHIuc3Vic3RyaW5nKDAsIHN0ci5sZW5ndGggLSAxKSk7XG4gICAgfTtcblxuICAgIENoYW5jZS5wcm90b3R5cGUubHVobl9jYWxjdWxhdGUgPSBmdW5jdGlvbiAobnVtKSB7XG4gICAgICAgIHZhciBkaWdpdHMgPSBudW0udG9TdHJpbmcoKS5zcGxpdChcIlwiKS5yZXZlcnNlKCk7XG4gICAgICAgIHZhciBzdW0gPSAwO1xuICAgICAgICB2YXIgZGlnaXQ7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGRpZ2l0cy5sZW5ndGg7IGwgPiBpOyArK2kpIHtcbiAgICAgICAgICAgIGRpZ2l0ID0gK2RpZ2l0c1tpXTtcbiAgICAgICAgICAgIGlmIChpICUgMiA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGRpZ2l0ICo9IDI7XG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0ID4gOSkge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdCAtPSA5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN1bSArPSBkaWdpdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHN1bSAqIDkpICUgMTA7XG4gICAgfTtcblxuXG4gICAgdmFyIGRhdGEgPSB7XG5cbiAgICAgICAgZmlyc3ROYW1lczoge1xuICAgICAgICAgICAgXCJtYWxlXCI6IFtcIkphbWVzXCIsIFwiSm9oblwiLCBcIlJvYmVydFwiLCBcIk1pY2hhZWxcIiwgXCJXaWxsaWFtXCIsIFwiRGF2aWRcIiwgXCJSaWNoYXJkXCIsIFwiSm9zZXBoXCIsIFwiQ2hhcmxlc1wiLCBcIlRob21hc1wiLCBcIkNocmlzdG9waGVyXCIsIFwiRGFuaWVsXCIsIFwiTWF0dGhld1wiLCBcIkdlb3JnZVwiLCBcIkRvbmFsZFwiLCBcIkFudGhvbnlcIiwgXCJQYXVsXCIsIFwiTWFya1wiLCBcIkVkd2FyZFwiLCBcIlN0ZXZlblwiLCBcIktlbm5ldGhcIiwgXCJBbmRyZXdcIiwgXCJCcmlhblwiLCBcIkpvc2h1YVwiLCBcIktldmluXCIsIFwiUm9uYWxkXCIsIFwiVGltb3RoeVwiLCBcIkphc29uXCIsIFwiSmVmZnJleVwiLCBcIkZyYW5rXCIsIFwiR2FyeVwiLCBcIlJ5YW5cIiwgXCJOaWNob2xhc1wiLCBcIkVyaWNcIiwgXCJTdGVwaGVuXCIsIFwiSmFjb2JcIiwgXCJMYXJyeVwiLCBcIkpvbmF0aGFuXCIsIFwiU2NvdHRcIiwgXCJSYXltb25kXCIsIFwiSnVzdGluXCIsIFwiQnJhbmRvblwiLCBcIkdyZWdvcnlcIiwgXCJTYW11ZWxcIiwgXCJCZW5qYW1pblwiLCBcIlBhdHJpY2tcIiwgXCJKYWNrXCIsIFwiSGVucnlcIiwgXCJXYWx0ZXJcIiwgXCJEZW5uaXNcIiwgXCJKZXJyeVwiLCBcIkFsZXhhbmRlclwiLCBcIlBldGVyXCIsIFwiVHlsZXJcIiwgXCJEb3VnbGFzXCIsIFwiSGFyb2xkXCIsIFwiQWFyb25cIiwgXCJKb3NlXCIsIFwiQWRhbVwiLCBcIkFydGh1clwiLCBcIlphY2hhcnlcIiwgXCJDYXJsXCIsIFwiTmF0aGFuXCIsIFwiQWxiZXJ0XCIsIFwiS3lsZVwiLCBcIkxhd3JlbmNlXCIsIFwiSm9lXCIsIFwiV2lsbGllXCIsIFwiR2VyYWxkXCIsIFwiUm9nZXJcIiwgXCJLZWl0aFwiLCBcIkplcmVteVwiLCBcIlRlcnJ5XCIsIFwiSGFycnlcIiwgXCJSYWxwaFwiLCBcIlNlYW5cIiwgXCJKZXNzZVwiLCBcIlJveVwiLCBcIkxvdWlzXCIsIFwiQmlsbHlcIiwgXCJBdXN0aW5cIiwgXCJCcnVjZVwiLCBcIkV1Z2VuZVwiLCBcIkNocmlzdGlhblwiLCBcIkJyeWFuXCIsIFwiV2F5bmVcIiwgXCJSdXNzZWxsXCIsIFwiSG93YXJkXCIsIFwiRnJlZFwiLCBcIkV0aGFuXCIsIFwiSm9yZGFuXCIsIFwiUGhpbGlwXCIsIFwiQWxhblwiLCBcIkp1YW5cIiwgXCJSYW5keVwiLCBcIlZpbmNlbnRcIiwgXCJCb2JieVwiLCBcIkR5bGFuXCIsIFwiSm9obm55XCIsIFwiUGhpbGxpcFwiLCBcIlZpY3RvclwiLCBcIkNsYXJlbmNlXCIsIFwiRXJuZXN0XCIsIFwiTWFydGluXCIsIFwiQ3JhaWdcIiwgXCJTdGFubGV5XCIsIFwiU2hhd25cIiwgXCJUcmF2aXNcIiwgXCJCcmFkbGV5XCIsIFwiTGVvbmFyZFwiLCBcIkVhcmxcIiwgXCJHYWJyaWVsXCIsIFwiSmltbXlcIiwgXCJGcmFuY2lzXCIsIFwiVG9kZFwiLCBcIk5vYWhcIiwgXCJEYW5ueVwiLCBcIkRhbGVcIiwgXCJDb2R5XCIsIFwiQ2FybG9zXCIsIFwiQWxsZW5cIiwgXCJGcmVkZXJpY2tcIiwgXCJMb2dhblwiLCBcIkN1cnRpc1wiLCBcIkFsZXhcIiwgXCJKb2VsXCIsIFwiTHVpc1wiLCBcIk5vcm1hblwiLCBcIk1hcnZpblwiLCBcIkdsZW5uXCIsIFwiVG9ueVwiLCBcIk5hdGhhbmllbFwiLCBcIlJvZG5leVwiLCBcIk1lbHZpblwiLCBcIkFsZnJlZFwiLCBcIlN0ZXZlXCIsIFwiQ2FtZXJvblwiLCBcIkNoYWRcIiwgXCJFZHdpblwiLCBcIkNhbGViXCIsIFwiRXZhblwiLCBcIkFudG9uaW9cIiwgXCJMZWVcIiwgXCJIZXJiZXJ0XCIsIFwiSmVmZmVyeVwiLCBcIklzYWFjXCIsIFwiRGVyZWtcIiwgXCJSaWNreVwiLCBcIk1hcmN1c1wiLCBcIlRoZW9kb3JlXCIsIFwiRWxpamFoXCIsIFwiTHVrZVwiLCBcIkplc3VzXCIsIFwiRWRkaWVcIiwgXCJUcm95XCIsIFwiTWlrZVwiLCBcIkR1c3RpblwiLCBcIlJheVwiLCBcIkFkcmlhblwiLCBcIkJlcm5hcmRcIiwgXCJMZXJveVwiLCBcIkFuZ2VsXCIsIFwiUmFuZGFsbFwiLCBcIldlc2xleVwiLCBcIklhblwiLCBcIkphcmVkXCIsIFwiTWFzb25cIiwgXCJIdW50ZXJcIiwgXCJDYWx2aW5cIiwgXCJPc2NhclwiLCBcIkNsaWZmb3JkXCIsIFwiSmF5XCIsIFwiU2hhbmVcIiwgXCJSb25uaWVcIiwgXCJCYXJyeVwiLCBcIkx1Y2FzXCIsIFwiQ29yZXlcIiwgXCJNYW51ZWxcIiwgXCJMZW9cIiwgXCJUb21teVwiLCBcIldhcnJlblwiLCBcIkphY2tzb25cIiwgXCJJc2FpYWhcIiwgXCJDb25ub3JcIiwgXCJEb25cIiwgXCJEZWFuXCIsIFwiSm9uXCIsIFwiSnVsaWFuXCIsIFwiTWlndWVsXCIsIFwiQmlsbFwiLCBcIkxsb3lkXCIsIFwiQ2hhcmxpZVwiLCBcIk1pdGNoZWxsXCIsIFwiTGVvblwiLCBcIkplcm9tZVwiLCBcIkRhcnJlbGxcIiwgXCJKZXJlbWlhaFwiLCBcIkFsdmluXCIsIFwiQnJldHRcIiwgXCJTZXRoXCIsIFwiRmxveWRcIiwgXCJKaW1cIiwgXCJCbGFrZVwiLCBcIk1pY2hlYWxcIiwgXCJHb3Jkb25cIiwgXCJUcmV2b3JcIiwgXCJMZXdpc1wiLCBcIkVyaWtcIiwgXCJFZGdhclwiLCBcIlZlcm5vblwiLCBcIkRldmluXCIsIFwiR2F2aW5cIiwgXCJKYXlkZW5cIiwgXCJDaHJpc1wiLCBcIkNseWRlXCIsIFwiVG9tXCIsIFwiRGVycmlja1wiLCBcIk1hcmlvXCIsIFwiQnJlbnRcIiwgXCJNYXJjXCIsIFwiSGVybWFuXCIsIFwiQ2hhc2VcIiwgXCJEb21pbmljXCIsIFwiUmljYXJkb1wiLCBcIkZyYW5rbGluXCIsIFwiTWF1cmljZVwiLCBcIk1heFwiLCBcIkFpZGVuXCIsIFwiT3dlblwiLCBcIkxlc3RlclwiLCBcIkdpbGJlcnRcIiwgXCJFbG1lclwiLCBcIkdlbmVcIiwgXCJGcmFuY2lzY29cIiwgXCJHbGVuXCIsIFwiQ29yeVwiLCBcIkdhcnJldHRcIiwgXCJDbGF5dG9uXCIsIFwiU2FtXCIsIFwiSm9yZ2VcIiwgXCJDaGVzdGVyXCIsIFwiQWxlamFuZHJvXCIsIFwiSmVmZlwiLCBcIkhhcnZleVwiLCBcIk1pbHRvblwiLCBcIkNvbGVcIiwgXCJJdmFuXCIsIFwiQW5kcmVcIiwgXCJEdWFuZVwiLCBcIkxhbmRvblwiXSxcbiAgICAgICAgICAgIFwiZmVtYWxlXCI6IFtcIk1hcnlcIiwgXCJFbW1hXCIsIFwiRWxpemFiZXRoXCIsIFwiTWlubmllXCIsIFwiTWFyZ2FyZXRcIiwgXCJJZGFcIiwgXCJBbGljZVwiLCBcIkJlcnRoYVwiLCBcIlNhcmFoXCIsIFwiQW5uaWVcIiwgXCJDbGFyYVwiLCBcIkVsbGFcIiwgXCJGbG9yZW5jZVwiLCBcIkNvcmFcIiwgXCJNYXJ0aGFcIiwgXCJMYXVyYVwiLCBcIk5lbGxpZVwiLCBcIkdyYWNlXCIsIFwiQ2FycmllXCIsIFwiTWF1ZGVcIiwgXCJNYWJlbFwiLCBcIkJlc3NpZVwiLCBcIkplbm5pZVwiLCBcIkdlcnRydWRlXCIsIFwiSnVsaWFcIiwgXCJIYXR0aWVcIiwgXCJFZGl0aFwiLCBcIk1hdHRpZVwiLCBcIlJvc2VcIiwgXCJDYXRoZXJpbmVcIiwgXCJMaWxsaWFuXCIsIFwiQWRhXCIsIFwiTGlsbGllXCIsIFwiSGVsZW5cIiwgXCJKZXNzaWVcIiwgXCJMb3Vpc2VcIiwgXCJFdGhlbFwiLCBcIkx1bGFcIiwgXCJNeXJ0bGVcIiwgXCJFdmFcIiwgXCJGcmFuY2VzXCIsIFwiTGVuYVwiLCBcIkx1Y3lcIiwgXCJFZG5hXCIsIFwiTWFnZ2llXCIsIFwiUGVhcmxcIiwgXCJEYWlzeVwiLCBcIkZhbm5pZVwiLCBcIkpvc2VwaGluZVwiLCBcIkRvcmFcIiwgXCJSb3NhXCIsIFwiS2F0aGVyaW5lXCIsIFwiQWduZXNcIiwgXCJNYXJpZVwiLCBcIk5vcmFcIiwgXCJNYXlcIiwgXCJNYW1pZVwiLCBcIkJsYW5jaGVcIiwgXCJTdGVsbGFcIiwgXCJFbGxlblwiLCBcIk5hbmN5XCIsIFwiRWZmaWVcIiwgXCJTYWxsaWVcIiwgXCJOZXR0aWVcIiwgXCJEZWxsYVwiLCBcIkxpenppZVwiLCBcIkZsb3JhXCIsIFwiU3VzaWVcIiwgXCJNYXVkXCIsIFwiTWFlXCIsIFwiRXR0YVwiLCBcIkhhcnJpZXRcIiwgXCJTYWRpZVwiLCBcIkNhcm9saW5lXCIsIFwiS2F0aWVcIiwgXCJMeWRpYVwiLCBcIkVsc2llXCIsIFwiS2F0ZVwiLCBcIlN1c2FuXCIsIFwiTW9sbGllXCIsIFwiQWxtYVwiLCBcIkFkZGllXCIsIFwiR2VvcmdpYVwiLCBcIkVsaXphXCIsIFwiTHVsdVwiLCBcIk5hbm5pZVwiLCBcIkxvdHRpZVwiLCBcIkFtYW5kYVwiLCBcIkJlbGxlXCIsIFwiQ2hhcmxvdHRlXCIsIFwiUmViZWNjYVwiLCBcIlJ1dGhcIiwgXCJWaW9sYVwiLCBcIk9saXZlXCIsIFwiQW1lbGlhXCIsIFwiSGFubmFoXCIsIFwiSmFuZVwiLCBcIlZpcmdpbmlhXCIsIFwiRW1pbHlcIiwgXCJNYXRpbGRhXCIsIFwiSXJlbmVcIiwgXCJLYXRocnluXCIsIFwiRXN0aGVyXCIsIFwiV2lsbGllXCIsIFwiSGVucmlldHRhXCIsIFwiT2xsaWVcIiwgXCJBbXlcIiwgXCJSYWNoZWxcIiwgXCJTYXJhXCIsIFwiRXN0ZWxsYVwiLCBcIlRoZXJlc2FcIiwgXCJBdWd1c3RhXCIsIFwiT3JhXCIsIFwiUGF1bGluZVwiLCBcIkpvc2llXCIsIFwiTG9sYVwiLCBcIlNvcGhpYVwiLCBcIkxlb25hXCIsIFwiQW5uZVwiLCBcIk1pbGRyZWRcIiwgXCJBbm5cIiwgXCJCZXVsYWhcIiwgXCJDYWxsaWVcIiwgXCJMb3VcIiwgXCJEZWxpYVwiLCBcIkVsZWFub3JcIiwgXCJCYXJiYXJhXCIsIFwiSXZhXCIsIFwiTG91aXNhXCIsIFwiTWFyaWFcIiwgXCJNYXltZVwiLCBcIkV2ZWx5blwiLCBcIkVzdGVsbGVcIiwgXCJOaW5hXCIsIFwiQmV0dHlcIiwgXCJNYXJpb25cIiwgXCJCZXR0aWVcIiwgXCJEb3JvdGh5XCIsIFwiTHVlbGxhXCIsIFwiSW5lelwiLCBcIkxlbGFcIiwgXCJSb3NpZVwiLCBcIkFsbGllXCIsIFwiTWlsbGllXCIsIFwiSmFuaWVcIiwgXCJDb3JuZWxpYVwiLCBcIlZpY3RvcmlhXCIsIFwiUnVieVwiLCBcIldpbmlmcmVkXCIsIFwiQWx0YVwiLCBcIkNlbGlhXCIsIFwiQ2hyaXN0aW5lXCIsIFwiQmVhdHJpY2VcIiwgXCJCaXJkaWVcIiwgXCJIYXJyaWV0dFwiLCBcIk1hYmxlXCIsIFwiTXlyYVwiLCBcIlNvcGhpZVwiLCBcIlRpbGxpZVwiLCBcIklzYWJlbFwiLCBcIlN5bHZpYVwiLCBcIkNhcm9seW5cIiwgXCJJc2FiZWxsZVwiLCBcIkxlaWxhXCIsIFwiU2FsbHlcIiwgXCJJbmFcIiwgXCJFc3NpZVwiLCBcIkJlcnRpZVwiLCBcIk5lbGxcIiwgXCJBbGJlcnRhXCIsIFwiS2F0aGFyaW5lXCIsIFwiTG9yYVwiLCBcIlJlbmFcIiwgXCJNaW5hXCIsIFwiUmhvZGFcIiwgXCJNYXRoaWxkYVwiLCBcIkFiYmllXCIsIFwiRXVsYVwiLCBcIkRvbGxpZVwiLCBcIkhldHRpZVwiLCBcIkV1bmljZVwiLCBcIkZhbm55XCIsIFwiT2xhXCIsIFwiTGVub3JhXCIsIFwiQWRlbGFpZGVcIiwgXCJDaHJpc3RpbmFcIiwgXCJMZWxpYVwiLCBcIk5lbGxlXCIsIFwiU3VlXCIsIFwiSm9oYW5uYVwiLCBcIkxpbGx5XCIsIFwiTHVjaW5kYVwiLCBcIk1pbmVydmFcIiwgXCJMZXR0aWVcIiwgXCJSb3hpZVwiLCBcIkN5bnRoaWFcIiwgXCJIZWxlbmFcIiwgXCJIaWxkYVwiLCBcIkh1bGRhXCIsIFwiQmVybmljZVwiLCBcIkdlbmV2aWV2ZVwiLCBcIkplYW5cIiwgXCJDb3JkZWxpYVwiLCBcIk1hcmlhblwiLCBcIkZyYW5jaXNcIiwgXCJKZWFuZXR0ZVwiLCBcIkFkZWxpbmVcIiwgXCJHdXNzaWVcIiwgXCJMZWFoXCIsIFwiTG9pc1wiLCBcIkx1cmFcIiwgXCJNaXR0aWVcIiwgXCJIYWxsaWVcIiwgXCJJc2FiZWxsYVwiLCBcIk9sZ2FcIiwgXCJQaG9lYmVcIiwgXCJUZXJlc2FcIiwgXCJIZXN0ZXJcIiwgXCJMaWRhXCIsIFwiTGluYVwiLCBcIldpbm5pZVwiLCBcIkNsYXVkaWFcIiwgXCJNYXJndWVyaXRlXCIsIFwiVmVyYVwiLCBcIkNlY2VsaWFcIiwgXCJCZXNzXCIsIFwiRW1pbGllXCIsIFwiSm9oblwiLCBcIlJvc2V0dGFcIiwgXCJWZXJuYVwiLCBcIk15cnRpZVwiLCBcIkNlY2lsaWFcIiwgXCJFbHZhXCIsIFwiT2xpdmlhXCIsIFwiT3BoZWxpYVwiLCBcIkdlb3JnaWVcIiwgXCJFbG5vcmFcIiwgXCJWaW9sZXRcIiwgXCJBZGVsZVwiLCBcIkxpbHlcIiwgXCJMaW5uaWVcIiwgXCJMb3JldHRhXCIsIFwiTWFkZ2VcIiwgXCJQb2xseVwiLCBcIlZpcmdpZVwiLCBcIkV1Z2VuaWFcIiwgXCJMdWNpbGVcIiwgXCJMdWNpbGxlXCIsIFwiTWFiZWxsZVwiLCBcIlJvc2FsaWVcIl1cbiAgICAgICAgfSxcblxuICAgICAgICBsYXN0TmFtZXM6IFsnU21pdGgnLCAnSm9obnNvbicsICdXaWxsaWFtcycsICdKb25lcycsICdCcm93bicsICdEYXZpcycsICdNaWxsZXInLCAnV2lsc29uJywgJ01vb3JlJywgJ1RheWxvcicsICdBbmRlcnNvbicsICdUaG9tYXMnLCAnSmFja3NvbicsICdXaGl0ZScsICdIYXJyaXMnLCAnTWFydGluJywgJ1Rob21wc29uJywgJ0dhcmNpYScsICdNYXJ0aW5leicsICdSb2JpbnNvbicsICdDbGFyaycsICdSb2RyaWd1ZXonLCAnTGV3aXMnLCAnTGVlJywgJ1dhbGtlcicsICdIYWxsJywgJ0FsbGVuJywgJ1lvdW5nJywgJ0hlcm5hbmRleicsICdLaW5nJywgJ1dyaWdodCcsICdMb3BleicsICdIaWxsJywgJ1Njb3R0JywgJ0dyZWVuJywgJ0FkYW1zJywgJ0Jha2VyJywgJ0dvbnphbGV6JywgJ05lbHNvbicsICdDYXJ0ZXInLCAnTWl0Y2hlbGwnLCAnUGVyZXonLCAnUm9iZXJ0cycsICdUdXJuZXInLCAnUGhpbGxpcHMnLCAnQ2FtcGJlbGwnLCAnUGFya2VyJywgJ0V2YW5zJywgJ0Vkd2FyZHMnLCAnQ29sbGlucycsICdTdGV3YXJ0JywgJ1NhbmNoZXonLCAnTW9ycmlzJywgJ1JvZ2VycycsICdSZWVkJywgJ0Nvb2snLCAnTW9yZ2FuJywgJ0JlbGwnLCAnTXVycGh5JywgJ0JhaWxleScsICdSaXZlcmEnLCAnQ29vcGVyJywgJ1JpY2hhcmRzb24nLCAnQ294JywgJ0hvd2FyZCcsICdXYXJkJywgJ1RvcnJlcycsICdQZXRlcnNvbicsICdHcmF5JywgJ1JhbWlyZXonLCAnSmFtZXMnLCAnV2F0c29uJywgJ0Jyb29rcycsICdLZWxseScsICdTYW5kZXJzJywgJ1ByaWNlJywgJ0Jlbm5ldHQnLCAnV29vZCcsICdCYXJuZXMnLCAnUm9zcycsICdIZW5kZXJzb24nLCAnQ29sZW1hbicsICdKZW5raW5zJywgJ1BlcnJ5JywgJ1Bvd2VsbCcsICdMb25nJywgJ1BhdHRlcnNvbicsICdIdWdoZXMnLCAnRmxvcmVzJywgJ1dhc2hpbmd0b24nLCAnQnV0bGVyJywgJ1NpbW1vbnMnLCAnRm9zdGVyJywgJ0dvbnphbGVzJywgJ0JyeWFudCcsICdBbGV4YW5kZXInLCAnUnVzc2VsbCcsICdHcmlmZmluJywgJ0RpYXonLCAnSGF5ZXMnLCAnTXllcnMnLCAnRm9yZCcsICdIYW1pbHRvbicsICdHcmFoYW0nLCAnU3VsbGl2YW4nLCAnV2FsbGFjZScsICdXb29kcycsICdDb2xlJywgJ1dlc3QnLCAnSm9yZGFuJywgJ093ZW5zJywgJ1JleW5vbGRzJywgJ0Zpc2hlcicsICdFbGxpcycsICdIYXJyaXNvbicsICdHaWJzb24nLCAnTWNEb25hbGQnLCAnQ3J1eicsICdNYXJzaGFsbCcsICdPcnRpeicsICdHb21leicsICdNdXJyYXknLCAnRnJlZW1hbicsICdXZWxscycsICdXZWJiJywgJ1NpbXBzb24nLCAnU3RldmVucycsICdUdWNrZXInLCAnUG9ydGVyJywgJ0h1bnRlcicsICdIaWNrcycsICdDcmF3Zm9yZCcsICdIZW5yeScsICdCb3lkJywgJ01hc29uJywgJ01vcmFsZXMnLCAnS2VubmVkeScsICdXYXJyZW4nLCAnRGl4b24nLCAnUmFtb3MnLCAnUmV5ZXMnLCAnQnVybnMnLCAnR29yZG9uJywgJ1NoYXcnLCAnSG9sbWVzJywgJ1JpY2UnLCAnUm9iZXJ0c29uJywgJ0h1bnQnLCAnQmxhY2snLCAnRGFuaWVscycsICdQYWxtZXInLCAnTWlsbHMnLCAnTmljaG9scycsICdHcmFudCcsICdLbmlnaHQnLCAnRmVyZ3Vzb24nLCAnUm9zZScsICdTdG9uZScsICdIYXdraW5zJywgJ0R1bm4nLCAnUGVya2lucycsICdIdWRzb24nLCAnU3BlbmNlcicsICdHYXJkbmVyJywgJ1N0ZXBoZW5zJywgJ1BheW5lJywgJ1BpZXJjZScsICdCZXJyeScsICdNYXR0aGV3cycsICdBcm5vbGQnLCAnV2FnbmVyJywgJ1dpbGxpcycsICdSYXknLCAnV2F0a2lucycsICdPbHNvbicsICdDYXJyb2xsJywgJ0R1bmNhbicsICdTbnlkZXInLCAnSGFydCcsICdDdW5uaW5naGFtJywgJ0JyYWRsZXknLCAnTGFuZScsICdBbmRyZXdzJywgJ1J1aXonLCAnSGFycGVyJywgJ0ZveCcsICdSaWxleScsICdBcm1zdHJvbmcnLCAnQ2FycGVudGVyJywgJ1dlYXZlcicsICdHcmVlbmUnLCAnTGF3cmVuY2UnLCAnRWxsaW90dCcsICdDaGF2ZXonLCAnU2ltcycsICdBdXN0aW4nLCAnUGV0ZXJzJywgJ0tlbGxleScsICdGcmFua2xpbicsICdMYXdzb24nLCAnRmllbGRzJywgJ0d1dGllcnJleicsICdSeWFuJywgJ1NjaG1pZHQnLCAnQ2FycicsICdWYXNxdWV6JywgJ0Nhc3RpbGxvJywgJ1doZWVsZXInLCAnQ2hhcG1hbicsICdPbGl2ZXInLCAnTW9udGdvbWVyeScsICdSaWNoYXJkcycsICdXaWxsaWFtc29uJywgJ0pvaG5zdG9uJywgJ0JhbmtzJywgJ01leWVyJywgJ0Jpc2hvcCcsICdNY0NveScsICdIb3dlbGwnLCAnQWx2YXJleicsICdNb3JyaXNvbicsICdIYW5zZW4nLCAnRmVybmFuZGV6JywgJ0dhcnphJywgJ0hhcnZleScsICdMaXR0bGUnLCAnQnVydG9uJywgJ1N0YW5sZXknLCAnTmd1eWVuJywgJ0dlb3JnZScsICdKYWNvYnMnLCAnUmVpZCcsICdLaW0nLCAnRnVsbGVyJywgJ0x5bmNoJywgJ0RlYW4nLCAnR2lsYmVydCcsICdHYXJyZXR0JywgJ1JvbWVybycsICdXZWxjaCcsICdMYXJzb24nLCAnRnJhemllcicsICdCdXJrZScsICdIYW5zb24nLCAnRGF5JywgJ01lbmRvemEnLCAnTW9yZW5vJywgJ0Jvd21hbicsICdNZWRpbmEnLCAnRm93bGVyJywgJ0JyZXdlcicsICdIb2ZmbWFuJywgJ0Nhcmxzb24nLCAnU2lsdmEnLCAnUGVhcnNvbicsICdIb2xsYW5kJywgJ0RvdWdsYXMnLCAnRmxlbWluZycsICdKZW5zZW4nLCAnVmFyZ2FzJywgJ0J5cmQnLCAnRGF2aWRzb24nLCAnSG9wa2lucycsICdNYXknLCAnVGVycnknLCAnSGVycmVyYScsICdXYWRlJywgJ1NvdG8nLCAnV2FsdGVycycsICdDdXJ0aXMnLCAnTmVhbCcsICdDYWxkd2VsbCcsICdMb3dlJywgJ0plbm5pbmdzJywgJ0Jhcm5ldHQnLCAnR3JhdmVzJywgJ0ppbWVuZXonLCAnSG9ydG9uJywgJ1NoZWx0b24nLCAnQmFycmV0dCcsICdPYnJpZW4nLCAnQ2FzdHJvJywgJ1N1dHRvbicsICdHcmVnb3J5JywgJ01jS2lubmV5JywgJ0x1Y2FzJywgJ01pbGVzJywgJ0NyYWlnJywgJ1JvZHJpcXVleicsICdDaGFtYmVycycsICdIb2x0JywgJ0xhbWJlcnQnLCAnRmxldGNoZXInLCAnV2F0dHMnLCAnQmF0ZXMnLCAnSGFsZScsICdSaG9kZXMnLCAnUGVuYScsICdCZWNrJywgJ05ld21hbicsICdIYXluZXMnLCAnTWNEYW5pZWwnLCAnTWVuZGV6JywgJ0J1c2gnLCAnVmF1Z2huJywgJ1BhcmtzJywgJ0Rhd3NvbicsICdTYW50aWFnbycsICdOb3JyaXMnLCAnSGFyZHknLCAnTG92ZScsICdTdGVlbGUnLCAnQ3VycnknLCAnUG93ZXJzJywgJ1NjaHVsdHonLCAnQmFya2VyJywgJ0d1em1hbicsICdQYWdlJywgJ011bm96JywgJ0JhbGwnLCAnS2VsbGVyJywgJ0NoYW5kbGVyJywgJ1dlYmVyJywgJ0xlb25hcmQnLCAnV2Fsc2gnLCAnTHlvbnMnLCAnUmFtc2V5JywgJ1dvbGZlJywgJ1NjaG5laWRlcicsICdNdWxsaW5zJywgJ0JlbnNvbicsICdTaGFycCcsICdCb3dlbicsICdEYW5pZWwnLCAnQmFyYmVyJywgJ0N1bW1pbmdzJywgJ0hpbmVzJywgJ0JhbGR3aW4nLCAnR3JpZmZpdGgnLCAnVmFsZGV6JywgJ0h1YmJhcmQnLCAnU2FsYXphcicsICdSZWV2ZXMnLCAnV2FybmVyJywgJ1N0ZXZlbnNvbicsICdCdXJnZXNzJywgJ1NhbnRvcycsICdUYXRlJywgJ0Nyb3NzJywgJ0dhcm5lcicsICdNYW5uJywgJ01hY2snLCAnTW9zcycsICdUaG9ybnRvbicsICdEZW5uaXMnLCAnTWNHZWUnLCAnRmFybWVyJywgJ0RlbGdhZG8nLCAnQWd1aWxhcicsICdWZWdhJywgJ0dsb3ZlcicsICdNYW5uaW5nJywgJ0NvaGVuJywgJ0hhcm1vbicsICdSb2RnZXJzJywgJ1JvYmJpbnMnLCAnTmV3dG9uJywgJ1RvZGQnLCAnQmxhaXInLCAnSGlnZ2lucycsICdJbmdyYW0nLCAnUmVlc2UnLCAnQ2Fubm9uJywgJ1N0cmlja2xhbmQnLCAnVG93bnNlbmQnLCAnUG90dGVyJywgJ0dvb2R3aW4nLCAnV2FsdG9uJywgJ1Jvd2UnLCAnSGFtcHRvbicsICdPcnRlZ2EnLCAnUGF0dG9uJywgJ1N3YW5zb24nLCAnSm9zZXBoJywgJ0ZyYW5jaXMnLCAnR29vZG1hbicsICdNYWxkb25hZG8nLCAnWWF0ZXMnLCAnQmVja2VyJywgJ0VyaWNrc29uJywgJ0hvZGdlcycsICdSaW9zJywgJ0Nvbm5lcicsICdBZGtpbnMnLCAnV2Vic3RlcicsICdOb3JtYW4nLCAnTWFsb25lJywgJ0hhbW1vbmQnLCAnRmxvd2VycycsICdDb2JiJywgJ01vb2R5JywgJ1F1aW5uJywgJ0JsYWtlJywgJ01heHdlbGwnLCAnUG9wZScsICdGbG95ZCcsICdPc2Jvcm5lJywgJ1BhdWwnLCAnTWNDYXJ0aHknLCAnR3VlcnJlcm8nLCAnTGluZHNleScsICdFc3RyYWRhJywgJ1NhbmRvdmFsJywgJ0dpYmJzJywgJ1R5bGVyJywgJ0dyb3NzJywgJ0ZpdHpnZXJhbGQnLCAnU3Rva2VzJywgJ0RveWxlJywgJ1NoZXJtYW4nLCAnU2F1bmRlcnMnLCAnV2lzZScsICdDb2xvbicsICdHaWxsJywgJ0FsdmFyYWRvJywgJ0dyZWVyJywgJ1BhZGlsbGEnLCAnU2ltb24nLCAnV2F0ZXJzJywgJ051bmV6JywgJ0JhbGxhcmQnLCAnU2Nod2FydHonLCAnTWNCcmlkZScsICdIb3VzdG9uJywgJ0NocmlzdGVuc2VuJywgJ0tsZWluJywgJ1ByYXR0JywgJ0JyaWdncycsICdQYXJzb25zJywgJ01jTGF1Z2hsaW4nLCAnWmltbWVybWFuJywgJ0ZyZW5jaCcsICdCdWNoYW5hbicsICdNb3JhbicsICdDb3BlbGFuZCcsICdSb3knLCAnUGl0dG1hbicsICdCcmFkeScsICdNY0Nvcm1pY2snLCAnSG9sbG93YXknLCAnQnJvY2snLCAnUG9vbGUnLCAnRnJhbmsnLCAnTG9nYW4nLCAnT3dlbicsICdCYXNzJywgJ01hcnNoJywgJ0RyYWtlJywgJ1dvbmcnLCAnSmVmZmVyc29uJywgJ1BhcmsnLCAnTW9ydG9uJywgJ0FiYm90dCcsICdTcGFya3MnLCAnUGF0cmljaycsICdOb3J0b24nLCAnSHVmZicsICdDbGF5dG9uJywgJ01hc3NleScsICdMbG95ZCcsICdGaWd1ZXJvYScsICdDYXJzb24nLCAnQm93ZXJzJywgJ1JvYmVyc29uJywgJ0JhcnRvbicsICdUcmFuJywgJ0xhbWInLCAnSGFycmluZ3RvbicsICdDYXNleScsICdCb29uZScsICdDb3J0ZXonLCAnQ2xhcmtlJywgJ01hdGhpcycsICdTaW5nbGV0b24nLCAnV2lsa2lucycsICdDYWluJywgJ0JyeWFuJywgJ1VuZGVyd29vZCcsICdIb2dhbicsICdNY0tlbnppZScsICdDb2xsaWVyJywgJ0x1bmEnLCAnUGhlbHBzJywgJ01jR3VpcmUnLCAnQWxsaXNvbicsICdCcmlkZ2VzJywgJ1dpbGtlcnNvbicsICdOYXNoJywgJ1N1bW1lcnMnLCAnQXRraW5zJ10sXG5cbiAgICAgICAgcHJvdmluY2VzOiBbXG4gICAgICAgICAgICB7bmFtZTogJ0FsYmVydGEnLCBhYmJyZXZpYXRpb246ICdBQid9LFxuICAgICAgICAgICAge25hbWU6ICdCcml0aXNoIENvbHVtYmlhJywgYWJicmV2aWF0aW9uOiAnQkMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTWFuaXRvYmEnLCBhYmJyZXZpYXRpb246ICdNQid9LFxuICAgICAgICAgICAge25hbWU6ICdOZXcgQnJ1bnN3aWNrJywgYWJicmV2aWF0aW9uOiAnTkInfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTmV3Zm91bmRsYW5kIGFuZCBMYWJyYWRvcicsIGFiYnJldmlhdGlvbjogJ05MJ30sXG4gICAgICAgICAgICB7bmFtZTogJ05vdmEgU2NvdGlhJywgYWJicmV2aWF0aW9uOiAnTlMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnT250YXJpbycsIGFiYnJldmlhdGlvbjogJ09OJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1ByaW5jZSBFZHdhcmQgSXNsYW5kJywgYWJicmV2aWF0aW9uOiAnUEUnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnUXVlYmVjJywgYWJicmV2aWF0aW9uOiAnUUMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnU2Fza2F0Y2hld2FuJywgYWJicmV2aWF0aW9uOiAnU0snfSxcblxuICAgICAgICAgICAgLy8gVGhlIGNhc2UgY291bGQgYmUgbWFkZSB0aGF0IHRoZSBmb2xsb3dpbmcgYXJlIG5vdCBhY3R1YWxseSBwcm92aW5jZXNcbiAgICAgICAgICAgIC8vIHNpbmNlIHRoZXkgYXJlIHRlY2huaWNhbGx5IGNvbnNpZGVyZWQgXCJ0ZXJyaXRvcmllc1wiIGhvd2V2ZXIgdGhleSBhbGxcbiAgICAgICAgICAgIC8vIGxvb2sgdGhlIHNhbWUgb24gYW4gZW52ZWxvcGUhXG4gICAgICAgICAgICB7bmFtZTogJ05vcnRod2VzdCBUZXJyaXRvcmllcycsIGFiYnJldmlhdGlvbjogJ05UJ30sXG4gICAgICAgICAgICB7bmFtZTogJ051bmF2dXQnLCBhYmJyZXZpYXRpb246ICdOVSd9LFxuICAgICAgICAgICAge25hbWU6ICdZdWtvbicsIGFiYnJldmlhdGlvbjogJ1lUJ31cbiAgICAgICAgXSxcblxuICAgICAgICB1c19zdGF0ZXNfYW5kX2RjOiBbXG4gICAgICAgICAgICB7bmFtZTogJ0FsYWJhbWEnLCBhYmJyZXZpYXRpb246ICdBTCd9LFxuICAgICAgICAgICAge25hbWU6ICdBbGFza2EnLCBhYmJyZXZpYXRpb246ICdBSyd9LFxuICAgICAgICAgICAge25hbWU6ICdBcml6b25hJywgYWJicmV2aWF0aW9uOiAnQVonfSxcbiAgICAgICAgICAgIHtuYW1lOiAnQXJrYW5zYXMnLCBhYmJyZXZpYXRpb246ICdBUid9LFxuICAgICAgICAgICAge25hbWU6ICdDYWxpZm9ybmlhJywgYWJicmV2aWF0aW9uOiAnQ0EnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnQ29sb3JhZG8nLCBhYmJyZXZpYXRpb246ICdDTyd9LFxuICAgICAgICAgICAge25hbWU6ICdDb25uZWN0aWN1dCcsIGFiYnJldmlhdGlvbjogJ0NUJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0RlbGF3YXJlJywgYWJicmV2aWF0aW9uOiAnREUnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnRGlzdHJpY3Qgb2YgQ29sdW1iaWEnLCBhYmJyZXZpYXRpb246ICdEQyd9LFxuICAgICAgICAgICAge25hbWU6ICdGbG9yaWRhJywgYWJicmV2aWF0aW9uOiAnRkwnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnR2VvcmdpYScsIGFiYnJldmlhdGlvbjogJ0dBJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0hhd2FpaScsIGFiYnJldmlhdGlvbjogJ0hJJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0lkYWhvJywgYWJicmV2aWF0aW9uOiAnSUQnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnSWxsaW5vaXMnLCBhYmJyZXZpYXRpb246ICdJTCd9LFxuICAgICAgICAgICAge25hbWU6ICdJbmRpYW5hJywgYWJicmV2aWF0aW9uOiAnSU4nfSxcbiAgICAgICAgICAgIHtuYW1lOiAnSW93YScsIGFiYnJldmlhdGlvbjogJ0lBJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0thbnNhcycsIGFiYnJldmlhdGlvbjogJ0tTJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0tlbnR1Y2t5JywgYWJicmV2aWF0aW9uOiAnS1knfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTG91aXNpYW5hJywgYWJicmV2aWF0aW9uOiAnTEEnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTWFpbmUnLCBhYmJyZXZpYXRpb246ICdNRSd9LFxuICAgICAgICAgICAge25hbWU6ICdNYXJ5bGFuZCcsIGFiYnJldmlhdGlvbjogJ01EJ30sXG4gICAgICAgICAgICB7bmFtZTogJ01hc3NhY2h1c2V0dHMnLCBhYmJyZXZpYXRpb246ICdNQSd9LFxuICAgICAgICAgICAge25hbWU6ICdNaWNoaWdhbicsIGFiYnJldmlhdGlvbjogJ01JJ30sXG4gICAgICAgICAgICB7bmFtZTogJ01pbm5lc290YScsIGFiYnJldmlhdGlvbjogJ01OJ30sXG4gICAgICAgICAgICB7bmFtZTogJ01pc3Npc3NpcHBpJywgYWJicmV2aWF0aW9uOiAnTVMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTWlzc291cmknLCBhYmJyZXZpYXRpb246ICdNTyd9LFxuICAgICAgICAgICAge25hbWU6ICdNb250YW5hJywgYWJicmV2aWF0aW9uOiAnTVQnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTmVicmFza2EnLCBhYmJyZXZpYXRpb246ICdORSd9LFxuICAgICAgICAgICAge25hbWU6ICdOZXZhZGEnLCBhYmJyZXZpYXRpb246ICdOVid9LFxuICAgICAgICAgICAge25hbWU6ICdOZXcgSGFtcHNoaXJlJywgYWJicmV2aWF0aW9uOiAnTkgnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTmV3IEplcnNleScsIGFiYnJldmlhdGlvbjogJ05KJ30sXG4gICAgICAgICAgICB7bmFtZTogJ05ldyBNZXhpY28nLCBhYmJyZXZpYXRpb246ICdOTSd9LFxuICAgICAgICAgICAge25hbWU6ICdOZXcgWW9yaycsIGFiYnJldmlhdGlvbjogJ05ZJ30sXG4gICAgICAgICAgICB7bmFtZTogJ05vcnRoIENhcm9saW5hJywgYWJicmV2aWF0aW9uOiAnTkMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTm9ydGggRGFrb3RhJywgYWJicmV2aWF0aW9uOiAnTkQnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnT2hpbycsIGFiYnJldmlhdGlvbjogJ09IJ30sXG4gICAgICAgICAgICB7bmFtZTogJ09rbGFob21hJywgYWJicmV2aWF0aW9uOiAnT0snfSxcbiAgICAgICAgICAgIHtuYW1lOiAnT3JlZ29uJywgYWJicmV2aWF0aW9uOiAnT1InfSxcbiAgICAgICAgICAgIHtuYW1lOiAnUGVubnN5bHZhbmlhJywgYWJicmV2aWF0aW9uOiAnUEEnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnUmhvZGUgSXNsYW5kJywgYWJicmV2aWF0aW9uOiAnUkknfSxcbiAgICAgICAgICAgIHtuYW1lOiAnU291dGggQ2Fyb2xpbmEnLCBhYmJyZXZpYXRpb246ICdTQyd9LFxuICAgICAgICAgICAge25hbWU6ICdTb3V0aCBEYWtvdGEnLCBhYmJyZXZpYXRpb246ICdTRCd9LFxuICAgICAgICAgICAge25hbWU6ICdUZW5uZXNzZWUnLCBhYmJyZXZpYXRpb246ICdUTid9LFxuICAgICAgICAgICAge25hbWU6ICdUZXhhcycsIGFiYnJldmlhdGlvbjogJ1RYJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1V0YWgnLCBhYmJyZXZpYXRpb246ICdVVCd9LFxuICAgICAgICAgICAge25hbWU6ICdWZXJtb250JywgYWJicmV2aWF0aW9uOiAnVlQnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnVmlyZ2luaWEnLCBhYmJyZXZpYXRpb246ICdWQSd9LFxuICAgICAgICAgICAge25hbWU6ICdXYXNoaW5ndG9uJywgYWJicmV2aWF0aW9uOiAnV0EnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnV2VzdCBWaXJnaW5pYScsIGFiYnJldmlhdGlvbjogJ1dWJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1dpc2NvbnNpbicsIGFiYnJldmlhdGlvbjogJ1dJJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1d5b21pbmcnLCBhYmJyZXZpYXRpb246ICdXWSd9XG4gICAgICAgIF0sXG5cbiAgICAgICAgdGVycml0b3JpZXM6IFtcbiAgICAgICAgICAgIHtuYW1lOiAnQW1lcmljYW4gU2Ftb2EnLCBhYmJyZXZpYXRpb246ICdBUyd9LFxuICAgICAgICAgICAge25hbWU6ICdGZWRlcmF0ZWQgU3RhdGVzIG9mIE1pY3JvbmVzaWEnLCBhYmJyZXZpYXRpb246ICdGTSd9LFxuICAgICAgICAgICAge25hbWU6ICdHdWFtJywgYWJicmV2aWF0aW9uOiAnR1UnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTWFyc2hhbGwgSXNsYW5kcycsIGFiYnJldmlhdGlvbjogJ01IJ30sXG4gICAgICAgICAgICB7bmFtZTogJ05vcnRoZXJuIE1hcmlhbmEgSXNsYW5kcycsIGFiYnJldmlhdGlvbjogJ01QJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1B1ZXJ0byBSaWNvJywgYWJicmV2aWF0aW9uOiAnUFInfSxcbiAgICAgICAgICAgIHtuYW1lOiAnVmlyZ2luIElzbGFuZHMsIFUuUy4nLCBhYmJyZXZpYXRpb246ICdWSSd9XG4gICAgICAgIF0sXG5cbiAgICAgICAgYXJtZWRfZm9yY2VzOiBbXG4gICAgICAgICAgICB7bmFtZTogJ0FybWVkIEZvcmNlcyBFdXJvcGUnLCBhYmJyZXZpYXRpb246ICdBRSd9LFxuICAgICAgICAgICAge25hbWU6ICdBcm1lZCBGb3JjZXMgUGFjaWZpYycsIGFiYnJldmlhdGlvbjogJ0FQJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0FybWVkIEZvcmNlcyB0aGUgQW1lcmljYXMnLCBhYmJyZXZpYXRpb246ICdBQSd9XG4gICAgICAgIF0sXG5cbiAgICAgICAgc3RyZWV0X3N1ZmZpeGVzOiBbXG4gICAgICAgICAgICB7bmFtZTogJ0F2ZW51ZScsIGFiYnJldmlhdGlvbjogJ0F2ZSd9LFxuICAgICAgICAgICAge25hbWU6ICdCb3VsZXZhcmQnLCBhYmJyZXZpYXRpb246ICdCbHZkJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0NlbnRlcicsIGFiYnJldmlhdGlvbjogJ0N0cid9LFxuICAgICAgICAgICAge25hbWU6ICdDaXJjbGUnLCBhYmJyZXZpYXRpb246ICdDaXInfSxcbiAgICAgICAgICAgIHtuYW1lOiAnQ291cnQnLCBhYmJyZXZpYXRpb246ICdDdCd9LFxuICAgICAgICAgICAge25hbWU6ICdEcml2ZScsIGFiYnJldmlhdGlvbjogJ0RyJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0V4dGVuc2lvbicsIGFiYnJldmlhdGlvbjogJ0V4dCd9LFxuICAgICAgICAgICAge25hbWU6ICdHbGVuJywgYWJicmV2aWF0aW9uOiAnR2xuJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0dyb3ZlJywgYWJicmV2aWF0aW9uOiAnR3J2J30sXG4gICAgICAgICAgICB7bmFtZTogJ0hlaWdodHMnLCBhYmJyZXZpYXRpb246ICdIdHMnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnSGlnaHdheScsIGFiYnJldmlhdGlvbjogJ0h3eSd9LFxuICAgICAgICAgICAge25hbWU6ICdKdW5jdGlvbicsIGFiYnJldmlhdGlvbjogJ0pjdCd9LFxuICAgICAgICAgICAge25hbWU6ICdLZXknLCBhYmJyZXZpYXRpb246ICdLZXknfSxcbiAgICAgICAgICAgIHtuYW1lOiAnTGFuZScsIGFiYnJldmlhdGlvbjogJ0xuJ30sXG4gICAgICAgICAgICB7bmFtZTogJ0xvb3AnLCBhYmJyZXZpYXRpb246ICdMb29wJ30sXG4gICAgICAgICAgICB7bmFtZTogJ01hbm9yJywgYWJicmV2aWF0aW9uOiAnTW5yJ30sXG4gICAgICAgICAgICB7bmFtZTogJ01pbGwnLCBhYmJyZXZpYXRpb246ICdNaWxsJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1BhcmsnLCBhYmJyZXZpYXRpb246ICdQYXJrJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1Bhcmt3YXknLCBhYmJyZXZpYXRpb246ICdQa3d5J30sXG4gICAgICAgICAgICB7bmFtZTogJ1Bhc3MnLCBhYmJyZXZpYXRpb246ICdQYXNzJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1BhdGgnLCBhYmJyZXZpYXRpb246ICdQYXRoJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1Bpa2UnLCBhYmJyZXZpYXRpb246ICdQaWtlJ30sXG4gICAgICAgICAgICB7bmFtZTogJ1BsYWNlJywgYWJicmV2aWF0aW9uOiAnUGwnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnUGxhemEnLCBhYmJyZXZpYXRpb246ICdQbHonfSxcbiAgICAgICAgICAgIHtuYW1lOiAnUG9pbnQnLCBhYmJyZXZpYXRpb246ICdQdCd9LFxuICAgICAgICAgICAge25hbWU6ICdSaWRnZScsIGFiYnJldmlhdGlvbjogJ1JkZyd9LFxuICAgICAgICAgICAge25hbWU6ICdSaXZlcicsIGFiYnJldmlhdGlvbjogJ1Jpdid9LFxuICAgICAgICAgICAge25hbWU6ICdSb2FkJywgYWJicmV2aWF0aW9uOiAnUmQnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnU3F1YXJlJywgYWJicmV2aWF0aW9uOiAnU3EnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnU3RyZWV0JywgYWJicmV2aWF0aW9uOiAnU3QnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnVGVycmFjZScsIGFiYnJldmlhdGlvbjogJ1Rlcid9LFxuICAgICAgICAgICAge25hbWU6ICdUcmFpbCcsIGFiYnJldmlhdGlvbjogJ1RybCd9LFxuICAgICAgICAgICAge25hbWU6ICdUdXJucGlrZScsIGFiYnJldmlhdGlvbjogJ1Rwa2UnfSxcbiAgICAgICAgICAgIHtuYW1lOiAnVmlldycsIGFiYnJldmlhdGlvbjogJ1Z3J30sXG4gICAgICAgICAgICB7bmFtZTogJ1dheScsIGFiYnJldmlhdGlvbjogJ1dheSd9XG4gICAgICAgIF0sXG5cbiAgICAgICAgbW9udGhzOiBbXG4gICAgICAgICAgICB7bmFtZTogJ0phbnVhcnknLCBzaG9ydF9uYW1lOiAnSmFuJywgbnVtZXJpYzogJzAxJywgZGF5czogMzF9LFxuICAgICAgICAgICAgLy8gTm90IG1lc3Npbmcgd2l0aCBsZWFwIHllYXJzLi4uXG4gICAgICAgICAgICB7bmFtZTogJ0ZlYnJ1YXJ5Jywgc2hvcnRfbmFtZTogJ0ZlYicsIG51bWVyaWM6ICcwMicsIGRheXM6IDI4fSxcbiAgICAgICAgICAgIHtuYW1lOiAnTWFyY2gnLCBzaG9ydF9uYW1lOiAnTWFyJywgbnVtZXJpYzogJzAzJywgZGF5czogMzF9LFxuICAgICAgICAgICAge25hbWU6ICdBcHJpbCcsIHNob3J0X25hbWU6ICdBcHInLCBudW1lcmljOiAnMDQnLCBkYXlzOiAzMH0sXG4gICAgICAgICAgICB7bmFtZTogJ01heScsIHNob3J0X25hbWU6ICdNYXknLCBudW1lcmljOiAnMDUnLCBkYXlzOiAzMX0sXG4gICAgICAgICAgICB7bmFtZTogJ0p1bmUnLCBzaG9ydF9uYW1lOiAnSnVuJywgbnVtZXJpYzogJzA2JywgZGF5czogMzB9LFxuICAgICAgICAgICAge25hbWU6ICdKdWx5Jywgc2hvcnRfbmFtZTogJ0p1bCcsIG51bWVyaWM6ICcwNycsIGRheXM6IDMxfSxcbiAgICAgICAgICAgIHtuYW1lOiAnQXVndXN0Jywgc2hvcnRfbmFtZTogJ0F1ZycsIG51bWVyaWM6ICcwOCcsIGRheXM6IDMxfSxcbiAgICAgICAgICAgIHtuYW1lOiAnU2VwdGVtYmVyJywgc2hvcnRfbmFtZTogJ1NlcCcsIG51bWVyaWM6ICcwOScsIGRheXM6IDMwfSxcbiAgICAgICAgICAgIHtuYW1lOiAnT2N0b2JlcicsIHNob3J0X25hbWU6ICdPY3QnLCBudW1lcmljOiAnMTAnLCBkYXlzOiAzMX0sXG4gICAgICAgICAgICB7bmFtZTogJ05vdmVtYmVyJywgc2hvcnRfbmFtZTogJ05vdicsIG51bWVyaWM6ICcxMScsIGRheXM6IDMwfSxcbiAgICAgICAgICAgIHtuYW1lOiAnRGVjZW1iZXInLCBzaG9ydF9uYW1lOiAnRGVjJywgbnVtZXJpYzogJzEyJywgZGF5czogMzF9XG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9CYW5rX2NhcmRfbnVtYmVyI0lzc3Vlcl9pZGVudGlmaWNhdGlvbl9udW1iZXJfLjI4SUlOLjI5XG4gICAgICAgIGNjX3R5cGVzOiBbXG4gICAgICAgICAgICB7bmFtZTogXCJBbWVyaWNhbiBFeHByZXNzXCIsIHNob3J0X25hbWU6ICdhbWV4JywgcHJlZml4OiAnMzQnLCBsZW5ndGg6IDE1fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkJhbmtjYXJkXCIsIHNob3J0X25hbWU6ICdiYW5rY2FyZCcsIHByZWZpeDogJzU2MTAnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkNoaW5hIFVuaW9uUGF5XCIsIHNob3J0X25hbWU6ICdjaGluYXVuaW9uJywgcHJlZml4OiAnNjInLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkRpbmVycyBDbHViIENhcnRlIEJsYW5jaGVcIiwgc2hvcnRfbmFtZTogJ2RjY2FydGUnLCBwcmVmaXg6ICczMDAnLCBsZW5ndGg6IDE0fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkRpbmVycyBDbHViIGVuUm91dGVcIiwgc2hvcnRfbmFtZTogJ2RjZW5yb3V0ZScsIHByZWZpeDogJzIwMTQnLCBsZW5ndGg6IDE1fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkRpbmVycyBDbHViIEludGVybmF0aW9uYWxcIiwgc2hvcnRfbmFtZTogJ2RjaW50bCcsIHByZWZpeDogJzM2JywgbGVuZ3RoOiAxNH0sXG4gICAgICAgICAgICB7bmFtZTogXCJEaW5lcnMgQ2x1YiBVbml0ZWQgU3RhdGVzICYgQ2FuYWRhXCIsIHNob3J0X25hbWU6ICdkY3VzYycsIHByZWZpeDogJzU0JywgbGVuZ3RoOiAxNn0sXG4gICAgICAgICAgICB7bmFtZTogXCJEaXNjb3ZlciBDYXJkXCIsIHNob3J0X25hbWU6ICdkaXNjb3ZlcicsIHByZWZpeDogJzYwMTEnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkluc3RhUGF5bWVudFwiLCBzaG9ydF9uYW1lOiAnaW5zdGFwYXknLCBwcmVmaXg6ICc2MzcnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIkpDQlwiLCBzaG9ydF9uYW1lOiAnamNiJywgcHJlZml4OiAnMzUyOCcsIGxlbmd0aDogMTZ9LFxuICAgICAgICAgICAge25hbWU6IFwiTGFzZXJcIiwgc2hvcnRfbmFtZTogJ2xhc2VyJywgcHJlZml4OiAnNjMwNCcsIGxlbmd0aDogMTZ9LFxuICAgICAgICAgICAge25hbWU6IFwiTWFlc3Ryb1wiLCBzaG9ydF9uYW1lOiAnbWFlc3RybycsIHByZWZpeDogJzUwMTgnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIk1hc3RlcmNhcmRcIiwgc2hvcnRfbmFtZTogJ21jJywgcHJlZml4OiAnNTEnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIlNvbG9cIiwgc2hvcnRfbmFtZTogJ3NvbG8nLCBwcmVmaXg6ICc2MzM0JywgbGVuZ3RoOiAxNn0sXG4gICAgICAgICAgICB7bmFtZTogXCJTd2l0Y2hcIiwgc2hvcnRfbmFtZTogJ3N3aXRjaCcsIHByZWZpeDogJzQ5MDMnLCBsZW5ndGg6IDE2fSxcbiAgICAgICAgICAgIHtuYW1lOiBcIlZpc2FcIiwgc2hvcnRfbmFtZTogJ3Zpc2EnLCBwcmVmaXg6ICc0JywgbGVuZ3RoOiAxNn0sXG4gICAgICAgICAgICB7bmFtZTogXCJWaXNhIEVsZWN0cm9uXCIsIHNob3J0X25hbWU6ICdlbGVjdHJvbicsIHByZWZpeDogJzQwMjYnLCBsZW5ndGg6IDE2fVxuICAgICAgICBdLFxuXG4gICAgICAgIC8vcmV0dXJuIGFsbCB3b3JsZCBjdXJyZW5jeSBieSBJU08gNDIxN1xuICAgICAgICBjdXJyZW5jeV90eXBlczogW1xuICAgICAgICAgICAgeydjb2RlJyA6ICdBRUQnLCAnbmFtZScgOiAnVW5pdGVkIEFyYWIgRW1pcmF0ZXMgRGlyaGFtJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0FGTicsICduYW1lJyA6ICdBZmdoYW5pc3RhbiBBZmdoYW5pJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0FMTCcsICduYW1lJyA6ICdBbGJhbmlhIExlayd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdBTUQnLCAnbmFtZScgOiAnQXJtZW5pYSBEcmFtJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0FORycsICduYW1lJyA6ICdOZXRoZXJsYW5kcyBBbnRpbGxlcyBHdWlsZGVyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0FPQScsICduYW1lJyA6ICdBbmdvbGEgS3dhbnphJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0FSUycsICduYW1lJyA6ICdBcmdlbnRpbmEgUGVzbyd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdBVUQnLCAnbmFtZScgOiAnQXVzdHJhbGlhIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdBV0cnLCAnbmFtZScgOiAnQXJ1YmEgR3VpbGRlcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdBWk4nLCAnbmFtZScgOiAnQXplcmJhaWphbiBOZXcgTWFuYXQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQkFNJywgJ25hbWUnIDogJ0Jvc25pYSBhbmQgSGVyemVnb3ZpbmEgQ29udmVydGlibGUgTWFya2EnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQkJEJywgJ25hbWUnIDogJ0JhcmJhZG9zIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdCRFQnLCAnbmFtZScgOiAnQmFuZ2xhZGVzaCBUYWthJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0JHTicsICduYW1lJyA6ICdCdWxnYXJpYSBMZXYnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQkhEJywgJ25hbWUnIDogJ0JhaHJhaW4gRGluYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQklGJywgJ25hbWUnIDogJ0J1cnVuZGkgRnJhbmMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQk1EJywgJ25hbWUnIDogJ0Jlcm11ZGEgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0JORCcsICduYW1lJyA6ICdCcnVuZWkgRGFydXNzYWxhbSBEb2xsYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQk9CJywgJ25hbWUnIDogJ0JvbGl2aWEgQm9saXZpYW5vJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0JSTCcsICduYW1lJyA6ICdCcmF6aWwgUmVhbCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdCU0QnLCAnbmFtZScgOiAnQmFoYW1hcyBEb2xsYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQlROJywgJ25hbWUnIDogJ0JodXRhbiBOZ3VsdHJ1bSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdCV1AnLCAnbmFtZScgOiAnQm90c3dhbmEgUHVsYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdCWVInLCAnbmFtZScgOiAnQmVsYXJ1cyBSdWJsZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdCWkQnLCAnbmFtZScgOiAnQmVsaXplIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdDQUQnLCAnbmFtZScgOiAnQ2FuYWRhIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdDREYnLCAnbmFtZScgOiAnQ29uZ28vS2luc2hhc2EgRnJhbmMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQ0hGJywgJ25hbWUnIDogJ1N3aXR6ZXJsYW5kIEZyYW5jJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0NMUCcsICduYW1lJyA6ICdDaGlsZSBQZXNvJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0NOWScsICduYW1lJyA6ICdDaGluYSBZdWFuIFJlbm1pbmJpJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0NPUCcsICduYW1lJyA6ICdDb2xvbWJpYSBQZXNvJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0NSQycsICduYW1lJyA6ICdDb3N0YSBSaWNhIENvbG9uJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0NVQycsICduYW1lJyA6ICdDdWJhIENvbnZlcnRpYmxlIFBlc28nfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQ1VQJywgJ25hbWUnIDogJ0N1YmEgUGVzbyd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdDVkUnLCAnbmFtZScgOiAnQ2FwZSBWZXJkZSBFc2N1ZG8nfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnQ1pLJywgJ25hbWUnIDogJ0N6ZWNoIFJlcHVibGljIEtvcnVuYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdESkYnLCAnbmFtZScgOiAnRGppYm91dGkgRnJhbmMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnREtLJywgJ25hbWUnIDogJ0Rlbm1hcmsgS3JvbmUnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnRE9QJywgJ25hbWUnIDogJ0RvbWluaWNhbiBSZXB1YmxpYyBQZXNvJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0RaRCcsICduYW1lJyA6ICdBbGdlcmlhIERpbmFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0VHUCcsICduYW1lJyA6ICdFZ3lwdCBQb3VuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdFUk4nLCAnbmFtZScgOiAnRXJpdHJlYSBOYWtmYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdFVEInLCAnbmFtZScgOiAnRXRoaW9waWEgQmlycid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdFVVInLCAnbmFtZScgOiAnRXVybyBNZW1iZXIgQ291bnRyaWVzJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0ZKRCcsICduYW1lJyA6ICdGaWppIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdGS1AnLCAnbmFtZScgOiAnRmFsa2xhbmQgSXNsYW5kcyAoTWFsdmluYXMpIFBvdW5kJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0dCUCcsICduYW1lJyA6ICdVbml0ZWQgS2luZ2RvbSBQb3VuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdHRUwnLCAnbmFtZScgOiAnR2VvcmdpYSBMYXJpJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0dHUCcsICduYW1lJyA6ICdHdWVybnNleSBQb3VuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdHSFMnLCAnbmFtZScgOiAnR2hhbmEgQ2VkaSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdHSVAnLCAnbmFtZScgOiAnR2licmFsdGFyIFBvdW5kJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0dNRCcsICduYW1lJyA6ICdHYW1iaWEgRGFsYXNpJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0dORicsICduYW1lJyA6ICdHdWluZWEgRnJhbmMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnR1RRJywgJ25hbWUnIDogJ0d1YXRlbWFsYSBRdWV0emFsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0dZRCcsICduYW1lJyA6ICdHdXlhbmEgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0hLRCcsICduYW1lJyA6ICdIb25nIEtvbmcgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0hOTCcsICduYW1lJyA6ICdIb25kdXJhcyBMZW1waXJhJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0hSSycsICduYW1lJyA6ICdDcm9hdGlhIEt1bmEnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSFRHJywgJ25hbWUnIDogJ0hhaXRpIEdvdXJkZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdIVUYnLCAnbmFtZScgOiAnSHVuZ2FyeSBGb3JpbnQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSURSJywgJ25hbWUnIDogJ0luZG9uZXNpYSBSdXBpYWgnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSUxTJywgJ25hbWUnIDogJ0lzcmFlbCBTaGVrZWwnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSU1QJywgJ25hbWUnIDogJ0lzbGUgb2YgTWFuIFBvdW5kJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0lOUicsICduYW1lJyA6ICdJbmRpYSBSdXBlZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdJUUQnLCAnbmFtZScgOiAnSXJhcSBEaW5hcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdJUlInLCAnbmFtZScgOiAnSXJhbiBSaWFsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0lTSycsICduYW1lJyA6ICdJY2VsYW5kIEtyb25hJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0pFUCcsICduYW1lJyA6ICdKZXJzZXkgUG91bmQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSk1EJywgJ25hbWUnIDogJ0phbWFpY2EgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0pPRCcsICduYW1lJyA6ICdKb3JkYW4gRGluYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnSlBZJywgJ25hbWUnIDogJ0phcGFuIFllbid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdLRVMnLCAnbmFtZScgOiAnS2VueWEgU2hpbGxpbmcnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnS0dTJywgJ25hbWUnIDogJ0t5cmd5enN0YW4gU29tJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0tIUicsICduYW1lJyA6ICdDYW1ib2RpYSBSaWVsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0tNRicsICduYW1lJyA6ICdDb21vcm9zIEZyYW5jJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0tQVycsICduYW1lJyA6ICdLb3JlYSAoTm9ydGgpIFdvbid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdLUlcnLCAnbmFtZScgOiAnS29yZWEgKFNvdXRoKSBXb24nfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnS1dEJywgJ25hbWUnIDogJ0t1d2FpdCBEaW5hcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdLWUQnLCAnbmFtZScgOiAnQ2F5bWFuIElzbGFuZHMgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0taVCcsICduYW1lJyA6ICdLYXpha2hzdGFuIFRlbmdlJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0xBSycsICduYW1lJyA6ICdMYW9zIEtpcCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdMQlAnLCAnbmFtZScgOiAnTGViYW5vbiBQb3VuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdMS1InLCAnbmFtZScgOiAnU3JpIExhbmthIFJ1cGVlJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0xSRCcsICduYW1lJyA6ICdMaWJlcmlhIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdMU0wnLCAnbmFtZScgOiAnTGVzb3RobyBMb3RpJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ0xUTCcsICduYW1lJyA6ICdMaXRodWFuaWEgTGl0YXMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTFlEJywgJ25hbWUnIDogJ0xpYnlhIERpbmFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01BRCcsICduYW1lJyA6ICdNb3JvY2NvIERpcmhhbSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdNREwnLCAnbmFtZScgOiAnTW9sZG92YSBMZXUnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTUdBJywgJ25hbWUnIDogJ01hZGFnYXNjYXIgQXJpYXJ5J30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01LRCcsICduYW1lJyA6ICdNYWNlZG9uaWEgRGVuYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTU1LJywgJ25hbWUnIDogJ015YW5tYXIgKEJ1cm1hKSBLeWF0J30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01OVCcsICduYW1lJyA6ICdNb25nb2xpYSBUdWdocmlrJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01PUCcsICduYW1lJyA6ICdNYWNhdSBQYXRhY2EnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTVJPJywgJ25hbWUnIDogJ01hdXJpdGFuaWEgT3VndWl5YSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdNVVInLCAnbmFtZScgOiAnTWF1cml0aXVzIFJ1cGVlJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01WUicsICduYW1lJyA6ICdNYWxkaXZlcyAoTWFsZGl2ZSBJc2xhbmRzKSBSdWZpeWFhJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01XSycsICduYW1lJyA6ICdNYWxhd2kgS3dhY2hhJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ01YTicsICduYW1lJyA6ICdNZXhpY28gUGVzbyd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdNWVInLCAnbmFtZScgOiAnTWFsYXlzaWEgUmluZ2dpdCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdNWk4nLCAnbmFtZScgOiAnTW96YW1iaXF1ZSBNZXRpY2FsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ05BRCcsICduYW1lJyA6ICdOYW1pYmlhIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdOR04nLCAnbmFtZScgOiAnTmlnZXJpYSBOYWlyYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdOSU8nLCAnbmFtZScgOiAnTmljYXJhZ3VhIENvcmRvYmEnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTk9LJywgJ25hbWUnIDogJ05vcndheSBLcm9uZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdOUFInLCAnbmFtZScgOiAnTmVwYWwgUnVwZWUnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnTlpEJywgJ25hbWUnIDogJ05ldyBaZWFsYW5kIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdPTVInLCAnbmFtZScgOiAnT21hbiBSaWFsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1BBQicsICduYW1lJyA6ICdQYW5hbWEgQmFsYm9hJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1BFTicsICduYW1lJyA6ICdQZXJ1IE51ZXZvIFNvbCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdQR0snLCAnbmFtZScgOiAnUGFwdWEgTmV3IEd1aW5lYSBLaW5hJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1BIUCcsICduYW1lJyA6ICdQaGlsaXBwaW5lcyBQZXNvJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1BLUicsICduYW1lJyA6ICdQYWtpc3RhbiBSdXBlZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdQTE4nLCAnbmFtZScgOiAnUG9sYW5kIFpsb3R5J30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1BZRycsICduYW1lJyA6ICdQYXJhZ3VheSBHdWFyYW5pJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1FBUicsICduYW1lJyA6ICdRYXRhciBSaXlhbCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdST04nLCAnbmFtZScgOiAnUm9tYW5pYSBOZXcgTGV1J30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1JTRCcsICduYW1lJyA6ICdTZXJiaWEgRGluYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnUlVCJywgJ25hbWUnIDogJ1J1c3NpYSBSdWJsZSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdSV0YnLCAnbmFtZScgOiAnUndhbmRhIEZyYW5jJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1NBUicsICduYW1lJyA6ICdTYXVkaSBBcmFiaWEgUml5YWwnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU0JEJywgJ25hbWUnIDogJ1NvbG9tb24gSXNsYW5kcyBEb2xsYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU0NSJywgJ25hbWUnIDogJ1NleWNoZWxsZXMgUnVwZWUnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU0RHJywgJ25hbWUnIDogJ1N1ZGFuIFBvdW5kJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1NFSycsICduYW1lJyA6ICdTd2VkZW4gS3JvbmEnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU0dEJywgJ25hbWUnIDogJ1NpbmdhcG9yZSBEb2xsYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU0hQJywgJ25hbWUnIDogJ1NhaW50IEhlbGVuYSBQb3VuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdTTEwnLCAnbmFtZScgOiAnU2llcnJhIExlb25lIExlb25lJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1NPUycsICduYW1lJyA6ICdTb21hbGlhIFNoaWxsaW5nJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1NQTCcsICduYW1lJyA6ICdTZWJvcmdhIEx1aWdpbm8nfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU1JEJywgJ25hbWUnIDogJ1N1cmluYW1lIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdTVEQnLCAnbmFtZScgOiAnU8OjbyBUb23DqSBhbmQgUHLDrW5jaXBlIERvYnJhJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1NWQycsICduYW1lJyA6ICdFbCBTYWx2YWRvciBDb2xvbid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdTWVAnLCAnbmFtZScgOiAnU3lyaWEgUG91bmQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnU1pMJywgJ25hbWUnIDogJ1N3YXppbGFuZCBMaWxhbmdlbmknfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVEhCJywgJ25hbWUnIDogJ1RoYWlsYW5kIEJhaHQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVEpTJywgJ25hbWUnIDogJ1RhamlraXN0YW4gU29tb25pJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1RNVCcsICduYW1lJyA6ICdUdXJrbWVuaXN0YW4gTWFuYXQnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVE5EJywgJ25hbWUnIDogJ1R1bmlzaWEgRGluYXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVE9QJywgJ25hbWUnIDogJ1RvbmdhIFBhXFwnYW5nYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdUUlknLCAnbmFtZScgOiAnVHVya2V5IExpcmEnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVFREJywgJ25hbWUnIDogJ1RyaW5pZGFkIGFuZCBUb2JhZ28gRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1RWRCcsICduYW1lJyA6ICdUdXZhbHUgRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1RXRCcsICduYW1lJyA6ICdUYWl3YW4gTmV3IERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdUWlMnLCAnbmFtZScgOiAnVGFuemFuaWEgU2hpbGxpbmcnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVUFIJywgJ25hbWUnIDogJ1VrcmFpbmUgSHJ5dm5pYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdVR1gnLCAnbmFtZScgOiAnVWdhbmRhIFNoaWxsaW5nJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1VTRCcsICduYW1lJyA6ICdVbml0ZWQgU3RhdGVzIERvbGxhcid9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdVWVUnLCAnbmFtZScgOiAnVXJ1Z3VheSBQZXNvJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1VaUycsICduYW1lJyA6ICdVemJla2lzdGFuIFNvbSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdWRUYnLCAnbmFtZScgOiAnVmVuZXp1ZWxhIEJvbGl2YXInfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVk5EJywgJ25hbWUnIDogJ1ZpZXQgTmFtIERvbmcnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnVlVWJywgJ25hbWUnIDogJ1ZhbnVhdHUgVmF0dSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdXU1QnLCAnbmFtZScgOiAnU2Ftb2EgVGFsYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdYQUYnLCAnbmFtZScgOiAnQ29tbXVuYXV0w6kgRmluYW5jacOocmUgQWZyaWNhaW5lIChCRUFDKSBDRkEgRnJhbmMgQkVBQyd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdYQ0QnLCAnbmFtZScgOiAnRWFzdCBDYXJpYmJlYW4gRG9sbGFyJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1hEUicsICduYW1lJyA6ICdJbnRlcm5hdGlvbmFsIE1vbmV0YXJ5IEZ1bmQgKElNRikgU3BlY2lhbCBEcmF3aW5nIFJpZ2h0cyd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdYT0YnLCAnbmFtZScgOiAnQ29tbXVuYXV0w6kgRmluYW5jacOocmUgQWZyaWNhaW5lIChCQ0VBTykgRnJhbmMnfSxcbiAgICAgICAgICAgIHsnY29kZScgOiAnWFBGJywgJ25hbWUnIDogJ0NvbXB0b2lycyBGcmFuw6dhaXMgZHUgUGFjaWZpcXVlIChDRlApIEZyYW5jJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1lFUicsICduYW1lJyA6ICdZZW1lbiBSaWFsJ30sXG4gICAgICAgICAgICB7J2NvZGUnIDogJ1pBUicsICduYW1lJyA6ICdTb3V0aCBBZnJpY2EgUmFuZCd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdaTVcnLCAnbmFtZScgOiAnWmFtYmlhIEt3YWNoYSd9LFxuICAgICAgICAgICAgeydjb2RlJyA6ICdaV0QnLCAnbmFtZScgOiAnWmltYmFid2UgRG9sbGFyJ31cbiAgICAgICAgXVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb3B5T2JqZWN0KHNvdXJjZSwgdGFyZ2V0KSB7XG4gICAgICAgIHZhciBrZXk7XG5cbiAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0IHx8IChBcnJheS5pc0FycmF5KHNvdXJjZSkgPyBbXSA6IHt9KTtcblxuICAgICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV0gfHwgdGFyZ2V0W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIC8qKiBHZXQgdGhlIGRhdGEgYmFzZWQgb24ga2V5KiovXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gY29weU9iamVjdChkYXRhW25hbWVdKTtcbiAgICB9O1xuXG4gICAgLyoqIFNldCB0aGUgZGF0YSBhcyBrZXkgYW5kIGRhdGEgb3IgdGhlIGRhdGEgbWFwKiovXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZGF0YVtuYW1lXSA9IHZhbHVlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBjb3B5T2JqZWN0KG5hbWUsIGRhdGEpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgQ2hhbmNlLnByb3RvdHlwZS5tZXJzZW5uZV90d2lzdGVyID0gZnVuY3Rpb24gKHNlZWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNZXJzZW5uZVR3aXN0ZXIoc2VlZCk7XG4gICAgfTtcblxuICAgIC8vIC0tIEVuZCBNaXNjZWxsYW5lb3VzIC0tXG5cbiAgICBDaGFuY2UucHJvdG90eXBlLlZFUlNJT04gPSBcIjAuNS45XCI7XG5cbiAgICAvLyBNZXJzZW5uZSBUd2lzdGVyIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vYmFua3NlYW4vMzAwNDk0XG4gICAgdmFyIE1lcnNlbm5lVHdpc3RlciA9IGZ1bmN0aW9uIChzZWVkKSB7XG4gICAgICAgIGlmIChzZWVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNlZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgfVxuICAgICAgICAvKiBQZXJpb2QgcGFyYW1ldGVycyAqL1xuICAgICAgICB0aGlzLk4gPSA2MjQ7XG4gICAgICAgIHRoaXMuTSA9IDM5NztcbiAgICAgICAgdGhpcy5NQVRSSVhfQSA9IDB4OTkwOGIwZGY7ICAgLyogY29uc3RhbnQgdmVjdG9yIGEgKi9cbiAgICAgICAgdGhpcy5VUFBFUl9NQVNLID0gMHg4MDAwMDAwMDsgLyogbW9zdCBzaWduaWZpY2FudCB3LXIgYml0cyAqL1xuICAgICAgICB0aGlzLkxPV0VSX01BU0sgPSAweDdmZmZmZmZmOyAvKiBsZWFzdCBzaWduaWZpY2FudCByIGJpdHMgKi9cblxuICAgICAgICB0aGlzLm10ID0gbmV3IEFycmF5KHRoaXMuTik7IC8qIHRoZSBhcnJheSBmb3IgdGhlIHN0YXRlIHZlY3RvciAqL1xuICAgICAgICB0aGlzLm10aSA9IHRoaXMuTiArIDE7IC8qIG10aT09TiArIDEgbWVhbnMgbXRbTl0gaXMgbm90IGluaXRpYWxpemVkICovXG5cbiAgICAgICAgdGhpcy5pbml0X2dlbnJhbmQoc2VlZCk7XG4gICAgfTtcblxuICAgIC8qIGluaXRpYWxpemVzIG10W05dIHdpdGggYSBzZWVkICovXG4gICAgTWVyc2VubmVUd2lzdGVyLnByb3RvdHlwZS5pbml0X2dlbnJhbmQgPSBmdW5jdGlvbiAocykge1xuICAgICAgICB0aGlzLm10WzBdID0gcyA+Pj4gMDtcbiAgICAgICAgZm9yICh0aGlzLm10aSA9IDE7IHRoaXMubXRpIDwgdGhpcy5OOyB0aGlzLm10aSsrKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5tdFt0aGlzLm10aSAtIDFdIF4gKHRoaXMubXRbdGhpcy5tdGkgLSAxXSA+Pj4gMzApO1xuICAgICAgICAgICAgdGhpcy5tdFt0aGlzLm10aV0gPSAoKCgoKHMgJiAweGZmZmYwMDAwKSA+Pj4gMTYpICogMTgxMjQzMzI1MykgPDwgMTYpICsgKHMgJiAweDAwMDBmZmZmKSAqIDE4MTI0MzMyNTMpICsgdGhpcy5tdGk7XG4gICAgICAgICAgICAvKiBTZWUgS251dGggVEFPQ1AgVm9sMi4gM3JkIEVkLiBQLjEwNiBmb3IgbXVsdGlwbGllci4gKi9cbiAgICAgICAgICAgIC8qIEluIHRoZSBwcmV2aW91cyB2ZXJzaW9ucywgTVNCcyBvZiB0aGUgc2VlZCBhZmZlY3QgICAqL1xuICAgICAgICAgICAgLyogb25seSBNU0JzIG9mIHRoZSBhcnJheSBtdFtdLiAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKiAyMDAyLzAxLzA5IG1vZGlmaWVkIGJ5IE1ha290byBNYXRzdW1vdG8gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMubXRbdGhpcy5tdGldID4+Pj0gMDtcbiAgICAgICAgICAgIC8qIGZvciA+MzIgYml0IG1hY2hpbmVzICovXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogaW5pdGlhbGl6ZSBieSBhbiBhcnJheSB3aXRoIGFycmF5LWxlbmd0aCAqL1xuICAgIC8qIGluaXRfa2V5IGlzIHRoZSBhcnJheSBmb3IgaW5pdGlhbGl6aW5nIGtleXMgKi9cbiAgICAvKiBrZXlfbGVuZ3RoIGlzIGl0cyBsZW5ndGggKi9cbiAgICAvKiBzbGlnaHQgY2hhbmdlIGZvciBDKyssIDIwMDQvMi8yNiAqL1xuICAgIE1lcnNlbm5lVHdpc3Rlci5wcm90b3R5cGUuaW5pdF9ieV9hcnJheSA9IGZ1bmN0aW9uIChpbml0X2tleSwga2V5X2xlbmd0aCkge1xuICAgICAgICB2YXIgaSA9IDEsIGogPSAwLCBrLCBzO1xuICAgICAgICB0aGlzLmluaXRfZ2VucmFuZCgxOTY1MDIxOCk7XG4gICAgICAgIGsgPSAodGhpcy5OID4ga2V5X2xlbmd0aCA/IHRoaXMuTiA6IGtleV9sZW5ndGgpO1xuICAgICAgICBmb3IgKDsgazsgay0tKSB7XG4gICAgICAgICAgICBzID0gdGhpcy5tdFtpIC0gMV0gXiAodGhpcy5tdFtpIC0gMV0gPj4+IDMwKTtcbiAgICAgICAgICAgIHRoaXMubXRbaV0gPSAodGhpcy5tdFtpXSBeICgoKCgocyAmIDB4ZmZmZjAwMDApID4+PiAxNikgKiAxNjY0NTI1KSA8PCAxNikgKyAoKHMgJiAweDAwMDBmZmZmKSAqIDE2NjQ1MjUpKSkgKyBpbml0X2tleVtqXSArIGo7IC8qIG5vbiBsaW5lYXIgKi9cbiAgICAgICAgICAgIHRoaXMubXRbaV0gPj4+PSAwOyAvKiBmb3IgV09SRFNJWkUgPiAzMiBtYWNoaW5lcyAqL1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgaWYgKGkgPj0gdGhpcy5OKSB7IHRoaXMubXRbMF0gPSB0aGlzLm10W3RoaXMuTiAtIDFdOyBpID0gMTsgfVxuICAgICAgICAgICAgaWYgKGogPj0ga2V5X2xlbmd0aCkgeyBqID0gMDsgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoayA9IHRoaXMuTiAtIDE7IGs7IGstLSkge1xuICAgICAgICAgICAgcyA9IHRoaXMubXRbaSAtIDFdIF4gKHRoaXMubXRbaSAtIDFdID4+PiAzMCk7XG4gICAgICAgICAgICB0aGlzLm10W2ldID0gKHRoaXMubXRbaV0gXiAoKCgoKHMgJiAweGZmZmYwMDAwKSA+Pj4gMTYpICogMTU2NjA4Mzk0MSkgPDwgMTYpICsgKHMgJiAweDAwMDBmZmZmKSAqIDE1NjYwODM5NDEpKSAtIGk7IC8qIG5vbiBsaW5lYXIgKi9cbiAgICAgICAgICAgIHRoaXMubXRbaV0gPj4+PSAwOyAvKiBmb3IgV09SRFNJWkUgPiAzMiBtYWNoaW5lcyAqL1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgaWYgKGkgPj0gdGhpcy5OKSB7IHRoaXMubXRbMF0gPSB0aGlzLm10W3RoaXMuTiAtIDFdOyBpID0gMTsgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tdFswXSA9IDB4ODAwMDAwMDA7IC8qIE1TQiBpcyAxOyBhc3N1cmluZyBub24temVybyBpbml0aWFsIGFycmF5ICovXG4gICAgfTtcblxuICAgIC8qIGdlbmVyYXRlcyBhIHJhbmRvbSBudW1iZXIgb24gWzAsMHhmZmZmZmZmZl0taW50ZXJ2YWwgKi9cbiAgICBNZXJzZW5uZVR3aXN0ZXIucHJvdG90eXBlLmdlbnJhbmRfaW50MzIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB5O1xuICAgICAgICB2YXIgbWFnMDEgPSBuZXcgQXJyYXkoMHgwLCB0aGlzLk1BVFJJWF9BKTtcbiAgICAgICAgLyogbWFnMDFbeF0gPSB4ICogTUFUUklYX0EgIGZvciB4PTAsMSAqL1xuXG4gICAgICAgIGlmICh0aGlzLm10aSA+PSB0aGlzLk4pIHsgLyogZ2VuZXJhdGUgTiB3b3JkcyBhdCBvbmUgdGltZSAqL1xuICAgICAgICAgICAgdmFyIGtrO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5tdGkgPT09IHRoaXMuTiArIDEpIHsgICAvKiBpZiBpbml0X2dlbnJhbmQoKSBoYXMgbm90IGJlZW4gY2FsbGVkLCAqL1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdF9nZW5yYW5kKDU0ODkpOyAvKiBhIGRlZmF1bHQgaW5pdGlhbCBzZWVkIGlzIHVzZWQgKi9cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoa2sgPSAwOyBrayA8IHRoaXMuTiAtIHRoaXMuTTsga2srKykge1xuICAgICAgICAgICAgICAgIHkgPSAodGhpcy5tdFtra10mdGhpcy5VUFBFUl9NQVNLKXwodGhpcy5tdFtrayArIDFdJnRoaXMuTE9XRVJfTUFTSyk7XG4gICAgICAgICAgICAgICAgdGhpcy5tdFtra10gPSB0aGlzLm10W2trICsgdGhpcy5NXSBeICh5ID4+PiAxKSBeIG1hZzAxW3kgJiAweDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICg7a2sgPCB0aGlzLk4gLSAxOyBraysrKSB7XG4gICAgICAgICAgICAgICAgeSA9ICh0aGlzLm10W2trXSZ0aGlzLlVQUEVSX01BU0spfCh0aGlzLm10W2trICsgMV0mdGhpcy5MT1dFUl9NQVNLKTtcbiAgICAgICAgICAgICAgICB0aGlzLm10W2trXSA9IHRoaXMubXRba2sgKyAodGhpcy5NIC0gdGhpcy5OKV0gXiAoeSA+Pj4gMSkgXiBtYWcwMVt5ICYgMHgxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHkgPSAodGhpcy5tdFt0aGlzLk4gLSAxXSZ0aGlzLlVQUEVSX01BU0spfCh0aGlzLm10WzBdJnRoaXMuTE9XRVJfTUFTSyk7XG4gICAgICAgICAgICB0aGlzLm10W3RoaXMuTiAtIDFdID0gdGhpcy5tdFt0aGlzLk0gLSAxXSBeICh5ID4+PiAxKSBeIG1hZzAxW3kgJiAweDFdO1xuXG4gICAgICAgICAgICB0aGlzLm10aSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICB5ID0gdGhpcy5tdFt0aGlzLm10aSsrXTtcblxuICAgICAgICAvKiBUZW1wZXJpbmcgKi9cbiAgICAgICAgeSBePSAoeSA+Pj4gMTEpO1xuICAgICAgICB5IF49ICh5IDw8IDcpICYgMHg5ZDJjNTY4MDtcbiAgICAgICAgeSBePSAoeSA8PCAxNSkgJiAweGVmYzYwMDAwO1xuICAgICAgICB5IF49ICh5ID4+PiAxOCk7XG5cbiAgICAgICAgcmV0dXJuIHkgPj4+IDA7XG4gICAgfTtcblxuICAgIC8qIGdlbmVyYXRlcyBhIHJhbmRvbSBudW1iZXIgb24gWzAsMHg3ZmZmZmZmZl0taW50ZXJ2YWwgKi9cbiAgICBNZXJzZW5uZVR3aXN0ZXIucHJvdG90eXBlLmdlbnJhbmRfaW50MzEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5nZW5yYW5kX2ludDMyKCkgPj4+IDEpO1xuICAgIH07XG5cbiAgICAvKiBnZW5lcmF0ZXMgYSByYW5kb20gbnVtYmVyIG9uIFswLDFdLXJlYWwtaW50ZXJ2YWwgKi9cbiAgICBNZXJzZW5uZVR3aXN0ZXIucHJvdG90eXBlLmdlbnJhbmRfcmVhbDEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdlbnJhbmRfaW50MzIoKSAqICgxLjAgLyA0Mjk0OTY3Mjk1LjApO1xuICAgICAgICAvKiBkaXZpZGVkIGJ5IDJeMzItMSAqL1xuICAgIH07XG5cbiAgICAvKiBnZW5lcmF0ZXMgYSByYW5kb20gbnVtYmVyIG9uIFswLDEpLXJlYWwtaW50ZXJ2YWwgKi9cbiAgICBNZXJzZW5uZVR3aXN0ZXIucHJvdG90eXBlLnJhbmRvbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2VucmFuZF9pbnQzMigpICogKDEuMCAvIDQyOTQ5NjcyOTYuMCk7XG4gICAgICAgIC8qIGRpdmlkZWQgYnkgMl4zMiAqL1xuICAgIH07XG5cbiAgICAvKiBnZW5lcmF0ZXMgYSByYW5kb20gbnVtYmVyIG9uICgwLDEpLXJlYWwtaW50ZXJ2YWwgKi9cbiAgICBNZXJzZW5uZVR3aXN0ZXIucHJvdG90eXBlLmdlbnJhbmRfcmVhbDMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5nZW5yYW5kX2ludDMyKCkgKyAwLjUpICogKDEuMCAvIDQyOTQ5NjcyOTYuMCk7XG4gICAgICAgIC8qIGRpdmlkZWQgYnkgMl4zMiAqL1xuICAgIH07XG5cbiAgICAvKiBnZW5lcmF0ZXMgYSByYW5kb20gbnVtYmVyIG9uIFswLDEpIHdpdGggNTMtYml0IHJlc29sdXRpb24qL1xuICAgIE1lcnNlbm5lVHdpc3Rlci5wcm90b3R5cGUuZ2VucmFuZF9yZXM1MyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzLmdlbnJhbmRfaW50MzIoKT4+PjUsIGIgPSB0aGlzLmdlbnJhbmRfaW50MzIoKT4+PjY7XG4gICAgICAgIHJldHVybiAoYSAqIDY3MTA4ODY0LjAgKyBiKSAqICgxLjAgLyA5MDA3MTk5MjU0NzQwOTkyLjApO1xuICAgIH07XG5cblxuICAgIC8vIENvbW1vbkpTIG1vZHVsZVxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBDaGFuY2U7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5DaGFuY2UgPSBDaGFuY2U7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIEFNRCBtb2R1bGVcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIENoYW5jZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgYSB3aW5kb3cgb2JqZWN0LCB0aGF0IGF0IGxlYXN0IGhhcyBhIGRvY3VtZW50IHByb3BlcnR5LFxuICAgIC8vIGluc3RhbnRpYXRlIGFuZCBkZWZpbmUgY2hhbmNlIG9uIHRoZSB3aW5kb3dcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygd2luZG93LmRvY3VtZW50ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHdpbmRvdy5DaGFuY2UgPSBDaGFuY2U7XG4gICAgICAgIHdpbmRvdy5jaGFuY2UgPSBuZXcgQ2hhbmNlKCk7XG4gICAgfVxufSkoKTtcbiIsIlRyaWFkID0gcmVxdWlyZSAnLi90cmlhZC5jb2ZmZWUnXG53aW5kb3cuYXBwID0gbmV3IFRyaWFkKClcblxualF1ZXJ5IC0+XG4gIGFwcC5yZW5kZXIoKVxuIiwibW9kdWxlLmV4cG9ydHMgPVxuICBUSUNLX01TOiAyNVxuICBGQURFX01TOiA0MDAwXG4gIFNIQVBFX1NJWkU6IDIwMCIsImNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmNvZmZlZScpXG5jaGFuY2UgPSBuZXcgKHJlcXVpcmUoJ2NoYW5jZScpKVxuXG5jbGFzcyBUcmlhZFxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuXG4gIHJlbmRlcjogLT5cbiAgICBAc3ZnID0gZDMuc2VsZWN0KCdib2R5JykuYXBwZW5kKCdzdmcnKVxuICAgIEBzaGFwZXMgPSBbXVxuICAgIEBnZW5lcmF0b3IgPSBAc2hhcGVGYWN0b3J5KClcbiAgICBAdGljaygpXG5cbiAgc2hhcGVGYWN0b3J5OiAtPlxuICAgIHggPSAxXG4gICAgeSA9IDFcblxuICAgID0+XG4gICAgICByb3QgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiA0KVxuXG4gICAgICBpZiB4IDwgMVxuICAgICAgICBkeCA9IDFcbiAgICAgIGVsc2UgaWYgeCA+PSBNYXRoLmZsb29yKCQod2luZG93KS53aWR0aCgpIC8gY29uc3RhbnRzLlNIQVBFX1NJWkUpXG4gICAgICAgIGR4ID0gLTFcbiAgICAgIGlmIHkgPCAxXG4gICAgICAgIGR5ID0gMVxuICAgICAgZWxzZSBpZiB5ID49IE1hdGguZmxvb3IoJCh3aW5kb3cpLmhlaWdodCgpIC8gY29uc3RhbnRzLlNIQVBFX1NJWkUpXG4gICAgICAgIGR5ID0gLTFcblxuICAgICAgdW5sZXNzIGR4P1xuICAgICAgICBkeCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIpIC0gMVxuICAgICAgdW5sZXNzIGR5P1xuICAgICAgICBkeSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIpIC0gMVxuXG4gICAgICBpZiBAc2hhcGVFeGlzdHNBdFBvc2l0aW9uKHggKyBkeCwgeSArIGR5KVxuICAgICAgICBkeCArPSBpZiBjaGFuY2UuYm9vbCgpIHRoZW4gMSBlbHNlIC0xXG5cbiAgICAgIHggKz0gZHhcbiAgICAgIHkgKz0gZHlcblxuICAgICAge3gsIHksIHJvdH1cblxuICB0aWNrOiA9PlxuICAgIHNoYXBlID0gQGdlbmVyYXRvcigpXG4gICAgc2hhcGUuZWwgPSBAZHJhd1RyaWFuZ2Ugc2hhcGVcblxuICAgIGlmIEBzaGFwZXMubGVuZ3RoID4gMjVcbiAgICAgIHRvUmVtb3ZlID0gQHNoYXBlcy5wb3AoKVxuICAgICAgdG9SZW1vdmUuZWwucmVtb3ZlKClcbiAgICBAc2hhcGVzLnVuc2hpZnQoc2hhcGUpXG4gICAgXy5kZWxheSBAdGljaywgY29uc3RhbnRzLlRJQ0tfTVNcblxuICBkcmF3VHJpYW5nZTogKHt4LCB5LCBzaXplLCByb3R9KSAtPlxuICAgIHNpemUgPz0gY29uc3RhbnRzLlNIQVBFX1NJWkVcblxuICAgIHRyaWFuZ2xlID0gQHN2Zy5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAuYXR0ciAnZCcsIChkKSAtPlxuICAgICAgICByZXR1cm4gXCJNICN7eCAqIHNpemV9ICN7eSAqIHNpemV9IGwgI3tzaXplfSAje3NpemV9IGwgLSN7c2l6ZX0gMCB6XCJcbiAgICAgIC5zdHlsZSAnZmlsbCcsICdibHVlJ1xuXG4gICAgaWYgcm90ID4gMFxuICAgICAgdHJpYW5nbGUuYXR0ciAndHJhbnNmb3JtJywgXCJyb3RhdGUoI3tyb3QqOTB9LCAje3ggKiBzaXplICsgc2l6ZS8yfSwgI3t5ICogKyBzaXplICsgc2l6ZS8yfSlcIlxuXG4gICAgdHJpYW5nbGUudHJhbnNpdGlvbigpLnN0eWxlKCdvcGFjaXR5JywgMCkuZHVyYXRpb24oY29uc3RhbnRzLkZBREVfTVMpXG5cbiAgc2hhcGVFeGlzdHNBdFBvc2l0aW9uOiAoeCwgeSkgLT5cbiAgICBjb25mbGljdHMgPSBAc2hhcGVzLmZpbHRlciAoc2hhcGUpIC0+IHNoYXBlLnggaXMgeCBhbmQgc2hhcGUueSBpcyB5XG4gICAgY29uZmxpY3RzLmxlbmd0aCA+IDBcblxubW9kdWxlLmV4cG9ydHMgPSBUcmlhZCJdfQ==
