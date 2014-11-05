/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.store = loop.store || {};
loop.store.ActiveRoomStore = (function() {
  "use strict";

  var sharedActions = loop.shared.actions;

  var ROOM_STATES = loop.store.ROOM_STATES = {
    // The initial state of the room
    INIT: "rm-init",
    // The store is gathering the room data
    GATHER: "rm-gather",
    // The store has got the room data
    READY: "rm-ready",
    // There was an issue with the room
    FAILED: "rm-failed"
  };

  /**
   * Store for things that are local to this instance (in this profile, on
   * this machine) of this roomRoom store, in addition to a mirror of some
   * remote-state.
   *
   * @extends {Backbone.Events}
   *
   * @param {Object}          options - Options object
   * @param {loop.Dispatcher} options.dispatch - The dispatcher for dispatching
   *                            actions and registering to consume them.
   * @param {MozLoop}         options.mozLoop - MozLoop API provider object
   */
  function ActiveRoomStore(options) {
    options = options || {};

    if (!options.dispatcher) {
      throw new Error("Missing option dispatcher");
    }
    this.dispatcher = options.dispatcher;

    if (!options.mozLoop) {
      throw new Error("Missing option mozLoop");
    }
    this.mozLoop = options.mozLoop;

    this.dispatcher.register(this, [
      "setupWindowData"
    ]);

    /**
     * Stored data reflecting the local state of a given room, used to drive
     * the room's views.
     *
     * @see https://wiki.mozilla.org/Loop/Architecture/Rooms#GET_.2Frooms.2F.7Btoken.7D
     *      for the main data.
     *
     * @property {Error=} error - if the room is an error state, this will be
     *                            set to an Error object reflecting the problem;
     *                            otherwise it will be unset.
     */
    this._storeState = {
      roomState: ROOM_STATES.INIT
    };
  }

  ActiveRoomStore.prototype = _.extend({

    getStoreState: function() {
      return this._storeState;
    },

    setStoreState: function(newState) {
      for (var key in newState) {
        this._storeState[key] = newState[key];
      }
      this.trigger("change");
    },

    /**
     * Execute setupWindowData event action from the dispatcher.  This primes
     * the store with the roomToken, and calls MozLoop.getRoomData on that
     * ID.  This will return either a reflection of state on the server, or,
     * if the createRoom call hasn't yet returned, it will have at least the
     * roomName as specified to the createRoom method.
     *
     * When the room name gets set, that will trigger the view to display
     * that name.
     *
     * @param {sharedActions.SetupWindowData} actionData
     */
    setupWindowData: function(actionData) {
      if (actionData.type !== "room") {
        // Nothing for us to do here, leave it to other stores.
        return;
      }
      this.setStoreState({
        roomState: ROOM_STATES.GATHER
      });

      this.mozLoop.rooms.get(actionData.roomToken,
        function(error, roomData) {

          this.setStoreState(_.extend({
            error: error,
            roomState: error ? ROOM_STATES.FAILED : ROOM_STATES.READY,
            roomToken: actionData.roomToken
          }, roomData));
        }.bind(this));
    }

  }, Backbone.Events);

  return ActiveRoomStore;

})();
