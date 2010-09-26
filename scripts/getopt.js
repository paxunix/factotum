var GetOpt = {};


// Function: GetOpt.shellWordSplit
//      Split a string into words according to shell-like rules.
// Parameters:
//      arg - string to parse
// Returns:
//      array of words
GetOpt.shellWordSplit = function (arg)
{
    arg = arg || "";

    var argv = [];
    var curWord = 0;
    var inWord = false;
    var openQuote = "";
    var ch;

    function appendToWord(s)
    {
        inWord = true;
        argv[curWord] = (argv[curWord] || "") + ch;
    }

    for (var i = 0;
         i < arg.length;
         ++i)
    {
        ch = arg.charAt(i);

        // Escaping next character always appends to word and resumes at
        // following character.
        if (ch === "\\")
        {
            ++i;
            ch = arg.charAt(i);
            if (ch !== "")
                appendToWord(ch);

            continue;
        }

        // Handle whitespace.
        if (/^\s$/.test(ch))
        {
            // If currently in a word and not in quotes, whitespace delimits
            // the word.
            if (inWord && openQuote === "")
            {
                curWord++;
                inWord = false;
            }

            // If in quotes, whitespace is kept.
            if (openQuote !== "")
            {
                appendToWord(ch);
            }

            continue;
        }

        // Single or double quote may need to be matched.
        if (ch === "'" || ch === "\"")
        {
            // Closing quote.
            if (openQuote === ch)
            {
                // Only delimits current word if whitespace follows.
                if (/^\s$/.test(arg.charAt(i + 1)))
                {
                    curWord++;
                    inWord = false;
                }

                openQuote = "";
            }
            // Keep track of quote type so we can close it only if we aren't
            // already tracking a quote.
            else if (openQuote === "")
                openQuote = ch;
            // If quote is already open, save this one.
            else
                appendToWord(ch);

            continue;
        }

        // Append character to the current word.
        appendToWord(ch);
    }

    return argv;
}   // shellWordSplit


// Function:
//      GetOpt.getOptions
// Parameters:
//      spec - option specification object:
//
//      {
//          <option-name>: {
//              type: t,
//              default: d,
//              aliases: []
//          },
//          <option2-name>: obj2
//      }
//
//      <option-name> is an option to be matched against shell-words in
//      args.  A single leading '-' is assumed.  Long option names can be
//      represented by prepending a '-'.
//
//      If option.type is "boolean", the option is set to true if the option
//      is present, false if not.  The option is also set to false if
//      "no-<option-name>" or "no<option-name" is present.
//
// Returns:
//      object containing options and their values, and arguments.
GetOpt.getOptions = function (spec, args)
{
    var argv = GetOpt.shellWordSplit(args);
    var opts = {};
    var retArgv = [];
    var saveToOptName = null;

    function saveValue(opt, value)
    {
        if (spec[opt].array)
            opts[opt] = [].concat(opts[opt] || [], value);
        else
            opts[opt] = value;
    }

    // Return an object with details about the arg/opt in s.
    function getOptionOrArg(s)
    {
        var optName = (s.match(/^-+(.*)/) || [ null, null ])[1];

        if (optName !== null)
        {
            // Exact matches are preferred.
            if (optName in spec)
                return { opt: optName };

            // Otherwise, see if it's an alias.
            for (var i in spec)
                if ((spec[i].aliases || []).indexOf(optName) != -1)
                    return { opt: i };

            // If it starts with 'no' or 'no-' try it as a boolean or an
            // incremental option that's been toggled off.
            var toggleCheck =
                optName.match(/^no-?(.*)/) || [ null ];
            if (toggleCheck[0] !== null)
            {
                // Recursively retry with the non-negated name.
                var trueOpt = getOptionOrArg("-" + toggleCheck[1]);
                if (trueOpt.opt &&
                    (spec[trueOpt.opt].type === "boolean" ||
                     spec[trueOpt.opt].type === "incremental"))
                    return { opt: trueOpt.opt, isToggledOff: true };

                return { opt: optName };
            }
        }

        // Not an option, so consider it a word.
        return { word: s };
    }   // getOptionOrArg

    // Pull options and their values out of argv.
    while (argv.length > 0)
    {
        var word = argv.shift();

        // Everything else is an argument.
        if (word === "--")
        {
            retArgv = retArgv.concat(argv);
            break;
        }

        var thing = getOptionOrArg(word);
        if (thing.opt)
        {
            saveToOptName = null;

            if (spec[thing.opt].type === "boolean")
            {
                saveValue(thing.opt, !thing.isToggledOff);
            }
            else if (spec[thing.opt].type === "incremental")
            {
                // Incremental option values >= 0.
                saveValue(thing.opt,
                    Math.max(0, (opts[thing.opt] || 0) +
                        (thing.isToggledOff ? -1 : +1)));
            }
            else if (spec[thing.opt].type === "value")
            {
                saveToOptName = thing.opt;
            }
            else
                throw("Unknown option type '" +
                      spec[thing.opt].type + "'.");

            continue;
        }   // if it's an option

        // If we are already "in" an option, save its value.
        if (saveToOptName !== null)
        {
            saveValue(saveToOptName, thing.word);
            saveToOptName = null;
            continue;
        }

        // Must be an argument.
        retArgv.push(thing.word);
    }   // while

    // Option validation.
    for (var opt in spec)
    {
        if (spec[opt].type === "value")
            if (!(opt in opts))
                if (!spec[opt].optional)
                    throw("Option '" + opt + "' requires a value.");
                else
                    saveValue(opt, "");
    }

    return { opts: opts, argv: retArgv };
}   // GetOpt.getOptions 
