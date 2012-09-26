path = require 'path'
fs = require 'fs'
poptags = require './poptags'

module.exports = (wintersmith, callback) ->

  class PopTagsTemplate extends wintersmith.TemplatePlugin

    constructor: (@tpl) ->

    render: (locals, callback) ->
      try
        callback null, new Buffer @tpl(locals)
      catch error
        callback error

  PopTagsTemplate.fromFile = (filename, base, callback) ->  
    fs.readFile path.join(base, filename), (error, contents) ->
      if error then callback error
      else
        try
          tpl = (locals) ->
            # main template
            templates = {main: contents.toString()}
            # layouts - for now this only works with a flat directory structure
            #           (all .tpl files in the root of /layouts are made available)
            #           %TODO% nested sub dirs
            layouts_dir = path.join base, 'layouts'
            layouts = (partial for partial in fs.readdirSync layouts_dir when /.tpl$/i.test(partial))
            add_layout = (layout) ->
              name = layout.split(".",1)[0]
              templates[path.join 'layouts', name] = fs.readFileSync(path.join(layouts_dir, layout)).toString()
            add_layout layout for layout in layouts
            # includes - for now this only works with a flat directory structure
            #           (all .tpl files in the root of /layouts are made available)
            #           %TODO% nested sub dirs
            includes_dir = path.join base, 'includes'
            includes = (partial for partial in fs.readdirSync includes_dir when /.tpl$/i.test(partial))
            add_include = (include) ->
              name = include.split(".",1)[0]
              templates[path.join 'includes', name] = fs.readFileSync(path.join(includes_dir, include)).toString()
            add_include include for include in includes
            # partials - for now this only works with a flat directory structure
            #           (all .tpl files in the root of the templates dir are made available)
            #           %TODO% nested sub dirs - then we could make all non layout templates
            #           available and drop the includes step above
            partials = (partial for partial in fs.readdirSync base when /.tpl$/i.test(partial))
            add_partial = (partial) ->
              name = partial.split(".",1)[0]
              templates[path.join name] = fs.readFileSync(path.join(base, partial)).toString()
            add_partial partial for partial in partials
            read = (name) -> templates[name]
            template = new poptags.Template {
              read: read
              name: 'main'
            }
            console.log templates
            # give our scope a webpop flavour
            # %TODO% add more webpop'ness as we need it e.g. in built tags, extensions...
            locals.contents_tree = locals.contents
            locals.contents = locals.page
            template.render(locals)
          callback null, new PopTagsTemplate tpl
        catch error
          callback error

  wintersmith.registerTemplatePlugin '**/*.tpl', PopTagsTemplate
  callback()