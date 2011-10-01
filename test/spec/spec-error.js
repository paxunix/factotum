// XXX:  there is a request to modify toThrow to do this:
//  https://github.com/pivotal/jasmine/pull/120
function toThrowInstanceOf(expected)
{
    var result = false;
    var exception;
    if (typeof this.actual != 'function')
        throw new Error('Actual is not a function');

    try
    {
        this.actual();
    }

    catch (e)
    {
        exception = e;
        result = exception instanceof expected;
    }

    if (!result)
    {
        this.message = function() {
            return "Expected function " + (this.isNot ? "not" : "") +
                "to throw " + expected.name + ", but it threw " +
                exception.name + "(" + exception + ")";
        };
    }
    else
    {
        this.message = function() {
            return "Expected function to throw an exception.";
        };
    }

    return result;
}


describe("FcommandError", function() {
    it("constructs an FcommandError object with info about the exception", function() {
        var msg = "error info";
        var err = new FcommandError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // FcommandError


describe("MissingPropertyError", function() {
    it("constructs a MissingPropertyError object with info about the exception", function() {
        var msg = "error info";
        var err = new MissingPropertyError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err instanceof MissingPropertyError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // MissingPropertyError


describe("InvalidData", function() {
    it("constructs an InvalidData object with info about the exception", function() {
        var msg = "error info";
        var err = new InvalidData(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err instanceof InvalidData).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // InvalidData
