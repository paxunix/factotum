var fs = require("fs");

var outputDir = "./build";

try {
    fs.accessSync(outputDir, fs.F_OK);
}

catch (e) {
    fs.mkdirSync(outputDir);
}


module.exports = {
    entry: {
        // One for each script context that doesn't require vulcanization (FFS)
        background: "./scripts/background.js",
        inject: "./scripts/inject.js",
        content: "./scripts/content.js",
        test: "./test/spec/run-spec.js",
    },
    output: {
        path: __dirname + "/" + outputDir,
        filename: "[name].bundle.js",
    },
}
