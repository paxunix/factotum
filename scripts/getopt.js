
function shellWordSplit(arg)
{
    arg = arg || "";

    var argv = [];
    var curWord = 0;
    var inWord = false;
    var quote = "";
    var ch = "";

    for (var i = 0;
         i < arg.length;
         ++i)
    {
        ch = arg.charAt(i);

        // Whitespace
        if (/^\s$/.test(ch))
        {
            // If currently in a word, whitespace delimits the word.
            if (inWord)
            {
                curWord++;
                inWord = false;
            }

            // Whitespace is ignored.
            continue;
        }

        // Append character to the current word.
        inWord = true;
        argv[curWord] = (argv[curWord] || "") + ch;
    }

    return argv;
}   // shellWordSplit
