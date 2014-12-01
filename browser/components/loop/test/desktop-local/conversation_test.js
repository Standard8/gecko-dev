/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop, sinon, React, TestUtils */

var expect = chai.expect;

describe("loop.conversation", function() {
  "use strict";

  var sharedModels = loop.shared.models,
      sharedView = loop.shared.views,
      sandbox;

  // XXX refactor to Just Work with "sandbox.stubComponent" or else
  // just pass in the sandbox and put somewhere generally usable

  function stubComponent(obj, component, mockTagName){
    var reactClass = React.createClass({
      render: function() {
        var mockTagName = mockTagName || "div";
        return React.DOM[mockTagName](null, this.props.children);
      }
    });
    return sandbox.stub(obj, component, reactClass);
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    navigator.mozLoop = {
      doNotDisturb: true,
      getStrings: function() {
        return JSON.stringify({textContent: "fakeText"});
      },
      get locale() {
        return "en-US";
      },
      setLoopPref: sinon.stub(),
      getLoopPref: function(prefName) {
        if (prefName == "debug.sdk") {
          return false;
        }

        return "http://fake";
      },
      calls: {
        clearCallInProgress: sinon.stub()
      },
      LOOP_SESSION_TYPE: {
        GUEST: 1,
        FXA: 2
      },
      startAlerting: sinon.stub(),
      stopAlerting: sinon.stub(),
      ensureRegistered: sinon.stub(),
      get appVersionInfo() {
        return {
          version: "42",
          channel: "test",
          platform: "test"
        };
      },
      getAudioBlob: sinon.spy(function(name, callback) {
        callback(null, new Blob([new ArrayBuffer(10)], {type: 'audio/ogg'}));
      })
    };

    // XXX These stubs should be hoisted in a common file
    // Bug 1040968
    sandbox.stub(document.mozL10n, "get", function(x) {
      return x;
    });
    document.mozL10n.initialize(navigator.mozLoop);
  });

  afterEach(function() {
    delete navigator.mozLoop;
    sandbox.restore();
  });

  describe("#init", function() {
    beforeEach(function() {
      sandbox.stub(React, "renderComponent");
      sandbox.stub(document.mozL10n, "initialize");

      sandbox.stub(loop.shared.models.ConversationModel.prototype,
        "initialize");

      sandbox.stub(loop.Dispatcher.prototype, "dispatch");

      sandbox.stub(loop.shared.utils.Helper.prototype,
        "locationData").returns({
          hash: "#42",
          pathname: "/"
        });

      window.OT = {
        overrideGuidStorage: sinon.stub()
      };
    });

    afterEach(function() {
      delete window.OT;
    });

    it("should initialize L10n", function() {
      loop.conversation.init();

      sinon.assert.calledOnce(document.mozL10n.initialize);
      sinon.assert.calledWithExactly(document.mozL10n.initialize,
        navigator.mozLoop);
    });

    it("should create the AppControllerView", function() {
      loop.conversation.init();

      sinon.assert.calledOnce(React.renderComponent);
      sinon.assert.calledWith(React.renderComponent,
        sinon.match(function(value) {
          return TestUtils.isDescriptorOfType(value,
            loop.conversation.AppControllerView);
      }));
    });

    it("should trigger a getWindowData action", function() {
      loop.conversation.init();

      sinon.assert.calledOnce(loop.Dispatcher.prototype.dispatch);
      sinon.assert.calledWithExactly(loop.Dispatcher.prototype.dispatch,
        new loop.shared.actions.GetWindowData({
          windowId: "42"
        }));
    });
  });

  describe("AppControllerView", function() {
    var conversationStore, conversation, client, ccView, oldTitle, dispatcher;
    var conversationAppStore, roomStore;

    function mountTestComponent() {
      return TestUtils.renderIntoDocument(
        loop.conversation.AppControllerView({
          client: client,
          conversation: conversation,
          roomStore: roomStore,
          sdk: {},
          conversationStore: conversationStore,
          conversationAppStore: conversationAppStore,
          dispatcher: dispatcher
        }));
    }

    beforeEach(function() {
      oldTitle = document.title;
      client = new loop.Client();
      conversation = new loop.shared.models.ConversationModel({}, {
        sdk: {}
      });
      dispatcher = new loop.Dispatcher();
      conversationStore = new loop.store.ConversationStore(
        dispatcher, {
          client: client,
          mozLoop: navigator.mozLoop,
          sdkDriver: {}
        });

      conversationStore.setStoreState({contact: {
        name: [ "Mr Smith" ],
        email: [{
          type: "home",
          value: "fakeEmail",
          pref: true
        }]
      }});

      roomStore = new loop.store.RoomStore(dispatcher, {
        mozLoop: navigator.mozLoop,
      });
      conversationAppStore = new loop.store.ConversationAppStore({
        dispatcher: dispatcher,
        mozLoop: navigator.mozLoop
      });
    });

    afterEach(function() {
      ccView = undefined;
      document.title = oldTitle;
    });

    it("should display the ConversationView for outgoing calls", function() {
      conversationAppStore.setStoreState({windowType: "outgoing"});

      ccView = mountTestComponent();

      TestUtils.findRenderedComponentWithType(ccView,
        loop.conversationViews.ConversationView);
    });

    it("should display the ConversationView for incoming calls", function() {
      conversationAppStore.setStoreState({windowType: "incoming"});

      ccView = mountTestComponent();

      TestUtils.findRenderedComponentWithType(ccView,
        loop.conversationViews.ConversationView);
    });

    it("should display the RoomView for rooms", function() {
      conversationAppStore.setStoreState({windowType: "room"});

      ccView = mountTestComponent();

      TestUtils.findRenderedComponentWithType(ccView,
        loop.roomViews.DesktopRoomConversationView);
    });

    it("should display the GenericFailureView for failures", function() {
      conversationAppStore.setStoreState({windowType: "failed"});

      ccView = mountTestComponent();

      TestUtils.findRenderedComponentWithType(ccView,
        loop.conversationViews.GenericFailureView);
    });
  });
});
