"use strict";


class ShellParse
{

// Function: ShellParse.split
//      Split a string into words according to shell-like rules.
// Parameters:
//      arg - string to parse
// Returns:
//      array of words
static split(arg)
{
    arg = arg || "";

    if (typeof(arg) !== "string")
        throw new TypeError("Argument must be a string.");

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
}   // split


}   // class ShellParse


export default ShellParse;
