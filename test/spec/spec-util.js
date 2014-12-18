// A matcher that checks if a given thrown object is an instance of an expected
// class.
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
}   // toThrowInstanceOf


// Create a test Fcommand.  It will be automatically deleted when the test
// completes.
function createTestFcommand(context, name)
{
    var mgr = new FcommandManager();
    var fcmd = new Fcommand({
        guid: "testguid-" + name,
        names: [ name ],
        execute: "",
        description: "test command: " + name
    });

    var onSuccess = jasmine.createSpy();
    var onFailure = jasmine.createSpy();

    fcmd.save(mgr.fileSystem, onSuccess, onFailure);

    waitsFor(function() { return onSuccess.wasCalled },
        "saving test Fcmd " + name + " to succeed", 2000);

    runs(function() {
        expect(onFailure).not.toHaveBeenCalled();
    });

    // delete the Fcommand at the end of the test
    context.after(function() {
        onSuccess.reset();
        onFailure.reset();

        fcmd.delete(mgr.fileSystem, onSuccess, onFailure);

        waitsFor(function() { return onSuccess.wasCalled; },
            "delete test Fcmd " + name + " to succeed", 2000);
    });
}   // createTestFcommand
