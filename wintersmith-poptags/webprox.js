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
    // stylesheets tag
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
    // TODO javascript tag...etc...
}


exports.setup = function(base, templates, locals) {
    // add layouts and includes
    addTemplates(base, templates);

    // add built in tags
    addTags(base, locals);

    // give our scope a webpop flavour
    locals.contents_tree = locals.contents;
    locals.contents = locals.page;
    locals.contents.body = {html: locals.page.html};
}