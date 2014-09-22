/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail, Skeletor */

(function() {
  "use strict";
  var CK = this.CK || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.Router = {};

  var AppRouter = Backbone.Router.extend({
    routes: {
      "run/:runid": "run",
      "*actions": "defaultRoute" // matches http://example.com/#anything-here
    }
  });
  // Initiate the router
  app.Router = new AppRouter();

  app.Router.on('route:defaultRoute', function(actions) {
    console.log("Hitting default route with actions: "+actions);
  });

  app.Router.on('route:run', function(runid){
    if (app.user) {
      // alert(runid);
      Skeletor.Mobile.initRun(runid);
    } else {
      var reloadUrl = window.location.origin + window.location.pathname;
      window.location.replace(reloadUrl);
    }
  });

  // Start Backbone history a necessary step for bookmarkable URL's
  Backbone.history.start();

  this.CK = CK;
}).call(this);