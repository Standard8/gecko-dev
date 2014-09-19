/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.ConversationStore = (function() {

  // XXX This is really an incoming call.
  var ConversationStore = Backbone.Model.extend({
    defaults: {
      loopToken: undefined,
      callStatus: "start"
    },

    initialize: function(attributes, options) {
      options = options || {};

      if (!options.client) {
        throw new Error("missing required client");
      }
      if (!options.dispatcher) {
        throw new Error("missing required dispatcher");
      }
      if (!options.hash) {
        throw new Error("missing required hash");
      }

      this.client = options.client;

      options.dispatcher.register(this, [
        "gatherCallData",
        "startOutgoingCall"
      ]);

      // We don't check validity here - the views should pick up on the
      // fact that loopToken is not defined.
      this.set({
        loopToken: options.hash.match(/\#call\/(.*)/)[1]
      });

      // XXX
      if (true) {
        this.listenTo(this, "change", this._logAttributes);
      }
    },

    _logAttributes: function() {
      console.log("conversationStore updated to", this.attributes);
    },

    gatherCallData: function() {
      console.log("gatherCallData");

      this.client.requestCallUrlInfo(this.get("loopToken"),
                                     function(err, callUrlInfo) {
        if (err) {
          // XXX
          return;
        }

        var date = (new Date(callUrlInfo.urlCreationDate * 1000));
        var options = {year: "numeric", month: "long", day: "numeric"};
        var timestamp = date.toLocaleDateString(navigator.language, options);
        this.set({urlCreationDateString: timestamp});
      }.bind(this));
    },

    startOutgoingCall: function(args) {
      console.log("startOutgoingCall", args);

      this.client.requestCallInfo(this.get("loopToken"),
                                  args.mediaType, function(err, sessionData) {
        if (err) {
          // XXX
        }

        this._setOutgoingData(sessionData);
        this.set({callStatus: "pending"});
      }.bind(this));
    },

    _setOutgoingData: function(sessionData) {
      // XXX Keep local copy of data - update defaults
      this.set(sessionData);
    }
  });

  return ConversationStore;

})();
