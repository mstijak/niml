var Parser = require('niml-node/Parser'),
    toHtml = require('niml-node/toHtml'),
    html = require('html');

module.exports = {
    convert: function (str) {
        var parser = new Parser(str);
        var niml = parser.parse();
        var output = toHtml(niml);
        var result = html.prettyPrint(output, {indent_size: 2});
        return result;
    }
}
