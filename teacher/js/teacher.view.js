/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = {};


  /**
    ListView
  **/
  app.View.ListView = Backbone.View.extend({
    template: "#brainstorms-list-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ListView...', view.el);

      // view.collection.on('change', function(n) {
      //   view.render();
      // });

      // view.collection.on('add', function(n) {
      //   view.render();
      // });

      view.render();

      return view;
    },

    events: {
      // nothing here yet, but could be click events on list items to have actions (delete, response and so forth)
    },

    render: function () {
      var view = this;
      console.log("Rendering ListView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // Only want to show published notes at some point
      //var publishedNotes = view.collection.where({published: true});

      // _.each(publishedNotes, function(note){
      //   var me_or_others = 'others';
      //   // add class 'me' or 'other' to note
      //   if (note.get('author') === app.username) {
      //     me_or_others = 'me';
      //   }

      //   //
      //   var listItem = _.template(jQuery(view.template).text(), {'id': note.id, 'text': note.get('body'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});

      //   var existingNote = list.find("[data-id='" + note.id + "']");

      //   if (existingNote.length === 0) {
      //     list.append(listItem);
      //   } else {
      //     existingNote.replaceWith(listItem);
      //   }
      // });

    }

  });

  this.HG = HG;
}).call(this);
