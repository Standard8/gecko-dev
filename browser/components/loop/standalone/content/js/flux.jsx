/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.webapp = (function($, _, OT, mozL10n) {
  "use strict";

  loop.config = loop.config || {};
  loop.config.serverUrl = loop.config.serverUrl || "http://localhost:5000";

  var sharedModels = loop.shared.models,
      sharedViews = loop.shared.views;

  /**
   * App router.
   * @type {loop.webapp.WebappRouter}
   */
  var router;

  /**
   * Homepage view.
   */
  var HomeView = React.createClass({
    render: function() {
      return (
        <p>{mozL10n.get("welcome")}</p>
      )
    }
  });

  /**
   * Unsupported Browsers view.
   */
  var UnsupportedBrowserView = React.createClass({
    render: function() {
      var useLatestFF = mozL10n.get("use_latest_firefox", {
        "firefoxBrandNameLink": React.renderComponentToStaticMarkup(
          <a target="_blank" href="https://www.mozilla.org/firefox/">Firefox</a>
        )
      });
      return (
        <div>
          <h2>{mozL10n.get("incompatible_browser")}</h2>
          <p>{mozL10n.get("powered_by_webrtc")}</p>
          <p dangerouslySetInnerHTML={{__html: useLatestFF}}></p>
        </div>
      );
    }
  });

  /**
   * Unsupported Device view.
   */
  var UnsupportedDeviceView = React.createClass({
    render: function() {
      return (
        <div>
          <h2>{mozL10n.get("incompatible_device")}</h2>
          <p>{mozL10n.get("sorry_device_unsupported")}</p>
          <p>{mozL10n.get("use_firefox_windows_mac_linux")}</p>
        </div>
      );
    }
  });

  /**
   * Firefox promotion interstitial. Will display only to non-Firefox users.
   */
  var PromoteFirefoxView = React.createClass({
    propTypes: {
      helper: React.PropTypes.object.isRequired
    },

    render: function() {
      if (this.props.helper.isFirefox(navigator.userAgent)) {
        return <div />;
      }
      return (
        <div className="promote-firefox">
          <h3>{mozL10n.get("promote_firefox_hello_heading")}</h3>
          <p>
            <a className="btn btn-large btn-accept"
               href="https://www.mozilla.org/firefox/">
              {mozL10n.get("get_firefox_button")}
            </a>
          </p>
        </div>
      );
    }
  });


  /**
   * Webapp Root View. This is the main, single, view that controls the display
   * of the webapp page.
   */
  var WebappRootView = React.createClass({
    propTypes: {
      browserInformationStore: React.PropTypes.instanceOf(
        loop.standaloneStores.BrowserInformationStore).isRequired,
      dispatcher: React.PropTypes.instanceOf(
        loop.Dispatcher).isRequired,
      conversationStore: React.PropTypes.instanceOf(
        loop.ConversationStore).isRequired
    },

    getInitialState: function() {
      return {
        unsupportedDevice: this.props.browserInformationStore.get("isIOS"),
        unsupportedBrowser: !OT.checkSystemRequirements(),
      };
    },

    render: function() {
      if (this.state.unsupportedDevice) {
        return <UnsupportedDeviceView />;
      } else if (this.state.unsupportedBrowser) {
        return <UnsupportedBrowserView />;
      } else if (this.props.conversationStore.get("loopToken")) {
        return (
          <loop.conversationViews.OutgoingConversationView
            conversationStore={this.props.conversationStore}
            dispatcher={this.props.dispatcher}
          />
        );
      } else {
        return <HomeView />;
      }
    }
  });

  /**
   * App initialization.
   */
  function init() {
    var dispatcher = new loop.Dispatcher();
    var browserInformationStore =
      new loop.standaloneStores.BrowserInformationStore({}, {
        platform: navigator.platform
      });
    var client = new loop.StandaloneClient({
      baseServerUrl: loop.config.serverUrl
    });
    var conversationStore =
      new loop.ConversationStore({}, {
        client: client,
        dispatcher: dispatcher,
        hash: window.location.hash
    });

    React.renderComponent(<WebappRootView
      browserInformationStore={browserInformationStore}
      dispatcher={dispatcher}
      conversationStore={conversationStore}
    />, document.querySelector("#main"));

    dispatcher.dispatch(new loop.shared.actions.gatherCallData({}));

    // Set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = mozL10n.language.code;
    document.documentElement.dir = mozL10n.language.direction;
  }

  return {
    HomeView: HomeView,
    UnsupportedBrowserView: UnsupportedBrowserView,
    UnsupportedDeviceView: UnsupportedDeviceView,
    init: init,
    PromoteFirefoxView: PromoteFirefoxView,
    WebappRootView: WebappRootView
  };
})(jQuery, _, window.OT, navigator.mozL10n);
