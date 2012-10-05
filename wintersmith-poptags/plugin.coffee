path = require 'path'
fs = require 'fs'
poptags = require './poptags'
webprox = require './webprox'

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
            # setup pseudo webpop environment
            # TODO add more webpop'ness as we need it e.g. in built tags, extensions...
            # TODO rewrite webprox in coffeescript :)
            templates = webprox.templates(base)

            # set main template (current template)
            templates.main = contents.toString()
            read = (name) -> templates[name]
            template = new poptags.Template {
              read: read
              name: 'main'
            }

            # give our scope a webpop flavour
            locals.contents_tree = locals.contents
            locals.contents = locals.page

            template.render(locals)
          callback null, new PopTagsTemplate tpl
        catch error
          callback error

  wintersmith.registerTemplatePlugin '**/*.tpl', PopTagsTemplate
  callback()