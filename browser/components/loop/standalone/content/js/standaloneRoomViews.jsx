/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */

var loop = loop || {};
loop.standaloneRoomViews = (function(mozL10n) {
  "use strict";

  var ROOM_STATES = loop.store.ROOM_STATES;
  var sharedActions = loop.shared.actions;

  var StandaloneRoomView = React.createClass({
    mixins: [Backbone.Events],

    propTypes: {
      activeRoomStore:
        React.PropTypes.instanceOf(loop.store.ActiveRoomStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
    },

    getInitialState: function() {
      return this.props.activeRoomStore.getStoreState();
    },

    componentWillMount: function() {
      this.listenTo(this.props.activeRoomStore, "change",
                    this._onActiveRoomStateChanged);
    },

    /**
     * Handles a "change" event on the roomStore, and updates this.state
     * to match the store.
     *
     * @private
     */
    _onActiveRoomStateChanged: function() {
      var oldRoomState = this.state.roomState;

      this.setState(this.props.activeRoomStore.getStoreState());
      if (this.state.roomState === ROOM_STATES.JOINED &&
          oldRoomState === ROOM_STATES.READY) {
        // The SDK needs to know about the configuration and the elements to use
        // for display. So the best way seems to pass the information here - ideally
        // the sdk wouldn't need to know this, but we can't change that.
        this.props.dispatcher.dispatch(new sharedActions.SetupStreamElements({
          publisherConfig: this._getPublisherConfig(),
          getLocalElementFunc: this._getElement.bind(this, ".local"),
          getRemoteElementFunc: this._getElement.bind(this, ".remote")
        }));
      }
    },

    componentWillUnmount: function() {
      this.stopListening(this.props.activeRoomStore);
    },

    componentDidMount: function() {
    },

    /**
     * Returns either the required DOMNode
     *
     * @param {String} className The name of the class to get the element for.
     */
    _getElement: function(className) {
      return this.getDOMNode().querySelector(className);
    },

    /**
     * Returns the required configuration for publishing video on the sdk.
     */
    _getPublisherConfig: function() {
      // height set to 100%" to fix video layout on Google Chrome
      // @see https://bugzilla.mozilla.org/show_bug.cgi?id=1020445
      return {
        insertMode: "append",
        width: "100%",
        height: "100%",
        publishVideo: true,
        style: {
          audioLevelDisplayMode: "off",
          bugDisplayMode: "off",
          buttonDisplayMode: "off",
          nameDisplayMode: "off",
          videoDisabledDisplayMode: "off"
        }
      }
    },

    joinRoom: function() {
      this.props.dispatcher.dispatch(new sharedActions.JoinRoom());
    },

    leaveRoom: function() {
      this.props.dispatcher.dispatch(new sharedActions.LeaveRoom());
    },

    // XXX Implement tests for this view when we do the proper views
    // - bug 1074705 and others
    render: function() {

      var localStreamClasses = React.addons.classSet({
        local: true,
        "local-stream": true,
        "local-stream-audio": false
      });

      return (
        <div>
        <div>{this.state.roomState}</div>
        <div>
          <button onClick={this.joinRoom}>Join</button>
          <button onClick={this.leaveRoom}>Leave</button>
        </div>

        <div className="video-layout-wrapper">
          <div className="conversation">
            <div className="media nested">
              <div className="video_wrapper remote_wrapper">
                <div className="video_inner remote"></div>
              </div>
              <div className={localStreamClasses}></div>
            </div>
          </div>
        </div>
        <div>{mozL10n.get("invite_header_text")}</div>
        </div>
      );
    }
  });

  return {
    StandaloneRoomView: StandaloneRoomView
  };
})(navigator.mozL10n);
