/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.standaloneStores = (function() {

  /**
   * Local helpers.
   */
  var BrowserInformationStore = Backbone.Model.extend({
    defaults: {
      isFirefox: undefined,
      isIOS: undefined
    },

    initialize: function(attributes, options) {
      options = options || {};
      if (!options.platform) {
        throw new Error("missing required platform");
      }

      this.set({
        isFirefox: options.platform.indexOf("Firefox") !== -1,
        isIOS: /^(iPad|iPhone|iPod)/.test(options.platform)
      });
    }
  });

  return {
    BrowserInformationStore: BrowserInformationStore
  };

})();
