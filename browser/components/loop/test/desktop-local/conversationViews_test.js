/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var expect = chai.expect;

describe("loop.conversationViews", function () {
  "use strict";

  var sharedUtils = loop.shared.utils;
  var sandbox, oldTitle, view, dispatcher, contact, fakeAudioXHR;
  var fakeMozLoop, fakeWindow;

  var CALL_STATES = loop.store.CALL_STATES;
  var CALL_TYPES = loop.shared.utils.CALL_TYPES;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    oldTitle = document.title;
    sandbox.stub(document.mozL10n, "get", function(x) {
      return x;
    });

    dispatcher = new loop.Dispatcher();
    sandbox.stub(dispatcher, "dispatch");

    contact = {
      name: [ "mrsmith" ],
      email: [{
        type: "home",
        value: "fakeEmail",
        pref: true
      }]
    };
    fakeAudioXHR = {
      open: sinon.spy(),
      send: function() {},
      abort: function() {},
      getResponseHeader: function(header) {
        if (header === "Content-Type")
          return "audio/ogg";
      },
      responseType: null,
      response: new ArrayBuffer(10),
      onload: null
    };

    fakeMozLoop = {
      getLoopPref: sinon.stub().returns("http://fakeurl"),
      composeEmail: sinon.spy(),
      get appVersionInfo() {
        return {
          version: "42",
          channel: "test",
          platform: "test"
        };
      },
      getAudioBlob: sinon.spy(function(name, callback) {
        callback(null, new Blob([new ArrayBuffer(10)], {type: "audio/ogg"}));
      }),
      startAlerting: sinon.stub(),
      stopAlerting: sinon.stub()
    };

    fakeWindow = {
      document: {},
      navigator: {
        mozLoop: fakeMozLoop
      }
    };
    loop.shared.mixins.setRootObject(fakeWindow);
  });

  afterEach(function() {
    document.title = oldTitle;
    view = undefined;
    sandbox.restore();
    loop.shared.mixins.setRootObject(window);
  });

  describe("CallIdentifierView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.CallIdentifierView(props));
    }

    it("should set display the peer identifer", function() {
      view = mountTestComponent({
        showIcons: false,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-identifier-text").props.children).eql("mrssmith");
    });

    it("should not display the icons if showIcons is false", function() {
      view = mountTestComponent({
        showIcons: false,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-detail").props.className).to.contain("hide");
    });

    it("should display the icons if showIcons is true", function() {
      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-detail").props.className).to.not.contain("hide");
    });

    it("should display the url timestamp", function() {
      sandbox.stub(loop.shared.utils, "formatDate").returns(("October 9, 2014"));

      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith",
        urlCreationDate: (new Date() / 1000).toString()
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-conversation-timestamp").props.children).eql("(October 9, 2014)");
    });

    it("should show video as muted if video is false", function() {
      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith",
        video: false
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-tiny-video-icon").props.className).to.contain("muted");
    });
  });

  describe("PendingConversationView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.PendingConversationView(props));
    }

    it("should set display connecting string when the state is not alerting",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var label = TestUtils.findRenderedDOMComponentWithClass(
          view, "btn-label").props.children;

        expect(label).to.have.string("connecting");
    });

    it("should set display ringing string when the state is alerting",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.ALERTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var label = TestUtils.findRenderedDOMComponentWithClass(
          view, "btn-label").props.children;

        expect(label).to.have.string("ringing");
    });

    it("should disable the cancel button if enableCancelButton is false",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher,
          enableCancelButton: false
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        expect(cancelBtn.classList.contains("disabled")).eql(true);
      });

    it("should enable the cancel button if enableCancelButton is false",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher,
          enableCancelButton: true
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        expect(cancelBtn.classList.contains("disabled")).eql(false);
      });

    it("should dispatch a cancelCall action when the cancel button is pressed",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        React.addons.TestUtils.Simulate.click(cancelBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "cancelCall"));
      });
  });

  describe("OutgoingCallFailedView", function() {
    var store, fakeAudio;

    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.OutgoingCallFailedView({
          dispatcher: dispatcher,
          store: store,
          contact: {email: [{value: "test@test.tld"}]}
        }));
    }

    beforeEach(function() {
      store = new loop.store.ConversationStore(dispatcher, {
        client: {},
        mozLoop: fakeMozLoop,
        sdkDriver: {}
      });
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy(),
        removeAttribute: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
    });

    it("should dispatch a retryCall action when the retry button is pressed",
      function() {
        view = mountTestComponent();

        var retryBtn = view.getDOMNode().querySelector('.btn-retry');

        React.addons.TestUtils.Simulate.click(retryBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "retryCall"));
      });

    it("should dispatch a cancelCall action when the cancel button is pressed",
      function() {
        view = mountTestComponent();

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        React.addons.TestUtils.Simulate.click(cancelBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "cancelCall"));
      });

    it("should dispatch a fetchEmailLink action when the cancel button is pressed",
      function() {
        view = mountTestComponent();

        var emailLinkBtn = view.getDOMNode().querySelector('.btn-email');

        React.addons.TestUtils.Simulate.click(emailLinkBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "fetchEmailLink"));
      });

    it("should disable the email link button once the action is dispatched",
      function() {
        view = mountTestComponent();
        var emailLinkBtn = view.getDOMNode().querySelector('.btn-email');
        React.addons.TestUtils.Simulate.click(emailLinkBtn);

        expect(view.getDOMNode().querySelector(".btn-email").disabled).eql(true);
      });

    it("should compose an email once the email link is received", function() {
      var composeCallUrlEmail = sandbox.stub(sharedUtils, "composeCallUrlEmail");
      view = mountTestComponent();
      store.setStoreState({emailLink: "http://fake.invalid/"});

      sinon.assert.calledOnce(composeCallUrlEmail);
      sinon.assert.calledWithExactly(composeCallUrlEmail,
        "http://fake.invalid/", "test@test.tld");
    });

    it("should close the conversation window once the email link is received",
      function() {
        sandbox.stub(window, "close");
        view = mountTestComponent();

        store.setStoreState({emailLink: "http://fake.invalid/"});

        sinon.assert.calledOnce(window.close);
      });

    it("should display an error message in case email link retrieval failed",
      function() {
        view = mountTestComponent();

        store.trigger("error:emailLink");

        expect(view.getDOMNode().querySelector(".error")).not.eql(null);
      });

    it("should allow retrying to get a call url if it failed previously",
      function() {
        view = mountTestComponent();

        store.trigger("error:emailLink");

        expect(view.getDOMNode().querySelector(".btn-email").disabled).eql(false);
      });

    it("should play a failure sound, once", function() {
      view = mountTestComponent();

      sinon.assert.calledOnce(fakeMozLoop.getAudioBlob);
      sinon.assert.calledWithExactly(fakeMozLoop.getAudioBlob,
                                     "failure", sinon.match.func);
      sinon.assert.calledOnce(fakeAudio.play);
      expect(fakeAudio.loop).to.equal(false);
    });
  });

  describe("IncomingCallFailedView", function() {
    var store, fakeAudio;

    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.IncomingCallFailedView({
          dispatcher: dispatcher,
          store: store,
          contact: {email: [{value: "test@test.tld"}]}
        }));
    }

    beforeEach(function() {
      store = new loop.store.ConversationStore(dispatcher, {
        client: {},
        mozLoop: fakeMozLoop,
        sdkDriver: {}
      });
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy(),
        removeAttribute: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
    });

    it("should dispatch a cancelCall action when the cancel button is pressed",
      function() {
        view = mountTestComponent();

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        React.addons.TestUtils.Simulate.click(cancelBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "cancelCall"));
      });

    it("should play a failure sound, once", function() {
      view = mountTestComponent();

      sinon.assert.calledOnce(fakeMozLoop.getAudioBlob);
      sinon.assert.calledWithExactly(fakeMozLoop.getAudioBlob,
                                     "failure", sinon.match.func);
      sinon.assert.calledOnce(fakeAudio.play);
      expect(fakeAudio.loop).to.equal(false);
    });
  });

  describe("OngoingConversationView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.OngoingConversationView(props));
    }

    it("should dispatch a setupStreamElements action when the view is created",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher
        });

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setupStreamElements"));
      });

    it("should dispatch a hangupCall action when the hangup button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher
        });

        var hangupBtn = view.getDOMNode().querySelector('.btn-hangup');

        React.addons.TestUtils.Simulate.click(hangupBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "hangupCall"));
      });

    it("should dispatch a setMute action when the audio mute button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher,
          audio: {enabled: false}
        });

        var muteBtn = view.getDOMNode().querySelector('.btn-mute-audio');

        React.addons.TestUtils.Simulate.click(muteBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setMute"));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("enabled", true));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("type", "audio"));
      });

    it("should dispatch a setMute action when the video mute button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher,
          video: {enabled: true}
        });

        var muteBtn = view.getDOMNode().querySelector('.btn-mute-video');

        React.addons.TestUtils.Simulate.click(muteBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setMute"));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("enabled", false));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("type", "video"));
      });

    it("should set the mute button as mute off", function() {
      view = mountTestComponent({
        dispatcher: dispatcher,
        video: {enabled: true}
      });

      var muteBtn = view.getDOMNode().querySelector('.btn-mute-video');

      expect(muteBtn.classList.contains("muted")).eql(false);
    });

    it("should set the mute button as mute on", function() {
      view = mountTestComponent({
        dispatcher: dispatcher,
        audio: {enabled: false}
      });

      var muteBtn = view.getDOMNode().querySelector('.btn-mute-audio');

      expect(muteBtn.classList.contains("muted")).eql(true);
    });
  });

  describe("ConversationView", function() {
    var store, feedbackStore;

    function mountTestComponent() {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.ConversationView({
          dispatcher: dispatcher,
          mozLoop: fakeMozLoop,
          store: store,
          feedbackStore: feedbackStore
        }));
    }

    beforeEach(function() {
      store = new loop.store.ConversationStore(dispatcher, {
        client: {},
        mozLoop: fakeMozLoop,
        sdkDriver: {}
      });
      feedbackStore = new loop.store.FeedbackStore(dispatcher, {
        feedbackClient: {}
      });
    });

    it("should render the OutgoingCallFailedView when the call state is" +
       "'terminated' for outgoing calls",
      function() {
        store.setStoreState({
          callState: CALL_STATES.TERMINATED,
          outgoing: true
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.OutgoingCallFailedView);
    });

    it("should render the IncomingCallFailedView when the call state is" +
       "'terminated' for incoming calls",
      function() {
        store.setStoreState({
          callState: CALL_STATES.TERMINATED,
          outgoing: false
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.IncomingCallFailedView);
    });

    it("should render the PendingConversationView when the call state is " +
       "'gather' and the call is outgoing", function() {
        store.setStoreState({
          callState: CALL_STATES.GATHER,
          contact: contact,
          outgoing: true
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.PendingConversationView);
    });

    it("should render the IncomingCallView when the call state is " +
       "'alerting' and the call is incoming", function() {
        store.setStoreState({
          callState: CALL_STATES.ALERTING,
          contact: contact,
          outgoing: false
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.IncomingCallView);
    });

    it("should render the OngoingConversationView when the call state is 'ongoing'",
      function() {
        store.setStoreState({callState: CALL_STATES.ONGOING});

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.OngoingConversationView);
    });

    it("should render the FeedbackView when the call state is 'finished'",
      function() {
        store.setStoreState({callState: CALL_STATES.FINISHED});

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.shared.views.FeedbackView);
    });

    it("should play the terminated sound when the call state is 'finished'",
      function() {
        var fakeAudio = {
          play: sinon.spy(),
          pause: sinon.spy(),
          removeAttribute: sinon.spy()
        };
        sandbox.stub(window, "Audio").returns(fakeAudio);

        store.setStoreState({callState: CALL_STATES.FINISHED});

        view = mountTestComponent();

        sinon.assert.calledOnce(fakeAudio.play);
    });

    it("should update the rendered views when the state is changed.",
      function() {
        store.setStoreState({
          callState: CALL_STATES.GATHER,
          contact: contact,
          outgoing: true
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.PendingConversationView);

        store.setStoreState({callState: CALL_STATES.TERMINATED});

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.OutgoingCallFailedView);
    });

    describe("Title", function() {
      it("should set the title to the contact name", function() {
        store.setStoreState({
          contact: contact,
          callerId: "fakeCallerId",
          callUrl: "fakeCallUrl"
        });

        view = mountTestComponent();

        expect(fakeWindow.document.title).to.equal(contact.name[0]);
      });

      it("should use the contact email if there is no name", function() {
        delete contact.name;

        store.setStoreState({
          contact: contact,
          callerId: "fakeCallerId",
          callUrl: "fakeCallUrl"
        });

        view = mountTestComponent();

        expect(fakeWindow.document.title).to.equal(contact.email[0].value);
      });

      it("should use the caller id if there is no contact", function() {
        store.setStoreState({
          callerId: "fakeCallerId",
          callUrl: "fakeCallUrl"
        });

        view = mountTestComponent();

        expect(fakeWindow.document.title).to.equal("fakeCallerId");
      });

      it("should fallback to callUrl if there is no contact nor caller id",
        function() {
          store.setStoreState({
            callUrl: "fakeCallUrl"
          });

          view = mountTestComponent();

          expect(fakeWindow.document.title).to.equal("fakeCallUrl");
        });
    });
  });

  describe("IncomingCallView", function() {
    var store, fakeAudio;

    function mountTestComponent(extraProps) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.IncomingCallView(_.extend({
          dispatcher: dispatcher,
          mozLoop: fakeMozLoop
        }, extraProps)));
    }

    beforeEach(function() {
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy(),
        removeAttribute: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
    });

    describe("default answer mode", function() {
      it("should display video as primary answer mode", function() {
        view = mountTestComponent({
          incomingHasVideo: true
        });

        var primaryBtn = view.getDOMNode()
                                  .querySelector('.fx-embedded-btn-icon-video');

        expect(primaryBtn).not.to.eql(null);
      });

      it("should display audio as primary answer mode", function() {
        view = mountTestComponent({
          incomingHasVideo: false
        });

        var primaryBtn = view.getDOMNode()
                                  .querySelector('.fx-embedded-btn-icon-audio');

        expect(primaryBtn).not.to.eql(null);
      });

      it("should accept call with video", function() {
        view = mountTestComponent({
          incomingHasVideo: true
        });

        var primaryBtn = view.getDOMNode()
                                  .querySelector('.fx-embedded-btn-icon-video');

        React.addons.TestUtils.Simulate.click(primaryBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithExactly(dispatcher.dispatch,
          new sharedActions.AcceptCall({callType: CALL_TYPES.AUDIO_VIDEO}));
      });

      it("should accept call with audio", function() {
        view = mountTestComponent({
          incomingHasVideo: false
        });

        var primaryBtn = view.getDOMNode()
                                  .querySelector('.fx-embedded-btn-icon-audio');

        React.addons.TestUtils.Simulate.click(primaryBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithExactly(dispatcher.dispatch,
          new sharedActions.AcceptCall({callType: CALL_TYPES.AUDIO_ONLY}));
      });

      it("should accept call with video when clicking on secondary btn",
        function() {
          view = mountTestComponent({
            incomingHasVideo: false
          });

          var secondaryBtn = view.getDOMNode()
            .querySelector('.fx-embedded-btn-video-small');

          React.addons.TestUtils.Simulate.click(secondaryBtn);

          sinon.assert.calledOnce(dispatcher.dispatch);
          sinon.assert.calledWithExactly(dispatcher.dispatch,
            new sharedActions.AcceptCall({callType: CALL_TYPES.AUDIO_VIDEO}));
        });

      it("should accept call with audio when clicking on secondary btn",
        function() {
          view = mountTestComponent({
            incomingHasVideo: true
          });

          var secondaryBtn = view.getDOMNode()
            .querySelector('.fx-embedded-btn-audio-small');

          React.addons.TestUtils.Simulate.click(secondaryBtn);

          sinon.assert.calledOnce(dispatcher.dispatch);
          sinon.assert.calledWithExactly(dispatcher.dispatch,
            new sharedActions.AcceptCall({callType: CALL_TYPES.AUDIO_ONLY}));
        });

      it("should dispatch `DeclineCall` when clicking the decline btn",
        function() {
          view = mountTestComponent();

          var buttonDecline = view.getDOMNode().querySelector(".btn-decline");

          TestUtils.Simulate.click(buttonDecline);

          sinon.assert.calledOnce(dispatcher.dispatch);
          sinon.assert.calledWithExactly(dispatcher.dispatch,
            new sharedActions.DeclineCall());
        });

      it("should dispatch `BlockCall` when clicking the block btn",
        function() {
          view = mountTestComponent();

          var buttonDecline = view.getDOMNode().querySelector(".btn-block");

          TestUtils.Simulate.click(buttonDecline);

          sinon.assert.calledOnce(dispatcher.dispatch);
          sinon.assert.calledWithExactly(dispatcher.dispatch,
            new sharedActions.BlockCall());
      });
    });
  });
});
