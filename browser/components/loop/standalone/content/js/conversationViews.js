/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.conversationViews = (function(mozL10n) {

  var StartConversationView = React.createClass({displayName: 'StartConversationView',
    mixins: [loop.shared.mixins.StoreListeningMixin, Backbone.Events],

    storesToWatch: [
      "conversationStore"
    ],

    propTypes: {
      conversationStore: React.PropTypes.instanceOf(
        loop.ConversationStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(
        loop.Dispatcher).isRequired
    },

    render: function() {
      // XXX This view is really a shorted hack of the previous
      // one, just to show what we're dealing with.

      var callUrlCreationDateString = this.state.urlCreationDateString;

      var fromDateString = mozL10n.get("call_url_creation_date_label", {
        "call_url_creation_date": callUrlCreationDateString
      });

      var urlCreationDateClasses = React.addons.classSet({
        "light-color-font": true,
        "call-url-date": true, /* Used as a handler in the tests */
        /*hidden until date is available*/
        "hide": !callUrlCreationDateString
      });

      return (
        React.DOM.div({className: "container"}, 
          React.DOM.div({className: "container-box"}, 
            React.DOM.header({className: "standalone-header header-box container-box"}, 
              React.DOM.h4({className: urlCreationDateClasses}, 
                fromDateString
              )
            ), 
            React.DOM.div({className: "btn-group"}, 
              React.DOM.div({className: "standalone-btn-chevron-menu-group"}, 
                React.DOM.div({className: "btn-group-chevron"}, 
                  React.DOM.div({className: "btn-group"}, 
                    React.DOM.button({className: "btn btn-large btn-accept", 
                            onClick: this._initiateCall("audio-video"), 
                            title: "Start"}, 
                            React.DOM.span({className: "standalone-call-btn-text"}, 
                              mozL10n.get("initiate_audio_video_call_button2")
                            )
                    )
                  )
                )
              )
            )
          )
        )
      );
    },

    _initiateCall: function(audioType) {
      return function() {
        this.props.dispatcher.dispatch(new loop.shared.actions.startOutgoingCall({mediaType: audioType}));
      }.bind(this);
    }
  });

  var OutgoingConversationView = React.createClass({displayName: 'OutgoingConversationView',
    mixins: [loop.shared.mixins.StoreListeningMixin, Backbone.Events],

    storesToWatch: [
      "conversationStore"
    ],

    propTypes: {
      conversationStore: React.PropTypes.instanceOf(
        loop.ConversationStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(
        loop.Dispatcher).isRequired
    },

    render: function() {
      switch (this.state.callStatus) {
        case "start": {
          return (
            StartConversationView({
              conversationStore: this.props.conversationStore, 
              dispatcher: this.props.dispatcher}
            )
          );
        }
        case "pending": {
          return (React.DOM.div(null, "pending"));
        }
      }
    }
  });

  return {
    OutgoingConversationView: OutgoingConversationView
  };

})(navigator.mozL10n);
