// Test profile: e74815d8695ccf8580d4af3be5cd1371f202f6ae
// 1305aa31f417005934020cd7181d8331691945d1

function createElement(name, props) {
  var el = document.createElement(name);

  for (var key in props) {
    if (key === "style") {
      for (var styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el[key] = props[key];
    }
  }

  return el;
}

function Backtrack()
{
  this.container = createElement("div", {
    className: "histogram",
  });
  this.data = null;
  this.pickButton = null;

  this.objectiveMarker;
  this.objectiveThread;
}

Backtrack.prototype = {
  round: function(ms) {
    return Math.round(ms * 10) / 10.0;
  },

  clock_time: function(ms) {
    var tick_diff_us = (this.data.timing.tick - ms) * 1000;
    var clock_us = this.data.timing.clock - tick_diff_us;
    return (new Date(clock_us / 1000)).toLocaleString();
  },

  getContainer: function Backtrack_getContainer() {
    return this.container;
  },

  setPickButton: function Backtrack_setPickButton(pick) {
    this.pickButton = pick;

    var pickObjectivesType;
    var pickObjectivesMarker;

    pickObjectivesType = function() {
      var objectiveTypes = this._getObjectivesTypes();
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var Objectives of objectiveTypes) {
        var opt = createElement("option", {});
        opt.appendChild(document.createTextNode(Objectives));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickObjectivesMarker.bind(this)(typeSelector.value);
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    };

    pickObjectivesMarker = function(type) {
      var objectiveMarkers = this._getObjectivesMarkers(type);
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var objective_id = 0; objective_id < objectiveMarkers.length; ++objective_id) {
        var Objectives = objectiveMarkers[objective_id].marker;
        var opt = createElement("option", {
          value: objective_id
        });
        opt.appendChild(document.createTextNode(Objectives.d));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickObjectivesType.bind(this)();
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        this.objectiveMarker = objectiveMarkers[typeSelector.value].marker;
        this.objectiveThread = objectiveMarkers[typeSelector.value].thread;
        this.display();
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    }

    this.pickButton.onclick = pickObjectivesType.bind(this);
  },

  _isMarkerInBoundary: function(marker) {
    return (marker.time >= this.data.boundaries.min) &&
           (marker.time <= this.data.boundaries.max);
  },

  _getObjectivesTypes: function() {
    var result = [];

    if (!this.data.threads) {
      return result;
    }

    var set = {};
    for (var thread_id in this.data.threads) {
      var thread = this.data.threads[thread_id];
      for (var marker of thread.markers) {
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "o") {
          set[marker.w] = true;
        }
      }
    }
    for (what in set) {
      result.push(what);
    }
    result.sort();
    return result;
  },

  _getObjectivesMarkers: function(type) {
    var result = [];

    if (!this.data) {
      return result;
    }

    for (var thread_id in this.data.threads) {
      var thread = this.data.threads[thread_id];
      for (var marker_id in thread.markers) {
        var marker = thread.markers[marker_id];
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "o" && marker.w === type) {
          result.push({
            thread: thread,
            marker: marker
          });
        }
      }
    }
    result.sort(function(a, b) {
      if (a.marker.time == b.marker.time) return 0;
      return (a.marker.time > b.marker.time) ? 1 : -1;
    });
    return result;
  },

  assignData: function Backtrack_assignData(data) {
    this.data = data;

    // todo - this.objectiveMarkerId needs reset on new data
    if (this.objectiveMarker) {
      this.display();
    }
  },

  display: function Backtrack_display() {
    console.log("backtrack.draw begin");

    this.container.innerHTML = "";

    var range = this.data.boundaries.max - this.data.boundaries.min;
    var one_pixel = 100 / this.container.clientWidth;

    var caret = {};
    caret.thread = this.objectiveThread;
    caret.marker = this.objectiveMarker;
    caret.closing = caret.marker;
    caret.closing_thread = caret.thread;
    caret.cpu_state = 1;
    caret.backup = function () {
      var copy = {};
      for (p in this) {
        copy[p] = this[p];
      }
      return copy;
    }

    function logstr_caret(caret)
    {
      return JSON.stringify(caret.marker) + "@" + JSON.stringify([caret.thread.name,caret.thread.tid]);
    }

    var backdraw = function(caret, name)
    {
      var startX = (caret.marker.time - this.data.boundaries.min) * 100.0 / range;
      var stopX = (caret.closing.time - this.data.boundaries.min) * 100.0 / range;

      var block = createElement("div", {
        className: "backtrackTape backtrackType-" + name,
        style: {
          left: startX + "%",
          width: ((stopX - startX) < one_pixel) ? "1px" : ((stopX - startX) + "%")
        }
      });

      var begin_time = this.clock_time(caret.marker.time);
      var begin_thread = caret.thread.name;
      var duration = this.round(caret.closing.time - caret.marker.time);
      var end_thread = caret.closing_thread.name;
      var what = caret.marker.w;
      var details = caret.marker.d;
      block.setAttribute("title",
        begin_time + " @ " + begin_thread + "\n" +
        duration + "ms @ " + end_thread + "\n" +
        (what || "") + (details ? " / " + details : "")) ;
      this.container.appendChild(block);

      console.log("backdraw: " + logstr_caret(caret) + " type=" + name);

      caret.closing = caret.marker;
      caret.closing_thread = caret.thread;
    }.bind(this);

    var draw_input = function(caret)
    {
      var startX = (caret.marker.time - this.data.boundaries.min) * 100.0 / range;

      var block = createElement("div", {
        className: "backtrackInput",
        style: {
          right: (100 - startX) + "%"
        }
      });

      block.textContent = caret.marker.w + "\n" +
                          caret.marker.d + "\n@" +
                          this.clock_time(caret.marker.time);
      this.container.appendChild(block);
    }.bind(this);

    var find = function(gid, caret)
    {
      if (gid[1] == 0) {
        console.log("gid.id == 0");
        return false;
      }

      caret.thread = this.data.threads[gid[0]];
      if (!caret.thread) {
        console.log("thread for gid.tid=" + gid[0] + " not found");
        return false;
      }

      caret.marker = caret.thread.markers[gid[1] - 1];
      return (caret.marker.i == gid[1]);
    }.bind(this);

    while (caret.marker.time > this.data.boundaries.min) {
      switch (caret.marker.t) {
        case "d": // dequeue
          backdraw(caret, "CPU_on_path");

          var revert = caret.backup();

          if (!find(caret.marker.o, caret)) {
            console.log("Queue/dispatch marker not found " + JSON.stringify(caret));
            return;
          }

          var params = caret.marker.w && caret.marker.w.match(/\[(.*)\]$/);
          if (params) {
            if (params.includes("control")) {
              // Ignore control dispatches
              caret = revert;
              break;
            }
          }

          backdraw(caret, "dispatch_" + caret.marker.w);
          break;
        case "e": // end of execution
          backdraw(caret, "CPU_on_path");
          if (!find(caret.marker.o, caret) ) {
            console.log("Execution span start not found " + JSON.stringify(caret));
            return;
          }
          backdraw(caret, "CPU_blocking");
          break;
        case "i": // user input
          backdraw(caret, "CPU_on_path");
          draw_input(caret);
          console.log("backtrack.draw finished on user input");
          return;
      }

      if (!find([caret.thread.tid, caret.marker.i - 1], caret)) {
        console.log("Hit start of the thread?");
        break;
      }
    } // while (in range)

    // Probably needs some conditioning.. lazy to figure this out now
    backdraw(caret, "CPU_on_path");

    console.log("backtrack.draw done");
  }
};
