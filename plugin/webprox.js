var fs = require('fs');
var path = require('path');

var processFilesRecursive = function (dir, processor) {
    var files = fs.readdirSync(dir);
    files.forEach(function(file) {
        file = path.join(dir,file);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            processFilesRecursive(file, processor);
        } else if (stat && stat.isFile()) {
            processor.process(file, stat);
        }
    });
}

var addTemplates = function(base, templates) {
    var processor = {
        base: base,
        context: 'layouts,includes',
        templates: templates,
        process: function(file,stat) {
            if (/.tpl$/i.test(file)) {
                var name = file.split(".",1)[0].replace((path.join(this.base,'/')),'');
                this.templates[name] = fs.readFileSync(file).toString();
            }
        }
    }
    processFilesRecursive(base, processor);
}

var addTags = function(base, locals) {
    // stylesheet tag
    locals.stylesheet = {
        html: { call:
            function(obj, render_options) {
                // TODO build timestamp based on last modified of css file
                var timestamp = new Date().getTime();
                return "<link rel='stylesheet' href='" +
                       render_options.name + "?" + timestamp +
                       "' media='all'/>"
            }
        }

    };
    // javascript tag
    locals.javascript = {
        html: { call:
            function(obj, render_options) {
                // TODO build timestamp based on last modified of js file
                var timestamp = new Date().getTime();
                return "<script src='" +
                    render_options.name + "?" + timestamp +
                    "'></script>"
            }
        }

    };
    // TODO keep going with the built in tags! ...
}

var addFilters = function() {
    // TODO...
    filters = {
        format: function(value, options) {
            switch(options.format) {
                case "upcase":
                    return value.toUpperCase();
                case "downcase":
                    return value.toLowerCase();
            }
            return value;
        }
    };
}

var addExtensions = function(base, modules) {
    if (path.existsSync(base)) {
        var processor = {
            base: base,
            context: 'extensions',
            modules: modules,
            process: function(file,stat) {
                if (/.js$/i.test(file)) {
                    var name = file.split(".",1)[0].replace((path.join(this.base,'/')),'');
                    var o = require('../../' + path.join('extensions',name));
                    modules[name] = o;
                }
            }
        }
        processFilesRecursive(base, processor);
    }
}

exports.setup = function(base, locals, templates, filters, modules) {
    // add layouts and includes
    addTemplates(base, templates);

    // add built in tags
    addTags(base, locals);

    // add filters
    addFilters(base, locals)

    // add extensions
    addExtensions(path.join(base,'../extensions'), modules);

    // give our scope a webpop flavour
    locals.contents_tree = locals.contents;
    locals.contents = locals.page;
    if (locals.page && locals.page.html) {
        locals.contents.body = {html: locals.page.html};
    }
}