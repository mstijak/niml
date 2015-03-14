// through2 is a thin wrapper around node transform streams
var through = require('through2'),
    gutil = require('gulp-util'),
    PluginError = gutil.PluginError,
    Parser = require('niml-node/Parser'),
    toHtml = require('niml-node/toHtml'),
    html = require('html'),
    fs = require('fs');

// Consts
const PLUGIN_NAME = 'gulp-niml';

// Plugin level function(dealing with files)
function niml(opt) {

    // Creating a stream through which each file will pass
    return through.obj(function(file, enc, cb) {
        if (file.isNull()) {
            // return empty file
            cb(null, file);
        }
        if (file.isBuffer()) {
            var parser = new Parser(file.contents.toString());
            var dom = parser.parse();
            if (opt == 'json') {
                var json = JSON.stringify(dom, null, 2);
                file.contents = new Buffer(json);
            } else {
                var contents  = toHtml(dom);
                file.contents = new Buffer(contents);
            }
        }
        if (file.isStream()) {
            throw new PluginError(PLUGIN_NAME, 'Streams not supported yet.');
        }

        cb(null, file);
    });
};

// Exporting the plugin main function
module.exports = niml;