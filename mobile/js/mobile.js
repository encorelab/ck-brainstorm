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
      uic_url: 'string'
    },
    wakeful: {
      url: 'string'
    },
    login_picker:'boolean',
    runs:'object'
  };

  app.rollcall = null;
  app.runId= null;
  app.users = null; // users collection
  app.username = null;
  app.runState = null;
  app.userState = null;
  app.numOfStudents = 0;

  var BASE_DATABASE = null;
  app.stateData = null;

  app.currentNote = null;
  app.currentReply = {};

  app.inputView = null;
  app.listView = null;
  // app.loginButtonsView = null;

  app.keyCount = 0;
  app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);

  app.init = function() {
    /* CONFIG */
    app.loadConfig('../config.json');
    app.verifyConfig(app.config, app.requiredConfig);

    // TODO: should ask at startup
    BASE_DATABASE = app.config.drowsy.db;

    // hide all rows initially
    app.hideAllContainers();

    if (app.rollcall === null) {
      app.rollcall = new Rollcall(app.config.drowsy.url, BASE_DATABASE);
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

  var initRun = function(runId) {
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

    jQuery('#read-screen').removeClass('hidden');
  };


  //*************** MAIN FUNCTIONS (RENAME ME) ***************//

  app.addNote = function(noteData) {
    app.currentNote = new Model.Note(noteData);
    app.currentNote.wake(app.config.wakeful.url);
    app.currentNote.save();
    Model.awake.notes.add(app.currentNote);
    return app.currentNote;
  };

  app.saveCurrentNote = function() {
    // app.currentNote.published = true;
    app.currentNote.save();
    app.currentNote = null;
  };

  app.createReply = function(noteId) {
    app.currentReply.content = '';
    app.currentReply.author = app.username;
    app.currentReply.related_note_id = noteId;
  };

  app.saveCurrentReply = function(replyText) {
    var note = Skeletor.Model.awake.notes.get(app.currentReply.related_note_id);
    note.addBuildOn(app.username, replyText);
    note.wake(app.config.wakeful.url);
    note.save();
    app.currentReply = {};
  };


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
    jQuery('#signin-button').click(function (){
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
        jQuery('.username-display a').text(user.get('display_name'));

        hideLogin();
        showUsername();

        //=============== populate dashboard screen
        app.rollcall.runs({"class":{"$in":["ec101","ec102"]}})
        .done(function(runsArray) {
          console.log(runsArray.toJSON());
          runsArray.each(function(run){
            jQuery('#dashboard-screen .row-fluid').append(JSON.stringify(run));
          });

          // show dashboard to select run
          jQuery('#dashboard-screen').removeClass('hidden');
        });
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


  app.autoSave = function(model, inputKey, inputValue, instantSave) {
    app.keyCount++;
    //console.log("  saving stuff as we go at", app.keyCount);

    // if (model.kind === 'buildOn') {
    //   if (instantSave || app.keyCount > 9) {
    //     // save to buildOn model to stay current with view
    //     // app.buildOn = inputValue;
    //     // save to contribution model so that it actually saves
    //     // var buildOnArray = app.contribution.get('build_ons');
    //     // var buildOnToUpdate = _.find(buildOnArray, function(b) {
    //     //   return b.author === app.userData.account.login && b.published === false;
    //     // });
    //     // buildOnToUpdate.content = inputValue;
    //     // app.contribution.set('build_ons',buildOnArray);
    //     // app.contribution.save(null, {silent:true});
    //     // app.keyCount = 0;
    //   }
    // } else {
      if (instantSave || app.keyCount > 9) {
        console.log('Saved');
        model.set(inputKey, inputValue);
        model.save(null, {silent:true});
        app.keyCount = 0;
      }
    //}
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
