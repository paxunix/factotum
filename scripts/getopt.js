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

        // Options start with any number of '-'.
        var rawOptName = (word.match(/^-+(.*)/) || [ null, "" ])[1];
        if (rawOptName !== "")
        {
            // Check if option is a "no-" boolean.
            var lookupOptName = rawOptName;
            var toggleCheck =
                rawOptName.match(/^no-?(.*)/) || [ "", rawOptName ];
            var isToggledOff = (toggleCheck[0] !== "");
            if (isToggledOff)
                lookupOptName = toggleCheck[1];

            // Check for option in spec.
            if (lookupOptName in spec)
            {
                if (spec[lookupOptName].type === "boolean")
                    opts[lookupOptName] = !isToggledOff;
                else
                    throw("Unknown option type '" +
                          spec[lookupOptName].type + "'.");

                continue;
            }
        }

        // Must be an argument.
        retArgv.push(word);
    }

    return { opts: opts, argv: retArgv };
}   // GetOpt.getOptions 
