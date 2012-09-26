// Generated by CoffeeScript 1.3.3
(function() {
  var Ast, CONSTANTS, EnclosingTag, Node, Parser, Tag, Template, TemplateError, breakFn, delimitFn, escapeHtml, separateFn, wrap,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CONSTANTS = {
    LAYOUT_TAG: 'layout',
    INCLUDE_TAG: 'include',
    REGION_TAG: 'region',
    BLOCK_TAG: 'block',
    START_TAG_RE: /^<pop:(\w+[a-zA-Z0-9_:\.-]*)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')))?)*)\s*\/?>/,
    END_TAG_RE: /^<\/pop:(\w+[a-zA-Z0-9_:\.-]*)\s*>/,
    SELF_CLOSING_RE: /\/>$/m,
    ATTRIBUTES_RE: /(\w+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')))/g,
    START_TAG: "<pop:",
    END_TAG: "</pop:",
    COMMENT_TAG: "<!--",
    COMMENT_TAG_END: "-->",
    CONTAINS_TAGS_RE: /<pop:/,
    SELF_CLOSING: {
      br: true,
      hr: true
    }
  };

  escapeHtml = function(html) {
    return new String(html).replace(/&/gmi, '&amp;').replace(/'/gmi, '&#x27;').replace(/"/gmi, '&quot;').replace(/>/gmi, '&gt;').replace(/</gmi, '&lt;');
  };

  wrap = function(text, tag, klass) {
    var result;
    if (!(tag && text)) {
      return text;
    }
    result = "<" + tag;
    if (klass) {
      result += " class=\"" + klass + "\"";
    }
    return "" + result + ">" + text + "</" + tag + ">";
  };

  breakFn = function(c, separator, last) {
    if (!/^[a-zA-Z]+$/.test(separator)) {
      return separateFn(c, separator, last);
    }
    if (CONSTANTS.SELF_CLOSING[separator]) {
      return separateFn(c, '<' + separator + ' />');
    }
    return delimitFn('<' + separator + '>', '</' + separator + '>');
  };

  separateFn = function(c, separator, last) {
    var end;
    end = c.length - 1;
    return function(value, index) {
      if (index === end) {
        separator = last || separator;
      }
      if (index === 0) {
        return value;
      } else {
        return separator + value;
      }
    };
  };

  delimitFn = function(open, close) {
    open || (open = '');
    close || (close = '');
    return function(value) {
      return open + value + close;
    };
  };

  TemplateError = (function(_super) {

    __extends(TemplateError, _super);

    function TemplateError(message, location, filename) {
      this.name = "TemplateError";
      this.message = message;
      this.location = location;
      this.filename = filename;
    }

    return TemplateError;

  })(Error);

  Ast = (function() {

    function Ast(require, filters, value_wrapper) {
      this.require = require;
      this.filters = filters;
      this.value_wrapper = value_wrapper;
      this.root = new EnclosingTag;
      this.current_tag = this.root;
      this.layout = null;
      this.includes = {};
    }

    Ast.prototype.start_document = function(parser) {};

    Ast.prototype.end_document = function(parser) {
      if (this.current_tag === this.root) {
        if (this.layout) {
          return this._handle_layout(parser, this.layout);
        }
      } else if (this.current_tag.parent && !this.current_tag.include_tag && !this.current_tag.layout_tag) {
        return this.no_closing_tag(parser, this.current_tag.name);
      }
    };

    Ast.prototype.start_tag = function(parser, name, options) {
      var key, new_tag, _;
      new_tag = new Tag(name, this.current_tag, options, this.require, this);
      new_tag.value_wrapper = this.value_wrapper;
      new_tag.position = parser.position;
      if (name === CONSTANTS.BLOCK_TAG) {
        if (!this.layout) {
          this.block_tag_without_layout(parser, name);
        }
        this.layout.blocks[options.region] = new_tag;
        return this.current_tag = new_tag;
      } else {
        if (name === CONSTANTS.LAYOUT_TAG) {
          if (this.layout) {
            this.layout_already_defined(parser, name);
          }
          this.layout = new_tag;
        }
        if (options && this.filters) {
          for (key in options) {
            if (!__hasProp.call(options, key)) continue;
            _ = options[key];
            if (this.filters[key]) {
              new_tag.add_filter(this.filters[key]);
            }
          }
        }
        this.current_tag.push(new_tag);
        return this.current_tag = new_tag;
      }
    };

    Ast.prototype.end_tag = function(parser, name) {
      while (!this.current_tag.is_closing(name)) {
        this.current_tag = this.current_tag.parent;
        if (!(this.current_tag && this.current_tag.parent)) {
          this.unmatched_closing_tag(parser, name);
        }
      }
      if (name === CONSTANTS.INCLUDE_TAG) {
        this._handle_include(parser, this.current_tag);
      }
      return this.current_tag = this.current_tag.parent;
    };

    Ast.prototype.text = function(parser, text) {
      return this.current_tag.push(text);
    };

    Ast.prototype._handle_include = function(parser, include_tag) {
      var template, template_name;
      template_name = include_tag.options.template;
      template = this.includes[template_name];
      if (template_name.render) {
        include_tag.read = parser.read;
        return include_tag.require = this.require;
      } else if (template) {
        return include_tag.enclosing = template.enclosing;
      } else {
        this.includes[template_name] = include_tag;
        return new Parser(parser.read).parse(parser.read(template_name), this, template_name);
      }
    };

    Ast.prototype._handle_layout = function(parser, layout) {
      var layout_name;
      layout_name = layout.options.name;
      if (layout_name.render) {
        layout.read = parser.read;
        return layout.require = this.require;
      } else {
        this.current_tag = layout;
        return new Parser(parser.read).parse(parser.read("layouts/" + layout_name), this, "layouts/" + layout_name);
      }
    };

    Ast.prototype.unmatched_closing_tag = function(parser, name) {
      throw new TemplateError("closing tag </pop:" + name + "> did not match any opening tag", parser.get_location(), parser.filename);
    };

    Ast.prototype.no_closing_tag = function(parser, name) {
      throw new TemplateError("no closing tag for <pop:" + name + ">", parser.get_location(this.current_tag.position), parser.filename);
    };

    Ast.prototype.block_tag_without_layout = function(parser, name) {
      throw new TemplateError("block tag without layout", parser.get_location(), parser.filename);
    };

    Ast.prototype.layout_already_defined = function(parser, name) {
      throw new TemplateError("layout already defined", parser.get_location(), parser.filename);
    };

    return Ast;

  })();

  Parser = (function() {

    function Parser(read) {
      this.read = read;
    }

    Parser.prototype.next_tag_index = function(next_start, next_end, next_comment) {
      if (next_start < 0 && next_end < 0 && next_comment < 0) {
        return -1;
      }
      return Math.min(next_start < 0 ? Infinity : next_start, next_end < 0 ? Infinity : next_end, next_comment < 0 ? Infinity : next_comment);
    };

    Parser.prototype.get_line_number = function(template, position) {
      var newlines;
      newlines = template.substring(0, position).match(/\n/g);
      if (newlines) {
        return newlines.length + 1;
      } else {
        return 1;
      }
    };

    Parser.prototype.get_character = function(template, line_number, position) {
      return template.split(/\n/).slice(0, (line_number - 1) + 1 || 9e9).join("").length;
    };

    Parser.prototype.get_location = function(position) {
      var line_number;
      line_number = this.get_line_number(this.template, position || this.position);
      return {
        line: line_number,
        character: this.get_character(this.template, line_number, position || this.position)
      };
    };

    Parser.prototype.parse = function(template, handler, filename) {
      var next_tag_index, offset, options, parser, tag, tag_attributes, tag_match, tag_name, tags, template_chunk, text, _i, _len;
      parser = this;
      template_chunk = template;
      offset = 0;
      this.template = template;
      this.filename = filename;
      this.position = 0;
      handler.start_document(this);
      while (template_chunk) {
        tag_match = null;
        if (template_chunk.indexOf(CONSTANTS.COMMENT_TAG) === 0) {
          tag_match = true;
          next_tag_index = template_chunk.indexOf(CONSTANTS.COMMENT_TAG_END);
          text = next_tag_index < 0 ? template_chunk : template_chunk.substring(0, next_tag_index);
          handler.text(this, text);
          offset = next_tag_index < 0 ? template_chunk.length : next_tag_index;
        } else if (template_chunk.indexOf(CONSTANTS.START_TAG) === 0) {
          if (!(tag_match = template_chunk.match(CONSTANTS.START_TAG_RE))) {
            throw new TemplateError("syntax error", this.get_location(), this.filename);
          }
          tags = null;
          options = {};
          tag_name = tag_match[1];
          tag_attributes = tag_match[2];
          if (tag_name.indexOf('.') !== 1) {
            tags = tag_name.split('.');
            tag_name = tags.pop();
            for (_i = 0, _len = tags.length; _i < _len; _i++) {
              tag = tags[_i];
              handler.start_tag(this, tag, {});
            }
          }
          if (tag_attributes) {
            tag_attributes.replace(CONSTANTS.ATTRIBUTES_RE, function(match, name, doublequoted_value, singlequoted_value) {
              var value;
              value = doublequoted_value || singlequoted_value;
              if (value && value.match(CONSTANTS.CONTAINS_TAGS_RE)) {
                options[name] = new Template({
                  template: value,
                  filters: handler.filters,
                  read: this.read,
                  require: handler.require
                }).compile();
                return options[name].parent = handler.current_tag;
              } else {
                return options[name] = value;
              }
            });
          }
          handler.start_tag(this, tag_name, options);
          offset = tag_match[0].length;
          if (tag_match[0].match(CONSTANTS.SELF_CLOSING_RE)) {
            handler.end_tag(this, tag_name);
            if (tags) {
              while (tag = tags.pop()) {
                handler.end_tag(this, tag);
              }
            }
          }
        } else if (template_chunk.indexOf(CONSTANTS.END_TAG) === 0) {
          tag_match = template_chunk.match(CONSTANTS.END_TAG_RE);
          if (!tag_match) {
            throw new TemplateError("syntax error", this.get_location(), this.filename);
          }
          tags = null;
          tag_name = tag_match[1];
          if (tag_name.indexOf('.') !== -1) {
            tags = tag_name.split('.');
            tag_name = tags.pop();
          }
          handler.end_tag(this, tag_name);
          if (tags) {
            while (tag = tags.pop()) {
              handler.end_tag(this, tag);
            }
          }
          offset = tag_match[0].length;
        }
        if (!tag_match) {
          next_tag_index = this.next_tag_index(template_chunk.indexOf(CONSTANTS.START_TAG), template_chunk.indexOf(CONSTANTS.END_TAG), template_chunk.indexOf(CONSTANTS.COMMENT_TAG));
          text = next_tag_index < 0 ? template_chunk : template_chunk.substring(0, next_tag_index);
          handler.text(this, text);
          offset = next_tag_index < 0 ? template_chunk.length : next_tag_index;
        }
        if (offset === 0) {
          throw new TemplateError("syntax error", this.get_location(), this.filename);
        }
        this.position += offset;
        template_chunk = template_chunk.substring(offset);
      }
      return handler.end_document(this);
    };

    return Parser;

  })();

  Node = (function() {

    function Node() {}

    Node.prototype.render = function() {};

    Node.prototype.push = function() {};

    return Node;

  })();

  EnclosingTag = (function(_super) {

    __extends(EnclosingTag, _super);

    function EnclosingTag() {
      this.collection = [];
      this.lastEmpty = null;
    }

    EnclosingTag.prototype.render = function(scope) {
      var child, rendered_children;
      this.scope = scope;
      rendered_children = (function() {
        var _i, _len, _ref, _results;
        _ref = this.collection;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          if (child.render != null) {
            _results.push(child.render(scope));
          } else {
            _results.push(child.toString());
          }
        }
        return _results;
      }).call(this);
      return rendered_children.join("");
    };

    EnclosingTag.prototype.push = function(obj) {
      obj.index = this.collection.length;
      return this.collection.push(obj);
    };

    EnclosingTag.prototype.is_empty = function() {
      return this.collection.length === 0;
    };

    EnclosingTag.prototype.is_closing = function() {
      return false;
    };

    return EnclosingTag;

  })(Node);

  Tag = (function(_super) {

    __extends(Tag, _super);

    function Tag(name, parent, options, require, ast) {
      var no_tag, route;
      route = name.split(':');
      this.qualified_name = name;
      this.name = route.pop();
      this.module = route.pop();
      no_tag = this.name.match(/^not?_(.+)/);
      this.module_scope = {};
      this.filters = [];
      this.enclosing = new EnclosingTag;
      this.blocks = {};
      this.parent = parent;
      this.options = options || {};
      this.require = require;
      this.ast = ast;
      this.no_tag = no_tag && (this.module ? "" + this.module + ":" + no_tag[1] : no_tag[1]);
      this.include_tag = this.qualified_name.toLowerCase() === CONSTANTS.INCLUDE_TAG;
      this.region_tag = this.qualified_name.toLowerCase() === CONSTANTS.REGION_TAG;
      this.block_tag = this.qualified_name.toLowerCase() === CONSTANTS.BLOCK_TAG;
      this.layout_tag = this.qualified_name.toLowerCase() === CONSTANTS.LAYOUT_TAG;
    }

    Tag.prototype.push = function(obj) {
      return this.enclosing.push(obj);
    };

    Tag.prototype.is_closing = function(name) {
      return name === this.qualified_name;
    };

    Tag.prototype.has_children = function() {
      return this.enclosing.collection.length > 0;
    };

    Tag.prototype.add_filter = function(filter) {
      return this.filters.push(filter);
    };

    Tag.prototype.get_option = function(name) {
      var opt;
      opt = this.options[name];
      if (opt && opt.render) {
        return opt.render(this.scope);
      } else {
        return opt;
      }
    };

    Tag.prototype.get_block = function() {
      var tag;
      tag = this;
      while (!(tag.blocks && tag.blocks[this.options.name]) && tag.parent) {
        tag = tag.parent;
      }
      return tag.blocks && tag.blocks[this.options.name];
    };

    Tag.prototype.get_value = function() {
      var tag;
      if (this.module) {
        this.module_scope = this.require(this.module);
      }
      tag = this;
      while (!(this.name in this.module_scope || this.name in tag.scope) && (tag.parent && tag.parent.scope)) {
        tag = tag.parent;
      }
      this._tag_fn_scope = tag.scope;
      if (this.value_wrapper) {
        return this.value_wrapper.wrap(this.module_scope[this.name] || tag.scope[this.name], this);
      } else {
        return this.module_scope[this.name] || tag.scope[this.name];
      }
    };

    Tag.prototype.default_value = function() {
      var def;
      def = this.get_option('default');
      if (def) {
        return def;
      }
      this.parent.last_empty = this.qualified_name;
      return "";
    };

    Tag.prototype.tags = function(filter) {
      var tag, tags, _i, _j, _len, _len1, _ref, _ref1, _results, _results1;
      tags = [];
      if (filter) {
        _ref = this.enclosing.collection;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tag = _ref[_i];
          if (tag.render && filter(tag)) {
            _results.push(tag);
          }
        }
        return _results;
      } else {
        _ref1 = this.enclosing.collection;
        _results1 = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          tag = _ref1[_j];
          _results1.push(tag);
        }
        return _results1;
      }
    };

    Tag.prototype.render_options = function() {
      var key, options;
      options = {};
      for (key in this.options) {
        options[key] = this.get_option(key);
      }
      return options;
    };

    Tag.prototype.render_collection = function(c) {
      var brk, fn, index, result, self, _first, _last;
      if (!c.length) {
        return "";
      }
      if (this.options.repeat === "false") {
        return this.enclosing.render({
          length: c.length,
          values: c.length && function(options, enclosing) {
            var limit, skip;
            if (options.skip || options.limit) {
              skip = options.skip ? parseInt(options.skip, 10) : 0;
              limit = options.limit ? parseInt(options.limit, 10) : c.length;
              return c.slice(skip, skip + limit);
            } else {
              return c;
            }
          }
        });
      }
      self = this;
      brk = this.get_option('break');
      fn = brk && breakFn(c, brk, this.get_option('last'));
      result = [];
      index = 0;
      _first = self.scope.first;
      _last = self.scope.last;
      c.forEach(function(el) {
        var value;
        self.scope.first = index === 0;
        self.scope.last = index === c.length - 1;
        value = self.render_value(self.value_wrapper ? self.value_wrapper.wrap(el, self) : el);
        value = fn ? fn.call(self, value, index) : value;
        index++;
        return result.push(value);
      });
      if (_first != null) {
        self.scope.first = _first;
      } else {
        delete self.scope.first;
      }
      if (_last != null) {
        self.scope.last = _last;
      } else {
        delete self.scope.last;
      }
      return result.join("");
    };

    Tag.prototype.render_object = function(obj) {
      var value;
      if (obj || obj === 0) {
        if (this.has_children()) {
          return this.enclosing.render(typeof obj === 'object' ? obj : {
            value: obj
          });
        } else if (typeof obj === 'object' && 'html' in obj) {
          value = obj.html && (obj.html.call ? obj.html.call(obj, this.render_options()) : obj.html);
          return value || (value === 0 ? value : '');
        }
        if (this.options.escape === "false") {
          return obj.toString();
        } else {
          return escapeHtml(obj.toString());
        }
      }
    };

    Tag.prototype.render_function = function(value) {
      var enclosing_wrapper, options, result, self;
      options = this.render_options();
      self = this;
      enclosing_wrapper = {
        render: function() {
          this.rendered = true;
          return self.enclosing.render.apply(self.enclosing, arguments);
        },
        skip: function() {
          return this.rendered = true;
        },
        tags: function(filter) {
          return self.tags(filter);
        }
      };
      this.scope.lookup = function(name) {
        var tag;
        tag = self;
        while (tag) {
          if (tag.scope[name]) {
            return tag.scope[name];
          }
          tag = tag.parent;
        }
        return void 0;
      };
      result = value.call(this._tag_fn_scope || value, options, enclosing_wrapper, this.scope);
      if (this.value_wrapper) {
        result = this.value_wrapper.wrap(result, this);
      }
      if (enclosing_wrapper.rendered) {
        return result;
      } else {
        return this.render_value(result);
      }
    };

    Tag.prototype.render_boolean = function(value) {
      if (this.enclosing.is_empty()) {
        return value.toString();
      } else if (value) {
        return this.enclosing.render(this.scope) || this.default_value();
      } else {
        return this.default_value();
      }
    };

    Tag.prototype.render_value = function(value) {
      var val;
      if (value && value.forEach) {
        return this.render_collection(value) || this.default_value();
      }
      if (value === true || value === false) {
        return this.render_boolean(value);
      }
      if (value && value.call) {
        return this.render_function(value);
      }
      val = this.render_object(value);
      return val || (val === 0 ? val : this.default_value());
    };

    Tag.prototype.render_region = function(block) {
      return wrap(this.with_filters((block ? block.render(this.scope) : this.enclosing.render()), this.options), this.get_option('wrap'), this.get_option('class'));
    };

    Tag.prototype.with_filters = function(value) {
      var filter, _i, _len, _ref;
      if (this.filters.length) {
        _ref = this.filters;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          filter = _ref[_i];
          value = filter(value, this.render_options());
        }
      }
      return value;
    };

    Tag.prototype.render = function(scope) {
      var layout_name, template_name;
      this.scope = scope || {};
      if (this.no_tag) {
        if (this.no_tag === this.parent.last_empty) {
          return wrap(this.with_filters(this.enclosing.render(this.scope), this.options), this.get_option('wrap'), this.get_option('class'));
        } else {
          return '';
        }
      } else {
        this.parent.last_empty = null;
      }
      if (this.include_tag && this.options.template.render) {
        template_name = this.options.template.render(this.scope);
        this.enclosing = new Template({
          name: template_name,
          read: this.read,
          require: this.require,
          filters: this.ast.filters,
          value_wrapper: this.value_wrapper
        }).compile();
        this.enclosing.parent = this;
      }
      if (this.layout_tag && this.options.name.render) {
        layout_name = this.options.name.render(this.scope);
        this.enclosing = new Template({
          name: "layouts/" + layout_name,
          read: this.read,
          require: this.require,
          filters: this.ast.filters,
          value_wrapper: this.value_wrapper
        }).compile();
        this.enclosing.parent = this;
      }
      if (this.include_tag || this.layout_tag || this.block_tag) {
        return this.enclosing.render(this.scope);
      }
      if (this.region_tag) {
        return this.render_region(this.get_block());
      }
      return wrap(this.with_filters(this.render_value(this.get_value()), this.options), this.get_option('wrap'), this.get_option('class'));
    };

    return Tag;

  })(Node);

  Template = (function() {

    function Template(options) {
      this.read = options.read;
      this.require = options.require;
      this.template = options.template || this.read(options.name);
      this.name = options.name;
      this.filters = options.filters;
      this.value_wrapper = options.value_wrapper;
    }

    Template.prototype.compile = function() {
      var ast;
      ast = new Ast(this.require, this.filters, this.value_wrapper);
      new Parser(this.read).parse(this.template, ast, this.name);
      return ast.root;
    };

    Template.prototype.render = function(scope) {
      return this.compile().render(scope);
    };

    return Template;

  })();

  if (typeof exports !== "undefined" && exports !== null) {
    exports.Template = Template;
    exports.TemplateError = TemplateError;
  }

  if (typeof window !== "undefined" && window !== null) {
    window.PopTags = {
      Template: Template,
      escapeHtml: escapeHtml
    };
  }

}).call(this);
