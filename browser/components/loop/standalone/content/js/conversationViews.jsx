/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.conversationViews = (function(mozL10n) {

  var StartConversationView = React.createClass({
    propTypes: {
      conversationStore: React.PropTypes.instanceOf(
        loop.ConversationStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(
        loop.Dispatcher).isRequired
    },

    componentWillMount: function() {
      this.setState({
        conversationState: this.props.conversationStore.attributes
      });
      // Explicit listening for specific events
      this.props.conversationStore.on("change:urlCreationDateString", this.setStoreState, this);
    },

    componentDidUnmount: function() {
      this.props.conversationStore.off(null, null, this);
    },

    setStoreState: function(model) {
      this.setState({
        conversationState: model.attributes
      });
    },

    render: function() {
      // XXX This view is really a shorted hack of the previous
      // one, just to show what we're dealing with.

      var callUrlCreationDateString = this.state.conversationState.urlCreationDateString;

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
        <div className="container">
          <div className="container-box">
            <header className="standalone-header header-box container-box">
              <h4 className={urlCreationDateClasses} >
                {fromDateString}
              </h4>
            </header>
            <div className="btn-group">
              <div className="standalone-btn-chevron-menu-group">
                <div className="btn-group-chevron">
                  <div className="btn-group">
                    <button className="btn btn-large btn-accept"
                            onClick={this._initiateCall("audio-video")}
                            title="Start">
                            <span className="standalone-call-btn-text">
                              {mozL10n.get("initiate_audio_video_call_button2")}
                            </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },

    _initiateCall: function(audioType) {
      return function() {
        this.props.dispatcher.dispatch(new loop.shared.actions.startOutgoingCall({mediaType: audioType}));
      }.bind(this);
    }
  });

  var OutgoingConversationView = React.createClass({
    propTypes: {
      conversationStore: React.PropTypes.instanceOf(
        loop.ConversationStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(
        loop.Dispatcher).isRequired
    },

    componentWillMount: function() {
      this.setState({
        conversationState: this.props.conversationStore.attributes
      });
      // Explicit listening for specific events
      this.props.conversationStore.on("change:callStatus", this.setStoreState, this);
    },

    componentDidUnmount: function() {
      this.props.conversationStore.off(null, null, this);
    },

    setStoreState: function(model) {
      this.setState({
        conversationState: model.attributes
      });
    },


    render: function() {
      switch (this.state.conversationState.callStatus) {
        case "start": {
          return (
            <StartConversationView
              conversationStore={this.props.conversationStore}
              dispatcher={this.props.dispatcher}
            />
          );
        }
        case "pending": {
          return (<div>pending</div>);
        }
      }
    }
  });

  return {
    OutgoingConversationView: OutgoingConversationView
  };

})(navigator.mozL10n);
