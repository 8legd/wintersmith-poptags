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

var _templates;
exports.templates = function(base) {
    if(!_templates) {
        var processor = {
            base: base,
            context: 'layouts,includes',
            templates: {},
            process: function(file,stat) {
                if (/.tpl$/i.test(file)) {
                    var name = file.split(".",1)[0].replace((path.join(this.base,'/')),'');
                    this.templates[name] = fs.readFileSync(file).toString();
                }
            }
        }
        processFilesRecursive(base, processor);
        _templates = processor.templates;
    }
    return _templates;
}