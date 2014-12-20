"use strict";

var GetOpt = {};


/**
 * Parse an array of words for options and arguments.
 *
 * Options start with at least one "-" (any number of "-" are allowed.
 *
 * @param {Object} spec - option specification.
 *      {
 *          option: {
 *              type: String,
 *              aliases: Array,
 *              array: Boolean,
 *          },
 *          option2: { ... },
 *          ...
 *      }
 * @property {String} option.type - type of value expected for the option.
 *      If "value", the value is the next word as a string.
 *      If "boolean", the value is true if the option is present, false if
 *          not.  The value is set to false if "no-<option-name>" is present.
 *      If "incremental", the value is an integer incremented from 0 with
 *          each occurrence of the option.
 * @property {Array} option.aliases - (Optional) array that specifies the possible aliases for this option name.  The key in the returned object will be the option name, even if an alias was given.
 * @property {Boolean} option.array - (Optional; only for "value" types) if true, the value of the option will be an array continue the found values of the option).
 * @param argv - array of command line words (as returned from Shell.split).
 * @return {Object} Of the form:
 *      {
 *          optA: value,
 *          optB: [ value1, value2, ....], ...
 *          _: [ arg1, arg2, ... ]
 *      }
 *  The _ array will always be present (it will be empty if there were no
 *  arguments).
 */
GetOpt.getOptions = function (spec, argv)
{
    var opts = { _: [ ] };
    var nameOfValueOpt = null;


    function saveValue(opt, value)
    {
        if (spec[opt].array && spec[opt].type === "value")
            opts[opt] = [].concat(opts[opt] || [], value);
        else
            opts[opt] = value;
    }


    // Return an object with details about the arg/opt in s.
    function getOptionOrArg(s)
    {
        // Options start with any number of '-'.  If the option name is
        // followed by '=', save everything after it as a value to be used
        // for that option.
        var optMatch =
            (s.match(/^-+(.+?)(?:=(.*))?$/) ||
            [ null, null, null ]);

        if (optMatch[1] !== null)
        {
            var ret = { opt: optMatch[1] };

            if (optMatch[2] !== null && typeof(optMatch[2]) !== "undefined")
                ret.value = optMatch[2];

            // Exact matches are preferred.
            if (ret.opt in spec)
                return ret;

            // Otherwise, see if it's an exact alias match.
            for (var i in spec)
                if ((spec[i].aliases || []).indexOf(ret.opt) != -1)
                {
                    ret.opt = i;
                    return ret;
                }

            // If it starts with 'no-' try it as a boolean that's been
            // toggled off.
            var toggleCheck = ret.opt.match(/^no-(.*)/);
            if (toggleCheck !== null)
            {
                // Recursively retry with the non-negated name.
                var trueOpt = getOptionOrArg("-" + toggleCheck[1]);
                if (trueOpt.opt && spec[trueOpt.opt].type === "boolean")
                {
                    ret.opt = trueOpt.opt;
                    ret.isToggledOff = true;
                    return ret;
                }

                // fall through, since it's not a supported option and
                // should be considered a word
            }
        }

        // Not an option, so consider it a word.
        return { word: s };
    }   // getOptionOrArg

    // Set default values for options that have them
    for (var opt in spec)
    {
        if ("default" in spec[opt])
            saveValue(opt, spec[opt].default);
    }

    // Pull options and their values out of argv.
    while (argv.length > 0)
    {
        var word = argv.shift();

        // Everything else is an argument.
        if (word === "--")
        {
            opts._ = opts._.concat(argv);

            // If a value option is active but we've consumed all options
            // and their values, then the option gets a value of null.
            if (nameOfValueOpt)
                saveValue(nameOfValueOpt, null);

            break;
        }

        var thing = getOptionOrArg(word);
        if (thing.opt)
        {
            // If there was an '=value' for this option, force it to be the
            // next word, but only if this option is a value-type.
            // Otherwise, this word should be considered an arg, not an
            // option.
            if ("value" in thing)
                if (spec[thing.opt].type === "value")
                    argv.unshift(thing.value);
                else
                {
                    opts._.push(word);
                    continue;
                }

            // If we last saw a value-option but are now in a new supported
            // option, the value-option gets null.
            if (nameOfValueOpt !== null)
            {
                saveValue(nameOfValueOpt, null);
                nameOfValueOpt = null;
            }

            if (spec[thing.opt].type === "boolean")
            {
                saveValue(thing.opt, !thing.isToggledOff);
            }
            else if (spec[thing.opt].type === "incremental")
            {
                saveValue(thing.opt, (opts[thing.opt] || 0) + 1);
            }
            else if (spec[thing.opt].type === "value")
            {
                nameOfValueOpt = thing.opt;
            }
            else
                throw("Unknown option type '" +
                      spec[thing.opt].type + "'.");

            continue;
        }   // if it's an option

        // If we are already "in" an option, save its value.
        if (nameOfValueOpt !== null)
        {
            saveValue(nameOfValueOpt, thing.word);
            nameOfValueOpt = null;
            continue;
        }

        // Must be an argument.
        opts._.push(thing.word);
    }   // while

    // We ended with a value option but there's nothing left to assign to it
    // as a value.
    if (nameOfValueOpt !== null)
        saveValue(nameOfValueOpt, null);

    return opts;
}   // GetOpt.getOptions
