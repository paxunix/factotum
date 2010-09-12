
function shellWordSplit(arg)
{
    var argv = [];

    arg = arg || "";

    var wordDelimiter = null;
    var wordStartOffset = -1;

    for (var i = 0;
         i < arg.length;
         ++i)
    {
        var ch = arg.charAt(i);

        // whitespace delimits a word
        if (/^\s$/.test(ch))
        {
            if (wordStartOffset >= 0)
            {
                argv.push(arg.substring(wordStartOffset, i));
                wordStartOffset = -1;
            }
        }
        else
        {
            // Any character starts a word unless already in a word
            if (wordStartOffset === -1)
                wordStartOffset = i;
        }
    }

    if (wordStartOffset !== -1)
    {
        argv.push(arg.substring(wordStartOffset, i));
    }

    return argv;
}   // shellWordSplit
