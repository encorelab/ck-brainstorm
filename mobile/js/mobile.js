/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || new Skeletor.App();
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  var app = this.Skeletor.Mobile;

  app.config = null;
  app.requiredConfig = {
    drowsy: {
      url: 'string',
      db: 'string',
      username: 'string',
      password: 'string'
    },
    wakeful: {
      url: 'string'
    },
    login_picker:'boolean',
    runs:'object'
  };

  app.rollcall = null;
  app.cohorts = null;
  app.discussions = null;
  app.runId= null;
  app.users = null; // users collection
  app.username = null;

  var BASE_DATABASE = null;
  app.stateData = null;

  app.init = function() {
    /* CONFIG */
    app.loadConfig('../config.json');
    app.verifyConfig(app.config, app.requiredConfig);

    // Adding BasicAuth to the XHR header in order to authenticate with drowsy database
    // this is not really big security but a start
    var basicAuthHash = btoa(app.config.drowsy.username + ':' + app.config.drowsy.password);
    Backbone.$.ajaxSetup({
      beforeSend: function(xhr) {
        return xhr.setRequestHeader('Authorization',
            // 'Basic ' + btoa(username + ':' + password));
            'Basic ' + basicAuthHash);
      }
    });

    // TODO: should ask at startup
    BASE_DATABASE = app.config.drowsy.db;

    // hide all rows initially
    app.hideAllContainers();

    if (app.rollcall === null) {
      app.rollcall = new Rollcall(app.config.drowsy.url, BASE_DATABASE);

      app.cohorts = new app.rollcall.Cohorts();
      app.cohorts.fetch();

      app.discussions = new app.rollcall.Discussions();
      app.discussions.fetch();
    }

    setProjectName(app.config.project_name);

    /* ======================================================
     * Function to enable click listeners in the UI
     * Beware: some click listeners might belong into Views
     * ======================================================
     */
    setUpClickListeners();

    // check for username cookie and sign in if cookie found
    var cookieUsername = jQuery.cookie(app.config.project_code + '_mobile_username');
    if (cookieUsername) {
      signin(cookieUsername);
    }

    /* MISC */
    jQuery().toastmessage({
      position : 'middle-center'
    });
  };

  app.initRun = function(runId) {
    /* pull users, then initialize the model and wake it up, then pull everything else */
    Skeletor.Model.init(app.config.drowsy.url, BASE_DATABASE+'-'+runId)
    .then(function () {
      console.log('model initialized - now waking up');
      return Skeletor.Model.wake(app.config.wakeful.url);
    })
    .done(function () {
      console.log('model awake - now calling ready');
      runReady();
    });
  };

  var runReady = function() {
    /* ======================================================
     * Setting up the Backbone Views to render data
     * coming from Collections and Models
     * ======================================================
     */
    if (app.inputView === null) {
      app.inputView = new app.View.InputView({
        el: '#notes-screen-input',
        collection: Skeletor.Model.awake.notes
      });
    }

    if (app.listView === null) {
      app.listView = new app.View.ListView({
        el: '#list-screen',
        collection: Skeletor.Model.awake.notes
      });
    }

    /*
    * ======================================
    * Buttons that manage the naviation
    * ======================================
    */
    jQuery('.write-button').click(function() {
      if (app.username) {
        jQuery('.navigation li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllContainers();
        jQuery('#write-screen').removeClass('hidden');
      }
    });

    jQuery('.read-button').click(function() {
      if (app.username) {
        jQuery('.navigation li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllContainers();
        jQuery('#read-screen').removeClass('hidden');
      }
    });

    // show nav links
    jQuery('.write-button').removeClass('hidden');
    jQuery('.read-button').removeClass('hidden');

    jQuery('.container').addClass('hidden');
    jQuery('#write-screen').removeClass('hidden');
  };


  //*************** MAIN FUNCTIONS (RENAME ME) ***************//



  //*************** HELPER FUNCTIONS ***************//


  var idToTimestamp = function(id) {
    var timestamp = id.substring(0,8);
    var seconds = parseInt(timestamp, 16);
    return seconds;
    // date = new Date( parseInt(timestamp, 16) * 1000 );
    // return date;
  };

  /**
   *  Function where most of the click listener should be setup
   *  called very late in the init process, will try to look it with Promise
   */
  var setUpClickListeners = function () {
    // login user
    jQuery('#signin-button').click(function (event){
      event.preventDefault();
      var username = jQuery('.email').val();
      signin(username);
    });

    // click listener that log user out
    jQuery('#logout-user').click(function() {
      logoutUser();
    });
    /*
    * ======================================
    * Other click listeners for the UI
    * ======================================
    */
  };


  var setProjectName = function (name) {
    jQuery('.brand').text(name);
  };


  //*************** LOGIN FUNCTIONS ***************//

  app.loginUser = function (username) {
    // retrieve user with given username
    app.rollcall.user(username)
    .done(function (user) {
      if (user) {
        console.log(user.toJSON());

        app.username = username;

        jQuery.cookie(app.config.project_code + '_mobile_username', app.username, { expires: 1, path: '/' });
        // jQuery.cookie('hunger-games_mobile_username', app.username, { expires: 1, path: '/' });
        jQuery('.username-display').text(user.get('display_name'));

        hideLogin();
        showUsername();

        // clear the dashboard
        jQuery('#dashboard-screen .row-fluid').html('');

        //=============== populate dashboard screen
        var userCohorts = app.user.get('cohorts');

        var runFragmentTemplate = _.template(jQuery('#available-runs-template').text());
        _.each(userCohorts, function(uc) {
          var cohort = app.cohorts.get(uc);
          var discussionIds = cohort.get('discussions');
          _.each(discussionIds, function (dId) {
            var d = app.discussions.get(dId);

            var runFragment = runFragmentTemplate({id: d.id, 'token': d.get('token'), 'description': d.get('description'), 'created_at': d.get('created_at')});
            jQuery('#dashboard-screen .row-fluid').append(runFragment);
          });
        });

        // show dashboard to select run
        jQuery('#dashboard-screen').removeClass('hidden');


        //=============== populate dashboard screen
      } else {
        console.log('User '+username+' not found!');
        if (confirm('User '+username+' not found! Do you want to create the user to continue?')) {
            // Create user and continue!
            console.log('Create user and continue!');
        } else {
            // Do nothing!
            console.log('No user logged in!');
        }
      }
    });
  };

  var signin = function (identifier) {
    app.rollcall.identify(identifier).done(function (identifiedUser) {
      if (identifiedUser) {
        // alert("I know you :)");
        app.user = identifiedUser;
        app.username = identifiedUser.get('username');
        app.loginUser(app.username);
      } else {
        alert("Who are you?");
      }
    });
  };


  var logoutUser = function () {
    jQuery.removeCookie(app.config.project_code + '_mobile_username',  { path: '/' });
    jQuery.removeCookie(app.config.project_code + '_mobile_runId',  { path: '/' });
    // jQuery.removeCookie('hunger-games_mobile_username',  { path: '/' });
    // jQuery.removeCookie('hunger-games_mobile_runId',  { path: '/' });

    // to make reload not log us in again after logout is called we need to remove URL parameters
    if (window.location.search && window.location.search !== "") {
      var reloadUrl = window.location.origin + window.location.pathname;
      window.location.replace(reloadUrl);
    } else {
      window.location.reload();
    }
    return true;
  };

  var showLogin = function () {
    jQuery('.signin-bar').removeClass('hide');
  };

  var hideLogin = function () {
    jQuery('.signin-bar').addClass('hide');
  };


  var showUsername = function () {
    jQuery('.username-display').removeClass('hide');
    jQuery('.signout-bar').removeClass('hide');
  };

  var hideUsername = function() {
    jQuery('.username-display').addClass('hide');
    jQuery('.signout-bar').addClass('hide');
  };


  app.hideAllContainers = function () {
    jQuery('.container').each(function (){
      jQuery(this).addClass('hidden');
    });
  };


  /**
    Function that is called on each keypress on username input field (in a form).
    If the 'return' key is pressed we call loginUser with the value of the input field.
    To avoid further bubbling, form submission and reload of page we have to return false.
    See also: http://stackoverflow.com/questions/905222/enter-key-press-event-in-javascript
  **/
  app.interceptKeypress = function(e) {
    if (e.which === 13 || e.keyCode === 13) {
      //app.loginUser(jQuery('#username').val());
      return false;
    }
  };

  app.turnUrlsToLinks = function(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    var urlText = text.replace(urlRegex, '<a href="$1">$1</a>');
    return urlText;
    // return text.replace(urlRegex, function (url) {
    //     alert('<a href="' + url + '">' + url + '</a>');
    // });
  };


  this.Skeletor = Skeletor;

}).call(this);
