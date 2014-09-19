/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.shared = loop.shared || {};
loop.shared.actions = (function() {
  "use strict";

  function Action(name, schema, values) {
    var validatedData = new validate.Validator(schema || {})
                                    .validate(values || {});
    for (var prop in validatedData)
      this[prop] = validatedData[prop];

    this.name = name;
  }

  Action.define = function(name, schema) {
    return Action.bind(null, name, schema);
  };

  return {
    gatherCallData: Action.define("gatherCallData", {
    }),

    startOutgoingCall: Action.define("startOutgoingCall", {
      mediaType: String
    })
  };
})();
