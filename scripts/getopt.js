
function shellWordSplit(arg)
{
    arg = arg || "";

    var argv = [];
    var curWord = 0;
    var inWord = false;
    var quote = "";
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

        // Whitespace is ignored.
        if (/^\s$/.test(ch))
        {
            // If currently in a word, whitespace delimits the word.
            if (inWord)
            {
                curWord++;
                inWord = false;
            }

            continue;
        }

        // Append character to the current word.
        appendToWord(ch);
    }

    return argv;
}   // shellWordSplit
