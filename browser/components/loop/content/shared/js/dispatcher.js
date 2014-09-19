/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.Dispatcher = (function() {

  function Dispatcher() {
    this.eventData = {};
  }

  Dispatcher.prototype = {
    register: function(store, eventTypes) {
      eventTypes.forEach(function (type) {
        if (this.eventData.hasOwnProperty(type)) {
          this.eventData[type].push(store);
        } else {
          this.eventData[type] = [store];
        }
      }.bind(this));
    },

    dispatch: function(action) {
      // XXX Implement a queue?
      var type = action.name;
      var registeredStores = this.eventData[type];
      if (!registeredStores) {
        console.log("No stores registered for event type ", type);
        return;
      }

      registeredStores.forEach(function(store) {
        store[type](action);
      });
    }
  };

  return Dispatcher;
})();
