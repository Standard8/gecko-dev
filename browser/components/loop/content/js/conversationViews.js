/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */

var loop = loop || {};
loop.conversationViews = (function(mozL10n) {

  var CALL_STATES = loop.store.CALL_STATES;
  var CALL_TYPES = loop.shared.utils.CALL_TYPES;
  var sharedActions = loop.shared.actions;
  var sharedUtils = loop.shared.utils;
  var sharedViews = loop.shared.views;
  var sharedMixins = loop.shared.mixins;

  // This duplicates a similar function in contacts.jsx that isn't used in the
  // conversation window. If we get too many of these, we might want to consider
  // finding a logical place for them to be shared.
  function _getPreferredEmail(contact) {
    // A contact may not contain email addresses, but only a phone number.
    if (!contact.email || contact.email.length === 0) {
      return { value: "" };
    }
    return contact.email.find(e => e.pref) || contact.email[0];
  }

  /**
   * Displays information about the call
   * Caller avatar, name & conversation creation date
   */
  var CallIdentifierView = React.createClass({displayName: 'CallIdentifierView',
    propTypes: {
      peerIdentifier: React.PropTypes.string,
      showIcons: React.PropTypes.bool.isRequired,
      urlCreationDate: React.PropTypes.string,
      video: React.PropTypes.bool
    },

    getDefaultProps: function() {
      return {
        peerIdentifier: "",
        showLinkDetail: true,
        urlCreationDate: "",
        video: true
      };
    },

    getInitialState: function() {
      return {timestamp: 0};
    },

    /**
     * Gets and formats the incoming call creation date
     */
    formatCreationDate: function() {
      if (!this.props.urlCreationDate) {
        return "";
      }

      var timestamp = this.props.urlCreationDate;
      return "(" + loop.shared.utils.formatDate(timestamp) + ")";
    },

    render: function() {
      var iconVideoClasses = React.addons.classSet({
        "fx-embedded-tiny-video-icon": true,
        "muted": !this.props.video
      });
      var callDetailClasses = React.addons.classSet({
        "fx-embedded-call-detail": true,
        "hide": !this.props.showIcons
      });

      return (
        React.DOM.div({className: "fx-embedded-call-identifier"}, 
          React.DOM.div({className: "fx-embedded-call-identifier-avatar fx-embedded-call-identifier-item"}), 
          React.DOM.div({className: "fx-embedded-call-identifier-info fx-embedded-call-identifier-item"}, 
            React.DOM.div({className: "fx-embedded-call-identifier-text overflow-text-ellipsis"}, 
              this.props.peerIdentifier
            ), 
            React.DOM.div({className: callDetailClasses}, 
              React.DOM.span({className: "fx-embedded-tiny-audio-icon"}), 
              React.DOM.span({className: iconVideoClasses}), 
              React.DOM.span({className: "fx-embedded-conversation-timestamp"}, 
                this.formatCreationDate()
              )
            )
          )
        )
      );
    }
  });

  /**
   * Displays details of the incoming/outgoing conversation
   * (name, link, audio/video type etc).
   *
   * Allows the view to be extended with different buttons and progress
   * via children properties.
   */
  var ConversationDetailView = React.createClass({displayName: 'ConversationDetailView',
    propTypes: {
      displayName: React.PropTypes.string
    },

    render: function() {
      return (
        React.DOM.div({className: "call-window"}, 
          CallIdentifierView({
            peerIdentifier: this.props.displayName, 
            showIcons: false}), 
          React.DOM.div(null, this.props.children)
        )
      );
    }
  });

  /**
   * Incoming call view accept button, renders different primary actions
   * (answer with video / with audio only) based on the props received
   *
   * propTypes:
   * - mode  This is an object consisting of:
   * -- primary    The primary button information.
   * -- secondary  The secondary information displayed in a drop-down
   *               menu.
   *
   * `primary` and `secondary` are both objects containing:
   * - className   Class Names for the item.
   * - handler     The handler to use when the item is clicked.
   * - tooltip     The title to display on the button.
   */
  var AcceptCallButton = React.createClass({displayName: 'AcceptCallButton',
    propTypes: {
      mode: React.PropTypes.object.isRequired,
    },

    render: function() {
      var mode = this.props.mode;
      return (
        React.DOM.div({className: "btn-chevron-menu-group"}, 
          React.DOM.div({className: "btn-group"}, 
            React.DOM.button({className: "btn btn-accept", 
                    onClick: mode.primary.handler, 
                    title: mozL10n.get(mode.primary.tooltip)}, 
              React.DOM.span({className: "fx-embedded-answer-btn-text"}, 
                mozL10n.get("incoming_call_accept_button")
              ), 
              React.DOM.span({className: mode.primary.className})
            ), 
            React.DOM.div({className: mode.secondary.className, 
                 onClick: mode.secondary.handler, 
                 title: mozL10n.get(mode.secondary.tooltip)}
            )
          )
        )
      );
    }
  });

  /**
   * Handles Accepting or rejecting of incoming calls.
   */
  var IncomingCallView = React.createClass({displayName: 'IncomingCallView',
    mixins: [sharedMixins.DropdownMenuMixin, sharedMixins.AudioMixin],

    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
      mozLoop: React.PropTypes.object.isRequired,
      incomingHasVideo: React.PropTypes.bool.isRequired,
      displayName: React.PropTypes.string,
      urlCreationDate: React.PropTypes.string
    },

    getDefaultProps: function() {
      return {
        incomingHasVideo: true
      };
    },

    componentWillMount: function() {
      this.props.mozLoop.startAlerting();
    },

    componentWillUnmount: function() {
      this.props.mozLoop.stopAlerting();
    },

    _handleAccept: function(callType) {
      return function() {
        this.props.dispatcher.dispatch(new sharedActions.AcceptCall({
          callType: callType
        }));
      }.bind(this);
    },

    _handleDecline: function() {
      this.props.dispatcher.dispatch(new sharedActions.DeclineCall());
    },

    _handleDeclineBlock: function(event) {
      event.preventDefault();
      this.props.dispatcher.dispatch(new sharedActions.BlockCall());
    },

    /**
     * Generate props for <AcceptCallButton> component based on
     * incoming call type. An incoming video call will render a video
     * answer button primarily, an audio call will flip them.
     */
    _answerModeProps: function() {
      var videoButton = {
        handler: this._handleAccept("audio-video"),
        className: "fx-embedded-btn-icon-video",
        tooltip: "incoming_call_accept_audio_video_tooltip"
      };
      var audioButton = {
        handler: this._handleAccept("audio"),
        className: "fx-embedded-btn-audio-small",
        tooltip: "incoming_call_accept_audio_only_tooltip"
      };
      var props = {};
      props.primary = videoButton;
      props.secondary = audioButton;

      // When video is not enabled on this call, we swap the buttons around.
      if (!this.props.incomingHasVideo) {
        audioButton.className = "fx-embedded-btn-icon-audio";
        videoButton.className = "fx-embedded-btn-video-small";
        props.primary = audioButton;
        props.secondary = videoButton;
      }

      return props;
    },

    render: function() {
      /* jshint ignore:start */
      var dropdownMenuClassesDecline = React.addons.classSet({
        "native-dropdown-menu": true,
        "conversation-window-dropdown": true,
        "visually-hidden": !this.state.showMenu
      });

      return (
        React.DOM.div({className: "call-window"}, 
          CallIdentifierView({video: this.props.incomingHasVideo, 
            peerIdentifier: this.props.displayName, 
            urlCreationDate: this.props.urlCreationDate, 
            showIcons: true}), 

          React.DOM.div({className: "btn-group call-action-group"}, 

            React.DOM.div({className: "fx-embedded-call-button-spacer"}), 

            React.DOM.div({className: "btn-chevron-menu-group"}, 
              React.DOM.div({className: "btn-group-chevron"}, 
                React.DOM.div({className: "btn-group"}, 

                  React.DOM.button({className: "btn btn-decline", 
                          onClick: this._handleDecline}, 
                    mozL10n.get("incoming_call_cancel_button")
                  ), 
                  React.DOM.div({className: "btn-chevron", onClick: this.toggleDropdownMenu})
                ), 

                React.DOM.ul({className: dropdownMenuClassesDecline}, 
                  React.DOM.li({className: "btn-block", onClick: this._handleDeclineBlock}, 
                    mozL10n.get("incoming_call_cancel_and_block_button")
                  )
                )

              )
            ), 

            React.DOM.div({className: "fx-embedded-call-button-spacer"}), 

            AcceptCallButton({mode: this._answerModeProps()}), 

            React.DOM.div({className: "fx-embedded-call-button-spacer"})

          )
        )
      );
      /* jshint ignore:end */
    }
  });

  /**
   * View for pending conversations. Displays a cancel button and appropriate
   * pending/ringing strings.
   */
  var PendingConversationView = React.createClass({displayName: 'PendingConversationView',
    mixins: [sharedMixins.AudioMixin],

    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
      callState: React.PropTypes.string,
      displayName: React.PropTypes.string,
      enableCancelButton: React.PropTypes.bool
    },

    getDefaultProps: function() {
      return {
        enableCancelButton: false
      };
    },

    componentDidMount: function() {
      this.play("ringtone", {loop: true});
    },

    cancelCall: function() {
      this.props.dispatcher.dispatch(new sharedActions.CancelCall());
    },

    render: function() {
      var cx = React.addons.classSet;
      var pendingStateString;
      if (this.props.callState === CALL_STATES.ALERTING) {
        pendingStateString = mozL10n.get("call_progress_ringing_description");
      } else {
        pendingStateString = mozL10n.get("call_progress_connecting_description");
      }

      var btnCancelStyles = cx({
        "btn": true,
        "btn-cancel": true,
        "disabled": !this.props.enableCancelButton
      });

      return (
        ConversationDetailView({displayName: this.props.displayName}, 

          React.DOM.p({className: "btn-label"}, pendingStateString), 

          React.DOM.div({className: "btn-group call-action-group"}, 
            React.DOM.button({className: btnCancelStyles, 
                    onClick: this.cancelCall}, 
              mozL10n.get("initiate_call_cancel_button")
            )
          )

        )
      );
    }
  });

  var BaseCallFailedView = React.createClass({displayName: 'BaseCallFailedView',
    mixins: [sharedMixins.AudioMixin],

    componentDidMount: function() {
      this.play("failure");
    },

    render: function() {
      return (
        React.DOM.div({className: "call-window"}, 
          React.DOM.h2(null, mozL10n.get("generic_failure_title")), 

          this.props.children
        )
      );
    }
  });


  /**
   * Call failed view. Displayed when a call fails.
   */
  var OutgoingCallFailedView = React.createClass({displayName: 'OutgoingCallFailedView',
    mixins: [Backbone.Events],

    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
      store: React.PropTypes.instanceOf(
        loop.store.ConversationStore).isRequired,
      contact: React.PropTypes.object.isRequired,
      // This is used by the UI showcase.
      emailLinkError: React.PropTypes.bool,
    },

    getInitialState: function() {
      return {
        emailLinkError: this.props.emailLinkError,
        emailLinkButtonDisabled: false
      };
    },

    componentDidMount: function() {
      this.listenTo(this.props.store, "change:emailLink",
                    this._onEmailLinkReceived);
      this.listenTo(this.props.store, "error:emailLink",
                    this._onEmailLinkError);
    },

    componentWillUnmount: function() {
      this.stopListening(this.props.store);
    },

    _onEmailLinkReceived: function() {
      var emailLink = this.props.store.getStoreState("emailLink");
      var contactEmail = _getPreferredEmail(this.props.contact).value;
      sharedUtils.composeCallUrlEmail(emailLink, contactEmail);
      window.close();
    },

    _onEmailLinkError: function() {
      this.setState({
        emailLinkError: true,
        emailLinkButtonDisabled: false
      });
    },

    retryCall: function() {
      this.props.dispatcher.dispatch(new sharedActions.RetryCall());
    },

    cancelCall: function() {
      this.props.dispatcher.dispatch(new sharedActions.CancelCall());
    },

    emailLink: function() {
      this.setState({
        emailLinkError: false,
        emailLinkButtonDisabled: true
      });

      this.props.dispatcher.dispatch(new sharedActions.FetchEmailLink());
    },

    _renderError: function() {
      if (!this.state.emailLinkError) {
        return;
      }
      return React.DOM.p({className: "error"}, mozL10n.get("unable_retrieve_url"));
    },

    render: function() {
      return (
        BaseCallFailedView(null, 
          React.DOM.p({className: "btn-label"}, mozL10n.get("generic_failure_with_reason2")), 

          this._renderError(), 

          React.DOM.div({className: "btn-group call-action-group"}, 
            React.DOM.button({className: "btn btn-cancel", 
                    onClick: this.cancelCall}, 
              mozL10n.get("cancel_button")
            ), 
            React.DOM.button({className: "btn btn-info btn-retry", 
                    onClick: this.retryCall}, 
              mozL10n.get("retry_call_button")
            ), 
            React.DOM.button({className: "btn btn-info btn-email", 
                    onClick: this.emailLink, 
                    disabled: this.state.emailLinkButtonDisabled}, 
              mozL10n.get("share_button2")
            )
          )
        )
      );
    }
  });

  var IncomingCallFailedView = React.createClass({displayName: 'IncomingCallFailedView',
    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
    },

    cancelCall: function() {
      this.props.dispatcher.dispatch(new sharedActions.CancelCall());
    },

    render: function() {
      return (
        BaseCallFailedView(null, 
          React.DOM.div({className: "btn-group call-action-group"}, 
            React.DOM.button({className: "btn btn-cancel", 
                    onClick: this.cancelCall}, 
              mozL10n.get("cancel_button")
            )
          )
        )
      );
    }
  });

  var OngoingConversationView = React.createClass({displayName: 'OngoingConversationView',
    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
      video: React.PropTypes.object,
      audio: React.PropTypes.object
    },

    getDefaultProps: function() {
      return {
        video: {enabled: true, visible: true},
        audio: {enabled: true, visible: true}
      };
    },

    componentDidMount: function() {
      /**
       * OT inserts inline styles into the markup. Using a listener for
       * resize events helps us trigger a full width/height on the element
       * so that they update to the correct dimensions.
       * XXX: this should be factored as a mixin.
       */
      window.addEventListener('orientationchange', this.updateVideoContainer);
      window.addEventListener('resize', this.updateVideoContainer);

      // The SDK needs to know about the configuration and the elements to use
      // for display. So the best way seems to pass the information here - ideally
      // the sdk wouldn't need to know this, but we can't change that.
      this.props.dispatcher.dispatch(new sharedActions.SetupStreamElements({
        publisherConfig: this._getPublisherConfig(),
        getLocalElementFunc: this._getElement.bind(this, ".local"),
        getRemoteElementFunc: this._getElement.bind(this, ".remote")
      }));
    },

    componentWillUnmount: function() {
      window.removeEventListener('orientationchange', this.updateVideoContainer);
      window.removeEventListener('resize', this.updateVideoContainer);
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
        publishVideo: this.props.video.enabled,
        style: {
          audioLevelDisplayMode: "off",
          bugDisplayMode: "off",
          buttonDisplayMode: "off",
          nameDisplayMode: "off",
          videoDisabledDisplayMode: "off"
        }
      };
    },

    /**
     * Used to update the video container whenever the orientation or size of the
     * display area changes.
     */
    updateVideoContainer: function() {
      var localStreamParent = this._getElement('.local .OT_publisher');
      var remoteStreamParent = this._getElement('.remote .OT_subscriber');
      if (localStreamParent) {
        localStreamParent.style.width = "100%";
      }
      if (remoteStreamParent) {
        remoteStreamParent.style.height = "100%";
      }
    },

    /**
     * Hangs up the call.
     */
    hangup: function() {
      this.props.dispatcher.dispatch(
        new sharedActions.HangupCall());
    },

    /**
     * Used to control publishing a stream - i.e. to mute a stream
     *
     * @param {String} type The type of stream, e.g. "audio" or "video".
     * @param {Boolean} enabled True to enable the stream, false otherwise.
     */
    publishStream: function(type, enabled) {
      this.props.dispatcher.dispatch(
        new sharedActions.SetMute({
          type: type,
          enabled: enabled
        }));
    },

    render: function() {
      var localStreamClasses = React.addons.classSet({
        local: true,
        "local-stream": true,
        "local-stream-audio": !this.props.video.enabled
      });

      return (
        React.DOM.div({className: "video-layout-wrapper"}, 
          React.DOM.div({className: "conversation"}, 
            React.DOM.div({className: "media nested"}, 
              React.DOM.div({className: "video_wrapper remote_wrapper"}, 
                React.DOM.div({className: "video_inner remote"})
              ), 
              React.DOM.div({className: localStreamClasses})
            ), 
            loop.shared.views.ConversationToolbar({
              video: this.props.video, 
              audio: this.props.audio, 
              publishStream: this.publishStream, 
              hangup: this.hangup})
          )
        )
      );
    }
  });

  /**
   * Master View Controller for calls. This manages
   * the different views that need displaying.
   */
  var ConversationView = React.createClass({displayName: 'ConversationView',
    mixins: [
      sharedMixins.AudioMixin,
      sharedMixins.DocumentTitleMixin,
      Backbone.Events
    ],

    propTypes: {
      dispatcher: React.PropTypes.instanceOf(loop.Dispatcher).isRequired,
      mozLoop: React.PropTypes.object.isRequired,
      store: React.PropTypes.instanceOf(
        loop.store.ConversationStore).isRequired,
      feedbackStore: React.PropTypes.instanceOf(loop.store.FeedbackStore)
    },

    getInitialState: function() {
      return this.props.store.getStoreState();
    },

    componentWillMount: function() {
      this.listenTo(this.props.store, "change", function() {
        this.setState(this.props.store.getStoreState());
      }, this);
    },

    componentWillUnmount: function() {
      this.stopListening(this.props.store, "change", function() {
        this.setState(this.props.store.getStoreState());
      }, this);
    },

    _closeWindow: function() {
      window.close();
    },

    /**
     * Returns true if the call is in a cancellable state, during call setup.
     */
    _isCancellable: function() {
      return this.state.callState !== CALL_STATES.INIT &&
             this.state.callState !== CALL_STATES.GATHER;
    },

    /**
     * Used to remove the scheme from a url.
     *
     * @param {String} url  The url to remove the scheme from.
     */
    _removeScheme: function(url) {
      if (!url) {
        return "";
      }
      return url.replace(/^https?:\/\//, "");
    },

    _getDisplayName: function() {
      var displayName = "";

      if (this.state.contact) {
        if (this.state.contact.name &&
            this.state.contact.name[0]) {
          displayName = this.state.contact.name[0];
        } else {
          displayName = _getPreferredEmail(this.state.contact).value;
        }
      } else if (this.state.callerId) {
        displayName = this.state.callerId;
      } else if (this.state.callUrl) {
        displayName = this._removeScheme(this.state.callUrl);
      }

      return displayName;
    },

    /**
     * Used to setup and render the feedback view.
     */
    _renderFeedbackView: function() {
      this.setTitle(mozL10n.get("conversation_has_ended"));

      return (
        sharedViews.FeedbackView({
          feedbackStore: this.props.feedbackStore, 
          onAfterFeedbackReceived: this._closeWindow.bind(this)}
        )
      );
    },

    _renderViewFromCallType: function() {
      if (this.state.outgoing) {
        return (PendingConversationView({
          dispatcher: this.props.dispatcher, 
          callState: this.state.callState, 
          displayName: this._getDisplayName(), 
          enableCancelButton: this._isCancellable()}
        ));
      }

      // Otherwise Incoming
      switch (this.state.callState) {
        case CALL_STATES.ALERTING: {
          return (IncomingCallView({
            dispatcher: this.props.dispatcher, 
            mozLoop: this.props.mozLoop, 
            incomingHasVideo: this.state.callType === CALL_TYPES.AUDIO_VIDEO, 
            displayName: this._getDisplayName(), 
            urlCreationDate: this.state.urlCreationDate}
          ));
        }
        // i.e. gathering or connecting
        default:  {
          // We've not connected yet, so don't give the user
          // the choice.
          return null;
        }
      };
    },

    _renderCallFailedView: function() {
      if (this.state.outgoing) {
        return (OutgoingCallFailedView({
          dispatcher: this.props.dispatcher, 
          store: this.props.store, 
          contact: this.state.contact}
        ));
      }

      return (IncomingCallFailedView({
        dispatcher: this.props.dispatcher}
      ));
    },

    render: function() {
      this.setTitle(this._getDisplayName());

      switch (this.state.callState) {
        case CALL_STATES.CLOSE: {
          this._closeWindow();
          return null;
        }
        case CALL_STATES.TERMINATED: {
          return this._renderCallFailedView();
        }
        case CALL_STATES.ONGOING: {
          return (OngoingConversationView({
            dispatcher: this.props.dispatcher, 
            video: {enabled: !this.state.videoMuted}, 
            audio: {enabled: !this.state.audioMuted}}
            )
          );
        }
        case CALL_STATES.FINISHED: {
          this.play("terminated");
          return this._renderFeedbackView();
        }
        case CALL_STATES.INIT: {
          // We know what we are, but we haven't got the data yet.
          return null;
        }
        default: {
          return this._renderViewFromCallType();
        }
      }
    },
  });

  return {
    PendingConversationView: PendingConversationView,
    CallIdentifierView: CallIdentifierView,
    ConversationDetailView: ConversationDetailView,
    OutgoingCallFailedView: OutgoingCallFailedView,
    IncomingCallFailedView: IncomingCallFailedView,
    IncomingCallView: IncomingCallView,
    OngoingConversationView: OngoingConversationView,
    ConversationView: ConversationView
  };

})(document.mozL10n || navigator.mozL10n);
