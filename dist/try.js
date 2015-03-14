!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.NIML=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Parser = _dereq_('niml-node/Parser'),
    toHtml = _dereq_('niml-node/toHtml'),
    html = _dereq_('html');

module.exports = {
    convert: function (str) {
        var parser = new Parser(str);
        var niml = parser.parse();
        var output = toHtml(niml);
        var result = html.prettyPrint(output, {indent_size: 2});
        return result;
    }
}

},{"html":2,"niml-node/Parser":3,"niml-node/toHtml":6}],2:[function(_dereq_,module,exports){
/*

 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <elfz@laacz.lv>
    http://jsbeautifier.org/


  You are free to use this in any way you want, in case you find this useful or working for you.

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    max_char (default 70)            -  maximum amount of characters per line,
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"

    e.g.

    style_html(html_source, {
      'indent_size': 2,
      'indent_char': ' ',
      'max_char': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u']
    });
*/

function style_html(html_source, options) {
//Wrapper function to invoke all the necessary constructors and deal with the output.

  var multi_parser,
      indent_size,
      indent_character,
      max_char,
      brace_style,
      unformatted;

  options = options || {};
  indent_size = options.indent_size || 4;
  indent_character = options.indent_char || ' ';
  brace_style = options.brace_style || 'collapse';
  max_char = options.max_char == 0 ? Infinity : options.max_char || 70;
  unformatted = options.unformatted || ['a', 'span', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike', 'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  function Parser() {

    this.pos = 0; //Parser position
    this.token = '';
    this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
    this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parentcount: 1,
      parent1: ''
    };
    this.tag_type = '';
    this.token_text = this.last_token = this.last_text = this.token_type = '';

    this.Utils = { //Uilities made available to the various functions
      whitespace: "\n\r\t ".split(''),
      single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), //all the single tags for HTML
      extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
      in_array: function (what, arr) {
        for (var i=0; i<arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    }

    this.get_content = function () { //function to capture regular content between tags

      var input_char = '',
          content = [],
          space = false; //if a space is needed

      while (this.input.charAt(this.pos) !== '<') {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space = true;
          }
          this.line_char_count--;
          continue; //don't want to insert unnecessary space
        }
        else if (space) {
          if (this.line_char_count >= this.max_char) { //insert a line when the max_char is reached
            content.push('\n');
            for (var i=0; i<this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          }
          else{
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //letter at-a-time (or string) inserted to an array
      }
      return content.length?content.join(''):'';
    }

    this.get_contents_to = function (name) { //get the full content of a script or style to pass to js_beautify
      if (this.pos == this.input.length) {
        return ['', 'TK_EOF'];
      }
      var input_char = '';
      var content = '';
      var reg_match = new RegExp('\<\/' + name + '\\s*\>', 'igm');
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array?reg_array.index:this.input.length; //absolute end of script
      if(this.pos < end_script) { //get everything in between the script tags
        content = this.input.substring(this.pos, end_script);
        this.pos = end_script;
      }
      return content;
    }

    this.record_tag = function (tag){ //function to record a tag and its parent in this.tags Object
      if (this.tags[tag + 'count']) { //check for the existence of this tag type
        this.tags[tag + 'count']++;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      else { //otherwise initialize this tag type
        this.tags[tag + 'count'] = 1;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
      this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
    }

    this.retrieve_tag = function (tag) { //function to retrieve the opening tag to the corresponding closer
      if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
        var temp_parent = this.tags.parent; //check to see if it's a closable tag.
        while (temp_parent) { //till we reach '' (the initial value);
          if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
            break;
          }
          temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
        }
        if (temp_parent) { //if we caught something
          this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
          this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
        }
        delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
        delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
        if (this.tags[tag + 'count'] == 1) {
          delete this.tags[tag + 'count'];
        }
        else {
          this.tags[tag + 'count']--;
        }
      }
    }

    this.get_tag = function () { //function to get a full tag and parse its type
      var input_char = '',
          content = [],
          space = false,
          tag_start, tag_end;

      do {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
          space = true;
          this.line_char_count--;
          continue;
        }

        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== '!') { //if we're in a comment strings don't get treated specially
            input_char += this.get_unformatted(input_char);
            space = true;
          }
        }

        if (input_char === '=') { //no space before =
          space = false;
        }

        if (content.length && content[content.length-1] !== '=' && input_char !== '>'
            && space) { //no space after = or before >
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          }
          else {
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        if (input_char === '<') {
            tag_start = this.pos - 1;
        }
        content.push(input_char); //inserts character at-a-time (or string)
      } while (input_char !== '>');

      var tag_complete = content.join('');
      var tag_index;
      if (tag_complete.indexOf(' ') != -1) { //if there's whitespace, thats where the tag name ends
        tag_index = tag_complete.indexOf(' ');
      }
      else { //otherwise go with the tag ending
        tag_index = tag_complete.indexOf('>');
      }
      var tag_check = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length-2) === '/' ||
          this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
        this.tag_type = 'SINGLE';
      }
      else if (tag_check === 'script') { //for later script handling
        this.record_tag(tag_check);
        this.tag_type = 'SCRIPT';
      }
      else if (tag_check === 'style') { //for future style handling (for now it justs uses get_content)
        this.record_tag(tag_check);
        this.tag_type = 'STYLE';
      }
      else if (this.Utils.in_array(tag_check, unformatted)) { // do not reformat the "unformatted" tags
        var comment = this.get_unformatted('</'+tag_check+'>', tag_complete); //...delegate to get_unformatted function
        content.push(comment);
        // Preserve collapsed whitespace either before or after this tag.
        if (tag_start > 0 && this.Utils.in_array(this.input.charAt(tag_start - 1), this.Utils.whitespace)){
            content.splice(0, 0, this.input.charAt(tag_start - 1));
        }
        tag_end = this.pos - 1;
        if (this.Utils.in_array(this.input.charAt(tag_end + 1), this.Utils.whitespace)){
            content.push(this.input.charAt(tag_end + 1));
        }
        this.tag_type = 'SINGLE';
      }
      else if (tag_check.charAt(0) === '!') { //peek for <!-- comment
        if (tag_check.indexOf('[if') != -1) { //peek for <!--[if conditional comment
          if (tag_complete.indexOf('!IE') != -1) { //this type needs a closing --> so...
            var comment = this.get_unformatted('-->', tag_complete); //...delegate to get_unformatted
            content.push(comment);
          }
          this.tag_type = 'START';
        }
        else if (tag_check.indexOf('[endif') != -1) {//peek for <!--[endif end conditional comment
          this.tag_type = 'END';
          this.unindent();
        }
        else if (tag_check.indexOf('[cdata[') != -1) { //if it's a <[cdata[ comment...
          var comment = this.get_unformatted(']]>', tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          this.tag_type = 'SINGLE'; //<![CDATA[ comments are treated like single tags
        }
        else {
          var comment = this.get_unformatted('-->', tag_complete);
          content.push(comment);
          this.tag_type = 'SINGLE';
        }
      }
      else {
        if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
          this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
          this.tag_type = 'END';
        }
        else { //otherwise it's a start-tag
          this.record_tag(tag_check); //push it on the tag stack
          this.tag_type = 'START';
        }
        if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
          this.print_newline(true, this.output);
        }
      }
      return content.join(''); //returns fully formatted tag
    }

    this.get_unformatted = function (delimiter, orig_tag) { //function to return unformatted content in its entirety

      if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) != -1) {
        return '';
      }
      var input_char = '';
      var content = '';
      var space = true;
      do {

        if (this.pos >= this.input.length) {
          return content;
        }

        input_char = this.input.charAt(this.pos);
        this.pos++

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space) {
            this.line_char_count--;
            continue;
          }
          if (input_char === '\n' || input_char === '\r') {
            content += '\n';
            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
            for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
            }
            space = false; //...and make sure other indentation is erased
            */
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space = true;


      } while (content.toLowerCase().indexOf(delimiter) == -1);
      return content;
    }

    this.get_token = function () { //initial handler for token-retrieval
      var token;

      if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
       var type = this.last_token.substr(7)
       token = this.get_contents_to(type);
        if (typeof token !== 'string') {
          return token;
        }
        return [token, 'TK_' + type];
      }
      if (this.current_mode === 'CONTENT') {
        token = this.get_content();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          return [token, 'TK_CONTENT'];
        }
      }

      if (this.current_mode === 'TAG') {
        token = this.get_tag();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          var tag_name_type = 'TK_TAG_' + this.tag_type;
          return [token, tag_name_type];
        }
      }
    }

    this.get_full_indent = function (level) {
      level = this.indent_level + level || 0;
      if (level < 1)
        return '';

      return Array(level + 1).join(this.indent_string);
    }


    this.printer = function (js_source, indent_character, indent_size, max_char, brace_style) { //handles input/output and some other printing functions

      this.input = js_source || ''; //gets the input for the Parser
      this.output = [];
      this.indent_character = indent_character;
      this.indent_string = '';
      this.indent_size = indent_size;
      this.brace_style = brace_style;
      this.indent_level = 0;
      this.max_char = max_char;
      this.line_char_count = 0; //count to see if max_char was exceeded

      for (var i=0; i<this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }

      this.print_newline = function (ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) { //we might want the extra line
          while (this.Utils.in_array(arr[arr.length-1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push('\n');
        for (var i=0; i<this.indent_level; i++) {
          arr.push(this.indent_string);
        }
      }

      this.print_token = function (text) {
        this.output.push(text);
      }

      this.indent = function () {
        this.indent_level++;
      }

      this.unindent = function () {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      }
    }
    return this;
  }

  /*_____________________--------------------_____________________*/

  multi_parser = new Parser(); //wrapping functions Parser
  multi_parser.printer(html_source, indent_character, indent_size, max_char, brace_style); //initialize starting values

  while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

    if (multi_parser.token_type === 'TK_EOF') {
      break;
    }

    switch (multi_parser.token_type) {
      case 'TK_TAG_START':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_STYLE':
      case 'TK_TAG_SCRIPT':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_END':
        //Print new line only if the tag has no content and has child
        if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
            var tag_name = multi_parser.token_text.match(/\w+/)[0];
            var tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length -1].match(/<\s*(\w+)/);
            if (tag_extracted_from_last_output === null || tag_extracted_from_last_output[1] !== tag_name)
                multi_parser.print_newline(true, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SINGLE':
        // Don't add a newline before elements that should remain unformatted.
        var tag_check = multi_parser.token_text.match(/^\s*<([a-z]+)/i);
        if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)){
            multi_parser.print_newline(false, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_CONTENT':
        if (multi_parser.token_text !== '') {
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = 'TAG';
        break;
      case 'TK_STYLE':
      case 'TK_SCRIPT':
        if (multi_parser.token_text !== '') {
          multi_parser.output.push('\n');
          var text = multi_parser.token_text;
          if (multi_parser.token_type == 'TK_SCRIPT') {
            var _beautifier = typeof js_beautify == 'function' && js_beautify;
          } else if (multi_parser.token_type == 'TK_STYLE') {
            var _beautifier = typeof css_beautify == 'function' && css_beautify;
          }

          if (options.indent_scripts == "keep") {
            var script_indent_level = 0;
          } else if (options.indent_scripts == "separate") {
            var script_indent_level = -multi_parser.indent_level;
          } else {
            var script_indent_level = 1;
          }

          var indentation = multi_parser.get_full_indent(script_indent_level);
          if (_beautifier) {
            // call the Beautifier if avaliable
            text = _beautifier(text.replace(/^\s*/, indentation), options);
          } else {
            // simply indent the string otherwise
            var white = text.match(/^\s*/)[0];
            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
            var reindent = multi_parser.get_full_indent(script_indent_level -_level);
            text = text.replace(/^\s*/, indentation)
                   .replace(/\r\n|\r|\n/g, '\n' + reindent)
                   .replace(/\s*$/, '');
          }
          if (text) {
            multi_parser.print_token(text);
            multi_parser.print_newline(true, multi_parser.output);
          }
        }
        multi_parser.current_mode = 'TAG';
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join('');
}

module.exports = {
  prettyPrint: style_html
};
},{}],3:[function(_dereq_,module,exports){
var Token = _dereq_('./Token');

const State = {
    Limbo: 1,

    TagName: 2,

    InlineText: 3,
    TagBody: 4,
    MultilineText: 5,

    Attributes: 6,
    AttributeName: 7,
    AttributeValue: 8,
    QuotedText: 9,
    LimboMultilineText: 10
};

function isLetter(x) {
    return (x>='a' && x<='z') || (x>='A' && x<='Z');
}

function Parser(input) {

    var states = [],
        buffer = [];

    function pushState(s, options) {
        states.push({
            state: s,
            options: options || {}
        });
    }

    var pos = 0,
        prevChar;

    pushState(State.Limbo);

    function clearBuffer(){
        buffer.splice(0, buffer.length);
    }

    function report(token, raw){
        var val = buffer.splice(0, buffer.length).join('');
        return { token: token, value: val, raw: raw };
    }

    function getNextChar () {
        if (pos<input.length)
            return input[pos++];

        if (pos==input.length) {
            pos++;
            return '\n';
        }

        return false;
    }

    this.read = function () {

        var c = '\0';

        function repeatLast(prevChar) {
            pos--;
            c = prevChar;
        }

        while (true) {

            prevChar = c;
            c = getNextChar();
            if (!c)
                return false;

            if (c==='\r') {
                c = prevChar;
                continue;
            }

            var state = states[states.length-1];

            switch (state.state) {
                case State.Limbo:
                    switch (c) {
                        case '+':
                            return report(Token.AddToLastElement);

                        case '-':
                            return report(Token.IndentDecrease);

                        case '<':
                            pushState(State.LimboMultilineText);
                            continue;

                        default:
                            if (isLetter(c)) {
                                buffer.splice(0, buffer.length);
                                buffer.push(c);
                                pushState(State.TagName);
                            }
                            continue;
                    }

                case State.TagName:
                    switch (c)
                    {
                        case ' ':
                            states.pop();
                            pushState(State.TagBody);
                            return report(Token.Element);

                        case '\n':
                            states.pop();
                            return report(Token.Element);

                        case '+':
                            states.pop();
                            pushState(State.TagBody);
                            c = prevChar;
                            pos--;
                            return report(Token.Element);

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.TagBody:

                    if (prevChar=='/' && c == '>')
                    {
                        states.pop();
                        continue;
                    }

                    switch (c) {
                        case ' ':
                            continue;

                        case '+':
                            return report(Token.EnterElement);

                        case '\n':
                            states.pop();
                            continue;

                        case '<':
                            states.pop();
                            pushState(State.MultilineText);
                            clearBuffer();
                            continue;

                        case '{':
                            pushState(State.Attributes);
                            continue;

                        case '|':
                            states.pop();
                            continue;

                        case '"':
                            states.pop();
                            pushState(State.InlineText);
                            pushState(State.QuotedText);
                            clearBuffer();
                            continue;
                    }

                    states.pop();
                    pushState(State.InlineText);
                    clearBuffer();
                    buffer.push(c);
                    continue;

                case State.InlineText:

                    if (prevChar == '/' && c == '>')
                    {
                        states.pop();
                        buffer.pop();
                        if (buffer.length > 0)
                            return report(Token.InlineText);
                        continue;
                    }

                    switch (c)
                    {
                        case '\n':
                        case '|':
                            states.pop();
                            if (buffer.length > 0)
                                return report(Token.InlineText);

                            continue;

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.LimboMultilineText:
                case State.MultilineText:
                    if (prevChar == '<' && isLetter(c))
                    {
                        buffer.pop();

                        var res = report(state.state == State.LimboMultilineText ? Token.Text : Token.MultilineText);

                        buffer.push(c);
                        pushState(State.TagName);
                        return res;
                    }

                    switch (c)
                    {
                        case ':':
                            if (buffer.length==0 && !state.options.newline)
                            {
                                state.options.raw = true;
                                continue;
                            }
                            break;


                        case '\n':
                            if (buffer.length==0 && !state.options.newline) {
                                state.options.newline = true;
                                continue;
                            }

                            break;

                        case '"':
                            if (buffer.length==0 && !state.options.newline)
                            {
                                pushState(State.QuotedText);
                                continue;
                            }
                            break;

                        case '>':
                            if (prevChar=='\n' || prevChar == '"') {
                                buffer.pop();
                                states.pop();
                                if (buffer.length > 0)
                                    return report(state.state == State.LimboMultilineText ? Token.Text : Token.MultilineText, state.options.raw);
                                continue;
                            }
                            buffer.push(c);
                            continue;
                    }

                    buffer.push(c);
                    continue;

                case State.Attributes:
                    switch (c)
                    {
                        case '}':
                            states.pop();
                            continue;

                        case '\n':
                        case ' ':
                        case ',':
                        case '\t':
                            continue;

                        default:
                            clearBuffer();
                            buffer.push(c);
                            pushState(State.AttributeName);
                            continue;
                    }

                case State.AttributeName:
                    switch (c)
                    {
                        case ':':
                            states.pop();
                            pushState(State.AttributeValue);
                            return report(Token.AttributeName);

                        case ',':
                            states.pop();
                            return report(Token.AttributeName);

                        case '}':
                            states.pop();
                            states.pop();
                            return report(Token.AttributeName);

                        case ' ':
                            if (buffer.length == 0)
                                continue;
                            buffer.push(c);
                            continue;

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.AttributeValue:
                    switch (c)
                    {
                        case ' ':
                            if (buffer.length>0){
                                states.pop();
                                return report(Token.AttributeValue);
                            }
                            continue;

                        case ',':
                        case '\n':
                        case '\t':
                            states.pop();
                            return report(Token.AttributeValue);

                        case '}':
                            states.pop();
                            states.pop();
                            return report(Token.AttributeValue);

                        default:
                            if (buffer.length == 0 && c == '\"')
                            {
                                pushState(State.QuotedText);
                                continue;
                            }
                            buffer.push(c);
                            continue;
                    }

                case State.QuotedText:
                    switch (c)
                    {
                        case '\n':
                            if (buffer.length == 0)
                                continue;
                            break;

                        case '"':
                            if (prevChar=='"') {
                                buffer.push('"');
                                c = '\0';
                            }
                            continue;
                    }

                    if (buffer.length>0 && prevChar=='"') {
                        states.pop();
                        repeatLast(prevChar);
                        continue;
                    }

                    buffer.push(c);
                    continue;
            }
        }
    };

    this.parse = function()
    {
        var dummyParent = {},
            currentElement = dummyParent,
            lastElement = dummyParent;

        var parents = [];
        parents.push(dummyParent);

        var addToCurrent = false;
        var lastAttributeName = null;
        var tr;

        function addChild(el, child) {
            if (!el.children)
                el.children = [];
            el.children.push(child);
        }

        while (tr = this.read())
        {
            switch (tr.token)
            {
                case Token.Element:
                    lastElement = { name : tr.value };
                    if (addToCurrent)
                    {
                        addChild(currentElement, lastElement);
                        addToCurrent = false;
                    }
                    else
                    {
                        currentElement = lastElement;
                        addChild(parents[parents.length-1], currentElement);
                    }
                    break;


                case Token.InlineText:
                case Token.MultilineText:
                    addChild(lastElement, { text: tr.value, raw: tr.raw });
                    break;

                case Token.Text:
                    if (addToCurrent)
                    {
                        addChild(currentElement, { text: tr.value });
                        addToCurrent = false;
                    }
                    else
                    {
                        addChild(parents[parents.length-1], { text: tr.value });
                    }
                    break;

                case Token.IndentDecrease:
                    if (parents.length > 1)
                        currentElement = parents.pop();
                    break;

                case Token.EnterElement:
                    parents.push(lastElement);
                    break;

                case Token.AddToLastElement:
                    addToCurrent = true;
                    break;

                case Token.AttributeName:
                    lastAttributeName = tr.value;
                    if (lastAttributeName == '')
                        break;

                    if (lastElement.attributes == null)
                        lastElement.attributes = {};

                    lastElement.attributes[lastAttributeName] = null;
                    break;

                case Token.AttributeValue:
                    lastElement.attributes[lastAttributeName] = tr.value;
                    break;
            }
        }

        return dummyParent.children || [];
    }
};

module.exports = Parser;

},{"./Token":4}],4:[function(_dereq_,module,exports){
const Token = {
    None : 1,

    Element : 2,
    EndElement : 3,

    EnterElement : 4,
    AddToLastElement : 5,
    IndentDecrease : 6,

    InlineText : 7,
    MultilineText: 8,
    AttributeName: 9,
    AttributeValue: 10,
    Text: 11
};

module.exports = Token;

},{}],5:[function(_dereq_,module,exports){
/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 * @api private
 */

module.exports = function(html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

},{}],6:[function(_dereq_,module,exports){
var escape = _dereq_('escape-html');

function toHtml(niml) {
    var s = '';

    function process(els) {
        if (!els)
            return false;

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.name) {
                s += '<' + el.name;
                if (el.attributes)
                    for (var att in el.attributes) {
                        s += ' ' + att;
                        var v = el.attributes[att];
                        if (v != null) {
                            s += '="' + escape(v) + '"';
                        }
                    }

                s += '>';
                process(el.children);
                s += '</' + el.name + '>';
            } else if (el.text) {
                if (el.raw)
                    s+=el.text;
                else
                    s += escape(el.text);
            }
        }
    }

    process(niml);
    return s;
}

module.exports = toHtml;

},{"escape-html":5}]},{},[1])
(1)
});